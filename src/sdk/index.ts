import { DesignerSDK } from './core/DesignerSDK';
import type { SDKConfig } from './types';
import { apiClient, IUD_STORAGE_KEY } from './api/client';
// @ts-ignore
import rg from '../rg-web-sdk/index.js';

export { DesignerSDK };
export { apiClient };
export { rg }; // Exporting the analytics instance as well
export type { Guide, SDKConfig, GuideTargeting } from './types';

let designerInstance: DesignerSDK | null = null;
let isSnippetMode = false;
const GUIDE_ID_STORAGE_KEY = 'designerGuideId';
const TEMPLATE_ID_STORAGE_KEY = 'designerTemplateId';

/** guide_id / template_id from URL; passed into SDK on init; backup from localStorage */
let urlGuideId: string | null = null;
let urlTemplateId: string | null = null;

function getStoredGuideId(): string | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(GUIDE_ID_STORAGE_KEY) : null;
  } catch {
    return null;
  }
}

function getStoredTemplateId(): string | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(TEMPLATE_ID_STORAGE_KEY) : null;
  } catch {
    return null;
  }
}

/**
 * Unified Initialize
 */
export function init(config?: SDKConfig): DesignerSDK {
  // 1. Initialize Analytics (rg-web-sdk)
  if (config?.apiKey) {
    rg.initialize(config);
  } else {
    console.warn('[Revgain] No apiKey found in config. Analytics will not start.');
  }

  // 2. Initialize Designer
  if (designerInstance) return designerInstance;
  designerInstance = new DesignerSDK({
    ...config,
    guideId: urlGuideId ?? config?.guideId ?? getStoredGuideId() ?? null,
    templateId: urlTemplateId ?? config?.templateId ?? getStoredTemplateId() ?? null,
  });
  designerInstance.init();

  return designerInstance;
}

/**
 * Unified Identify
 */
export function identify(visitor: any, account?: any): void {
  rg.identify(visitor, account);
  // Designer currently doesn't have its own identify but we could pass it here if needed
}

/**
 * Unified Track
 */
export function track(eventName: string, properties?: any): void {
  rg.track(eventName, properties);
}

export function getInstance(): DesignerSDK | null {
  return designerInstance;
}

export function _processQueue(queue: any[]): void {
  if (!queue || !Array.isArray(queue)) return;

  const calls = queue.splice(0, queue.length);
  calls.forEach((call) => {
    if (!call || !Array.isArray(call) || call.length === 0) return;
    const method = call[0];
    const args = call.slice(1);

    try {
      switch (method) {
        case 'initialize':
        case 'init':
          init(args[0] as SDKConfig);
          break;
        case 'identify':
          identify(args[0], args[1]);
          break;
        case 'track':
          track(args[0] as string, args[1]);
          break;
        case 'enableEditor':
          (designerInstance ?? init()).enableEditor();
          break;
        case 'disableEditor':
          designerInstance?.disableEditor();
          break;
        case 'loadGuides':
          designerInstance?.loadGuides();
          break;
        case 'getGuides':
          return designerInstance?.getGuides();
        default:
          // @ts-ignore
          if (typeof rg[method] === 'function') {
            // @ts-ignore
            rg[method](...args);
          } else {
            console.warn('[Revgain] Unknown snippet method:', method);
          }
      }
    } catch (error) {
      console.error('[Revgain] Error processing queued call:', method, error);
    }
  });
}

if (typeof window !== 'undefined') {
  const globalRG = (window as any).revgain || (window as any).visualDesigner;
  if (globalRG && Array.isArray(globalRG._q)) {
    isSnippetMode = true;

    // Attach methods to existing snippet proxy
    globalRG.init = init;
    globalRG.initialize = init;
    globalRG.identify = identify;
    globalRG.track = track;
    globalRG.enableEditor = () => (designerInstance ?? init()).enableEditor();
    globalRG.disableEditor = () => designerInstance?.disableEditor();
    globalRG.loadGuides = () => designerInstance?.loadGuides();
    globalRG.getGuides = () => designerInstance?.getGuides();
    globalRG.getInstance = getInstance;

    // Analytics methods
    globalRG.page = (name: string, props: any) => rg.page(name, props);
    globalRG.flush = () => rg.flush();
    globalRG.reset = () => rg.reset();

    _processQueue(globalRG._q);
  }

  try {
    const url = new URL(window.location.href);
    const designerParam = url.searchParams.get('designer');
    const modeParam = url.searchParams.get('mode');
    const designerIudParam = url.searchParams.get('iud');
    const guideIdParam = url.searchParams.get('guide_id');
    const templateIdParam = url.searchParams.get('template_id');

    if (designerParam === 'true' || guideIdParam != null || templateIdParam != null) {
      console.log('[Revgain] URL params detected:', { designerParam, modeParam, guideIdParam });
    }

    if (designerParam === 'true') {
      if (modeParam) {
        (window as any).__visualDesignerMode = modeParam;
        localStorage.setItem('designerModeType', modeParam);
      }
      localStorage.setItem('designerMode', 'true');
      if (designerIudParam) localStorage.setItem(IUD_STORAGE_KEY, designerIudParam);
      if (guideIdParam != null) {
        urlGuideId = guideIdParam;
        localStorage.setItem(GUIDE_ID_STORAGE_KEY, guideIdParam);
      }
      if (templateIdParam != null) {
        urlTemplateId = templateIdParam;
        localStorage.setItem(TEMPLATE_ID_STORAGE_KEY, templateIdParam);
      }
      url.searchParams.delete('designer');
      url.searchParams.delete('mode');
      url.searchParams.delete('iud');
      url.searchParams.delete('guide_id');
      url.searchParams.delete('template_id');
      window.history.replaceState({}, '', url.toString());
      (window as any).__visualDesignerWasLaunched = true;
    }
  } catch {
    // ignore
  }
}

// Auto-initialize if designer mode active
if (typeof window !== 'undefined' && !designerInstance && !isSnippetMode) {
  const isDesignerActive = localStorage.getItem('designerMode') === 'true';
  const doInit = () => {
    if (!designerInstance && isDesignerActive) init();
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', doInit);
  } else {
    doInit();
  }
}

// Expose unified Revgain global
if (typeof window !== 'undefined') {
  const Revgain = {
    init,
    initialize: init,
    identify,
    track,
    page: (name: string, props: any) => rg.page(name, props),
    flush: () => rg.flush(),
    reset: () => rg.reset(),
    getInstance,
    DesignerSDK,
    apiClient,
    _processQueue,
    getGuideId: () => getInstance()?.getGuideId() ?? null,
    getTemplateId: () => getInstance()?.getTemplateId() ?? null,
    enableEditor: () => (designerInstance ?? init()).enableEditor(),
    disableEditor: () => designerInstance?.disableEditor(),
    analytics: rg,
  };
  (window as any).revgain = Revgain;
  (window as any).VisualDesigner = Revgain; // Alias for backward compatibility
}

