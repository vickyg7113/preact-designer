import type { Guide } from '../types';
import { SDK_STYLES } from '../styles/constants';

interface GuideTooltipProps {
  guide: Guide;
  top: number;
  left: number;
  arrowStyle: Record<string, string>;
  onDismiss: () => void;
}

export function GuideTooltip({ guide, top, left, arrowStyle, onDismiss }: GuideTooltipProps) {
  return (
    <div
      className="designer-guide-tooltip"
      data-guide-id={guide.id}
      style={{
        position: 'absolute',
        background: SDK_STYLES.bg,
        border: `2px solid ${SDK_STYLES.primary}`,
        borderRadius: SDK_STYLES.borderRadius,
        padding: '12px 16px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
        zIndex: SDK_STYLES.zIndex.tooltip,
        maxWidth: 300,
        fontFamily: SDK_STYLES.fontFamily,
        fontSize: 14,
        lineHeight: 1.5,
        color: SDK_STYLES.text,
        top: `${top}px`,
        left: `${left}px`,
        pointerEvents: 'auto',
      }}
    >
      <div style={{ marginBottom: 8 }}>{guide.content}</div>
      <button
        type="button"
        onClick={onDismiss}
        style={{
          background: SDK_STYLES.primary,
          color: SDK_STYLES.bg,
          border: 'none',
          borderRadius: 4,
          padding: '6px 12px',
          fontSize: 12,
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'background 0.2s',
        }}
      >
        Got it
      </button>
      <div
        className="designer-guide-arrow"
        style={{
          position: 'absolute',
          width: 0,
          height: 0,
          borderStyle: 'solid',
          ...arrowStyle,
        }}
      />
    </div>
  );
}
