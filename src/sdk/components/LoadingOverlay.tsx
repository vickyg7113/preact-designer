import { SDK_STYLES } from '../styles/constants';

export function LoadingOverlay() {
  return (
    <div
      id="designer-loading-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(255, 255, 255, 0.95)',
        zIndex: SDK_STYLES.zIndex.loading,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: SDK_STYLES.fontFamily,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          border: '4px solid #e2e8f0',
          borderTopColor: SDK_STYLES.primary,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: 16,
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div
        style={{
          color: '#1e40af',
          fontSize: 16,
          fontWeight: 500,
          fontFamily: SDK_STYLES.fontFamily,
        }}
      >
        Loading Visual Designer...
      </div>
    </div>
  );
}
