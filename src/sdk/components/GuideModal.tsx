import { useMemo, useState } from 'preact/hooks';
import { SDK_STYLES } from '../styles/constants';
import type { GuideTemplateContent, GuideBlock } from '../types';

interface GuideModalProps {
  content: string; // JSON string
  onDismiss: () => void;
  onNext: () => void;
  onBack: () => void;
  onAction: (url: string) => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

function BlockRenderer({ block, onNext, onBack, onDismiss, onAction, isFirstStep, isLastStep }: { 
  block: GuideBlock, 
  onNext: () => void, 
  onBack: () => void,
  onDismiss: () => void,
  onAction: (url: string) => void,
  isFirstStep: boolean, 
  isLastStep: boolean 
}) {
  const { type, settings } = block;
  const [selectedValue, setSelectedValue] = useState<number | null>(null);

  const fontStyle = { fontFamily: SDK_STYLES.fontFamily };

  switch (type) {
    case 'text':
      const isTitle = settings.themeStyle === 'title';
      return (
        <div style={{
          ...fontStyle,
          fontSize: isTitle ? '22px' : '15px',
          fontWeight: isTitle ? 700 : 400,
          color: isTitle ? SDK_STYLES.text : SDK_STYLES.textMuted,
          lineHeight: 1.4,
          margin: isTitle ? '0 0 12px 0' : '0 0 8px 0',
          textAlign: 'center'
        }}>
          {settings.content}
        </div>
      );
    case 'poll-scale':
      const min = settings.minValue ?? 1;
      const max = settings.maxValue ?? 5;
      const range = Array.from({ length: max - min + 1 }, (_, i) => min + i);

      return (
        <div style={{ ...fontStyle, display: 'flex', flexDirection: 'column', gap: '16px', padding: '12px 0' }}>
          {settings.question && (
            <h3 style={{ fontSize: '18px', fontWeight: 700, textAlign: 'center', margin: 0, color: SDK_STYLES.text }}>
              {settings.question}
            </h3>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
            {range.map((num) => (
              <div key={num} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={() => setSelectedValue(num)}
                  style={{
                    width: '100%',
                    aspectRatio: '1/1',
                    maxWidth: '50px',
                    borderRadius: '12px',
                    border: `1.5px solid ${selectedValue === num ? SDK_STYLES.primary : '#E2E8F0'}`,
                    backgroundColor: selectedValue === num ? `${SDK_STYLES.primary}15` : '#F8FAFC',
                    color: selectedValue === num ? SDK_STYLES.primary : '#64748B',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {num}
                </button>
                {settings.showLabels && settings.labels?.[num] && (
                  <span style={{ fontSize: '10px', fontWeight: 600, color: selectedValue === num ? SDK_STYLES.primary : '#94a3b8', textAlign: 'center' }}>
                    {settings.labels[num]}
                  </span>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={onNext}
              style={{
                backgroundColor: '#222',
                color: '#fff',
                padding: '12px 40px',
                borderRadius: '12px',
                border: 'none',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            >
              {settings.submitLabel || 'Submit'}
            </button>
          </div>
        </div>
      );

    case 'poll-text':
      return (
        <div style={{ ...fontStyle, display: 'flex', flexDirection: 'column', gap: '20px', padding: '12px 0' }}>
          {settings.question && (
            <div
              style={{
                ...fontStyle,
                fontSize: settings.themeStyle === 'title' ? '20px' : (settings.themeStyle === 'sub-title' ? '16px' : '14px'),
                fontWeight: (settings.themeStyle === 'title' || settings.themeStyle === 'sub-title') ? 700 : 500,
                color: settings.themeStyle === 'title' ? '#1855BC' : (settings.themeStyle === 'sub-title' ? '#222222' : '#475569'),
                textAlign: 'center',
                lineHeight: 1.6
              }}
              dangerouslySetInnerHTML={{ __html: settings.question }}
            />
          )}

          <div style={{ width: '100%' }}>
            <textarea
              placeholder={settings.placeholder || "Enter text here..."}
              style={{
                ...fontStyle,
                width: '100%',
                minHeight: '120px',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
                padding: '16px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#222222',
                outline: 'none',
                resize: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={onNext}
              style={{
                backgroundColor: '#222222',
                color: '#fff',
                padding: '12px 40px',
                borderRadius: '12px',
                border: 'none',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            >
              {settings.submitLabel || "Submit"}
            </button>
          </div>
        </div>
      );

    case 'poll-yes-no':
      return (
        <div style={{ ...fontStyle, display: 'flex', flexDirection: 'column', gap: '20px', padding: '12px 0' }}>
          {settings.question && (
            <h3 style={{ fontSize: '18px', fontWeight: 700, textAlign: 'center', margin: 0, color: '#222222', lineHeight: 1.2 }}>
              {settings.question}
            </h3>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={onNext}
              style={{
                flex: 1,
                maxWidth: '120px',
                backgroundColor: '#222222',
                color: '#fff',
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            >
              {settings.yesLabel || "Yes"}
            </button>
            <button
              onClick={onNext}
              style={{
                flex: 1,
                maxWidth: '120px',
                backgroundColor: '#222222',
                color: '#fff',
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            >
              {settings.noLabel || "No"}
            </button>
          </div>
        </div>
      );
    case 'button':
      const label = (settings.label || '').toLowerCase();
      const derivedAction = settings.action || 
                            (label === 'next' || label === 'finish' || label === 'thank you!' ? 'next' : 'next');

      return (
        <div style={{ display: 'flex', gap: '12px', width: '100%', margin: '8px 0' }}>
          {derivedAction === 'next' && !isFirstStep && (
            <button
              onClick={onBack}
              style={{
                flex: 1,
                padding: '12px 24px',
                borderRadius: '10px',
                border: `1.5px solid ${SDK_STYLES.border}`,
                backgroundColor: 'transparent',
                color: SDK_STYLES.text,
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Back
            </button>
          )}
          <button
            onClick={() => {
              if (derivedAction === 'next') onNext();
              else if (derivedAction === 'dismiss') onDismiss();
              else if (derivedAction === 'url' && settings.url) onAction(settings.url);
            }}
            style={{
              flex: 2,
              padding: '12px 24px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: SDK_STYLES.primary,
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)',
            }}
          >
            {settings.label || (isLastStep ? 'Finish' : 'Next')}
          </button>
        </div>
      );
    case 'image':
      return (
        <div style={{ width: '100%', backgroundColor: '#f1f5f9', display: 'flex', justifyContent: 'center', margin: '0 0 16px 0' }}>
          <img 
            src={settings.url} 
            alt="Guide Media" 
            style={{ width: '100%', maxHeight: '300px', objectFit: 'cover' }} 
          />
        </div>
      );
    case 'video':
      return (
        <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', margin: '0 0 16px 0' }}>
          <iframe
            src={settings.url}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
            allowFullScreen
          />
        </div>
      );
    case 'horizontal-line':
      return <hr style={{ border: 'none', borderTop: `1px solid ${SDK_STYLES.border}`, margin: '16px 0' }} />;
    default:
      return null;
  }
}

export function GuideModal({ 
  content: contentStr, 
  onDismiss, 
  onNext, 
  onBack,
  onAction,
  isFirstStep,
  isLastStep 
}: GuideModalProps) {
  const content = useMemo(() => {
    try {
      return JSON.parse(contentStr) as GuideTemplateContent;
    } catch (e) {
      return { title: 'Untitled' } as GuideTemplateContent;
    }
  }, [contentStr]);

  const overlayStyles = useMemo(() => {
    const layout = content.layout || {};

    type FlexAlign = 'flex-start' | 'center' | 'flex-end';
    const positionMap: Record<string, [FlexAlign, FlexAlign]> = {
      'center':       ['center',     'center'],
      'top':          ['flex-start', 'center'],
      'bottom':       ['flex-end',   'center'],
      'top-left':     ['flex-start', 'flex-start'],
      'top-right':    ['flex-start', 'flex-end'],
      'bottom-left':  ['flex-end',   'flex-start'],
      'bottom-right': ['flex-end',   'flex-end'],
    };

    let alignItems: FlexAlign = 'center';
    let justifyContent: FlexAlign = 'center';

    if (layout.position && positionMap[layout.position]) {
      [alignItems, justifyContent] = positionMap[layout.position];
    } else if (layout.verticalAlignment || layout.horizontalAlignment) {
      const legacyV: Record<string, FlexAlign> = { top: 'flex-start', center: 'center', bottom: 'flex-end' };
      const legacyH: Record<string, FlexAlign> = { left: 'flex-start', center: 'center', right: 'flex-end' };
      alignItems = legacyV[layout.verticalAlignment || 'center'] ?? 'center';
      justifyContent = legacyH[layout.horizontalAlignment || 'center'] ?? 'center';
    }

    return {
      position: 'fixed' as const,
      inset: 0,
      display: 'flex',
      alignItems,
      justifyContent,
      backgroundColor: content.backdropColor || 'rgba(0, 0, 0, 0.5)',
      zIndex: SDK_STYLES.zIndex.guides,
      pointerEvents: 'auto' as const,
      padding: '40px', // Prevent sticking to edges
      backdropFilter: 'blur(2px)',
      transition: 'all 0.3s ease-out',
    };
  }, [content]);

  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget && content.backdropDismiss !== false) {
      onDismiss();
    }
  };

  return (
    <div
      className="designer-guide-modal-overlay"
      onClick={handleBackdropClick}
      style={overlayStyles}
    >
      <div
        className="designer-guide-modal-card"
        style={{
          position: 'relative',
          width: '90%',
          maxWidth: '500px',
          backgroundColor: SDK_STYLES.bg,
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: SDK_STYLES.fontFamily,
          animation: 'designer-modal-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onDismiss}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748b',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            zIndex: 10,
          }}
        >
          <iconify-icon icon="mdi:close" style={{ fontSize: '20px' }} />
        </button>

        <div style={{ padding: '24px' }}>
          {content.blocks && content.blocks.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
               {content.blocks.map(block => (
                 <BlockRenderer 
                   key={block.id} 
                   block={block} 
                   onNext={onNext} 
                   onBack={onBack}
                   onDismiss={onDismiss}
                   onAction={onAction}
                   isFirstStep={isFirstStep}
                   isLastStep={isLastStep}
                 />
               ))}
            </div>
          ) : (
            /* Fallback Legacy Rendering */
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ margin: '0 0 12px 0', fontSize: '22px', fontWeight: 700, color: SDK_STYLES.text }}>
                {content.title}
              </h2>
              {content.body && <p style={{ margin: 0, fontSize: '15px', color: SDK_STYLES.textMuted }}>{content.body}</p>}
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                {!isFirstStep && (
                  <button
                    onClick={onBack}
                    style={{
                      flex: 1,
                      padding: '12px 24px',
                      borderRadius: '10px',
                      border: `1.5px solid ${SDK_STYLES.border}`,
                      backgroundColor: 'transparent',
                      color: SDK_STYLES.text,
                      fontSize: '15px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={onNext}
                  style={{
                    flex: 2,
                    padding: '12px 24px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: SDK_STYLES.primary,
                    color: '#ffffff',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)',
                  }}
                >
                  {isLastStep ? 'Finish' : (content.cta1Text || 'Next')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes designer-modal-in {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
