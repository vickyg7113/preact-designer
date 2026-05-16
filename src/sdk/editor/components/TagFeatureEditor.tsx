import { useState, useEffect, useCallback } from 'preact/hooks';
import { useQueryClient } from '@tanstack/react-query';
import type { ElementInfo, EditorMessage, ExactMatchFeaturePayload } from '../../types';
import type { FeatureItem } from '../../types';
import { editorStyles } from '../editorStyles';
import { EditorButton } from './EditorButton';
import { EditorInput, EditorTextarea } from './EditorInput';
import { useCreateFeatureMutation } from '../../hooks/useCreateFeatureMutation';
import { useUpdateFeatureMutation } from '../../hooks/useUpdateFeatureMutation';
import { useDeleteFeatureMutation } from '../../hooks/useDeleteFeatureMutation';
import { useFeaturesList, featuresListQueryKey } from '../../hooks/useFeaturesList';

const HEATMAP_STORAGE_KEY = 'designerHeatmapEnabled';

type FeatureViewId = 'overview' | 'taggedList' | 'form';

export interface TagFeatureEditorProps {
  onMessage: (msg: EditorMessage) => void;
  elementSelected?: { selector: string; elementInfo: ElementInfo; xpath?: string } | null;
}

export function TagFeatureEditor({ onMessage, elementSelected }: TagFeatureEditorProps) {
  const [view, setView] = useState<FeatureViewId>('overview');
  const [showForm, setShowForm] = useState(false);
  const [elementInfo, setElementInfo] = useState<ElementInfo | null>(null);
  const [featureName, setFeatureName] = useState('');
  const [featureNameError, setFeatureNameError] = useState(false);
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectionModeActive, setSelectionModeActive] = useState(false);
  const [elementInfoExpanded, setElementInfoExpanded] = useState(false);
  const [description, setDescription] = useState('');
  const [xpath, setXpath] = useState('');
  const [editingFeatureId, setEditingFeatureId] = useState<string | null>(null);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [deletingFeatureId, setDeletingFeatureId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const queryClient = useQueryClient();
  const createFeatureMutation = useCreateFeatureMutation();
  const updateFeatureMutation = useUpdateFeatureMutation();
  const deleteFeatureMutation = useDeleteFeatureMutation();
  const { data: featuresListData, isLoading: featuresListLoading } = useFeaturesList();
  const saving = createFeatureMutation.isPending || updateFeatureMutation.isPending || deleteFeatureMutation.isPending;

  const featuresList: FeatureItem[] = featuresListData?.data ?? [];
  const taggedCount = featuresList.length;
  const filteredFeaturesList = featuresList
    .filter((f) => (f.name || '').toLowerCase().includes(searchQuery.toLowerCase().trim()))
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));

  const showOverview = useCallback(() => {
    setView('overview');
    setShowForm(false);
    setElementInfo(null);
    setXpath('');
    setFeatureName('');
    setFeatureNameError(false);
    setEditingFeatureId(null);
    setEditingRuleId(null);
    setSearchQuery('');
    setElementInfoExpanded(false);
    queryClient.invalidateQueries({ queryKey: featuresListQueryKey });
  }, [queryClient]);

  const showTaggedList = useCallback(() => {
    setView('taggedList');
    setSearchQuery('');
  }, []);

  const getFirstXpathFromFeature = useCallback((f: FeatureItem): string => {
    const xpathRule = f.rules?.find(
      (r) => r.selector_type === 'xpath' && (r.selector_value ?? '').trim() !== ''
    );
    return xpathRule?.selector_value ?? '';
  }, []);

  const showFeatureForm = useCallback(
    (feature?: FeatureItem) => {
      setView('form');
      setShowForm(true);
      setElementInfoExpanded(false);
      if (feature) {
        setEditingFeatureId(feature.feature_id);
        setEditingRuleId(feature.rules?.find(r => r.selector_type === 'xpath')?.rule_id ?? null);
        setFeatureName(feature.name || '');
        setDescription(feature.description || '');
        setXpath(getFirstXpathFromFeature(feature));
        setElementInfo(null);
      } else {
        setEditingFeatureId(null);
        setFeatureName('');
        setDescription('');
        setXpath(elementSelected?.xpath || '');
        setElementInfo(elementSelected?.elementInfo || null);
      }
      setFeatureNameError(false);
    },
    [elementSelected, getFirstXpathFromFeature]
  );

  useEffect(() => {
    onMessage({ type: 'EDITOR_READY' });
  }, []);

  useEffect(() => {
    onMessage({ type: 'FEATURES_FOR_HEATMAP', features: featuresListData?.data ?? [] });
  }, [featuresListData, onMessage]);

  useEffect(() => {
    const stored = localStorage.getItem(HEATMAP_STORAGE_KEY) === 'true';
    setHeatmapEnabled(stored);
  }, []);

  useEffect(() => {
    if (elementSelected) {
      setElementInfo(elementSelected.elementInfo);
      setXpath(elementSelected.xpath || '');
      setSelectionModeActive(false);
      if (editingFeatureId) {
        // Editing: only update xpath, keep name/description intact
        return;
      }
      setShowForm(true);
      setView('form');
      setFeatureName('');
      setFeatureNameError(false);
      setDescription('');
      setElementInfoExpanded(false);
    } else if (!showForm) {
      showOverview();
    }
  }, [elementSelected, showForm]);

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

  const getCurrentPageSlug = (): string => {
    try {
      const w = typeof window !== 'undefined' && window.parent !== window ? window.parent : window;
      const p = w.location;
      const path = (p.pathname || '/').replace(/^\//, '');
      return '//*/' + path + (p.search || '') + (p.hash || '');
    } catch {
      return '//*/';
    }
  };

  const handleSave = async () => {
    const trimmed = featureName.trim();
    if (!trimmed) {
      setFeatureNameError(true);
      return;
    }
    setFeatureNameError(false);

    // When editing: xpath state holds the (possibly edited) saved xpath.
    // When creating: prefer elementSelected xpath, fall back to xpath state.
    const effectiveXpath = editingFeatureId
      ? xpath.trim()
      : (xpath.trim() || elementSelected?.xpath || '');

    if (!effectiveXpath) return;

    const payload: ExactMatchFeaturePayload = {
      name: trimmed,
      slug: getCurrentPageSlug(),
      description: description.trim() || '',
      status: 'active',
      rules: [
        {
          ...(editingFeatureId && editingRuleId ? { rule_id: editingRuleId } : {}),
          selector_type: 'xpath',
          selector_value: effectiveXpath,
          match_mode: 'exact',
          priority: 10,
          is_active: true,
        },
      ],
    };

    try {
      if (editingFeatureId) {
        await updateFeatureMutation.mutateAsync({ featureId: editingFeatureId, payload });
        queryClient.invalidateQueries({ queryKey: featuresListQueryKey });
        showOverview();
      } else {
        await createFeatureMutation.mutateAsync(payload);
        queryClient.invalidateQueries({ queryKey: featuresListQueryKey });
        showOverview();
      }
    } catch {
      // Error handled by mutation; keep form open
    }
  };

  const handleDeleteFeature = async (featureId: string) => {
    if (!window.confirm('Delete this feature?')) return;
    setDeletingFeatureId(featureId);
    try {
      await deleteFeatureMutation.mutateAsync(featureId);
      queryClient.invalidateQueries({ queryKey: featuresListQueryKey });
      if (editingFeatureId === featureId) {
        setEditingFeatureId(null);
        showOverview();
      }
    } catch {
      // Error handled by mutation
    } finally {
      setDeletingFeatureId(null);
    }
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

  if (isMinimized) {
    return (
      <div style={{ ...editorStyles.panel, padding: '0.5rem' }}>
        <div style={editorStyles.panelHeader}>
          <h2 style={{ ...editorStyles.headerTitle, fontSize: '1.125rem' }}>
            {showForm ? 'Tag Feature' : 'Tag Features'}
          </h2>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <EditorButton variant="icon" title="Expand" onClick={() => setIsMinimized(false)}>
              <iconify-icon icon="mdi:plus" style={{ fontSize: '1.25rem', color: '#64748b' }} />
            </EditorButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={editorStyles.panel}>
      <div style={editorStyles.panelHeader}>
        <h2 style={{ ...editorStyles.headerTitle, fontSize: '1.125rem' }}>Tag Features</h2>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <EditorButton variant="icon" title="Minimize" onClick={() => setIsMinimized(true)}>
            <iconify-icon icon="mdi:window-minimize" style={{ fontSize: '1.125rem' }} />
          </EditorButton>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', background: 'linear-gradient(to bottom, rgba(248,250,252,0.8), #fff)' }}>
        {!showForm ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {view === 'taggedList' ? (
              <>
                <a
                  href="#"
                  style={editorStyles.link}
                  onClick={(e) => {
                    e.preventDefault();
                    showOverview();
                  }}
                >
                  <iconify-icon icon="mdi:arrow-left" /> Back to overview
                </a>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ ...editorStyles.badge, background: '#3b82f6', color: '#fff', minWidth: '1.75rem', height: '1.75rem' }}>{featuresListLoading ? '…' : filteredFeaturesList.length}</span>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>Tagged Features</h3>
                </div>
                <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>List of tagged features</p>
                <div style={editorStyles.searchWrap}>
                  <iconify-icon icon="mdi:magnify" style={editorStyles.searchIcon} />
                  <EditorInput
                    type="text"
                    placeholder="Search features"
                    value={searchQuery}
                    onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
                    style={editorStyles.searchInput}
                  />
                  {searchQuery && (
                    <EditorButton variant="ghost" style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} onClick={() => setSearchQuery('')}>
                      Clear
                    </EditorButton>
                  )}
                </div>
                {featuresListLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', color: '#64748b', fontSize: '0.875rem' }}>
                    <iconify-icon icon="mdi:loading" className="editor-spinner" style={{ fontSize: '1.25rem', marginRight: '0.5rem' }} />
                    <span>Loading features…</span>
                  </div>
                ) : (
                  filteredFeaturesList.map((f) => {
                    const isDeleting = deletingFeatureId === f.feature_id;
                    return (
                      <div key={f.feature_id} style={{ ...editorStyles.pageItem, marginBottom: '0.5rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b', flex: 1 }}>{f.name || 'Unnamed'}</span>
                        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                          <EditorButton variant="iconSm" title="Edit" onClick={() => showFeatureForm(f)} disabled={isDeleting}>
                            <iconify-icon icon="mdi:pencil" />
                          </EditorButton>
                          {isDeleting ? (
                            <span style={{ width: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <iconify-icon icon="mdi:loading" className="editor-spinner" style={{ fontSize: '1.25rem', color: '#64748b' }} />
                            </span>
                          ) : (
                            <EditorButton variant="iconSm" title="Delete" onClick={() => handleDeleteFeature(f.feature_id)}>
                              <iconify-icon icon="mdi:delete-outline" />
                            </EditorButton>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <EditorButton variant="primary" style={{ width: '100%', marginTop: '1rem' }} onClick={() => showFeatureForm()}>
                  Tag Feature
                </EditorButton>
              </>
            ) : featuresListLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', color: '#64748b', fontSize: '0.875rem' }}>
                <iconify-icon icon="mdi:loading" className="editor-spinner" style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }} />
                <span>Loading features…</span>
              </div>
            ) : (
              <>
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
                <div style={{ ...editorStyles.card, marginBottom: '0.75rem', cursor: 'pointer' }} onClick={showTaggedList}>
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
                    <EditorButton variant="icon" style={{ border: '1px solid #e2e8f0', borderRadius: '0.75rem' }}>
                      <iconify-icon icon="mdi:plus" style={{ fontSize: '1.125rem' }} />
                    </EditorButton>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <EditorButton
                    variant={selectionModeActive ? 'primary' : 'secondary'}
                    style={{ flex: 1 }}
                    onClick={() => {
                      setSelectionModeActive(true);
                      onMessage({ type: 'TAG_FEATURE_CLICKED' });
                    }}
                  >
                    Re-Select
                  </EditorButton>
                  <EditorButton
                    variant="secondary"
                    style={
                      !selectionModeActive
                        ? { borderWidth: '2px', borderColor: '#3b82f6', background: 'rgba(59, 130, 246, 0.08)', color: '#1d4ed8' }
                        : undefined
                    }
                    onClick={() => {
                      setSelectionModeActive(false);
                      onMessage({ type: 'CLEAR_SELECTION_CLICKED' });
                    }}
                  >
                    Hide Selector
                  </EditorButton>
                </div>
              </>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <a href="#" style={editorStyles.link} onClick={(e) => { e.preventDefault(); setSelectionModeActive(false); onMessage({ type: 'CLEAR_SELECTION_CLICKED' }); showOverview(); }}>
                  <iconify-icon icon="mdi:arrow-left" /> Back
                </a>

                {/* Name + Description */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={editorStyles.sectionLabel}>{editingFeatureId ? 'EDIT FEATURE' : 'NEW FEATURE'}</div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
                      Feature name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <EditorInput
                      type="text"
                      placeholder="e.g. report-designer-data-table-grid Link"
                      value={featureName}
                      onInput={(e) => setFeatureName((e.target as HTMLInputElement).value)}
                    />
                    {featureNameError && (
                      <p style={{ fontSize: '0.875rem', color: '#dc2626', marginTop: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <iconify-icon icon="mdi:alert-circle" /> Please enter a feature name.
                      </p>
                    )}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>Description</label>
                    <EditorTextarea
                      placeholder="Describe your Feature"
                      value={description}
                      onInput={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
                      minHeight="5rem"
                    />
                  </div>
                </div>

                {/* XPath / Selector */}
                <div>
                  <div style={{ ...editorStyles.sectionLabel, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    ELEMENT SELECTOR
                    <span style={{ color: '#94a3b8' }} title="XPath used to identify this feature element">
                      <iconify-icon icon="mdi:information-outline" />
                    </span>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
                      XPath
                    </label>
                    <div style={editorStyles.selectorBox}>
                      {xpath || elementSelected?.xpath || '-'}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <EditorButton
                        variant={selectionModeActive ? 'primary' : 'secondary'}
                        style={{ flex: 1 }}
                        onClick={() => {
                          setSelectionModeActive(true);
                          onMessage({ type: 'TAG_FEATURE_CLICKED' });
                        }}
                      >
                        <iconify-icon icon="mdi:cursor-default-click-outline" style={{ fontSize: '1rem', marginRight: '0.375rem' }} />
                        {selectionModeActive ? 'Selecting…' : 'Re-Select Element'}
                      </EditorButton>
                      <EditorButton
                        variant="secondary"
                        style={
                          !selectionModeActive
                            ? { borderWidth: '2px', borderColor: '#3b82f6', background: 'rgba(59, 130, 246, 0.08)', color: '#1d4ed8' }
                            : undefined
                        }
                        onClick={() => {
                          setSelectionModeActive(false);
                          onMessage({ type: 'CLEAR_SELECTION_CLICKED' });
                        }}
                      >
                        Hide Selector
                      </EditorButton>
                    </div>
                  </div>
                  {!editingFeatureId && elementInfo && (
                    <div style={{ marginTop: '1rem' }}>
                      <button
                        type="button"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                          padding: 0,
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          textAlign: 'left',
                        }}
                        onClick={() => setElementInfoExpanded((e) => !e)}
                        aria-expanded={elementInfoExpanded}
                      >
                        <label style={{ ...editorStyles.label, marginBottom: 0, cursor: 'pointer' }}>Element info</label>
                        <iconify-icon
                          icon={elementInfoExpanded ? 'mdi:chevron-up' : 'mdi:chevron-down'}
                          style={{ fontSize: '1.125rem', color: '#64748b', flexShrink: 0 }}
                        />
                      </button>
                      {elementInfoExpanded && (
                        <div style={{ ...editorStyles.elementInfo, marginTop: '0.5rem' }}>
                          <div style={editorStyles.elementInfoText}>{formatElementInfo(elementInfo)}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={editorStyles.footer}>
              <EditorButton variant="secondary" onClick={() => { setSelectionModeActive(false); onMessage({ type: 'CLEAR_SELECTION_CLICKED' }); showOverview(); }}>
                Cancel
              </EditorButton>
              <EditorButton variant="primary" style={{ flex: 1 }} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editingFeatureId ? 'Update' : 'Save'}
              </EditorButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
