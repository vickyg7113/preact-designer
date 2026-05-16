import { useMemo, useRef, useLayoutEffect, useState } from 'preact/hooks';
import type { GuideTemplateMapItem, GuideTemplateContent } from '../types';
import { resolveStepContent } from '../utils/dom';
import { SDK_STYLES } from '../styles/constants';
import { BlockRenderer } from './GuideModal';

const DEFAULT_DESCRIPTION = 'Description';

export function parseTemplateContent(content: string): GuideTemplateContent {
    try {
        return JSON.parse(content || '{}') as GuideTemplateContent;
    } catch {
        return { description: DEFAULT_DESCRIPTION };
    }
}

const previewBoxStyle: Record<string, string | number> = {
    background: '#FFFFFF',
    borderRadius: '8px',
    border: '1px solid #1855BC',
    boxShadow: '0px 2px 8px 0.4px #0000001C',
    paddingTop: '16px',
    paddingRight: '12px',
    paddingBottom: '16px',
    paddingLeft: '12px',
    minWidth: '420px',
    fontFamily: 'Montserrat, sans-serif',
};


interface LiveGuideCardProps {
    template: GuideTemplateMapItem;
    top: number;
    left: number;
    placement?: 'top' | 'right' | 'bottom' | 'left';
    onDismiss: () => void;
    onNext: () => void;
    onBack: () => void;
    isFirstStep: boolean;
    isLastStep: boolean;
    onPollChange?: (blockId: string, pollType: string, question: string, value: string) => void;
    surveyMode?: boolean;
    targetRect?: DOMRect;
    stepIndex?: number;
    totalSteps?: number;
}

