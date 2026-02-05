import { render } from 'preact';
import type { TaggedFeature } from '../types';
import { SelectorEngine } from './SelectorEngine';
import { FeatureHeatmapOverlay, HEATMAP_COLORS } from '../components/FeatureHeatmapOverlay';
import { SDK_STYLES } from '../styles/constants';

/**
 * Feature Heatmap Renderer - Renders colored overlays on elements matching feature xpaths.
 * Uses all features with an xpath; highlights wherever that xpath matches on this page (no URL filter).
 */
export class FeatureHeatmapRenderer {
  private container: HTMLElement | null = null;
  private lastEnabled = false;

  render(features: TaggedFeature[], enabled: boolean): void {
    this.lastEnabled = enabled;
    this.clear();
    if (!enabled || features.length === 0) return;

    const featuresWithSelector = features.filter((f) => (f.selector || '').trim() !== '');

    this.ensureContainer();
    if (!this.container) return;

    const overlays = featuresWithSelector
      .map((feature, index) => {
        const el = SelectorEngine.findElement(feature.selector);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        const color = HEATMAP_COLORS[index % HEATMAP_COLORS.length];
        return { feature, rect, color };
      })
      .filter(Boolean) as { feature: TaggedFeature; rect: DOMRect; color: string }[];

    if (overlays.length === 0) return;

    render(
      <div
        id="designer-feature-heatmap-container"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
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
