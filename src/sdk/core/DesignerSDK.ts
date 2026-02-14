import { EditorMode } from './EditorMode';
import { GuideRenderer } from './GuideRenderer';
import { FeatureHeatmapRenderer } from './FeatureHeatmapRenderer';
import { EditorFrame } from '../editor/EditorFrame';
import { Storage } from '../utils/storage';
import { getCurrentPage, generateId } from '../utils/dom';
import { renderSDKOverlays } from '../components/SDKOverlays';
import type {
  Guide,
  SDKConfig,
  EditorMessage,
  SaveGuideMessage,
  ElementSelectedMessage,
  TaggedFeature,
  FeatureItem,
  HeatmapToggleMessage,
  GuideByIdData,
  GuideByIdResponse,
} from '../types';
import { apiClient } from '../api/client';
import { SelectorEngine } from './SelectorEngine';

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
  /** Features for heatmap from API (editor sends via FEATURES_FOR_HEATMAP; xpaths from feature rules) */
  private featuresForHeatmap: TaggedFeature[] = [];
  /** guide_id from URL or config (in-memory only) */
  private guideId: string | null = null;
  /** template_id from URL or config (in-memory only) */
  private templateId: string | null = null;
  /** Guides fetched from API for the current page */
  private fetchedGuides: GuideByIdData[] = [];
  /** Current URL to detect page changes */
  private currentUrl: string = typeof window !== 'undefined' ? window.location.href : '';
  private styleInjected: boolean = false;

  constructor(config: SDKConfig = {}) {
    this.config = config;
    this.guideId = config.guideId ?? null;
    this.templateId = config.templateId ?? null;
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

    this.guideRenderer.setOnDismiss((id, stepIndex) => {
      const properties: Record<string, any> = { guide_id: id, step_index: stepIndex };

      // Try to find template info if possible
      const guide = this.fetchedGuides.find(g => g.guide_id === id);
      if (guide) {
        const activeTemplates = (guide.templates || []).filter(t => t.is_active);
        const sortedTemplates = [...activeTemplates].sort((a, b) => a.step_order - b.step_order);
        const currentTemplate = sortedTemplates[stepIndex];
        if (currentTemplate) {
          properties.template_id = currentTemplate.template_id;
          properties.template_key = currentTemplate.template.template_key;
          properties.step_order = currentTemplate.step_order;
          properties.xpath = currentTemplate.x_path;
        }
      }

      this.trackEvent('dismissed', properties);
      this.config.onGuideDismissed?.(id);
    });
    this.guideRenderer.setOnNext((guideId, stepIndex, totalSteps) => {
      const guide = this.fetchedGuides.find(g => g.guide_id === guideId);
      if (guide) {
        const activeTemplates = (guide.templates || []).filter(t => t.is_active);
        const sortedTemplates = [...activeTemplates].sort((a, b) => a.step_order - b.step_order);
        const currentTemplate = sortedTemplates[stepIndex];

        if (currentTemplate) {
          let guideStepMarker = 'middle';
          if (stepIndex === 0) guideStepMarker = 'first';
          else if (stepIndex === totalSteps - 1) guideStepMarker = 'last';

          this.trackEvent('viewed', {
            guide_id: guideId,
            template_id: currentTemplate.template_id,
            map_id: currentTemplate.map_id,
            step_order: currentTemplate.step_order,
            template_key: currentTemplate.template.template_key,
            guide_step: guideStepMarker,
            xpath: currentTemplate.x_path
          });
        }
      }
    });

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

    // Initial fetch of guides for the current page
    this.fetchGuides();

    // Ensure SDK elements are correctly stacked (once on init)
    this.injectGlobalProtectionStyles();
  }

  enableEditor(): void {
    if (this.isEditorMode) return;
    this.isEditorMode = true;

    let mode = (typeof window !== 'undefined' && (window as any).__visualDesignerMode) || null;
    if (!mode) {
      mode = localStorage.getItem('designerModeType') || null;
    }

    this.editorFrame.create((msg) => this.handleEditorMessage(msg), mode, {
      guideId: this.guideId,
      templateId: this.templateId,
    });

    const isTagMode = mode === 'tag-page' || mode === 'tag-feature';
    // For guide mode, do NOT auto-activate selector; user must click Re-Select / Select element.
    // For tag modes, selector is activated on demand via TAG_FEATURE_CLICKED.

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

  getGuideId(): string | null {
    return this.guideId;
  }

  getTemplateId(): string | null {
    return this.templateId;
  }

  async fetchGuides(): Promise<void> {
    try {
      const currentPage = getCurrentPage();
      const response = await apiClient.get<GuideByIdResponse>(`/guides?target_page=${encodeURIComponent(currentPage)}`);
      if (response && response.data) {
        this.fetchedGuides = Array.isArray(response.data) ? response.data : [response.data as any];
        console.log('[Visual Designer] Fetched guides for page:', currentPage, this.fetchedGuides);
      }
    } catch (error) {
      console.error('[Visual Designer] Error fetching guides:', error);
    }
  }

  private _getStorageItem(key: string): any {
    if (typeof window === 'undefined') return null;
    try {
      const val = localStorage.getItem(key);
      if (val === null || val === undefined) return null;
      try {
        return JSON.parse(val);
      } catch {
        return val;
      }
    } catch {
      return null;
    }
  }

  private _getIdentity() {
    return {
      visitor_id: this._getStorageItem('__rg_visitor_id'),
      account_id: this._getStorageItem('__rg_account_id'),
      session_id: this._getStorageItem('__rg_session_id'),
    };
  }

  private _getDeviceContext() {
    if (typeof window === 'undefined') return {};

    const ua = navigator.userAgent;
    let browserName = 'Unknown';
    let browserVersion = 'Unknown';
    if (ua.indexOf('Chrome') > -1 && ua.indexOf('Edg') === -1) {
      browserName = 'Chrome';
      browserVersion = ua.match(/Chrome\/([\d.]+)/)?.[1] || 'Unknown';
    } else if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) {
      browserName = 'Safari';
      browserVersion = ua.match(/Version\/([\d.]+)/)?.[1] || 'Unknown';
    } else if (ua.indexOf('Firefox') > -1) {
      browserName = 'Firefox';
      browserVersion = ua.match(/Firefox\/([\d.]+)/)?.[1] || 'Unknown';
    } else if (ua.indexOf('Edg') > -1) {
      browserName = 'Edge';
      browserVersion = ua.match(/Edg\/([\d.]+)/)?.[1] || 'Unknown';
    }

    let osName = 'Unknown';
    let osVersion = 'Unknown';
    if (ua.indexOf('Win') > -1) {
      osName = 'Windows';
      if (ua.indexOf('Windows NT 10.0') > -1) osVersion = '10';
    } else if (ua.indexOf('Mac') > -1) {
      osName = 'macOS';
      osVersion = ua.match(/Mac OS X ([\d_]+)/)?.[1]?.replace(/_/g, '.') || 'Unknown';
    } else if (ua.indexOf('Linux') > -1) {
      osName = 'Linux';
    } else if (ua.indexOf('Android') > -1) {
      osName = 'Android';
      osVersion = ua.match(/Android ([\d.]+)/)?.[1] || 'Unknown';
    } else if (ua.indexOf('iOS') > -1 || ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) {
      osName = 'iOS';
      osVersion = ua.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, '.') || 'Unknown';
    }

    return {
      device_type: /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua) ? 'mobile' : 'desktop',
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      browser_name: browserName,
      browser_version: browserVersion,
      os_name: osName,
      os_version: osVersion,
      user_agent: ua,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown',
    };
  }

  private _getPageContext() {
    if (typeof window === 'undefined') return {};
    return {
      page_url: window.location.href,
      page_title: document.title,
      page_path: window.location.pathname,
      page_hash: window.location.hash || null,
      page_query: window.location.search || null,
    };
  }

  async trackEvent(eventName: string, properties: Record<string, any> = {}): Promise<void> {
    await this.trackEventBatch([{ eventName, properties }]);
  }

  async trackEventBatch(events: { eventName: string; properties?: Record<string, any> }[]): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      const identity = this._getIdentity();
      const pageContext = this._getPageContext();

      // Calculate session duration if available
      let sessionDurationMs = 0;
      const sessionStart = this._getStorageItem('__rg_session_start');
      if (sessionStart) {
        const startTime = new Date(sessionStart).getTime();
        if (!isNaN(startTime)) {
          sessionDurationMs = Date.now() - startTime;
        }
      }

      // Get visitor email from traits
      const visitorTraits = this._getStorageItem('__rg_visitor_traits') || {};
      const visitorEmail = visitorTraits.email || null;

      const canonicalEvents = events.map(e => {
        const props = e.properties || {};
        return {
          event_id: 'evt_' + generateId(),
          event_type: 'guide',
          event_name: e.eventName,
          timestamp: timestamp,
          ingested_at: timestamp, // Simulating server-side ingestion time
          visitor_id: identity.visitor_id,
          account_id: identity.account_id,
          session_id: identity.session_id,
          page_url: pageContext.page_url,
          visitor_email: visitorEmail,
          session_duration_ms: sessionDurationMs,
          element_id: props.element_id || props.xpath || null,
          guide_id: props.guide_id || null,
          properties: props
        };
      });

      console.log('[Visual Designer] Tracking Batch:', canonicalEvents);

      await apiClient.post('/guide-events', {
        events: canonicalEvents
      });
    } catch (error) {
      console.error('[Visual Designer] Failed to track events:', error);
    }
  }

  private handlePageChange(): void {
    const newUrl = window.location.href;
    if (newUrl !== this.currentUrl) {
      this.currentUrl = newUrl;
      this.fetchGuides();
    }
  }

  private handleGlobalClick(event: MouseEvent): void {
    if (this.isEditorMode) return;

    // Log the click event
    console.log('[Visual Designer] Click Event:', event);

    const target = event.target as Element;
    if (!target) return;

    // Generate XPath of clicked element
    const xpath = SelectorEngine.getXPath(target);

    console.log('[Visual Designer] Clicked Element XPath:', xpath);

    // Compare with target_segment of fetched guides
    for (const guide of this.fetchedGuides) {
      console.log('Guide:', guide);
      if (guide.target_segment && guide.target_segment === xpath) {
        // Step 1: Only track triggered on click
        this.trackEvent('triggered', {
          guide_id: guide.guide_id,
          guide_name: guide.guide_name,
          xpath: xpath
        });

        // Trigger the guide display here (this will then trigger guide_template_shown via callback)
        this.guideRenderer.renderTriggeredGuide(guide);
      }
    }
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
      case 'HEATMAP_TOGGLE':
        this.handleHeatmapToggle((message as HeatmapToggleMessage).enabled);
        break;
      case 'FEATURES_FOR_HEATMAP':
        this.handleFeaturesForHeatmap((message as { type: 'FEATURES_FOR_HEATMAP'; features: FeatureItem[] }).features);
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

  private handleHeatmapToggle(enabled: boolean): void {
    this.heatmapEnabled = enabled;
    try {
      localStorage.setItem('designerHeatmapEnabled', String(enabled));
    } catch {
      // ignore
    }
    this.renderFeatureHeatmap();
  }

  private handleFeaturesForHeatmap(features: FeatureItem[]): void {
    this.featuresForHeatmap = features.map((f) => {
      const xpathRule = f.rules?.find(
        (r) => r.selector_type === 'xpath' && (r.selector_value ?? '').trim() !== ''
      );
      let selector = (xpathRule?.selector_value ?? '').trim();
      if (selector && selector.startsWith('/body')) {
        selector = '/html[1]' + selector;
      }
      return {
        id: f.feature_id,
        featureName: f.name,
        selector,
        url: '',
      };
    });
    this.renderFeatureHeatmap();
  }

  private getTaggedFeatures(): TaggedFeature[] {
    return this.featuresForHeatmap;
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

    // Page change detection for SPAs
    window.addEventListener('popstate', () => this.handlePageChange());

    // Patch pushState/replaceState
    const originalPushState = history.pushState;
    if (originalPushState) {
      history.pushState = (...args: any[]) => {
        originalPushState.apply(history, args as any);
        this.handlePageChange();
      };
    }

    const originalReplaceState = history.replaceState;
    if (originalReplaceState) {
      history.replaceState = (...args: any[]) => {
        originalReplaceState.apply(history, args as any);
        this.handlePageChange();
      };
    }

    // Global click listener for guide triggering
    document.addEventListener('click', (e) => this.handleGlobalClick(e), true);
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

  private injectGlobalProtectionStyles(): void {
    if (this.styleInjected || typeof document === 'undefined') return;

    const style = document.createElement('style');
    style.id = 'designer-protection-styles';
    style.textContent = `
    #designer-editor-frame {
      pointer-events: auto !important;
      position: fixed !important;
      z-index: 2147483647 !important;
    }

    #designer-editor-drag-handle {
      pointer-events: auto !important;
      position: fixed !important;
      z-index: 2147483647 !important;
    }
  `;

    document.head.appendChild(style);
    this.styleInjected = true;
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
