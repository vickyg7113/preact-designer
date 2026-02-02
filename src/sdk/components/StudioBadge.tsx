import { SDK_STYLES } from '../styles/constants';

export function StudioBadge() {
  return (
    <div
      id="designer-studio-badge"
      style={{
        position: 'fixed',
        top: '4px',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '0px 10px 3px',
        background: SDK_STYLES.primary,
        color: SDK_STYLES.bg,
        fontSize: '14px',
        fontWeight: '600',
        fontFamily: SDK_STYLES.fontFamily,
        borderRadius: '0 0 6px 6px',
        border: `5px solid ${SDK_STYLES.primary}`,
        borderTop: 'none',
        zIndex: SDK_STYLES.zIndex.badge,
        boxShadow: `0 4px 12px rgba(59, 130, 246, 0.3)`,
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      Revgain Visual Design Studio
    </div>
  );
}
