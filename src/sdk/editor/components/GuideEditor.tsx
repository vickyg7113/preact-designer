import { useState, useEffect } from 'preact/hooks';
import type { ElementInfo, EditorMessage } from '../../types';
import { getCurrentPage } from '../../utils/dom';
import { editorStyles } from '../editorStyles';
import { EditorButton } from './EditorButton';
import { EditorTextarea } from './EditorInput';

export interface GuideEditorProps {
  onMessage: (msg: EditorMessage) => void;
  elementSelected?: { selector: string; elementInfo: ElementInfo } | null;
}

const PLACEMENTS = ['top', 'right', 'bottom', 'left'] as const;

export function GuideEditor({ onMessage, elementSelected }: GuideEditorProps) {
  const [selector, setSelector] = useState('');
  const [elementInfo, setElementInfo] = useState<ElementInfo | null>(null);
  const [content, setContent] = useState('');
  const [placement, setPlacement] = useState<(typeof PLACEMENTS)[number]>('right');
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    onMessage({ type: 'EDITOR_READY' });
  }, []);

  useEffect(() => {
    if (elementSelected) {
      setSelector(elementSelected.selector);
      setElementInfo(elementSelected.elementInfo);
      setShowForm(true);
      setContent('');
      setError('');
    } else {
      setSelector('');
      setElementInfo(null);
      setShowForm(false);
      setContent('');
      setError('');
    }
  }, [elementSelected]);

  const handleSave = () => {
    const trimmed = content.trim();
    if (!trimmed) {
      setError('Please enter guide content');
      return;
    }
    if (!selector) {
      setError('No element selected');
      return;
    }
    setError('');
    onMessage({
      type: 'SAVE_GUIDE',
      guide: {
        page: getCurrentPage(),
        selector,
        content: trimmed,
        placement,
        status: 'active',
      },
    });
  };

  const handleClearSelection = () => {
    setSelector('');
    setElementInfo(null);
    setShowForm(false);
    setContent('');
    setError('');
    onMessage({ type: 'CLEAR_SELECTION_CLICKED' });
  };

  const formatElementInfo = (info: ElementInfo) => {
    const parts: string[] = [];
    if (info.tagName) parts.push(`Tag: ${info.tagName}`);
    if (info.id) parts.push(`ID: ${info.id}`);
    if (info.className) parts.push(`Class: ${info.className}`);
    if (info.textContent) parts.push(`Text: ${info.textContent}`);
    return parts.join(' | ');
  };

  return (
    <div style={editorStyles.root}>
      <div style={editorStyles.header}>
        <h2 style={editorStyles.headerTitle}>Create Guide</h2>
        <EditorButton variant="icon" onClick={() => onMessage({ type: 'CANCEL' })} aria-label="Close">
          <iconify-icon icon="mdi:close" style={{ fontSize: '1.25rem' }} />
        </EditorButton>
      </div>

      {!showForm ? (
        <div style={editorStyles.emptyState}>
          <div style={editorStyles.emptyStateIcon}>
            <iconify-icon icon="mdi:cursor-default-click" style={{ fontSize: '1.875rem', color: '#3b82f6' }} />
          </div>
          <p style={editorStyles.emptyStateText}>Click on an element in the page to create a guide</p>
          <EditorButton variant="primary" onClick={() => onMessage({ type: 'ACTIVATE_SELECTOR' })}>
            <iconify-icon icon="mdi:selection-marker" />
            Select element
          </EditorButton>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={editorStyles.section}>
            <label style={editorStyles.label}>Selector</label>
            <div style={editorStyles.selectorBox}>{selector || '-'}</div>
          </div>
          {elementInfo && (
            <div style={editorStyles.elementInfo}>
              <strong style={editorStyles.elementInfoTitle}>Element Info</strong>
              <div style={editorStyles.elementInfoText}>{formatElementInfo(elementInfo)}</div>
            </div>
          )}
          <div style={editorStyles.section}>
            <label for="guideContent" style={editorStyles.label}>
              Guide Content
            </label>
            <EditorTextarea
              id="guideContent"
              placeholder="Enter the guide text that will be shown to users..."
              value={content}
              onInput={(e) => setContent((e.target as HTMLTextAreaElement).value)}
            />
          </div>
          <div style={editorStyles.section}>
            <label style={editorStyles.label}>Placement</label>
            <div style={editorStyles.placementGrid}>
              {PLACEMENTS.map((p) => (
                <EditorButton
                  key={p}
                  variant="placement"
                  active={placement === p}
                  onClick={() => setPlacement(p)}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </EditorButton>
              ))}
            </div>
          </div>
          {error && (
            <div style={editorStyles.errorBox}>
              <iconify-icon icon="mdi:alert-circle" />
              {error}
            </div>
          )}
          <div style={editorStyles.actionRow}>
            <EditorButton variant="secondary" onClick={() => onMessage({ type: 'CANCEL' })}>
              Cancel
            </EditorButton>
            <EditorButton variant="secondary" onClick={handleClearSelection}>
              Clear Selection
            </EditorButton>
            <EditorButton variant="primary" style={{ flex: 1 }} onClick={handleSave}>
              Save Guide
            </EditorButton>
          </div>
        </div>
      )}
    </div>
  );
}
