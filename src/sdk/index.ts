import { DesignerSDK } from './core/DesignerSDK';
import type { SDKConfig } from './types';
import { apiClient, IUD_STORAGE_KEY } from './api/client';

export { DesignerSDK };
export { apiClient };
export type { Guide, SDKConfig, GuideTargeting } from './types';

let sdkInstance: DesignerSDK | null = null;
let isSnippetMode = false;

export function init(config?: SDKConfig): DesignerSDK {
  if (sdkInstance) return sdkInstance;
  sdkInstance = new DesignerSDK(config);
  sdkInstance.init();
  return sdkInstance;
}

export function getInstance(): DesignerSDK | null {
  return sdkInstance;
}

export function _processQueue(queue: unknown[]): void {
  if (!queue || !Array.isArray(queue)) return;

  queue.forEach((call) => {
    if (!call || !Array.isArray(call) || call.length === 0) return;
    const method = call[0];
    const args = call.slice(1);

    try {
      switch (method) {
        case 'initialize':
          init(args[0] as SDKConfig);
          break;
        case 'identify':
          if (args[0]) console.log('[Visual Designer] identify (snippet) called with:', args[0]);
          break;
        case 'enableEditor':
          (sdkInstance ?? init()).enableEditor();
          break;
        case 'disableEditor':
          sdkInstance?.disableEditor();
          break;
        case 'loadGuides':
          sdkInstance?.loadGuides();
          break;
        case 'getGuides':
          return sdkInstance?.getGuides();
        default:
          console.warn('[Visual Designer] Unknown snippet method:', method);
      }
    } catch (error) {
      console.error('[Visual Designer] Error processing queued call:', method, error);
    }
  });
}

if (typeof window !== 'undefined') {
  const globalVD = (window as any).visualDesigner;
  if (globalVD && Array.isArray(globalVD._q)) {
    isSnippetMode = true;
    globalVD.initialize = (config?: SDKConfig | Record<string, unknown>) => init(config as SDKConfig);
    globalVD.identify = (user: unknown) => {
      if (user) console.log('[Visual Designer] identify (snippet) called with:', user);
    };
    globalVD.enableEditor = () => (sdkInstance ?? init()).enableEditor();
    globalVD.disableEditor = () => sdkInstance?.disableEditor();
    globalVD.loadGuides = () => sdkInstance?.loadGuides();
    globalVD.getGuides = () => sdkInstance?.getGuides();
    globalVD.getInstance = getInstance;
    globalVD.init = init;
    _processQueue(globalVD._q);
  }

  try {
    const url = new URL(window.location.href);
    const designerParam = url.searchParams.get('designer');
    const modeParam = url.searchParams.get('mode');
    const designerIudParam = url.searchParams.get('iud');

    if (designerParam === 'true') {
      if (modeParam) {
        (window as any).__visualDesignerMode = modeParam;
        localStorage.setItem('designerModeType', modeParam);
      }
      localStorage.setItem('designerMode', 'true');
      if (designerIudParam) localStorage.setItem(IUD_STORAGE_KEY, designerIudParam);
      url.searchParams.delete('designer');
      url.searchParams.delete('mode');
      url.searchParams.delete('iud');
      window.history.replaceState({}, '', url.toString());
      (window as any).__visualDesignerWasLaunched = true;
    }
  } catch {
    // ignore
  }
}

if (typeof window !== 'undefined' && !sdkInstance && !isSnippetMode) {
  const doInit = () => {
    if (!sdkInstance) init();
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', doInit);
  } else {
    doInit();
  }
}

if (typeof window !== 'undefined') {
  (window as any).VisualDesigner = {
    init,
    initialize: init,
    getInstance,
    DesignerSDK,
    apiClient,
    _processQueue,
  };
}
