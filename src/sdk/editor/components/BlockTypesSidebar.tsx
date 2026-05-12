import type { BlockType } from '../../types';
import { EDITOR_FONT_FAMILY, editorStyles } from '../editorStyles';

const BLOCK_GROUPS: { label: string; blocks: { type: BlockType; icon: string; label: string }[] }[] = [
  {
    label: 'GENERAL',
    blocks: [
      { type: 'text', icon: 'mdi:format-text', label: 'Text' },
      { type: 'button', icon: 'mdi:gesture-tap-button', label: 'Button' },
      { type: 'horizontal-line', icon: 'mdi:minus', label: 'Horizontal Line' },
    ],
  },
  {
    label: 'MEDIA',
    blocks: [
      { type: 'image', icon: 'mdi:image-outline', label: 'Image' },
      { type: 'video', icon: 'mdi:video-outline', label: 'Video' },
    ],
  },
  {
    label: 'POLLS',
    blocks: [
      { type: 'poll-text',            icon: 'mdi:comment-text-outline',        label: 'Open Text' },
      { type: 'poll-yes-no',          icon: 'mdi:check-circle-outline',        label: 'Yes / No' },
      { type: 'poll-scale',           icon: 'mdi:pound',                       label: 'Number Scale' },
      { type: 'poll-nps',             icon: 'mdi:numeric-10-box-outline',      label: 'NPS (0–10)' },
      { type: 'poll-multiple-choice', icon: 'mdi:radiobox-marked',             label: 'Multiple Choice' },
      { type: 'poll-checkboxes',      icon: 'mdi:checkbox-marked-outline',     label: 'Checkboxes' },
      { type: 'poll-star-rating',     icon: 'mdi:star-outline',                label: 'Star Rating' },
      { type: 'poll-dropdown',        icon: 'mdi:chevron-down-box-outline',    label: 'Dropdown' },
      { type: 'poll-slider',          icon: 'mdi:tune-variant',                label: 'Slider' },
      { type: 'poll-ranking',         icon: 'mdi:sort-variant',                label: 'Ranking' },
      { type: 'poll-matrix',          icon: 'mdi:grid',                        label: 'Matrix' },
    ],
  },
];

interface BlockTypesSidebarProps {
  onAddBlock: (type: BlockType) => void;
  onClose: () => void;
}

export function BlockTypesSidebar({ onAddBlock, onClose }: BlockTypesSidebarProps) {
  return (
    <div style={{
      width: '210px',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid #e2e8f0',
      background: '#fff',
      fontFamily: EDITOR_FONT_FAMILY,
    }}>
      <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b' }}>Building Blocks</div>
        <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '0.2rem' }}>
          Click to add component
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
        {BLOCK_GROUPS.map((group) => (
          <div key={group.label} style={{ marginBottom: '1.25rem' }}>
            <div style={editorStyles.sectionLabel}>{group.label}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {group.blocks.map(({ type, icon, label }) => (
                <button
                  key={type}
                  onClick={() => onAddBlock(type)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.55rem 0.7rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.625rem',
                    background: '#fff',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    color: '#334155',
                    fontFamily: EDITOR_FONT_FAMILY,
                    textAlign: 'left',
                    width: '100%',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.borderColor = '#3b82f6';
                    el.style.background = 'rgba(59,130,246,0.04)';
                    el.style.color = '#1d4ed8';
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.borderColor = '#e2e8f0';
                    el.style.background = '#fff';
                    el.style.color = '#334155';
                  }}
                >
                  <iconify-icon icon={icon} style={{ fontSize: '1rem', color: '#64748b', flexShrink: 0 }} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '0.6rem',
            border: '1px solid #e2e8f0',
            borderRadius: '0.625rem',
            background: '#f8fafc',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: '#64748b',
            fontFamily: EDITOR_FONT_FAMILY,
          }}
        >
          Close Editor
        </button>
      </div>
    </div>
  );
}
