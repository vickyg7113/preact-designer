import type { TaggedFeature } from '../types';
import { SDK_STYLES } from '../styles/constants';

const HEATMAP_COLORS = [
  'rgba(251, 191, 36, 0.35)',
  'rgba(34, 197, 94, 0.35)',
  'rgba(249, 115, 22, 0.35)',
];

interface FeatureHeatmapOverlayProps {
  feature: TaggedFeature;
  color: string;
  rect: { left: number; top: number; width: number; height: number };
}

export function FeatureHeatmapOverlay({ feature, color, rect }: FeatureHeatmapOverlayProps) {
  return (
    <div
      className="designer-feature-heatmap-overlay"
      title={feature.featureName}
      style={{
        position: 'fixed',
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        backgroundColor: color,
        pointerEvents: 'none',
        zIndex: SDK_STYLES.zIndex.overlay,
        boxSizing: 'border-box',
        borderRadius: 4,
        border: `2px solid ${color}`,
      }}
    />
  );
}

export { HEATMAP_COLORS };
