import { useMemo } from 'preact/hooks';
import type { GuideTemplateMapItem } from '../types';
import { SDK_STYLES } from '../styles/constants';

const DEFAULT_TITLE = 'Template';
const DEFAULT_DESCRIPTION = 'Description';
const DEFAULT_BUTTON_CONTENT = 'Next';

export function parseTemplateContent(content: string): {
    title: string;
    description: string;
    buttonContent: string;
} {
    try {
        const parsed = JSON.parse(content || '{}') as Record<string, string>;
        return {
            title: parsed.title ?? DEFAULT_TITLE,
            description: parsed.description ?? DEFAULT_DESCRIPTION,
            buttonContent: parsed.buttonContent ?? DEFAULT_BUTTON_CONTENT,
        };
    } catch {
        return {
            title: DEFAULT_TITLE,
            description: DEFAULT_DESCRIPTION,
            buttonContent: DEFAULT_BUTTON_CONTENT,
        };
    }
}

const previewBoxStyle: Record<string, string | number> = {
    background: '#ffffff',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
    paddingTop: 24,
    paddingRight: 16,
    paddingBottom: 24,
    paddingLeft: 16,
    fontFamily: SDK_STYLES.fontFamily,
};

interface TourStyleCardContentProps {
    title?: string;
    description?: string;
    buttonContent?: string;
    onNext?: () => void;
}

function TourStyleCardContent({
    title = DEFAULT_TITLE,
    description = DEFAULT_DESCRIPTION,
    buttonContent = DEFAULT_BUTTON_CONTENT,
    onNext,
}: TourStyleCardContentProps) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 4, position: 'relative' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1855BC', lineHeight: 1.3, margin: 0 }}>
                {title}
            </h3>
            <p style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.4, margin: 0 }}>{description}</p>
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 4 }}>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onNext?.();
                    }}
                    style={{
                        display: 'inline-block',
                        background: '#007AFF',
                        color: '#fff',
                        padding: '6px 20px',
                        border: 'none',
                        borderRadius: 9999,
                        fontWeight: 600,
                        fontSize: 10,
                        cursor: 'pointer',
                        transition: 'opacity 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                >
                    {buttonContent}
                </button>
            </div>
        </div>
    );
}

interface LiveGuideCardProps {
    template: GuideTemplateMapItem;
    top: number;
    left: number;
    onDismiss: () => void;
    onNext: () => void;
}

export function LiveGuideCard({ template, top, left, onDismiss, onNext }: LiveGuideCardProps) {
    const content = useMemo(() => parseTemplateContent(template.template.content), [template.template.content]);
    const templateKey = template.template.template_key;

    const isTooltip = templateKey === 'tooltip-scratch';

    return (
        <div
            style={{
                position: 'absolute',
                top: `${top}px`,
                left: `${left}px`,
                zIndex: SDK_STYLES.zIndex.tooltip,
                pointerEvents: 'auto',
                maxWidth: 300,
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                willChange: 'top, left',
            }}
        >
            <div style={{ position: 'relative', width: '100%', margin: '0 auto', paddingTop: isTooltip ? 12 : 0 }}>
                {isTooltip && (
                    <div
                        style={{
                            position: 'absolute',
                            left: 16,
                            top: -24, // Adjusted for the 44px icon height to align better
                            display: 'flex',
                            justifyContent: 'center',
                        }}
                    >
                        <iconify-icon icon="iconamoon:arrow-up-2-light" style={{ fontSize: 44, color: '#1855BC' }} />
                    </div>
                )}
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 8, ...previewBoxStyle }}>
                    <div
                        onClick={onDismiss}
                        style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            width: 20,
                            height: 20,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#6b7280',
                            cursor: 'pointer'
                        }}
                    >
                        <iconify-icon icon="mdi:close" style={{ fontSize: 14 }} />
                    </div>
                    <TourStyleCardContent
                        title={content.title}
                        description={content.description}
                        buttonContent={content.buttonContent}
                        onNext={onNext}
                    />
                </div>
            </div>
        </div>
    );
}
