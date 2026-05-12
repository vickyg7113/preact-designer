import { useState } from 'preact/hooks';
import type { GuideBlock, BlockType, GuideTemplateContent } from '../../types';
import { EDITOR_FONT_FAMILY } from '../editorStyles';
import { BlockTypesSidebar } from './BlockTypesSidebar';
import { BlockSettingsPanel } from './BlockSettingsPanel';
import { BlockRenderer } from '../../components/GuideModal';

const DEFAULT_SETTINGS: Record<BlockType, Record<string, any>> = {
  text: { content: 'Enter your text here', themeStyle: 'body' },
  image: { url: '' },
  button: { label: 'Next', action: 'next' },
  'horizontal-line': {},
  video: { url: '' },
  'poll-text':            { question: 'How can we improve?', placeholder: 'Enter text here...', submitLabel: 'Submit', themeStyle: 'body' },
  'poll-yes-no':          { question: 'Was this helpful?', yesLabel: 'Yes', noLabel: 'No' },
  'poll-scale':           { question: 'How would you rate this?', minValue: 1, maxValue: 5, showLabels: true, labels: { 1: 'Low', 5: 'High' }, submitLabel: 'Submit' },
  'poll-nps':             { question: 'How likely are you to recommend us to a friend or colleague?', lowLabel: 'Not at all likely', highLabel: 'Extremely likely' },
  'poll-multiple-choice': { question: 'Select an option', choices: ['Option 1', 'Option 2', 'Option 3'], allowOther: false, randomize: false },
  'poll-checkboxes':      { question: 'Select all that apply', choices: ['Option 1', 'Option 2', 'Option 3'], allowOther: false, randomize: false },
  'poll-star-rating':     { question: 'How would you rate your experience?', maxStars: 5 },
  'poll-dropdown':        { question: 'Select an option', choices: ['Option 1', 'Option 2', 'Option 3'] },
  'poll-slider':          { question: 'How satisfied are you?', min: 0, max: 10, step: 1, minLabel: 'Not satisfied', maxLabel: 'Very satisfied' },
  'poll-ranking':         { question: 'Rank the following in order of importance', choices: ['Item 1', 'Item 2', 'Item 3'] },
  'poll-matrix':          { question: 'Please rate the following', rows: ['Item 1', 'Item 2', 'Item 3'], columns: ['Poor', 'Fair', 'Good', 'Excellent'] },
};

interface InlineTemplateEditorProps {
  initialContent: string;
  onSave: (updatedContent: string) => void;
  onClose: () => void;
  onPreview?: (content: string, guideType?: string) => void;
  stepLabel?: string;
  surveyMode?: boolean;
}

function controlBtn(disabled: boolean, danger = false): Record<string, any> {
  return {
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `1px solid ${danger ? '#fca5a5' : '#e2e8f0'}`,
    borderRadius: '4px',
    background: danger ? '#fff1f2' : '#fff',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.35 : 1,
    color: danger ? '#dc2626' : '#475569',
    padding: 0,
    fontFamily: EDITOR_FONT_FAMILY,
  };
}

const noop = () => {};

function migrateToBlocks(parsed: GuideTemplateContent): GuideBlock[] {
  if (parsed.blocks && parsed.blocks.length > 0) return parsed.blocks;

  const migrated: GuideBlock[] = [];
  const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  if (parsed.title) {
    migrated.push({ id: makeId(), type: 'text', settings: { content: parsed.title, themeStyle: 'title' } });
  }
  if (parsed.description) {
    migrated.push({ id: makeId(), type: 'text', settings: { content: parsed.description, themeStyle: 'body' } });
  }
  if (parsed.body) {
    migrated.push({ id: makeId(), type: 'text', settings: { content: parsed.body, themeStyle: 'body' } });
  }
  if (parsed.buttonContent) {
    migrated.push({ id: makeId(), type: 'button', settings: { label: parsed.buttonContent, action: 'next' } });
  }
  return migrated;
}

