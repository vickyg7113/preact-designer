import { SDK_STYLES } from '../styles/constants';

interface HighlightOverlayProps {
  visible: boolean;
  rect: { left: number; top: number; width: number; height: number } | null;
}

export function HighlightOverlay({ visible, rect }: HighlightOverlayProps) {
  if (!visible || !rect) return null;

  const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollY = window.pageYOffset || document.documentElement.scrollTop;

  return (
    <div
      id="designer-highlight-overlay"
      style={{
        position: 'absolute',
        pointerEvents: 'none',
        border: `2px solid ${SDK_STYLES.primary}`,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        zIndex: SDK_STYLES.zIndex.highlight,
        transition: 'all 0.1s ease',
        boxSizing: 'border-box',
        left: rect.left + scrollX,
        top: rect.top + scrollY,
        width: rect.width,
        height: rect.height,
      }}
    />
  );
}
