import { SDK_STYLES } from '../styles/constants';

interface ExitEditorButtonProps {
  onExit: () => void;
}

export function ExitEditorButton({ onExit }: ExitEditorButtonProps) {
  const baseStyle: Record<string, string> = {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '10px 20px',
    background: SDK_STYLES.bg,
    border: `2px solid ${SDK_STYLES.primary}`,
    borderRadius: SDK_STYLES.borderRadius,
    color: SDK_STYLES.primary,
    fontSize: '14px',
    fontWeight: '600',
    fontFamily: SDK_STYLES.fontFamily,
    cursor: 'pointer',
    zIndex: String(SDK_STYLES.zIndex.controls),
    boxShadow: SDK_STYLES.shadow,
    transition: 'all 0.2s ease',
    pointerEvents: 'auto',
  };

  return (
    <button
      id="designer-exit-editor-btn"
      style={baseStyle}
      onClick={onExit}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = SDK_STYLES.primary;
        e.currentTarget.style.color = SDK_STYLES.bg;
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = SDK_STYLES.shadowHover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = SDK_STYLES.bg;
        e.currentTarget.style.color = SDK_STYLES.primary;
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = SDK_STYLES.shadow;
      }}
    >
      <iconify-icon icon="mdi:exit-to-app" style={{ verticalAlign: '-0.2em', marginRight: '6px' }} />
      Exit Editor
    </button>
  );
}
