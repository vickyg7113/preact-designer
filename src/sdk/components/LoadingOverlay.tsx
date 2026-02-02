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
        background: 'rgba(248, 250, 252, 0.97)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
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
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2.5rem 3rem',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.04)',
          minWidth: '220px',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            border: '3px solid #e2e8f0',
            borderTopColor: SDK_STYLES.primary,
            borderRadius: '50%',
            animation: 'vd-spin 0.8s linear infinite',
            marginBottom: '1.5rem',
          }}
        />
        <div
          style={{
            fontSize: '1rem',
            fontWeight: 600,
            color: '#1e293b',
            letterSpacing: '-0.02em',
            marginBottom: '0.25rem',
          }}
        >
          Loading editor
        </div>
        <div
          style={{
            fontSize: '0.8125rem',
            color: '#64748b',
            fontWeight: 500,
          }}
        >
          <span style={{ animation: 'vd-dot1 1.4s ease-in-out infinite' }}>.</span>
          <span style={{ animation: 'vd-dot2 1.4s ease-in-out infinite' }}>.</span>
          <span style={{ animation: 'vd-dot3 1.4s ease-in-out infinite' }}>.</span>
        </div>
      </div>
      <style>{`
        @keyframes vd-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes vd-dot1 {
          0%, 20% { opacity: 0.2; }
          40%, 100% { opacity: 1; }
        }
        @keyframes vd-dot2 {
          0%, 20%, 40% { opacity: 0.2; }
          60%, 100% { opacity: 1; }
        }
        @keyframes vd-dot3 {
          0%, 20%, 40%, 60% { opacity: 0.2; }
          80%, 100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
