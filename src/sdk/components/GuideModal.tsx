import { useMemo, useState } from 'preact/hooks';
import { SDK_STYLES } from '../styles/constants';
import type { GuideTemplateContent, GuideBlock } from '../types';

interface GuideModalProps {
  content: string;
  onDismiss: () => void;
  onNext: () => void;
  onBack: () => void;
  onAction: (url: string) => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  onPollChange?: (blockId: string, pollType: string, question: string, value: string) => void;
  surveyMode?: boolean;
}

export function BlockRenderer({ block, onNext, onBack, onDismiss, onAction, isFirstStep, isLastStep, onPollChange, totalPollsInStep, surveyMode }: {
  block: GuideBlock;
  onNext: () => void;
  onBack: () => void;
  onDismiss: () => void;
  onAction: (url: string) => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  onPollChange?: (blockId: string, pollType: string, question: string, value: string) => void;
  totalPollsInStep?: number;
  surveyMode?: boolean;
}) {
  const { type, settings } = block;
  const isMultiPoll = surveyMode || (totalPollsInStep ?? 1) > 1;
  const [selectedValue, setSelectedValue] = useState<number | null>(null);
  const [textValue, setTextValue] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submittedAnswer, setSubmittedAnswer] = useState<'yes' | 'no' | null>(null);
  // New poll type state
  const [npsValue, setNpsValue] = useState<number | null>(null);
  const [npsSubmitted, setNpsSubmitted] = useState(false);
  const [mcSelected, setMcSelected] = useState<string | null>(null);
  const [mcSubmitted, setMcSubmitted] = useState(false);
  const [cbSelected, setCbSelected] = useState<string[]>([]);
  const [cbSubmitted, setCbSubmitted] = useState(false);
  const [starHover, setStarHover] = useState(0);
  const [starSelected, setStarSelected] = useState(0);
  const [starSubmitted, setStarSubmitted] = useState(false);
  const [dropdownVal, setDropdownVal] = useState('');
  const [dropdownSubmitted, setDropdownSubmitted] = useState(false);
  const [sliderVal, setSliderVal] = useState<number>(settings.min ?? 0);
  const [sliderSubmitted, setSliderSubmitted] = useState(false);
  const [rankOrder, setRankOrder] = useState<string[]>(settings.choices || []);
  const [rankSubmitted, setRankSubmitted] = useState(false);
  const [matrixAnswers, setMatrixAnswers] = useState<Record<string, string>>({});
  const [matrixSubmitted, setMatrixSubmitted] = useState(false);

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
    case 'poll-scale': {
      const scaleMin = settings.minValue ?? 1;
      const scaleMax = settings.maxValue ?? 5;
      const scaleRange = Array.from({ length: scaleMax - scaleMin + 1 }, (_, i) => scaleMin + i);
      return (
        <div style={{ ...fontStyle, display: 'flex', flexDirection: 'column', gap: '16px', padding: '12px 0' }}>
          {settings.question && (
            <h3 style={{ fontSize: '18px', fontWeight: 700, textAlign: 'center', margin: 0, color: SDK_STYLES.text }}>
              {settings.question}
            </h3>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
            {scaleRange.map((num) => (
              <div key={num} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={() => {
                    setSelectedValue(num);
                    if (surveyMode) onPollChange?.(block.id, block.type, settings.question || '', String(num));
                  }}
                  style={{
                    width: '100%', aspectRatio: '1/1', maxWidth: '50px', borderRadius: '12px',
                    border: `1.5px solid ${selectedValue === num ? SDK_STYLES.primary : '#E2E8F0'}`,
                    backgroundColor: selectedValue === num ? `${SDK_STYLES.primary}15` : '#F8FAFC',
                    color: selectedValue === num ? SDK_STYLES.primary : '#64748B',
                    fontSize: '15px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
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
          {!surveyMode && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                disabled={selectedValue === null || submitted}
                onClick={() => {
                  onPollChange?.(block.id, block.type, settings.question || '', String(selectedValue));
                  setSubmitted(true);
                  if (!isMultiPoll) setTimeout(() => onNext(), 600);
                }}
                style={{
                  backgroundColor: submitted ? '#16a34a' : selectedValue === null ? '#94a3b8' : '#222',
                  color: '#fff', padding: '12px 40px', borderRadius: '12px', border: 'none',
                  fontWeight: 700, fontSize: '14px',
                  cursor: selectedValue === null || submitted ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)', transition: 'background-color 0.2s',
                }}
              >
                {submitted ? '✓ Submitted' : (settings.submitLabel || 'Submit')}
              </button>
            </div>
          )}
        </div>
      );
    }

    case 'poll-text':
      return (
        <div style={{ ...fontStyle, display: 'flex', flexDirection: 'column', gap: '20px', padding: '12px 0' }}>
          {settings.question && (
            <h3 style={{
              fontSize: settings.themeStyle === 'title' ? '20px' : settings.themeStyle === 'sub-title' ? '16px' : '14px',
              fontWeight: settings.themeStyle === 'body' ? 500 : 700,
              textAlign: 'center', margin: 0, color: '#222222', lineHeight: 1.2,
            }}>
              {settings.question}
            </h3>
          )}
          <textarea
            value={textValue}
            placeholder={settings.placeholder || 'Enter text here...'}
            onInput={(e) => {
              const val = (e.target as HTMLTextAreaElement).value;
              setTextValue(val);
              if (surveyMode) onPollChange?.(block.id, block.type, settings.question || '', val.trim());
            }}
            style={{
              ...fontStyle, width: '100%', minHeight: '120px', borderRadius: '16px',
              border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', padding: '16px',
              fontSize: '14px', fontWeight: 500, color: '#222222', outline: 'none',
              resize: 'none', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', boxSizing: 'border-box',
            }}
          />
          {!surveyMode && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                disabled={!textValue.trim() || submitted}
                onClick={() => {
                  onPollChange?.(block.id, block.type, settings.question || '', textValue.trim());
                  setSubmitted(true);
                  if (!isMultiPoll) setTimeout(() => onNext(), 600);
                }}
                style={{
                  backgroundColor: submitted ? '#16a34a' : !textValue.trim() ? '#94a3b8' : '#222222',
                  color: '#fff', padding: '12px 40px', borderRadius: '12px', border: 'none',
                  fontWeight: 700, fontSize: '14px',
                  cursor: !textValue.trim() || submitted ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)', transition: 'background-color 0.2s',
                }}
              >
                {submitted ? '✓ Submitted' : (settings.submitLabel || 'Submit')}
              </button>
            </div>
          )}
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
            {(['yes', 'no'] as const).map((answer) => {
              const isChosen = submittedAnswer === answer;
              const isOther = submittedAnswer !== null && submittedAnswer !== answer;
              return (
                <button
                  key={answer}
                  disabled={submittedAnswer !== null}
                  onClick={() => {
                    onPollChange?.(block.id, block.type, settings.question || '', answer);
                    setSubmittedAnswer(answer);
                    if (!surveyMode && !isMultiPoll) setTimeout(() => onNext(), 400);
                  }}
                  style={{
                    flex: 1, maxWidth: '120px',
                    backgroundColor: isChosen ? '#16a34a' : '#222222',
                    color: '#fff', padding: '10px', borderRadius: '8px', border: 'none',
                    fontWeight: 700, fontSize: '14px',
                    cursor: submittedAnswer !== null ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    opacity: isOther ? 0.4 : 1, transition: 'background-color 0.2s, opacity 0.2s',
                  }}
                >
                  {isChosen
                    ? `✓ ${answer === 'yes' ? (settings.yesLabel || 'Yes') : (settings.noLabel || 'No')}`
                    : answer === 'yes' ? (settings.yesLabel || 'Yes') : (settings.noLabel || 'No')}
                </button>
              );
            })}
          </div>
        </div>
      );

    case 'poll-nps': {
      const npsRange = Array.from({ length: 11 }, (_, i) => i);
      const submitNps = (n: number) => {
        setNpsValue(n);
        onPollChange?.(block.id, block.type, settings.question || '', String(n));
        if (!surveyMode) setNpsSubmitted(true);
      };
      return (
        <div style={{ ...fontStyle, display: 'flex', flexDirection: 'column', gap: '16px', padding: '12px 0' }}>
          {settings.question && (
            <h3 style={{ fontSize: '16px', fontWeight: 700, textAlign: 'center', margin: 0, color: SDK_STYLES.text }}>
              {settings.question}
            </h3>
          )}
          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {npsRange.map((n) => (
              <button
                key={n}
                disabled={npsSubmitted}
                onClick={() => submitNps(n)}
                style={{
                  width: '36px', height: '36px', borderRadius: '8px', border: '1.5px solid',
                  borderColor: npsValue === n ? SDK_STYLES.primary : n <= 6 ? '#fca5a5' : n <= 8 ? '#fde68a' : '#86efac',
                  backgroundColor: npsValue === n ? SDK_STYLES.primary : n <= 6 ? '#fff1f2' : n <= 8 ? '#fefce8' : '#f0fdf4',
                  color: npsValue === n ? '#fff' : n <= 6 ? '#dc2626' : n <= 8 ? '#ca8a04' : '#16a34a',
                  fontSize: '13px', fontWeight: 700, cursor: npsSubmitted ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {n}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 2px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>{settings.lowLabel || 'Not at all likely'}</span>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>{settings.highLabel || 'Extremely likely'}</span>
          </div>
        </div>
      );
    }

    case 'poll-multiple-choice': {
      const mcChoices: string[] = settings.choices || ['Option 1', 'Option 2', 'Option 3'];
      return (
        <div style={{ ...fontStyle, display: 'flex', flexDirection: 'column', gap: '16px', padding: '12px 0' }}>
          {settings.question && (
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: SDK_STYLES.text }}>{settings.question}</h3>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {mcChoices.map((choice) => {
              const isSelected = mcSelected === choice;
              return (
                <button
                  key={choice}
                  disabled={mcSubmitted}
                  onClick={() => {
                    setMcSelected(choice);
                    if (surveyMode) onPollChange?.(block.id, block.type, settings.question || '', choice);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                    borderRadius: '10px', border: `1.5px solid ${isSelected ? SDK_STYLES.primary : '#E2E8F0'}`,
                    backgroundColor: isSelected ? `${SDK_STYLES.primary}10` : '#F8FAFC',
                    cursor: mcSubmitted ? 'not-allowed' : 'pointer', textAlign: 'left',
                    transition: 'all 0.15s', fontFamily: SDK_STYLES.fontFamily,
                  }}
                >
                  <div style={{
                    width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${isSelected ? SDK_STYLES.primary : '#cbd5e1'}`,
                    backgroundColor: isSelected ? SDK_STYLES.primary : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isSelected && <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#fff' }} />}
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: isSelected ? SDK_STYLES.primary : '#334155' }}>{choice}</span>
                </button>
              );
            })}
            {settings.allowOther && (
              <button disabled style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #E2E8F0', backgroundColor: '#F8FAFC', textAlign: 'left', fontFamily: SDK_STYLES.fontFamily }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid #cbd5e1', flexShrink: 0 }} />
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#94a3b8' }}>Other…</span>
              </button>
            )}
          </div>
          {!surveyMode && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                disabled={!mcSelected || mcSubmitted}
                onClick={() => {
                  onPollChange?.(block.id, block.type, settings.question || '', mcSelected!);
                  setMcSubmitted(true);
                }}
                style={{
                  backgroundColor: mcSubmitted ? '#16a34a' : !mcSelected ? '#94a3b8' : '#222',
                  color: '#fff', padding: '10px 36px', borderRadius: '10px', border: 'none',
                  fontWeight: 700, fontSize: '14px',
                  cursor: !mcSelected || mcSubmitted ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s',
                }}
              >
                {mcSubmitted ? '✓ Submitted' : 'Submit'}
              </button>
            </div>
          )}
        </div>
      );
    }

    case 'poll-checkboxes': {
      const cbChoices: string[] = settings.choices || ['Option 1', 'Option 2', 'Option 3'];
      const toggleCb = (choice: string) => {
        const next = cbSelected.includes(choice)
          ? cbSelected.filter(c => c !== choice)
          : [...cbSelected, choice];
        setCbSelected(next);
        if (surveyMode) onPollChange?.(block.id, block.type, settings.question || '', next.join(', '));
      };
      return (
        <div style={{ ...fontStyle, display: 'flex', flexDirection: 'column', gap: '16px', padding: '12px 0' }}>
          {settings.question && (
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: SDK_STYLES.text }}>{settings.question}</h3>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {cbChoices.map((choice) => {
              const isChecked = cbSelected.includes(choice);
              return (
                <button
                  key={choice}
                  disabled={cbSubmitted}
                  onClick={() => toggleCb(choice)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                    borderRadius: '10px', border: `1.5px solid ${isChecked ? SDK_STYLES.primary : '#E2E8F0'}`,
                    backgroundColor: isChecked ? `${SDK_STYLES.primary}10` : '#F8FAFC',
                    cursor: cbSubmitted ? 'not-allowed' : 'pointer', textAlign: 'left',
                    transition: 'all 0.15s', fontFamily: SDK_STYLES.fontFamily,
                  }}
                >
                  <div style={{
                    width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0,
                    border: `2px solid ${isChecked ? SDK_STYLES.primary : '#cbd5e1'}`,
                    backgroundColor: isChecked ? SDK_STYLES.primary : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isChecked && <span style={{ color: '#fff', fontSize: '11px', fontWeight: 700, lineHeight: 1 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: isChecked ? SDK_STYLES.primary : '#334155' }}>{choice}</span>
                </button>
              );
            })}
          </div>
          {!surveyMode && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                disabled={cbSelected.length === 0 || cbSubmitted}
                onClick={() => {
                  onPollChange?.(block.id, block.type, settings.question || '', cbSelected.join(', '));
                  setCbSubmitted(true);
                }}
                style={{
                  backgroundColor: cbSubmitted ? '#16a34a' : cbSelected.length === 0 ? '#94a3b8' : '#222',
                  color: '#fff', padding: '10px 36px', borderRadius: '10px', border: 'none',
                  fontWeight: 700, fontSize: '14px',
                  cursor: cbSelected.length === 0 || cbSubmitted ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s',
                }}
              >
                {cbSubmitted ? '✓ Submitted' : 'Submit'}
              </button>
            </div>
          )}
        </div>
      );
    }

    case 'poll-star-rating': {
      const maxStars = settings.maxStars ?? 5;
      return (
        <div style={{ ...fontStyle, display: 'flex', flexDirection: 'column', gap: '16px', padding: '12px 0' }}>
          {settings.question && (
            <h3 style={{ fontSize: '16px', fontWeight: 700, textAlign: 'center', margin: 0, color: SDK_STYLES.text }}>{settings.question}</h3>
          )}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
            {Array.from({ length: maxStars }, (_, i) => i + 1).map((star) => {
              const filled = star <= (starHover || starSelected);
              return (
                <button
                  key={star}
                  disabled={starSubmitted}
                  onClick={() => {
                    setStarSelected(star);
                    if (surveyMode) onPollChange?.(block.id, block.type, settings.question || '', String(star));
                  }}
                  onMouseEnter={() => !starSubmitted && setStarHover(star)}
                  onMouseLeave={() => setStarHover(0)}
                  style={{
                    background: 'none', border: 'none', cursor: starSubmitted ? 'not-allowed' : 'pointer',
                    padding: '2px', fontSize: '28px', transition: 'transform 0.1s',
                    transform: star <= starHover ? 'scale(1.15)' : 'scale(1)',
                  }}
                >
                  <span style={{ color: filled ? '#f59e0b' : '#d1d5db' }}>★</span>
                </button>
              );
            })}
          </div>
          {!surveyMode && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                disabled={starSelected === 0 || starSubmitted}
                onClick={() => {
                  onPollChange?.(block.id, block.type, settings.question || '', String(starSelected));
                  setStarSubmitted(true);
                }}
                style={{
                  backgroundColor: starSubmitted ? '#16a34a' : starSelected === 0 ? '#94a3b8' : '#222',
                  color: '#fff', padding: '10px 36px', borderRadius: '10px', border: 'none',
                  fontWeight: 700, fontSize: '14px',
                  cursor: starSelected === 0 || starSubmitted ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s',
                }}
              >
                {starSubmitted ? '✓ Submitted' : 'Submit'}
              </button>
            </div>
          )}
        </div>
      );
    }

    case 'poll-dropdown': {
      const ddChoices: string[] = settings.choices || ['Option 1', 'Option 2', 'Option 3'];
      return (
        <div style={{ ...fontStyle, display: 'flex', flexDirection: 'column', gap: '16px', padding: '12px 0' }}>
          {settings.question && (
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: SDK_STYLES.text }}>{settings.question}</h3>
          )}
          <select
            value={dropdownVal}
            disabled={dropdownSubmitted}
            onChange={(e) => {
              const val = (e.target as HTMLSelectElement).value;
              setDropdownVal(val);
              if (surveyMode) onPollChange?.(block.id, block.type, settings.question || '', val);
            }}
            style={{
              ...fontStyle, width: '100%', padding: '10px 14px', borderRadius: '10px',
              border: `1.5px solid ${dropdownVal ? SDK_STYLES.primary : '#E2E8F0'}`,
              backgroundColor: '#F8FAFC', fontSize: '14px', color: dropdownVal ? '#1e293b' : '#94a3b8',
              cursor: dropdownSubmitted ? 'not-allowed' : 'pointer', outline: 'none',
            }}
          >
            <option value="" disabled>Select an option…</option>
            {ddChoices.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {!surveyMode && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                disabled={!dropdownVal || dropdownSubmitted}
                onClick={() => {
                  onPollChange?.(block.id, block.type, settings.question || '', dropdownVal);
                  setDropdownSubmitted(true);
                }}
                style={{
                  backgroundColor: dropdownSubmitted ? '#16a34a' : !dropdownVal ? '#94a3b8' : '#222',
                  color: '#fff', padding: '10px 36px', borderRadius: '10px', border: 'none',
                  fontWeight: 700, fontSize: '14px',
                  cursor: !dropdownVal || dropdownSubmitted ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s',
                }}
              >
                {dropdownSubmitted ? '✓ Submitted' : 'Submit'}
              </button>
            </div>
          )}
        </div>
      );
    }

    case 'poll-slider': {
      const slMin = settings.min ?? 0;
      const slMax = settings.max ?? 10;
      const slStep = settings.step ?? 1;
      const pct = ((sliderVal - slMin) / (slMax - slMin)) * 100;
      return (
        <div style={{ ...fontStyle, display: 'flex', flexDirection: 'column', gap: '16px', padding: '12px 0' }}>
          {settings.question && (
            <h3 style={{ fontSize: '16px', fontWeight: 700, textAlign: 'center', margin: 0, color: SDK_STYLES.text }}>{settings.question}</h3>
          )}
          <div style={{ padding: '8px 4px' }}>
            <div style={{ position: 'relative', height: '6px', borderRadius: '3px', backgroundColor: '#E2E8F0', margin: '8px 0' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, borderRadius: '3px', backgroundColor: SDK_STYLES.primary }} />
            </div>
            <input
              type="range"
              min={slMin} max={slMax} step={slStep} value={sliderVal}
              disabled={sliderSubmitted}
              onInput={(e) => {
                const val = Number((e.target as HTMLInputElement).value);
                setSliderVal(val);
                if (surveyMode) onPollChange?.(block.id, block.type, settings.question || '', String(val));
              }}
              style={{ width: '100%', accentColor: SDK_STYLES.primary, cursor: sliderSubmitted ? 'not-allowed' : 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>{settings.minLabel || slMin}</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: SDK_STYLES.primary }}>{sliderVal}</span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>{settings.maxLabel || slMax}</span>
            </div>
          </div>
          {!surveyMode && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                disabled={sliderSubmitted}
                onClick={() => {
                  onPollChange?.(block.id, block.type, settings.question || '', String(sliderVal));
                  setSliderSubmitted(true);
                }}
                style={{
                  backgroundColor: sliderSubmitted ? '#16a34a' : '#222',
                  color: '#fff', padding: '10px 36px', borderRadius: '10px', border: 'none',
                  fontWeight: 700, fontSize: '14px',
                  cursor: sliderSubmitted ? 'not-allowed' : 'pointer', transition: 'background-color 0.2s',
                }}
              >
                {sliderSubmitted ? '✓ Submitted' : 'Submit'}
              </button>
            </div>
          )}
        </div>
      );
    }

    case 'poll-ranking': {
      const moveRank = (i: number, dir: -1 | 1) => {
        const next = [...rankOrder];
        const j = i + dir;
        if (j < 0 || j >= next.length) return;
        [next[i], next[j]] = [next[j], next[i]];
        setRankOrder(next);
        if (surveyMode) onPollChange?.(block.id, block.type, settings.question || '', next.join(', '));
      };
      return (
        <div style={{ ...fontStyle, display: 'flex', flexDirection: 'column', gap: '16px', padding: '12px 0' }}>
          {settings.question && (
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: SDK_STYLES.text }}>{settings.question}</h3>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {rankOrder.map((item, i) => (
              <div key={item} style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
                borderRadius: '10px', border: '1.5px solid #E2E8F0', backgroundColor: '#F8FAFC',
              }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', width: '18px' }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: '14px', fontWeight: 500, color: '#334155' }}>{item}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <button onClick={() => moveRank(i, -1)} disabled={i === 0 || rankSubmitted} style={{ background: 'none', border: 'none', cursor: i === 0 ? 'not-allowed' : 'pointer', opacity: i === 0 ? 0.3 : 1, padding: '1px 4px', fontSize: '10px', color: '#64748b' }}>▲</button>
                  <button onClick={() => moveRank(i, 1)} disabled={i === rankOrder.length - 1 || rankSubmitted} style={{ background: 'none', border: 'none', cursor: i === rankOrder.length - 1 ? 'not-allowed' : 'pointer', opacity: i === rankOrder.length - 1 ? 0.3 : 1, padding: '1px 4px', fontSize: '10px', color: '#64748b' }}>▼</button>
                </div>
              </div>
            ))}
          </div>
          {!surveyMode && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                disabled={rankSubmitted}
                onClick={() => {
                  onPollChange?.(block.id, block.type, settings.question || '', rankOrder.join(', '));
                  setRankSubmitted(true);
                }}
                style={{
                  backgroundColor: rankSubmitted ? '#16a34a' : '#222',
                  color: '#fff', padding: '10px 36px', borderRadius: '10px', border: 'none',
                  fontWeight: 700, fontSize: '14px',
                  cursor: rankSubmitted ? 'not-allowed' : 'pointer', transition: 'background-color 0.2s',
                }}
              >
                {rankSubmitted ? '✓ Submitted' : 'Submit'}
              </button>
            </div>
          )}
        </div>
      );
    }

    case 'poll-matrix': {
      const matRows: string[] = settings.rows || ['Item 1', 'Item 2', 'Item 3'];
      const matCols: string[] = settings.columns || ['Poor', 'Fair', 'Good', 'Excellent'];
      const allAnswered = matRows.every(r => matrixAnswers[r]);
      return (
        <div style={{ ...fontStyle, display: 'flex', flexDirection: 'column', gap: '16px', padding: '12px 0', overflowX: 'auto' }}>
          {settings.question && (
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: SDK_STYLES.text }}>{settings.question}</h3>
          )}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr>
                <th style={{ padding: '6px', textAlign: 'left' }} />
                {matCols.map((c) => (
                  <th key={c} style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '12px' }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matRows.map((row, ri) => (
                <tr key={row} style={{ backgroundColor: ri % 2 === 0 ? '#F8FAFC' : '#fff' }}>
                  <td style={{ padding: '8px 6px', fontWeight: 500, color: '#334155' }}>{row}</td>
                  {matCols.map((col) => {
                    const isSelected = matrixAnswers[row] === col;
                    return (
                      <td key={col} style={{ padding: '8px 4px', textAlign: 'center' }}>
                        <button
                          disabled={matrixSubmitted}
                          onClick={() => {
                            const next = { ...matrixAnswers, [row]: col };
                            setMatrixAnswers(next);
                            if (surveyMode) {
                              onPollChange?.(block.id, block.type, settings.question || '', JSON.stringify(next));
                            }
                          }}
                          style={{
                            width: '18px', height: '18px', borderRadius: '50%',
                            border: `2px solid ${isSelected ? SDK_STYLES.primary : '#cbd5e1'}`,
                            backgroundColor: isSelected ? SDK_STYLES.primary : 'transparent',
                            cursor: matrixSubmitted ? 'not-allowed' : 'pointer',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          {isSelected && <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#fff' }} />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {!surveyMode && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                disabled={!allAnswered || matrixSubmitted}
                onClick={() => {
                  onPollChange?.(block.id, block.type, settings.question || '', JSON.stringify(matrixAnswers));
                  setMatrixSubmitted(true);
                }}
                style={{
                  backgroundColor: matrixSubmitted ? '#16a34a' : !allAnswered ? '#94a3b8' : '#222',
                  color: '#fff', padding: '10px 36px', borderRadius: '10px', border: 'none',
                  fontWeight: 700, fontSize: '14px',
                  cursor: !allAnswered || matrixSubmitted ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s',
                }}
              >
                {matrixSubmitted ? '✓ Submitted' : 'Submit'}
              </button>
            </div>
          )}
        </div>
      );
    }
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
  isLastStep,
  onPollChange,
  surveyMode,
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
               {(() => {
                 const pollCount = content.blocks!.filter(b => b.type.startsWith('poll-')).length;
                 return content.blocks!.map(block => (
                   <BlockRenderer
                     key={block.id}
                     block={block}
                     onNext={onNext}
                     onBack={onBack}
                     onDismiss={onDismiss}
                     onAction={onAction}
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
