import { useMemo } from 'preact/hooks';
import { SDK_STYLES } from '../styles/constants';
import type { GuideTemplateContent } from '../types';
import { BlockRenderer } from './GuideModal';

interface GuideBannerProps {
  content: string;
  onDismiss: () => void;
  onNext: () => void;
  onBack: () => void;
  onAction: (url: string) => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  onPollChange?: (blockId: string, pollType: string, question: string, value: string) => void;
}

export function GuideBanner({
  content: contentStr,
  onDismiss,
  onNext,
  onBack,
  onAction,
  isFirstStep,
  isLastStep,
  onPollChange,
}: GuideBannerProps) {
  const content = useMemo<GuideTemplateContent>(() => {
    try { return JSON.parse(contentStr); } catch { return {}; }
  }, [contentStr]);

  const placement = content.layout?.position === 'bottom' ? 'bottom' : 'top';

  const bannerStyle: Record<string, any> = {
    position: 'fixed',
    [placement]: 0,
    left: 0,
    width: '100%',
    background: '#ffffff',
    borderTop: placement === 'bottom' ? `3px solid ${SDK_STYLES.primary}` : 'none',
    borderBottom: placement === 'top' ? `3px solid ${SDK_STYLES.primary}` : 'none',
    boxShadow: placement === 'top'
      ? '0 4px 16px rgba(0,0,0,0.10)'
      : '0 -4px 16px rgba(0,0,0,0.10)',
    zIndex: SDK_STYLES.zIndex.guides,
    fontFamily: SDK_STYLES.fontFamily,
    animation: placement === 'top' ? 'banner-slide-down 0.3s ease' : 'banner-slide-up 0.3s ease',
    pointerEvents: 'auto',
  };

  const blocks = content.blocks ?? [];
  const pollCount = blocks.filter(b => b.type.startsWith('poll-')).length;

  return (
    <>
      <style>{`
        @keyframes banner-slide-down {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
        @keyframes banner-slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
      <div style={bannerStyle}>
        <div style={{
          maxWidth: '960px',
          margin: '0 auto',
          padding: '12px 48px 12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          position: 'relative',
        }}>
          {blocks.length > 0 ? (
            blocks.map((block) => (
              <div key={block.id} style={{ flex: block.type === 'button' ? '0 0 auto' : '1 1 auto', minWidth: 0 }}>
                <BlockRenderer
                  block={block}
                  onNext={onNext}
                  onBack={onBack}
                  onDismiss={onDismiss}
                  onAction={onAction}
                  isFirstStep={isFirstStep}
                  isLastStep={isLastStep}
                  onPollChange={onPollChange}
                  totalPollsInStep={pollCount}
                />
              </div>
            ))
          ) : (
            <span style={{ fontSize: '14px', color: SDK_STYLES.textMuted, fontFamily: SDK_STYLES.fontFamily }}>
              Banner — add blocks to show content
            </span>
          )}

          {/* Close button */}
          <button
            onClick={onDismiss}
            style={{
              position: 'absolute',
              top: '50%',
              right: '12px',
              transform: 'translateY(-50%)',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: '#f1f5f9',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              flexShrink: 0,
            }}
          >
            <iconify-icon icon="mdi:close" style={{ fontSize: '16px' }} />
          </button>
        </div>
      </div>
    </>
  );
}
