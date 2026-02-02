import { render } from 'preact';
import type { TaggedFeature } from '../types';
import { SelectorEngine } from './SelectorEngine';
import { FeatureHeatmapOverlay, HEATMAP_COLORS } from '../components/FeatureHeatmapOverlay';
import { SDK_STYLES } from '../styles/constants';

function normalizeUrl(url: string): string {
  return (url || '').replace(/^https?:\/\//i, '').replace(/\/$/, '').trim() || '';
}

function getCurrentUrl(): string {
  try {
    return window.location.href || '';
  } catch {
    return '';
  }
}

/**
 * Feature Heatmap Renderer - Renders colored overlays on tagged features using Preact
 */
export class FeatureHeatmapRenderer {
  private container: HTMLElement | null = null;
  private lastEnabled = false;

  render(features: TaggedFeature[], enabled: boolean): void {
    this.lastEnabled = enabled;
    this.clear();
    if (!enabled || features.length === 0) return;

    const currentUrl = getCurrentUrl();
    const normalized = normalizeUrl(currentUrl);
    const pageFeatures = features.filter((f) => f.url && normalizeUrl(f.url) === normalized);

    if (pageFeatures.length === 0) return;

    this.ensureContainer();
    if (!this.container) return;

    const overlays = pageFeatures
      .map((feature, index) => {
        const el = SelectorEngine.findElement(feature.selector);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        const color = HEATMAP_COLORS[index % HEATMAP_COLORS.length];
        return { feature, rect, color };
      })
      .filter(Boolean) as { feature: TaggedFeature; rect: DOMRect; color: string }[];

    render(
      <div
        id="designer-feature-heatmap-container"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: SDK_STYLES.zIndex.overlay - 1,
        }}
      >
        {overlays.map(({ feature, rect, color }) => (
          <FeatureHeatmapOverlay
            key={feature.id}
            feature={feature}
            color={color}
            rect={{
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
            }}
          />
        ))}
      </div>,
      this.container
    );
  }

  updatePositions(features: TaggedFeature[]): void {
    this.render(features, this.lastEnabled);
  }

  clear(): void {
    if (this.container) {
      render(null, this.container);
    }
  }

  destroy(): void {
    this.clear();
    this.container?.remove();
    this.container = null;
  }

  private ensureContainer(): void {
    if (this.container) return;
    if (!document.body) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.ensureContainer());
        return;
      }
      setTimeout(() => this.ensureContainer(), 100);
      return;
    }
    this.container = document.createElement('div');
    this.container.id = 'designer-feature-heatmap-root';
    document.body.appendChild(this.container);
  }
}
