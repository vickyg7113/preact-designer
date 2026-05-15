import { useState } from 'preact/hooks';
import type { RepeatUnit, ExpirationType, DayOfWeek } from '../../types';
import { parseRepeatDays } from '../../utils/dom';
import { editorStyles, EDITOR_FONT_FAMILY } from '../editorStyles';
import { EditorButton } from './EditorButton';

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

interface ActivationSettingsProps {
  onBack: () => void;
  guideName?: string;
  initialIgnoreThrottling?: boolean;
  initialRepeatOnDismiss?: boolean;
  initialRepeatInterval?: number;
  initialRepeatUnit?: RepeatUnit;
  initialExpirationType?: ExpirationType;
  initialExpirationValue?: number;
  initialRepeatDays?: DayOfWeek[] | string | null;
  onSave?: (config: {
    ignore_throttling: boolean;
    repeat_on_dismiss: boolean;
    repeat_interval: number | null;
    repeat_unit: RepeatUnit | null;
    expiration_type: ExpirationType | null;
    expiration_value: number | null;
    repeat_days: DayOfWeek[] | null;
  }) => Promise<void>;

}

export function ActivationSettings({
  onBack,
  guideName,
  initialIgnoreThrottling = false,
  initialRepeatOnDismiss = false,
  initialRepeatInterval = 1,
  initialRepeatUnit = 'day',
  initialExpirationType = 'never',
  initialExpirationValue = 2,
  initialRepeatDays = null,
  onSave,
}: ActivationSettingsProps) {
  const [ignoreGlobalThrottle, setIgnoreGlobalThrottle] = useState(initialIgnoreThrottling);
  const [repeatDisplay, setRepeatDisplay] = useState(initialRepeatOnDismiss);
  const [repeatEvery, setRepeatEvery] = useState(initialRepeatInterval);
  const [repeatUnit, setRepeatUnit] = useState<RepeatUnit>(initialRepeatUnit);
  const [expirationType, setExpirationType] = useState<ExpirationType>(initialExpirationType);
  const [expirationValue, setExpirationValue] = useState(initialExpirationValue);
  const parsedRepeatDays = parseRepeatDays(initialRepeatDays);
  const [scheduleDaysEnabled, setScheduleDaysEnabled] = useState(parsedRepeatDays.length > 0);
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>(parsedRepeatDays);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const getSummary = (): string => {
    if (!repeatDisplay) return 'This guide appears on every page load. Dismissals are not tracked.';

    const base = repeatEvery === 1
      ? `This guide will reappear at most once per ${repeatUnit}`
      : `This guide will reappear at most once every ${repeatEvery} ${repeatUnit}s`;

    const daysPart = scheduleDaysEnabled && selectedDays.length > 0
      ? `, on ${selectedDays.map(d => DAYS.find(day => day.key === d)?.label ?? d).join(', ')}`
      : '';

    switch (expirationType) {
      case 'dismissals':
        return `${base}${daysPart}, up to ${expirationValue} dismissal${expirationValue !== 1 ? 's' : ''} total.`;
      case 'never':
      default:
        return `${base}${daysPart}, with no end date.`;
    }
  };

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave({
        ignore_throttling: ignoreGlobalThrottle,
        repeat_on_dismiss: repeatDisplay,
        repeat_interval: repeatDisplay ? repeatEvery : null,
        repeat_unit: repeatDisplay ? repeatUnit : null,
        expiration_type: repeatDisplay ? expirationType : null,
        expiration_value: repeatDisplay && expirationType === 'dismissals' ? expirationValue : null,
        repeat_days: scheduleDaysEnabled && selectedDays.length > 0 ? selectedDays : null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const selectStyle = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    border: '1px solid #e2e8f0',
    borderRadius: '0.625rem',
    fontSize: '0.875rem',
    color: '#1e293b',
    background: '#fff',
    fontFamily: EDITOR_FONT_FAMILY,
    cursor: 'pointer',
  };

  const numberInputStyle = {
    width: '5rem',
    padding: '0.5rem 0.75rem',
    border: '1px solid #e2e8f0',
    borderRadius: '0.625rem',
    fontSize: '0.875rem',
    color: '#1e293b',
    background: '#fff',
    fontFamily: EDITOR_FONT_FAMILY,
    textAlign: 'center' as const,
  };

  const checkboxLabelStyle = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    cursor: 'pointer',
  };

  const checkboxStyle = {
    marginTop: '0.15rem',
    accentColor: '#3b82f6',
    width: '1rem',
    height: '1rem',
    flexShrink: 0,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Back button */}
      <EditorButton
        variant="secondary"
        style={{ alignSelf: 'flex-start' }}
        onClick={onBack}
      >
        <iconify-icon icon="mdi:arrow-left" style={{ marginRight: '0.4rem' }} />
        Back to Steps
      </EditorButton>

      {guideName && (
        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
          for "{guideName}"
        </span>
      )}

      {/* Override display limit */}
      <label style={checkboxLabelStyle}>
        <input
          type="checkbox"
          checked={ignoreGlobalThrottle}
          onChange={() => setIgnoreGlobalThrottle(v => !v)}
          style={checkboxStyle}
        />
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
            Override account display limit
          </div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.1rem' }}>
            Show this guide even if the account-wide daily limit has been reached
          </div>
        </div>
      </label>

      {/* Divider + section label */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
        <div style={editorStyles.sectionLabel}>Dismissal &amp; Repeat Behavior</div>
      </div>

      {/* Show again checkbox */}
      <label style={checkboxLabelStyle}>
        <input
          type="checkbox"
          checked={repeatDisplay}
          onChange={() => setRepeatDisplay(v => !v)}
          style={checkboxStyle}
        />
        <div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
            Apply a cooldown after dismissal
          </div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.1rem' }}>
            Without a cooldown, the guide appears on every page load even if dismissed
          </div>
        </div>
      </label>

      {/* Repeat config — only visible when repeatDisplay is checked */}
      {repeatDisplay && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.875rem',
          padding: '1rem',
          border: '1px solid #e2e8f0',
          borderRadius: '0.75rem',
          background: '#f8fafc',
        }}>

          {/* Repeat every */}
          <div style={editorStyles.section}>
            <label style={editorStyles.label}>Show again every</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="number"
                min={1}
                value={repeatEvery}
                onChange={(e) => {
                  const v = parseInt((e.target as HTMLInputElement).value) || 1;
                  setRepeatEvery(Math.max(1, v));
                }}
                style={numberInputStyle}
              />
              <select
                value={repeatUnit}
                onChange={(e) => setRepeatUnit((e.target as HTMLSelectElement).value as RepeatUnit)}
                style={{ ...selectStyle, width: 'auto', flex: 1 }}
              >
                <option value="hour">Hour(s)</option>
                <option value="day">Day(s)</option>
                <option value="week">Week(s)</option>
                <option value="month">Month(s)</option>
              </select>
            </div>
          </div>

          {/* Stop showing after */}
          <div style={editorStyles.section}>
            <label style={editorStyles.label}>Stop showing after</label>
            <select
              value={expirationType}
              onChange={(e) => setExpirationType((e.target as HTMLSelectElement).value as ExpirationType)}
              style={selectStyle}
            >
              <option value="never">Never stop showing</option>
              <option value="dismissals">A set number of dismissals</option>
            </select>
          </div>

          {/* Threshold value — only for dismissals */}
          {expirationType === 'dismissals' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.875rem', color: '#475569', fontWeight: 500 }}>After</span>
              <input
                type="number"
                min={1}
                value={expirationValue}
                onChange={(e) => {
                  const v = parseInt((e.target as HTMLInputElement).value) || 1;
                  setExpirationValue(Math.max(1, v));
                }}
                style={numberInputStyle}
              />
              <span style={{ fontSize: '0.875rem', color: '#475569', fontWeight: 500 }}>
                Dismissal(s)
              </span>
            </div>
          )}
        </div>
      )}

      {/* Day-of-week scheduling */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
        <div style={editorStyles.sectionLabel}>Schedule by day (optional)</div>
      </div>

      <label style={checkboxLabelStyle}>
        <input
          type="checkbox"
          checked={scheduleDaysEnabled}
          onChange={() => setScheduleDaysEnabled(v => !v)}
          style={checkboxStyle}
        />
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
            Show on specific days of the week
          </div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.1rem' }}>
            Restrict this guide to selected days only
          </div>
        </div>
      </label>

      {scheduleDaysEnabled && (
        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
          {DAYS.map(({ key, label }) => {
            const isSelected = selectedDays.includes(key);
            return (
              <button
                key={key}
                onClick={() =>
                  setSelectedDays(prev =>
                    isSelected ? prev.filter(d => d !== key) : [...prev, key]
                  )
                }
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: '9999px',
                  border: isSelected ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                  background: isSelected ? 'rgba(59,130,246,0.1)' : '#fff',
                  color: isSelected ? '#1d4ed8' : '#64748b',
                  fontSize: '0.78rem',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  fontFamily: EDITOR_FONT_FAMILY,
                  transition: 'all 0.12s',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* Plain-language summary */}
      <div style={{
        padding: '0.75rem 1rem',
        background: 'rgba(59,130,246,0.05)',
        border: '1px solid #bfdbfe',
        borderRadius: '0.75rem',
        fontSize: '0.8rem',
        color: '#1d4ed8',
        lineHeight: 1.6,
      }}>
        <iconify-icon icon="mdi:information-outline" style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />
        {getSummary()}
      </div>

      {/* Footer */}
      <div style={{ ...editorStyles.actionRow, marginTop: '0.5rem' }}>
        {onSave && (
          <EditorButton
            variant="primary"
            style={{ flex: 1 }}
            onClick={handleSave}
            disabled={isSaving || saved}
          >
            {isSaving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
          </EditorButton>
        )}
        <EditorButton variant="secondary" style={{ flex: 1 }} onClick={onBack}>
          Close
        </EditorButton>
      </div>

    </div>
  );
}
