import { useState, useEffect, useCallback } from 'preact/hooks';
import type { TagPagePayload, EditorMessage } from '../../types';
import { editorStyles } from '../editorStyles';

const STORAGE_KEY = 'designerTaggedPages';

export interface TagPageEditorProps {
  onMessage: (msg: EditorMessage) => void;
  tagPageSavedAckCounter?: number;
}

interface TaggedPage {
  pageName: string;
  url: string;
}

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

function getTaggedPages(): TaggedPage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || '[]';
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function getSuggestedSelectionUrl(): string {
  try {
    const p = window.location;
    const path = (p.pathname || '/').replace(/^\//, '');
    const search = p.search || '';
    const hash = p.hash || '';
    return '//*/' + path + search + hash;
  } catch {
    return '//*/';
  }
}

type ViewId = 'overviewTagged' | 'overviewUntagged' | 'taggedPagesDetailView' | 'tagPageFormView';

export function TagPageEditor({ onMessage, tagPageSavedAckCounter }: TagPageEditorProps) {
  const [view, setView] = useState<ViewId>('overviewUntagged');
  const [currentUrl, setCurrentUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFormActions, setShowFormActions] = useState(false);
  const [pageSetup, setPageSetup] = useState<'create' | 'merge'>('create');
  const [pageName, setPageName] = useState('');
  const [pageDescription, setPageDescription] = useState('');
  const [ruleType, setRuleType] = useState<'suggested' | 'exact' | 'builder'>('suggested');
  const [selectionUrl, setSelectionUrl] = useState('');
  const [pageNameError, setPageNameError] = useState(false);

  const isCurrentUrlTagged = useCallback(() => {
    const current = normalizeUrl(getCurrentUrl());
    const list = getTaggedPages();
    return list.some((p) => p && normalizeUrl(p.url) === current);
  }, []);

  const getPagesForCurrentUrl = useCallback((): TaggedPage[] => {
    const current = normalizeUrl(getCurrentUrl());
    return getTaggedPages().filter((p) => p && normalizeUrl(p.url) === current);
  }, []);

  const refreshOverview = useCallback(() => {
    const tagged = isCurrentUrlTagged();
    setView(tagged ? 'overviewTagged' : 'overviewUntagged');
    setCurrentUrl(getCurrentUrl() || '(current page)');
    setShowFormActions(false);
  }, [isCurrentUrlTagged]);

  const showTaggedDetailView = useCallback(() => {
    setView('taggedPagesDetailView');
    setSearchQuery('');
  }, []);

  const showTagPageForm = useCallback(() => {
    setView('tagPageFormView');
    setShowFormActions(true);
    setSelectionUrl(getSuggestedSelectionUrl());
    setPageName('');
    setPageDescription('');
    setPageSetup('create');
    setRuleType('suggested');
    setPageNameError(false);
  }, []);

  useEffect(() => {
    onMessage({ type: 'EDITOR_READY' });
  }, []);

  useEffect(() => {
    refreshOverview();
  }, [refreshOverview]);

  useEffect(() => {
    if (tagPageSavedAckCounter != null && tagPageSavedAckCounter > 0) {
      refreshOverview();
    }
  }, [tagPageSavedAckCounter, refreshOverview]);

  useEffect(() => {
    let lastKnownUrl = getCurrentUrl();
    const checkUrlChange = () => {
      const current = getCurrentUrl();
      if (current !== lastKnownUrl) {
        lastKnownUrl = current;
        refreshOverview();
      }
    };
    const handleHashChange = () => checkUrlChange();
    const handlePopState = () => checkUrlChange();
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handlePopState);
    const interval = setInterval(checkUrlChange, 1500);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handlePopState);
      clearInterval(interval);
    };
  }, [refreshOverview]);

  const handleSave = () => {
    const trimmed = pageName.trim();
    if (!trimmed) {
      setPageNameError(true);
      return;
    }
    setPageNameError(false);
    const payload: TagPagePayload = {
      pageSetup,
      pageName: trimmed,
      description: pageDescription.trim() || undefined,
      includeRules: [{ ruleType, selectionUrl: selectionUrl.trim() || '' }],
    };
    onMessage({ type: 'SAVE_TAG_PAGE', payload });
  };

  const handleDeletePage = (pageNameToDelete: string) => {
    if (!window.confirm(`Delete page "${pageNameToDelete}"?`)) return;
    const current = normalizeUrl(getCurrentUrl());
    const list = getTaggedPages().filter(
      (p) => !(p && p.pageName === pageNameToDelete && normalizeUrl(p.url) === current)
    );
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      const remaining = getPagesForCurrentUrl();
      if (remaining.length === 0) {
        refreshOverview();
      } else if (view === 'taggedPagesDetailView') {
        setView('taggedPagesDetailView');
      }
    } catch {
      // ignore
    }
  };

  const filteredPages = getPagesForCurrentUrl().filter((p) =>
    (p.pageName || '').toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const col = { display: 'flex', flexDirection: 'column' as const, flex: 1, gap: '1rem' };

  return (
    <div style={editorStyles.panel}>
      <div style={editorStyles.panelHeader}>
        <h2 style={{ ...editorStyles.headerTitle, fontSize: '1.125rem' }}>Tag Page</h2>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button type="button" style={editorStyles.iconBtn} title="Menu">
            <iconify-icon icon="mdi:dots-horizontal" style={{ fontSize: '1.125rem' }} />
          </button>
          <button type="button" style={editorStyles.iconBtn} title="Minimize" onClick={() => onMessage({ type: 'CANCEL' })}>
            <iconify-icon icon="mdi:window-minimize" style={{ fontSize: '1.125rem' }} />
          </button>
        </div>
      </div>
      <div style={editorStyles.panelBody}>
        {view === 'overviewTagged' && (
          <div style={col}>
            <div style={editorStyles.sectionLabel}>PAGES OVERVIEW</div>
            <div style={{ ...editorStyles.card, marginBottom: '1rem', cursor: 'pointer' }} onClick={showTaggedDetailView}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: '1rem', flex: 1, minWidth: 0 }}>
                  <span style={{ ...editorStyles.badge, background: '#10b981', color: '#fff' }}>Tagged</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>Current URL</div>
                    <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.125rem', wordBreak: 'break-all' }}>{currentUrl}</div>
                  </div>
                </div>
                <iconify-icon icon="mdi:chevron-right" style={{ color: '#94a3b8', fontSize: '1.25rem', flexShrink: 0 }} />
              </div>
            </div>
            <button type="button" style={{ ...editorStyles.primaryBtn, width: '100%' }} onClick={showTagPageForm}>
              Tag Page
            </button>
          </div>
        )}

        {view === 'taggedPagesDetailView' && (
          <div style={col}>
            <a
              href="#"
              style={editorStyles.link}
              onClick={(e) => {
                e.preventDefault();
                refreshOverview();
              }}
            >
              <iconify-icon icon="mdi:arrow-left" /> Back to overview
            </a>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{ ...editorStyles.badge, background: '#3b82f6', color: '#fff', minWidth: '1.5rem', height: '1.5rem' }}>{filteredPages.length}</span>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>Current URL</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>List of tagged Pages on this URL</p>
            <div style={editorStyles.searchWrap}>
              <iconify-icon icon="mdi:magnify" style={editorStyles.searchIcon} />
              <input
                type="text"
                placeholder="Search Pages"
                value={searchQuery}
                onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
                style={editorStyles.searchInput}
              />
              {searchQuery && (
                <button type="button" style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.75rem', cursor: 'pointer' }} onClick={() => setSearchQuery('')}>
                  Clear
                </button>
              )}
            </div>
            {filteredPages.map((p) => (
              <div key={p.pageName} style={{ ...editorStyles.pageItem, marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b', flex: 1 }}>{p.pageName || 'Unnamed'}</span>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button type="button" style={editorStyles.iconBtnSm} title="Edit" onClick={() => onMessage({ type: 'EDIT_TAG_PAGE', payload: { pageName: p.pageName } })}>
                    <iconify-icon icon="mdi:pencil" />
                  </button>
                  <button type="button" style={editorStyles.iconBtnSm} title="Delete" onClick={() => handleDeletePage(p.pageName)}>
                    <iconify-icon icon="mdi:delete-outline" />
                  </button>
                </div>
              </div>
            ))}
            <button type="button" style={{ ...editorStyles.primaryBtn, width: '100%', marginTop: '1rem' }} onClick={showTagPageForm}>
              Tag Page
            </button>
          </div>
        )}

        {view === 'overviewUntagged' && (
          <div style={{ ...col, textAlign: 'center', padding: '2.5rem 1.5rem' }}>
            <div style={{ ...editorStyles.emptyStateIcon, width: '6rem', height: '6rem', marginBottom: '1.5rem', background: 'linear-gradient(to bottom right, #dbeafe, #bfdbfe, #93c5fd)' }}>
              <iconify-icon icon="mdi:tag-plus" style={{ fontSize: '3rem', color: '#3b82f6' }} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>Let's start tagging!</h3>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '2rem', lineHeight: 1.625, maxWidth: '20rem', margin: '0 auto 2rem' }}>
              Start by first tagging this page and then features to get going.
            </p>
            <button type="button" style={{ ...editorStyles.primaryBtn, width: '100%', maxWidth: '20rem', margin: '0 auto' }} onClick={showTagPageForm}>
              Tag Page
            </button>
          </div>
        )}

        {view === 'tagPageFormView' && (
          <div style={{ ...col, gap: '1.5rem' }}>
            <a
              href="#"
              style={editorStyles.link}
              onClick={(e) => {
                e.preventDefault();
                refreshOverview();
                setShowFormActions(false);
              }}
            >
              <iconify-icon icon="mdi:arrow-left" /> Back
            </a>
            <div>
              <div style={editorStyles.sectionLabel}>PAGE SETUP</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <label style={editorStyles.radioLabel}>
                  <input type="radio" name="pageSetup" value="create" checked={pageSetup === 'create'} onChange={() => setPageSetup('create')} style={{ accentColor: '#3b82f6' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#334155' }}>Create New Page</span>
                </label>
                <label style={editorStyles.radioLabel}>
                  <input type="radio" name="pageSetup" value="merge" checked={pageSetup === 'merge'} onChange={() => setPageSetup('merge')} style={{ accentColor: '#3b82f6' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#334155' }}>Merge with Existing</span>
                </label>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
                    Page Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter page name"
                    value={pageName}
                    onInput={(e) => setPageName((e.target as HTMLInputElement).value)}
                    style={editorStyles.input}
                  />
                  {pageNameError && (
                    <p style={{ fontSize: '0.875rem', color: '#dc2626', marginTop: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <iconify-icon icon="mdi:alert-circle" /> Please enter a page name.
                    </p>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>Description</label>
                  <textarea
                    placeholder="Click to add description"
                    value={pageDescription}
                    onInput={(e) => setPageDescription((e.target as HTMLTextAreaElement).value)}
                    style={{ ...editorStyles.textarea, minHeight: '5rem' }}
                  />
                </div>
              </div>
            </div>
            <div>
              <div style={{ ...editorStyles.sectionLabel, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                INCLUDE PAGE RULES
                <span style={{ color: '#94a3b8' }} title="Define how this page is identified">
                  <iconify-icon icon="mdi:information-outline" />
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>Include Rule 1</span>
                <button type="button" style={editorStyles.iconBtnSm}>
                  <iconify-icon icon="mdi:delete-outline" />
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <label style={editorStyles.radioLabel}>
                  <input type="radio" name="ruleType" value="suggested" checked={ruleType === 'suggested'} onChange={() => setRuleType('suggested')} style={{ accentColor: '#3b82f6' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#334155' }}>Suggested Match</span>
                </label>
                <label style={editorStyles.radioLabel}>
                  <input type="radio" name="ruleType" value="exact" checked={ruleType === 'exact'} onChange={() => setRuleType('exact')} style={{ accentColor: '#3b82f6' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#334155' }}>Exact Match</span>
                </label>
                <label style={editorStyles.radioLabel}>
                  <input type="radio" name="ruleType" value="builder" checked={ruleType === 'builder'} onChange={() => setRuleType('builder')} style={{ accentColor: '#3b82f6' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#334155' }}>Rule Builder</span>
                </label>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>Selection URL</label>
                <input type="text" placeholder="e.g. //*/path/to/page" value={selectionUrl} onInput={(e) => setSelectionUrl((e.target as HTMLInputElement).value)} style={editorStyles.input} />
              </div>
            </div>
          </div>
        )}
      </div>
      {showFormActions && (
        <div style={editorStyles.footer}>
          <button type="button" style={editorStyles.secondaryBtn} onClick={refreshOverview}>
            Cancel
          </button>
          <button type="button" style={{ ...editorStyles.primaryBtn, flex: 1 }} onClick={handleSave}>
            Save
          </button>
        </div>
      )}
    </div>
  );
}
