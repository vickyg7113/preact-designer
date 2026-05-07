import type { ComponentChildren } from 'preact';
import type { GuideBlock } from '../../types';
import { EDITOR_FONT_FAMILY, editorStyles } from '../editorStyles';

const BLOCK_NAMES: Record<string, string> = {
  text: 'Text',
  image: 'Image',
  button: 'Button',
  'horizontal-line': 'Horizontal Line',
  video: 'Video',
  'poll-text': 'Open Text Poll',
  'poll-yes-no': 'Yes/No Poll',
  'poll-scale': 'Number Scale Poll',
};

interface BlockSettingsPanelProps {
  block: GuideBlock;
  onUpdate: (id: string, settings: Record<string, any>) => void;
  onCancel: () => void;
  onDone: () => void;
}

function Field({ label, children }: { label: string; children: ComponentChildren }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{
        display: 'block',
        fontSize: '0.7rem',
        fontWeight: 600,
        color: '#64748b',
        marginBottom: '0.35rem',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        fontFamily: EDITOR_FONT_FAMILY,
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: Record<string, any> = {
  ...editorStyles.input,
  boxSizing: 'border-box',
  fontSize: '0.85rem',
  padding: '0.55rem 0.75rem',
};

const textareaStyle: Record<string, any> = {
  ...editorStyles.textarea,
  boxSizing: 'border-box',
  fontSize: '0.85rem',
  padding: '0.55rem 0.75rem',
  minHeight: 'unset',
};

const selectStyle: Record<string, any> = {
  width: '100%',
  padding: '0.55rem 0.75rem',
  border: '1px solid #e2e8f0',
  borderRadius: '0.625rem',
  fontSize: '0.85rem',
  color: '#334155',
  background: '#fff',
  fontFamily: EDITOR_FONT_FAMILY,
  boxSizing: 'border-box',
};

export function BlockSettingsPanel({ block, onUpdate, onCancel, onDone }: BlockSettingsPanelProps) {
  const s = block.settings;
  const set = (key: string, value: any) => onUpdate(block.id, { ...s, [key]: value });

  const renderSettings = () => {
    switch (block.type) {
      case 'text':
        return (
          <>
            <Field label="Theme Style">
              <select value={s.themeStyle || 'body'} onChange={(e) => set('themeStyle', (e.target as HTMLSelectElement).value)} style={selectStyle}>
                <option value="title">Title</option>
                <option value="sub-title">Sub Title</option>
                <option value="body">Body</option>
              </select>
            </Field>
            <Field label="Content">
              <textarea
                value={s.content || ''}
                onInput={(e) => set('content', (e.target as HTMLTextAreaElement).value)}
                placeholder="Enter your text here"
                rows={4}
                style={textareaStyle}
              />
            </Field>
          </>
        );

      case 'button':
        return (
          <>
            <Field label="Label">
              <input type="text" value={s.label || ''} onInput={(e) => set('label', (e.target as HTMLInputElement).value)} placeholder="Continue" style={inputStyle} />
            </Field>
            <Field label="Action">
              <select value={s.action || 'next'} onChange={(e) => set('action', (e.target as HTMLSelectElement).value)} style={selectStyle}>
                <option value="next">Next / Finish</option>
                <option value="dismiss">Dismiss</option>
                <option value="url">Open URL</option>
              </select>
            </Field>
            {s.action === 'url' && (
              <Field label="URL">
                <input type="text" value={s.url || ''} onInput={(e) => set('url', (e.target as HTMLInputElement).value)} placeholder="https://..." style={inputStyle} />
              </Field>
            )}
          </>
        );

      case 'image':
        return (
          <Field label="Image URL">
            <input type="text" value={s.url || ''} onInput={(e) => set('url', (e.target as HTMLInputElement).value)} placeholder="https://..." style={inputStyle} />
          </Field>
        );

      case 'video':
        return (
          <Field label="Video Embed URL">
            <input type="text" value={s.url || ''} onInput={(e) => set('url', (e.target as HTMLInputElement).value)} placeholder="https://youtube.com/embed/..." style={inputStyle} />
          </Field>
        );

      case 'poll-text':
        return (
          <>
            <Field label="Question">
              <textarea value={s.question || ''} onInput={(e) => set('question', (e.target as HTMLTextAreaElement).value)} placeholder="How can we improve?" rows={3} style={textareaStyle} />
            </Field>
            <Field label="Question Style">
              <select value={s.themeStyle || 'body'} onChange={(e) => set('themeStyle', (e.target as HTMLSelectElement).value)} style={selectStyle}>
                <option value="title">Title</option>
                <option value="sub-title">Sub Title</option>
                <option value="body">Body</option>
              </select>
            </Field>
            <Field label="Answer Placeholder">
              <input type="text" value={s.placeholder || ''} onInput={(e) => set('placeholder', (e.target as HTMLInputElement).value)} placeholder="Enter text here..." style={inputStyle} />
            </Field>
            <Field label="Submit Button Label">
              <input type="text" value={s.submitLabel || ''} onInput={(e) => set('submitLabel', (e.target as HTMLInputElement).value)} placeholder="Submit" style={inputStyle} />
            </Field>
          </>
        );

      case 'poll-yes-no':
        return (
          <>
            <Field label="Question">
              <textarea value={s.question || ''} onInput={(e) => set('question', (e.target as HTMLTextAreaElement).value)} placeholder="Was this guide helpful?" rows={3} style={textareaStyle} />
            </Field>
            <Field label="Yes Label">
              <input type="text" value={s.yesLabel || ''} onInput={(e) => set('yesLabel', (e.target as HTMLInputElement).value)} placeholder="Yes" style={inputStyle} />
            </Field>
            <Field label="No Label">
              <input type="text" value={s.noLabel || ''} onInput={(e) => set('noLabel', (e.target as HTMLInputElement).value)} placeholder="No" style={inputStyle} />
            </Field>
          </>
        );

      case 'poll-scale':
        return (
          <>
            <Field label="Question">
              <textarea value={s.question || ''} onInput={(e) => set('question', (e.target as HTMLTextAreaElement).value)} placeholder="How would you rate this?" rows={3} style={textareaStyle} />
            </Field>
            <Field label="Min Value">
              <input type="number" value={s.minValue ?? 1} onInput={(e) => set('minValue', Number((e.target as HTMLInputElement).value))} style={inputStyle} />
            </Field>
            <Field label="Max Value">
              <input type="number" value={s.maxValue ?? 5} onInput={(e) => set('maxValue', Number((e.target as HTMLInputElement).value))} style={inputStyle} />
            </Field>
            <Field label="Show Min / Max Labels">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={s.showLabels ?? true}
                  onChange={(e) => set('showLabels', (e.target as HTMLInputElement).checked)}
                  style={{ accentColor: '#1d4ed8', width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.8rem', color: '#475569', fontFamily: EDITOR_FONT_FAMILY }}>
                  Show labels below scale
                </span>
              </div>
            </Field>
            {s.showLabels && (
              <>
                <Field label={`Min Label (at ${s.minValue ?? 1})`}>
                  <input
                    type="text"
                    value={s.labels?.[s.minValue ?? 1] || ''}
                    onInput={(e) => set('labels', { ...s.labels, [s.minValue ?? 1]: (e.target as HTMLInputElement).value })}
                    placeholder="e.g. Not likely"
                    style={inputStyle}
                  />
                </Field>
                <Field label={`Max Label (at ${s.maxValue ?? 5})`}>
                  <input
                    type="text"
                    value={s.labels?.[s.maxValue ?? 5] || ''}
                    onInput={(e) => set('labels', { ...s.labels, [s.maxValue ?? 5]: (e.target as HTMLInputElement).value })}
                    placeholder="e.g. Very likely"
                    style={inputStyle}
                  />
                </Field>
              </>
            )}
            <Field label="Submit Button Label">
              <input type="text" value={s.submitLabel || ''} onInput={(e) => set('submitLabel', (e.target as HTMLInputElement).value)} placeholder="Submit" style={inputStyle} />
            </Field>
          </>
        );

      case 'horizontal-line':
        return (
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>
            No settings for this block.
          </p>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{
      width: '260px',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      borderLeft: '1px solid #e2e8f0',
      background: '#fff',
      fontFamily: EDITOR_FONT_FAMILY,
    }}>
      <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b' }}>
          Edit {BLOCK_NAMES[block.type] || block.type}
        </div>
        <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '0.2rem' }}>
          Configure Component
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
        {renderSettings()}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem 1rem', borderTop: '1px solid #e2e8f0' }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1, padding: '0.6rem', border: '1px solid #e2e8f0', borderRadius: '0.625rem',
            background: '#f8fafc', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
            color: '#64748b', fontFamily: EDITOR_FONT_FAMILY,
          }}
        >
          Cancel
        </button>
        <button
          onClick={onDone}
          style={{
            flex: 1, padding: '0.6rem', border: 'none', borderRadius: '0.625rem',
            background: '#1d4ed8', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
            color: '#fff', fontFamily: EDITOR_FONT_FAMILY,
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}
