import { useState, useEffect } from 'preact/hooks';
import type { ElementInfo, EditorMessage } from '../../types';
import { editorStyles } from '../editorStyles';

const FEATURES_STORAGE_KEY = 'designerTaggedFeatures';
const HEATMAP_STORAGE_KEY = 'designerHeatmapEnabled';

function getCurrentUrl(): string {
  try {
    const p = window.location;
    return (p.host || p.hostname || '') + (p.pathname || '/') + (p.search || '') + (p.hash || '');
  } catch {
    return window.location.href || '';
  }
}

function normalizeUrl(u: string): string {
  return (u || '')
    .replace(/^https?:\/\//i, '')
    .replace(/\/$/, '') || '';
}

function getTaggedFeatures(): { url?: string }[] {
  try {
    const raw = localStorage.getItem(FEATURES_STORAGE_KEY) || '[]';
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function getFeaturesForCurrentUrl(): unknown[] {
  const current = normalizeUrl(getCurrentUrl());
  return getTaggedFeatures().filter((f) => f && normalizeUrl((f as { url: string }).url) === current);
}

export interface TagFeatureEditorProps {
  onMessage: (msg: EditorMessage) => void;
  elementSelected?: { selector: string; elementInfo: ElementInfo } | null;
  tagFeatureSavedAckCounter?: number;
}

export function TagFeatureEditor({ onMessage, elementSelected, tagFeatureSavedAckCounter }: TagFeatureEditorProps) {
  const [showForm, setShowForm] = useState(false);
  const [selector, setSelector] = useState('');
  const [elementInfo, setElementInfo] = useState<ElementInfo | null>(null);
  const [featureName, setFeatureName] = useState('');
  const [featureNameError, setFeatureNameError] = useState(false);
  const [taggedCount, setTaggedCount] = useState(0);
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState<'features' | 'pages' | 'ai-agents'>('features');

  const refreshTaggedCount = () => {
    setTaggedCount(getFeaturesForCurrentUrl().length);
  };

  const showOverview = () => {
    setShowForm(false);
    setSelector('');
    setElementInfo(null);
    setFeatureName('');
    setFeatureNameError(false);
    refreshTaggedCount();
  };

  useEffect(() => {
    onMessage({ type: 'EDITOR_READY' });
  }, []);

  useEffect(() => {
    refreshTaggedCount();
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(HEATMAP_STORAGE_KEY) === 'true';
    setHeatmapEnabled(stored);
  }, []);

  useEffect(() => {
    if (elementSelected) {
      setSelector(elementSelected.selector);
      setElementInfo(elementSelected.elementInfo);
      setShowForm(true);
      setFeatureName('');
      setFeatureNameError(false);
    } else {
      showOverview();
    }
  }, [elementSelected]);

  useEffect(() => {
    if (tagFeatureSavedAckCounter != null && tagFeatureSavedAckCounter > 0) {
      showOverview();
    }
  }, [tagFeatureSavedAckCounter]);

  const handleHeatmapToggle = () => {
    const next = !heatmapEnabled;
    setHeatmapEnabled(next);
    try {
      localStorage.setItem(HEATMAP_STORAGE_KEY, String(next));
    } catch {
      // ignore
    }
    onMessage({ type: 'HEATMAP_TOGGLE', enabled: next });
  };

  const handleSave = () => {
    const trimmed = featureName.trim();
    if (!trimmed) {
      setFeatureNameError(true);
      return;
    }
    setFeatureNameError(false);
    onMessage({
      type: 'SAVE_TAG_FEATURE',
      payload: {
        featureName: trimmed,
        selector,
        elementInfo: elementInfo || undefined,
      },
    });
  };

  const formatElementInfo = (info: ElementInfo) => {
    const parts: string[] = [];
    if (info.tagName) parts.push(`Tag: ${info.tagName}`);
    if (info.id) parts.push(`ID: ${info.id}`);
    if (info.className) parts.push(`Class: ${info.className}`);
    const text = (info.textContent || '').slice(0, 80);
    if (text) parts.push(`Text: ${text}`);
    return parts.join(' | ');
  };

  return (
    <div style={editorStyles.panel}>
      <div style={editorStyles.panelHeader}>
        <h2 style={{ ...editorStyles.headerTitle, fontSize: '1.125rem' }}>Manage Pages, Features & AI</h2>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button type="button" style={editorStyles.iconBtn} title="Menu">
            <iconify-icon icon="mdi:dots-horizontal" style={{ fontSize: '1.125rem' }} />
          </button>
          <button type="button" style={editorStyles.iconBtn} title="Minimize" onClick={() => onMessage({ type: 'CANCEL' })}>
            <iconify-icon icon="mdi:window-minimize" style={{ fontSize: '1.125rem' }} />
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(226,232,240,0.8)', padding: '0 1.5rem', background: '#fff' }}>
        {(['features', 'pages', 'ai-agents'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            style={editorStyles.tab(activeTab === tab)}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ')}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', background: 'linear-gradient(to bottom, rgba(248,250,252,0.8), #fff)' }}>
        {!showForm ? (
          <>
            {activeTab === 'features' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={editorStyles.sectionLabel}>FEATURES OVERVIEW</div>
                <div style={{ ...editorStyles.card, marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '1rem', flex: 1, minWidth: 0 }}>
                      <span style={{ ...editorStyles.badge, background: '#14b8a6', color: '#fff', minWidth: '1.75rem', height: '1.75rem' }}>0</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.125rem' }}>Suggested Features</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.375 }}>List of untagged elements on this page</div>
                      </div>
                    </div>
                    <iconify-icon icon="mdi:chevron-right" style={{ color: '#94a3b8', fontSize: '1.25rem', flexShrink: 0 }} />
                  </div>
                </div>
                <div style={{ ...editorStyles.card, marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '1rem', flex: 1, minWidth: 0 }}>
                      <span style={{ ...editorStyles.badge, background: '#3b82f6', color: '#fff', minWidth: '1.75rem', height: '1.75rem' }}>{taggedCount}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.125rem' }}>Tagged Features</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.375 }}>List of tagged Features on this page</div>
                      </div>
                    </div>
                    <iconify-icon icon="mdi:chevron-right" style={{ color: '#94a3b8', fontSize: '1.25rem', flexShrink: 0 }} />
                  </div>
                </div>
                <div style={editorStyles.heatmapRow}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#334155' }}>Heatmap</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                      role="switch"
                      tabIndex={0}
                      style={editorStyles.toggle(heatmapEnabled)}
                      onClick={handleHeatmapToggle}
                      onKeyDown={(e) => e.key === 'Enter' && handleHeatmapToggle()}
                    >
                      <span style={editorStyles.toggleThumb(heatmapEnabled)} />
                    </button>
                    <button type="button" style={{ ...editorStyles.iconBtn, border: '1px solid #e2e8f0', borderRadius: '0.75rem' }}>
                      <iconify-icon icon="mdi:plus" style={{ fontSize: '1.125rem' }} />
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button type="button" style={{ ...editorStyles.primaryBtn, flex: 1 }} onClick={() => onMessage({ type: 'TAG_FEATURE_CLICKED' })}>
                    Tag Feature
                  </button>
                  <button type="button" style={editorStyles.secondaryBtn} onClick={() => onMessage({ type: 'CLEAR_SELECTION_CLICKED' })}>
                    Clear Selection
                  </button>
                </div>
              </div>
            )}
            {activeTab === 'pages' && (
              <div style={editorStyles.comingSoon}>
                <div style={editorStyles.comingSoonIcon}>
                  <iconify-icon icon="mdi:file-document-multiple" style={{ fontSize: '1.875rem', color: '#94a3b8' }} />
                </div>
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Pages view — coming soon</p>
              </div>
            )}
            {activeTab === 'ai-agents' && (
              <div style={editorStyles.comingSoon}>
                <div style={editorStyles.comingSoonIcon}>
                  <iconify-icon icon="mdi:robot" style={{ fontSize: '1.875rem', color: '#94a3b8' }} />
                </div>
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>AI Agents — coming soon</p>
              </div>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
            <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <a href="#" style={editorStyles.link} onClick={(e) => { e.preventDefault(); showOverview(); }}>
                <iconify-icon icon="mdi:arrow-left" /> Back to overview
              </a>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>Tag Feature</h3>
              <div style={editorStyles.section}>
                <label style={editorStyles.label}>Selector</label>
                <div style={editorStyles.selectorBox}>{selector || '-'}</div>
              </div>
              {elementInfo && (
                <div style={editorStyles.section}>
                  <label style={editorStyles.label}>Element info</label>
                  <div style={editorStyles.elementInfo}>
                    <div style={editorStyles.elementInfoText}>{formatElementInfo(elementInfo)}</div>
                  </div>
                </div>
              )}
              <div style={editorStyles.section}>
                <label style={editorStyles.label}>
                  Feature Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter feature name"
                  value={featureName}
                  onInput={(e) => setFeatureName((e.target as HTMLInputElement).value)}
                  style={editorStyles.input}
                />
                {featureNameError && (
                  <p style={{ fontSize: '0.875rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <iconify-icon icon="mdi:alert-circle" /> Please enter a feature name.
                  </p>
                )}
              </div>
            </div>
            <div style={editorStyles.footer}>
              <button type="button" style={editorStyles.secondaryBtn} onClick={showOverview}>
                Cancel
              </button>
              <button type="button" style={editorStyles.secondaryBtn} onClick={() => onMessage({ type: 'CLEAR_SELECTION_CLICKED' })}>
                Clear Selection
              </button>
              <button type="button" style={editorStyles.primaryBtn} onClick={handleSave}>
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
