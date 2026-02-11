import { useMemo } from 'preact/hooks';
import type { GuideTemplateMapItem, GuideTemplateNested } from '../../types';
import { editorStyles } from '../editorStyles';

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

export function getTemplateKeyFromTemplate(template: GuideTemplateNested): string {
  return template?.template_key ?? '';
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
  fontFamily: editorStyles.root.fontFamily as string,
};

export interface TourStyleCardContentProps {
  title?: string;
  description?: string;
  buttonContent?: string;
}

export function TourStyleCardContent({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  buttonContent = DEFAULT_BUTTON_CONTENT,
}: TourStyleCardContentProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 4, position: 'relative' }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1855BC', lineHeight: 1.3, margin: 0 }}>
        {title}
      </h3>
      <p style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.4, margin: 0 }}>{description}</p>
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 4 }}>
        <span
          style={{
            display: 'inline-block',
            background: '#007AFF',
            color: '#fff',
            padding: '6px 12px',
            borderRadius: 9999,
            fontWeight: 600,
            fontSize: 10,
          }}
        >
          {buttonContent}
        </span>
      </div>
    </div>
  );
}

export function LightboxPreview(props: TourStyleCardContentProps) {
  return (
    <div style={{ position: 'relative', width: '100%', margin: '0 auto' }}>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 8, ...previewBoxStyle }}>
        <div
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
          }}
        >
          <iconify-icon icon="mdi:close" style={{ fontSize: 14 }} />
        </div>
        <TourStyleCardContent {...props} />
      </div>
    </div>
  );
}

export function TooltipPreview(props: TourStyleCardContentProps) {
  return (
    <div style={{ position: 'relative', width: '100%', margin: '0 auto', paddingTop: 12 }}>
      <div
        style={{
          position: 'absolute',
          left: 16,
          top: -15,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <iconify-icon icon="iconamoon:arrow-up-2-light" style={{ fontSize: 44, color: '#1855BC' }} />
      </div>
      <div style={{ position: 'relative', marginTop: 0, display: 'flex', flexDirection: 'column', gap: 8, ...previewBoxStyle }}>
        <div
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
          }}
        >
          <iconify-icon icon="mdi:close" style={{ fontSize: 14 }} />
        </div>
        <TourStyleCardContent {...props} />
      </div>
    </div>
  );
}

export interface LayoutTemplateCardProps {
  item: GuideTemplateMapItem;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

export function LayoutTemplateCard({
  item,
  selected = false,
  onClick,
  disabled = false,
}: LayoutTemplateCardProps) {
  const template = item.template;
  const templateKey = useMemo(() => getTemplateKeyFromTemplate(template), [template]);
  const content = useMemo(() => parseTemplateContent(template.content), [template.content]);
  const PreviewComponent = templateKey === 'tooltip-scratch' ? TooltipPreview : LightboxPreview;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        padding: '12px',
        margin: 0,
        border: selected ? '2px solid #3b82f6' : '1px solid #e2e8f0',
        borderRadius: 12,
        background: selected ? 'rgba(59, 130, 246, 0.06)' : '#fff',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.7 : 1,
        textAlign: 'left',
        overflow: 'hidden',
      }}
    >
      <PreviewComponent
        title={content.title}
        description={content.description}
        buttonContent={content.buttonContent}
      />
      {template.title && (
        <div
          style={{
            padding: '8px 12px',
            fontSize: 12,
            fontWeight: 500,
            color: '#475569',
            borderTop: '1px solid #f1f5f9',
          }}
        >
          {template.title}
        </div>
      )}
    </button>
  );
}
