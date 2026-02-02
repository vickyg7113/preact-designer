import { EditorMode } from './EditorMode';
import { GuideRenderer } from './GuideRenderer';
import { FeatureHeatmapRenderer } from './FeatureHeatmapRenderer';
import { EditorFrame } from '../editor/EditorFrame';
import { Storage } from '../utils/storage';
import { getCurrentPage, generateId } from '../utils/dom';
import { renderSDKOverlays } from '../components/SDKOverlays';
import { apiClient } from '../api/client';
import type {
  Guide,
  SDKConfig,
  EditorMessage,
  SaveGuideMessage,
  SaveTagPageMessage,
  SaveTagFeatureMessage,
  ElementSelectedMessage,
  TaggedFeature,
  HeatmapToggleMessage,
} from '../types';

/**
 * Visual Designer SDK - Main SDK class (Preact-based)
 */
export class DesignerSDK {
  private config: SDKConfig;
  private storage: Storage;
  private editorMode: EditorMode;
  private guideRenderer: GuideRenderer;
  private featureHeatmapRenderer: FeatureHeatmapRenderer;
  private editorFrame: EditorFrame;
  private heatmapEnabled = false;
  private isInitialized = false;
  private isEditorMode = false;
  private sdkRoot: HTMLElement | null = null;
  private showLoading = false;
  private loadingFallbackTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: SDKConfig = {}) {
    this.config = config;
    this.storage = new Storage(config.storageKey);
    this.editorMode = new EditorMode();
    this.guideRenderer = new GuideRenderer();
    this.featureHeatmapRenderer = new FeatureHeatmapRenderer();
    this.editorFrame = new EditorFrame();
  }

  init(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    this.injectMontserratFont();
    this.injectIconifyScript();

    this.guideRenderer.setOnDismiss((id) => this.config.onGuideDismissed?.(id));

    const shouldEnableEditor = this.shouldEnableEditorMode();

    if (shouldEnableEditor) {
      this.showLoading = true;
      this.renderOverlays();
      this.enableEditor();
    } else {
      this.loadGuides();
    }

    this.heatmapEnabled = localStorage.getItem('designerHeatmapEnabled') === 'true';
    this.renderFeatureHeatmap();
    this.setupEventListeners();
  }

  enableEditor(): void {
    if (this.isEditorMode) return;
    this.isEditorMode = true;

    let mode = (typeof window !== 'undefined' && (window as any).__visualDesignerMode) || null;
    if (!mode) {
      mode = localStorage.getItem('designerModeType') || null;
    }

    this.editorFrame.create((msg) => this.handleEditorMessage(msg), mode);

    const isTagMode = mode === 'tag-page' || mode === 'tag-feature';
    if (!isTagMode) {
      this.editorMode.activate((msg) => this.handleEditorMessage(msg));
    }

    this.ensureSDKRoot();
    // Keep showLoading true - loading overlay stays centered until EDITOR_READY
    this.renderOverlays();

    localStorage.setItem('designerMode', 'true');
    if (mode) localStorage.setItem('designerModeType', mode);

    setTimeout(() => {
      this.editorFrame.show();
      this.renderOverlays();
    }, isTagMode ? 100 : 300);

    // Fallback: hide loading after 5s if EDITOR_READY never arrives
    this.loadingFallbackTimer = setTimeout(() => {
      this.loadingFallbackTimer = null;
      if (this.showLoading) {
        this.showLoading = false;
        this.renderOverlays();
      }
    }, 5000);
  }

  disableEditor(): void {
    if (!this.isEditorMode) return;
    try {
      window.close();
    } catch {
      // ignore
    }
    this.isEditorMode = false;
    this.editorMode.deactivate();
    this.editorFrame.destroy();
    this.featureHeatmapRenderer.destroy();
    if (this.loadingFallbackTimer) {
      clearTimeout(this.loadingFallbackTimer);
      this.loadingFallbackTimer = null;
    }
    this.showLoading = false;

    localStorage.removeItem('designerMode');
    localStorage.removeItem('designerModeType');

    this.renderOverlays();
    this.loadGuides();
  }

  getGuides(): Guide[] {
    return this.storage.getGuides();
  }

  getGuidesForCurrentPage(): Guide[] {
    return this.storage.getGuidesByPage(getCurrentPage());
  }

  saveGuide(guideData: Omit<Guide, 'id' | 'createdAt' | 'updatedAt'>): Guide {
    const guide: Guide = {
      ...guideData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.storage.saveGuide(guide);
    if (!this.isEditorMode) this.loadGuides();
    this.config.onGuideSaved?.(guide);
    return guide;
  }

  deleteGuide(guideId: string): void {
    this.storage.deleteGuide(guideId);
    this.guideRenderer.dismissGuide(guideId);
  }

  loadGuides(): void {
    this.guideRenderer.renderGuides(this.storage.getGuides());
  }

  isEditorModeActive(): boolean {
    return this.isEditorMode;
  }

  private shouldEnableEditorMode(): boolean {
    if (this.config.editorMode !== undefined) return this.config.editorMode;
    if (typeof window !== 'undefined' && (window as any).__visualDesignerWasLaunched) return true;
    return localStorage.getItem('designerMode') === 'true';
  }

  private handleEditorMessage(message: EditorMessage): void {
    switch (message.type) {
      case 'ELEMENT_SELECTED':
        this.handleElementSelected(message);
        break;
      case 'SAVE_GUIDE':
        this.handleSaveGuide(message);
        break;
      case 'TAG_FEATURE_CLICKED':
        this.editorMode.activate((msg) => this.handleEditorMessage(msg));
        break;
      case 'ACTIVATE_SELECTOR':
        this.editorMode.activate((msg) => this.handleEditorMessage(msg));
        break;
      case 'CLEAR_SELECTION_CLICKED':
        this.editorMode.deactivate();
        this.editorFrame.sendClearSelectionAck();
        break;
      case 'SAVE_TAG_PAGE':
        this.handleSaveTagPage(message);
        break;
      case 'SAVE_TAG_FEATURE':
        this.handleSaveTagFeature(message);
        break;
      case 'HEATMAP_TOGGLE':
        this.handleHeatmapToggle((message as HeatmapToggleMessage).enabled);
        break;
      case 'CANCEL':
        this.editorFrame.hide();
        break;
      case 'EXIT_EDITOR_MODE':
        this.disableEditor();
        break;
      case 'EDITOR_READY':
        if (this.loadingFallbackTimer) {
          clearTimeout(this.loadingFallbackTimer);
          this.loadingFallbackTimer = null;
        }
        this.showLoading = false;
        this.renderOverlays();
        break;
      default:
        break;
    }
  }

  private handleElementSelected(message: ElementSelectedMessage): void {
    this.editorFrame.sendElementSelected(message);
  }

  private handleSaveGuide(message: SaveGuideMessage): void {
    this.saveGuide({
      ...message.guide,
      page: getCurrentPage(),
    });
  }

  private async handleSaveTagPage(message: SaveTagPageMessage): Promise<void> {
    const payload = message.payload;
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
    const slug =
      typeof window !== 'undefined'
        ? `${window.location.hostname}${window.location.pathname}`
        : '';

    try {
      await apiClient.post('/pages', {
        name: payload.pageName,
        slug,
        description: payload.description,
        status: 'active',
      });
    } catch (e) {
      console.warn('[Visual Designer] Failed to create page via API:', e);
      this.editorFrame.sendTagPageSavedAck();
      return;
    }

    const key = 'designerTaggedPages';
    try {
      const raw = localStorage.getItem(key) || '[]';
      const list: { pageName: string; url: string }[] = JSON.parse(raw);
      list.push({ pageName: payload.pageName, url: currentUrl });
      localStorage.setItem(key, JSON.stringify(list));
    } catch {
      // ignore
    }
    this.editorFrame.sendTagPageSavedAck();
  }

  private handleSaveTagFeature(message: SaveTagFeatureMessage): void {
    const key = 'designerTaggedFeatures';
    const payload = message.payload;
    if (!payload.selector || !payload.featureName) return;
    try {
      const raw = localStorage.getItem(key) || '[]';
      const list: TaggedFeature[] = JSON.parse(raw);
      const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
      const feature: TaggedFeature = {
        id: generateId(),
        featureName: payload.featureName,
        selector: payload.selector,
        url: currentUrl,
        elementInfo: payload.elementInfo,
        createdAt: new Date().toISOString(),
      };
      list.push(feature);
      localStorage.setItem(key, JSON.stringify(list));
      this.editorFrame.sendTagFeatureSavedAck();
      this.renderFeatureHeatmap();
    } catch {
      // ignore
    }
  }

  private handleHeatmapToggle(enabled: boolean): void {
    this.heatmapEnabled = enabled;
    try {
      localStorage.setItem('designerHeatmapEnabled', String(enabled));
    } catch {
      // ignore
    }
    this.renderFeatureHeatmap();
  }

  private getTaggedFeatures(): TaggedFeature[] {
    try {
      const raw = localStorage.getItem('designerTaggedFeatures') || '[]';
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private renderFeatureHeatmap(): void {
    this.featureHeatmapRenderer.render(this.getTaggedFeatures(), this.heatmapEnabled);
  }

  private setupEventListeners(): void {
    let resizeTimeout: number;
    let scrollTimeout: number;

    const updateGuides = () => {
      this.guideRenderer.updatePositions(this.storage.getGuides());
    };
    const updateHeatmap = () => {
      this.featureHeatmapRenderer.updatePositions(this.getTaggedFeatures());
    };

    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
        updateGuides();
        updateHeatmap();
      }, 100);
    });

    window.addEventListener(
      'scroll',
      () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = window.setTimeout(() => {
          updateGuides();
          updateHeatmap();
        }, 50);
      },
      true
    );
  }

  private ensureSDKRoot(): void {
    if (this.sdkRoot) return;
    if (!document.body) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.ensureSDKRoot());
        return;
      }
      setTimeout(() => this.ensureSDKRoot(), 100);
      return;
    }
    this.sdkRoot = document.createElement('div');
    this.sdkRoot.id = 'designer-sdk-root';
    document.body.appendChild(this.sdkRoot);
  }

  private renderOverlays(): void {
    this.ensureSDKRoot();
    if (!this.sdkRoot) return;

    renderSDKOverlays(this.sdkRoot, {
      showExitButton: this.isEditorMode,
      showRedBorder: this.isEditorMode,
      showBadge: this.isEditorMode,
      showLoading: this.showLoading,
      onExitEditor: () => this.disableEditor(),
    });
  }

  private injectMontserratFont(): void {
    if (typeof document === 'undefined' || !document.head) return;
    if (document.getElementById('designer-montserrat-font')) return;
    const link = document.createElement('link');
    link.id = 'designer-montserrat-font';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
  }

  private injectIconifyScript(): void {
    if (typeof document === 'undefined' || !document.head) return;
    if (document.getElementById('designer-iconify-script')) return;
    const script = document.createElement('script');
    script.id = 'designer-iconify-script';
    script.src = 'https://code.iconify.design/iconify-icon/3.0.2/iconify-icon.min.js';
    script.async = true;
    document.head.appendChild(script);
  }
}
