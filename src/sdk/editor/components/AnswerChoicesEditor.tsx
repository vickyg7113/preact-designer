import { useState } from 'preact/hooks';
import { EDITOR_FONT_FAMILY } from '../editorStyles';

const ANSWER_GENIUS_PRESETS: { label: string; choices: string[] }[] = [
  { label: 'Agree – Disagree',        choices: ['Strongly agree', 'Agree', 'Neutral', 'Disagree', 'Strongly disagree'] },
  { label: 'Satisfied – Dissatisfied',choices: ['Very satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very dissatisfied'] },
  { label: 'Yes – No',                choices: ['Yes', 'No'] },
  { label: 'Likely – Unlikely',       choices: ['Very likely', 'Likely', 'Neutral', 'Unlikely', 'Very unlikely'] },
  { label: 'Always – Never',          choices: ['Always', 'Often', 'Sometimes', 'Rarely', 'Never'] },
  { label: 'Easy – Difficult',        choices: ['Very easy', 'Easy', 'Neutral', 'Difficult', 'Very difficult'] },
  { label: 'Approve – Disapprove',    choices: ['Strongly approve', 'Approve', 'Neutral', 'Disapprove', 'Strongly disapprove'] },
  { label: 'Better – Worse',          choices: ['Much better', 'Better', 'About the same', 'Worse', 'Much worse'] },
  { label: 'High – Low quality',      choices: ['Very high quality', 'High quality', 'Average', 'Low quality', 'Very low quality'] },
  { label: 'True – False',            choices: ['True', 'False'] },
  { label: 'Interested – Not interested', choices: ['Very interested', 'Interested', 'Neutral', 'Not interested', 'Not at all interested'] },
];

interface AnswerChoicesEditorProps {
  choices: string[];
  onChange: (choices: string[]) => void;
  inputType?: 'radio' | 'checkbox';
  allowOther?: boolean;
  onAllowOtherChange?: (val: boolean) => void;
  showRandomize?: boolean;
  randomize?: boolean;
  onRandomizeChange?: (val: boolean) => void;
}