export function LiveGuideCard({ template, top, left, placement = 'bottom', onDismiss, onNext, onBack, isFirstStep, isLastStep, onPollChange, surveyMode, targetRect, stepIndex, totalSteps }: LiveGuideCardProps) {
    const content = useMemo(() => parseTemplateContent(resolveStepContent(template)), [template]);
    const templateKey = template.template?.template_key;

    const isTooltip = templateKey === 'tooltip-scratch' || !!template.x_path;

    const outerRef = useRef<HTMLDivElement>(null);
    const [resolvedTop, setResolvedTop] = useState(top);
    const [resolvedLeft, setResolvedLeft] = useState(left);

    useLayoutEffect(() => {
        if (!outerRef.current || !targetRect) {
            setResolvedTop(top);
            setResolvedLeft(left);
            return;
        }
        const h = outerRef.current.offsetHeight;
        const w = outerRef.current.offsetWidth;
        const gap = 12;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        let t: number;
        let l: number;
        switch (placement) {
            case 'top':
                t = targetRect.top - h - gap;
                l = targetRect.left + targetRect.width / 2 - w / 2;
                break;
            case 'bottom':
                t = targetRect.bottom + gap;
                l = targetRect.left + targetRect.width / 2 - w / 2;
                break;
            case 'left':
                t = targetRect.top + targetRect.height / 2 - h / 2;
                l = targetRect.left - w - gap;
                break;
            case 'right':
            default:
                t = targetRect.top + targetRect.height / 2 - h / 2;
                l = targetRect.right + gap;
                break;
        }
        if (l < 10) l = 10;
        else if (l + w > vw - 10) l = vw - w - 10;
        if (t < 10) t = 10;
        else if (t + h > vh - 10) t = vh - h - 10;
        setResolvedTop(t);
        setResolvedLeft(l);
    }, [placement, targetRect, top, left]);

    const arrowPad = isTooltip ? 16 : 0;

    return (
        <div
            ref={outerRef}
            style={{
                position: 'absolute',
                top: `${resolvedTop}px`,
                left: `${resolvedLeft}px`,
                zIndex: SDK_STYLES.zIndex.tooltip,
                pointerEvents: 'auto',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                willChange: 'top, left',
            }}
        >
            <div style={{
                position: 'relative',
                width: '100%',
                margin: '0 auto',
                paddingTop: placement === 'bottom' ? arrowPad : 0,
                paddingBottom: placement === 'top' ? arrowPad : 0,
                paddingLeft: placement === 'right' ? arrowPad : 0,
                paddingRight: placement === 'left' ? arrowPad : 0,
            }}>
                {isTooltip && (
                    <div
                        style={{
                            position: 'absolute',
                            ...(placement === 'bottom' && { top: -24, left: '50%', transform: 'translateX(-50%)' }),
                            ...(placement === 'top'    && { bottom: -24, left: '50%', transform: 'translateX(-50%)' }),
                            ...(placement === 'right'  && { left: -24, top: '50%', transform: 'translateY(-50%)' }),
                            ...(placement === 'left'   && { right: -24, top: '50%', transform: 'translateY(-50%)' }),
                            display: 'flex',
                            justifyContent: 'center',
                        }}
                    >
                        <iconify-icon
                            icon={
                                placement === 'bottom' ? 'iconamoon:arrow-up-2-light' :
                                placement === 'top'    ? 'iconamoon:arrow-down-2-light' :
                                placement === 'right'  ? 'iconamoon:arrow-left-2-light' :
                                                         'iconamoon:arrow-right-2-light'
                            }
                            style={{ fontSize: 44, color: '#1855BC' }}
                        />
                    </div>
                )}
                {isTooltip ? (() => {
                    // Extract title: from content.title or first title-styled block
                    const titleBlock = content.blocks?.find(b => b.type === 'text' && b.settings?.themeStyle === 'title');
                    const cardTitle = content.title || titleBlock?.settings?.content || '';
                    // Extract description: from content.description or first non-title text block
                    const descBlock = content.blocks?.find(b => b.type === 'text' && b.settings?.themeStyle !== 'title');
                    const cardDescription = descBlock?.settings?.content || '';

                    return (
                        <div style={{ position: 'relative', ...previewBoxStyle }}>
                            {/* Close */}
                            <div
                                onClick={onDismiss}
                                style={{
                                    position: 'absolute', top: -10, right: -10,
                                    width: 22, height: 22, display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                    color: '#9ca3af', cursor: 'pointer',
                                    background: '#fff', borderRadius: 9999,
                                }}
                            >
                                <iconify-icon icon="mdi:close-circle" style={{ fontSize: 22 }} />
                            </div>

                            {/* Header: title + CTA */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1855BC', margin: 0, lineHeight: 1.3 }}>
                                    {cardTitle}
                                </h3>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onNext(); }}
                                    style={{
                                        flexShrink: 0, background: '#007AFF', color: '#fff',
                                        padding: '6px 20px', border: 'none', borderRadius: 9999,
                                        fontWeight: 600, fontSize: 13, cursor: 'pointer',
                                        whiteSpace: 'nowrap', boxShadow: '0 1px 3px rgba(0,122,255,0.3)',
                                        fontFamily: 'inherit',
                                    }}
                                >
                                    {isLastStep ? 'Done' : (content.buttonContent || 'Next')}
                                </button>
                            </div>

                            {/* Description */}
                            {cardDescription && (
                                <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.6, margin: '10px 0 8px' }}>
                                    {cardDescription}
                                </p>
                            )}

                            {/* Footer: chevrons + step counter */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2, paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onBack(); }}
                                    disabled={isFirstStep}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: 'transparent', border: 'none', padding: '2px 4px',
                                        cursor: isFirstStep ? 'default' : 'pointer',
                                        color: '#6b7280', opacity: isFirstStep ? 0.3 : 1, lineHeight: 1,
                                    }}
                                >
                                    <iconify-icon icon="mdi:chevron-left" style={{ fontSize: 20 }} />
                                </button>
                                {stepIndex !== undefined && totalSteps !== undefined && (
                                    <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 500, minWidth: 32, textAlign: 'center' }}>
                                        {stepIndex}/{totalSteps}
                                    </span>
                                )}
                                <button
                                    onClick={(e) => { e.stopPropagation(); onNext(); }}
                                    disabled={isLastStep}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: 'transparent', border: 'none', padding: '2px 4px',
                                        cursor: isLastStep ? 'default' : 'pointer',
                                        color: '#6b7280', opacity: isLastStep ? 0.3 : 1, lineHeight: 1,
                                    }}
                                >
                                    <iconify-icon icon="mdi:chevron-right" style={{ fontSize: 20 }} />
                                </button>
                            </div>
                        </div>
                    );
                })() : (
                    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 8, ...previewBoxStyle }}>
                        <div
                            onClick={onDismiss}
                            style={{
                                position: 'absolute', top: 8, right: 8, width: 20, height: 20,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#6b7280', cursor: 'pointer',
                            }}
                        >
                            <iconify-icon icon="mdi:close" style={{ fontSize: 14 }} />
                        </div>
                        {content.blocks && content.blocks.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {(() => {
                                    const pollCount = content.blocks!.filter(b => b.type.startsWith('poll-')).length;
                                    return content.blocks!.map(block => (
                                        <BlockRenderer
                                            key={block.id}
                                            block={block}
                                            onNext={onNext}
                                            onBack={onBack}
                                            onDismiss={onDismiss}
                                            onAction={(url) => window.open(url, '_blank')}
                                            isFirstStep={isFirstStep}
                                            isLastStep={isLastStep}
                                            onPollChange={onPollChange}
                                            totalPollsInStep={pollCount}
                                            surveyMode={surveyMode}
                                        />
                                    ));
                                })()}
                            </div>
                        ) : (
                            <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.6, margin: 0 }}>
                                {content.description || DEFAULT_DESCRIPTION}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