export function InlineTemplateEditor({ initialContent, onSave, onClose, onPreview, stepLabel, surveyMode }: InlineTemplateEditorProps) {
  const parsed: GuideTemplateContent = (() => {
    try { return JSON.parse(initialContent || '{}'); } catch { return {}; }
  })();

  const [blocks, setBlocks] = useState<GuideBlock[]>(migrateToBlocks(parsed));
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) ?? null;

  const handleAddBlock = (type: BlockType) => {
    const block: GuideBlock = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      settings: { ...DEFAULT_SETTINGS[type] },
    };
    setBlocks((prev) => [...prev, block]);
    setSelectedBlockId(block.id);
  };

  const handleUpdateBlock = (id: string, settings: Record<string, any>) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, settings } : b)));
  };

  const handleDeleteBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  const handleMove = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    setBlocks((prev) => {
      if (next < 0 || next >= prev.length) return prev;
      const arr = [...prev];
      [arr[index], arr[next]] = [arr[next], arr[index]];
      return arr;
    });
  };

  const buildContent = (): string => {
    const clean: GuideTemplateContent = { blocks };
    if (parsed.layout) clean.layout = parsed.layout;
    return JSON.stringify(clean);
  };

  const handleSave = () => {
    onSave(buildContent());
  };

  const handlePreview = () => {
    if (!onPreview) return;
    onPreview(buildContent(), surveyMode ? 'survey' : undefined);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 2147483647,
      display: 'flex',
      background: '#F8FAFC',
      fontFamily: EDITOR_FONT_FAMILY,
    }}>
      {/* Left: block types */}
      <BlockTypesSidebar onAddBlock={handleAddBlock} onClose={onClose} />

      {/* Center: preview */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        overflowY: 'auto',
        position: 'relative',
      }}>
        {/* Dot grid */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.04,
          backgroundImage: 'radial-gradient(#1855BC 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />

        {/* Header */}
        <div style={{ position: 'absolute', top: '1.75rem', left: '2rem', zIndex: 10 }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#222', margin: 0, letterSpacing: '-0.03em' }}>
            {stepLabel ? `Editing: ${stepLabel}` : 'Design your guide step'}
          </h1>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem', fontWeight: 500 }}>
            Drag and drop building blocks to craft your experience
          </p>
        </div>

        {/* Modal card */}
        <div style={{
          position: 'relative',
          width: '100%',
          maxWidth: '440px',
          background: '#fff',
          borderRadius: '1rem',
          boxShadow: '0 32px 64px -12px rgba(0,0,0,0.14)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          zIndex: 10,
          marginTop: '3.5rem',
        }}>
          {/* Decorative close */}
          <div style={{
            position: 'absolute', top: '12px', right: '12px',
            color: '#cbd5e1', cursor: 'not-allowed', zIndex: 20,
          }}>
            <iconify-icon icon="mdi:close" style={{ fontSize: '16px' }} />
          </div>

          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 0 }}>
            {blocks.length === 0 ? (
              <div style={{
                padding: '3rem 1rem',
                border: '2px dashed #e2e8f0',
                borderRadius: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
                color: '#94a3b8',
              }}>
                <iconify-icon icon="mdi:plus-circle-outline" style={{ fontSize: '2rem' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, textAlign: 'center' }}>
                  Click a block type on the left to start
                </span>
              </div>
            ) : (
              blocks.map((block, index) => {
                const isSelected = selectedBlockId === block.id;
                return (
                  <div
                    key={block.id}
                    onClick={() => setSelectedBlockId(block.id)}
                    style={{
                      position: 'relative',
                      borderRadius: '0.5rem',
                      border: isSelected ? '2px solid #3b82f6' : '2px solid transparent',
                      background: isSelected ? 'rgba(59,130,246,0.03)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s',
                      padding: '4px',
                      marginBottom: '4px',
                    }}
                  >
                    {isSelected && (
                      <div style={{
                        position: 'absolute', top: '6px', right: '6px',
                        display: 'flex', gap: '4px', zIndex: 10,
                      }}>
                        <button onClick={(e) => { e.stopPropagation(); handleMove(index, -1); }} style={controlBtn(index === 0)} title="Move up">
                          <iconify-icon icon="mdi:chevron-up" style={{ fontSize: '14px' }} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleMove(index, 1); }} style={controlBtn(index === blocks.length - 1)} title="Move down">
                          <iconify-icon icon="mdi:chevron-down" style={{ fontSize: '14px' }} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteBlock(block.id); }} style={controlBtn(false, true)} title="Delete">
                          <iconify-icon icon="mdi:trash-can-outline" style={{ fontSize: '14px' }} />
                        </button>
                      </div>
                    )}
                    <div style={{ pointerEvents: 'none' }}>
                      <BlockRenderer
                        block={block}
                        onNext={noop} onBack={noop} onDismiss={noop} onAction={noop}
                        isFirstStep={true} isLastStep={true}
                        surveyMode={surveyMode}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ marginTop: '2rem', display: 'flex', gap: '0.75rem', zIndex: 10, position: 'relative' }}>
          {onPreview && (
            <button
              onClick={handlePreview}
              style={{
                padding: '0.75rem 2rem',
                background: '#fff',
                color: '#1855BC',
                border: '2px solid #1855BC',
                borderRadius: '9999px',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer',
                fontFamily: EDITOR_FONT_FAMILY,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <iconify-icon icon="mdi:eye-outline" style={{ fontSize: '16px' }} />
              Preview on Page
            </button>
          )}
          <button
            onClick={handleSave}
            style={{
              padding: '0.75rem 3rem',
              background: '#1855BC',
              color: '#fff',
              border: 'none',
              borderRadius: '9999px',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              fontFamily: EDITOR_FONT_FAMILY,
              boxShadow: '0 10px 20px rgba(24,85,188,0.2)',
            }}
          >
            Save Template
          </button>
        </div>
      </div>

      {/* Right: block settings */}
      {selectedBlock && (
        <BlockSettingsPanel
          block={selectedBlock}
          onUpdate={handleUpdateBlock}
          onCancel={() => setSelectedBlockId(null)}
          onDone={() => setSelectedBlockId(null)}
        />
      )}
    </div>
  );
}