export function AnswerChoicesEditor({
  choices,
  onChange,
  inputType = 'radio',
  allowOther,
  onAllowOtherChange,
  showRandomize,
  randomize,
  onRandomizeChange,
}: AnswerChoicesEditorProps) {
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const updateChoice = (i: number, val: string) => {
    const next = [...choices];
    next[i] = val;
    onChange(next);
  };

  const addChoice = (afterIndex: number) => {
    const next = [...choices];
    next.splice(afterIndex + 1, 0, `Option ${next.length + 1}`);
    onChange(next);
  };

  const removeChoice = (i: number) => {
    onChange(choices.filter((_, idx) => idx !== i));
  };

  const moveChoice = (i: number, dir: -1 | 1) => {
    const next = [...choices];
    const target = i + dir;
    if (target < 0 || target >= next.length) return;
    [next[i], next[target]] = [next[target], next[i]];
    onChange(next);
  };

  const applyPreset = (label: string) => {
    const preset = ANSWER_GENIUS_PRESETS.find((p) => p.label === label);
    if (preset) onChange([...preset.choices]);
  };

  const applyBulk = () => {
    const lines = bulkText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length) onChange(lines);
    setShowBulk(false);
    setBulkText('');
  };

  const prefixIcon = inputType === 'checkbox' ? '□' : '○';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontFamily: EDITOR_FONT_FAMILY }}>
      {/* Answer Genius */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>Answer Genius</span>
        <select
          onChange={(e) => applyPreset((e.target as HTMLSelectElement).value)}
          defaultValue=""
          style={{
            fontSize: '0.72rem', padding: '3px 6px',
            border: '1px solid #e2e8f0', borderRadius: '4px',
            background: '#f8fafc', color: '#334155',
            fontFamily: EDITOR_FONT_FAMILY, cursor: 'pointer',
          }}
        >
          <option value="" disabled>Select preset…</option>
          {ANSWER_GENIUS_PRESETS.map((p) => (
            <option key={p.label} value={p.label}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* Choices */}
      {choices.map((choice, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontSize: '13px', color: '#cbd5e1', width: '14px', flexShrink: 0, userSelect: 'none' }}>
            {prefixIcon}
          </span>
          <input
            type="text"
            value={choice}
            onInput={(e) => updateChoice(i, (e.target as HTMLInputElement).value)}
            style={{
              flex: 1, padding: '5px 8px',
              border: '1px solid #e2e8f0', borderRadius: '4px',
              fontSize: '0.8rem', fontFamily: EDITOR_FONT_FAMILY,
              color: '#1e293b', background: '#fafafa', outline: 'none',
            }}
            onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = '#3b82f6'; }}
            onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = '#e2e8f0'; }}
          />
          <button onClick={() => addChoice(i)} title="Add below" style={iconBtn}>
            <iconify-icon icon="mdi:plus" style={{ fontSize: '12px' }} />
          </button>
          <button onClick={() => moveChoice(i, -1)} disabled={i === 0} title="Move up" style={{ ...iconBtn, opacity: i === 0 ? 0.35 : 1 }}>
            <iconify-icon icon="mdi:chevron-up" style={{ fontSize: '12px' }} />
          </button>
          <button onClick={() => moveChoice(i, 1)} disabled={i === choices.length - 1} title="Move down" style={{ ...iconBtn, opacity: i === choices.length - 1 ? 0.35 : 1 }}>
            <iconify-icon icon="mdi:chevron-down" style={{ fontSize: '12px' }} />
          </button>
          <button onClick={() => removeChoice(i)} title="Delete" style={{ ...iconBtn, color: '#ef4444' }}>
            <iconify-icon icon="mdi:close" style={{ fontSize: '12px' }} />
          </button>
        </div>
      ))}

      {/* Add / Bulk */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '2px' }}>
        <button
          onClick={() => onChange([...choices, `Option ${choices.length + 1}`])}
          style={{ fontSize: '0.72rem', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontFamily: EDITOR_FONT_FAMILY, fontWeight: 600, padding: 0 }}
        >
          ⊕ Add choice
        </button>
        <button
          onClick={() => setShowBulk(!showBulk)}
          style={{ fontSize: '0.72rem', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontFamily: EDITOR_FONT_FAMILY, fontWeight: 500, padding: 0 }}
        >
          ≡ Bulk add
        </button>
      </div>

      {/* Bulk textarea */}
      {showBulk && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <textarea
            value={bulkText}
            onInput={(e) => setBulkText((e.target as HTMLTextAreaElement).value)}
            placeholder="One choice per line…"
            rows={4}
            style={{
              width: '100%', padding: '6px 8px',
              border: '1px solid #e2e8f0', borderRadius: '4px',
              fontSize: '0.8rem', fontFamily: EDITOR_FONT_FAMILY,
              resize: 'vertical', color: '#1e293b', boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={applyBulk} style={{ ...smBtn, background: '#3b82f6', color: '#fff' }}>Apply</button>
            <button onClick={() => setShowBulk(false)} style={{ ...smBtn, background: '#f1f5f9', color: '#64748b' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Options */}
      {(onAllowOtherChange !== undefined || onRandomizeChange !== undefined) && (
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {onAllowOtherChange !== undefined && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#475569', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={!!allowOther}
                onChange={(e) => onAllowOtherChange((e.target as HTMLInputElement).checked)}
              />
              Add "Other" answer option
            </label>
          )}
          {showRandomize && onRandomizeChange !== undefined && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#475569', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={!!randomize}
                onChange={(e) => onRandomizeChange((e.target as HTMLInputElement).checked)}
              />
              Randomize answer order
            </label>
          )}
        </div>
      )}
    </div>
  );
}

const iconBtn: Record<string, any> = {
  width: '22px', height: '22px',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  border: '1px solid #e2e8f0', borderRadius: '4px',
  background: '#fff', cursor: 'pointer', color: '#64748b',
  padding: 0, flexShrink: 0,
};

const smBtn: Record<string, any> = {
  padding: '4px 12px', border: 'none', borderRadius: '4px',
  fontSize: '0.75rem', fontWeight: 600,
  cursor: 'pointer', fontFamily: EDITOR_FONT_FAMILY,
};
