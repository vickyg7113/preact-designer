import { SDK_STYLES } from '../styles/constants';

export function RedBorderOverlay() {
  return (
    <div
      id="designer-red-border-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        border: `5px solid ${SDK_STYLES.primary}`,
        pointerEvents: 'none',
        zIndex: SDK_STYLES.zIndex.highlight - 1,
        boxSizing: 'border-box',
      }}
    />
  );
}
