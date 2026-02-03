import { useState, useEffect, useCallback } from 'preact/hooks';
import { useQueryClient } from '@tanstack/react-query';
import type { EditorMessage } from '../../types';
import { editorStyles } from '../editorStyles';
import { EditorButton } from './EditorButton';
import { EditorInput, EditorTextarea } from './EditorInput';
import { useCreatePageMutation } from '../../hooks/useCreatePageMutation';
import { useUpdatePageMutation } from '../../hooks/useUpdatePageMutation';
import { useDeletePageMutation } from '../../hooks/useDeletePageMutation';
import { useCheckSlug } from '../../hooks/useCheckSlug';
import { usePagesList } from '../../hooks/usePagesList';
import type { PageItem } from '../../hooks/usePagesList';

const STORAGE_KEY = 'designerTaggedPages';
const CHECK_SLUG_QUERY_KEY = ['pages', 'check-slug'] as const;
const PAGES_LIST_QUERY_KEY = ['pages', 'list'] as const;

export interface TagPageEditorProps {
  onMessage: (msg: EditorMessage) => void;
}

/** Use parent window URL when in iframe (designer editor runs in iframe) */
function getCurrentUrl(): string {
  try {
    const w = typeof window !== 'undefined' && window.parent !== window ? window.parent : window;
    const p = w.location;
    return (p.host || p.hostname || '') + (p.pathname || '/') + (p.search || '') + (p.hash || '');
  } catch {
    return typeof window !== 'undefined' && window.parent !== window ? window.parent.location.href : window.location.href || '';
  }
}

function getSuggestedSelectionUrl(): string {
  try {
    const w = typeof window !== 'undefined' && window.parent !== window ? window.parent : window;
    const p = w.location;
    const path = (p.pathname || '/').replace(/^\//, '');
    const search = p.search || '';
    const hash = p.hash || '';
    return '//*/' + path + search + hash;
  } catch {
    return '//*/';
  }
}

type ViewId = 'overviewTagged' | 'overviewUntagged' | 'taggedPagesDetailView' | 'tagPageFormView';

export function TagPageEditor({ onMessage }: TagPageEditorProps) {
  const [view, setView] = useState<ViewId>('overviewUntagged');
  const [currentSlug, setCurrentSlug] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFormActions, setShowFormActions] = useState(false);
  const [pageSetup, setPageSetup] = useState<'create' | 'merge'>('create');
  const [pageName, setPageName] = useState('');
  const [pageDescription, setPageDescription] = useState('');
  const [ruleType, setRuleType] = useState<'suggested' | 'exact' | 'builder'>('suggested');
  const [selectionUrl, setSelectionUrl] = useState('');
  const [pageNameError, setPageNameError] = useState(false);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const queryClient = useQueryClient();
  const createPageMutation = useCreatePageMutation();
  const updatePageMutation = useUpdatePageMutation();
  const deletePageMutation = useDeletePageMutation();
  const { data: checkSlugData, isLoading: slugQueryLoading, isError: slugCheckError } = useCheckSlug(currentSlug);
  const { data: pagesListData, isLoading: pagesListLoading } = usePagesList();
  const slugCheckLoading = !!currentSlug && slugQueryLoading;
  const saving = createPageMutation.isPending || updatePageMutation.isPending;

  const normalizedCurrentSlug = (currentSlug || '').trim().toLowerCase();
  const pagesForCurrentSlug: PageItem[] = (pagesListData?.data ?? []).filter((p) => (p.slug || '').trim().toLowerCase() === normalizedCurrentSlug);
  const filteredPagesList = pagesForCurrentSlug.filter((p) =>
    (p.name || '').toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const refreshOverview = useCallback(() => {
    setView('overviewUntagged');
    setCurrentUrl(getCurrentUrl() || '(current page)');
    setShowFormActions(false);
    queryClient.invalidateQueries({ queryKey: CHECK_SLUG_QUERY_KEY });
  }, [queryClient]);

  const showTaggedDetailView = useCallback(() => {
    setView('taggedPagesDetailView');
    setSearchQuery('');
  }, []);

  const showTagPageForm = useCallback(() => {
    setEditingPageId(null);
    setView('tagPageFormView');
    setShowFormActions(true);
    setSelectionUrl(getSuggestedSelectionUrl());
    setPageName('');
    setPageDescription('');
    setPageSetup('create');
    setRuleType('suggested');
    setPageNameError(false);
  }, []);

  const showEditPageForm = useCallback((page: PageItem) => {
    setEditingPageId(page.page_id);
    setView('tagPageFormView');
    setShowFormActions(true);
    setSelectionUrl(page.slug || getSuggestedSelectionUrl());
    setPageName(page.name || '');
    setPageDescription(page.description || '');
    setPageSetup('create');
    setRuleType('suggested');
    setPageNameError(false);
  }, []);

  useEffect(() => {
    onMessage({ type: 'EDITOR_READY' });
  }, []);

  useEffect(() => {
    setCurrentSlug(getSuggestedSelectionUrl());
    setCurrentUrl(getCurrentUrl() || '(current page)');
  }, []);

  useEffect(() => {
    if (!currentSlug) {
      setView('overviewUntagged');
      return;
    }
    if (slugCheckError) {
      if (view === 'overviewTagged' || view === 'overviewUntagged') setView('overviewUntagged');
      return;
    }
    if (checkSlugData === undefined) return;
    if (view === 'overviewTagged' || view === 'overviewUntagged') {
      setView(checkSlugData.exists ? 'overviewTagged' : 'overviewUntagged');
    }
  }, [currentSlug, checkSlugData, slugCheckError, view]);

  useEffect(() => {
    let lastKnownUrl = getCurrentUrl();
    const checkUrlChange = () => {
      const current = getCurrentUrl();
      if (current !== lastKnownUrl) {
        lastKnownUrl = current;
        setCurrentSlug(getSuggestedSelectionUrl());
        setCurrentUrl(current || '(current page)');
        setView('overviewUntagged');
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
  }, []);

  const handleSave = async () => {
    const trimmed = pageName.trim();
    if (!trimmed) {
      setPageNameError(true);
      return;
    }
    setPageNameError(false);
    const pathnameFallback = typeof window !== 'undefined' && window.parent !== window ? window.parent.location.pathname : window.location.pathname;
    const slug = selectionUrl.trim() || pathnameFallback || '/';
    try {
      if (editingPageId) {
        await updatePageMutation.mutateAsync({
          pageId: editingPageId,
          payload: {
            name: trimmed,
            slug,
            description: pageDescription.trim() || undefined,
            status: 'active',
          },
        });
        setEditingPageId(null);
        queryClient.invalidateQueries({ queryKey: CHECK_SLUG_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: PAGES_LIST_QUERY_KEY });
        refreshOverview();
      } else {
        const currentHref = typeof window !== 'undefined' && window.parent !== window ? window.parent.location.href : window.location.href;
        const urlToStore = selectionUrl.trim() || currentHref;
        await createPageMutation.mutateAsync({
          name: trimmed,
          slug,
          description: pageDescription.trim() || undefined,
        });
        const key = STORAGE_KEY;
        const raw = localStorage.getItem(key) || '[]';
        const list: { pageName: string; url: string }[] = JSON.parse(raw);
        list.push({ pageName: trimmed, url: urlToStore });
        localStorage.setItem(key, JSON.stringify(list));
        queryClient.invalidateQueries({ queryKey: CHECK_SLUG_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: PAGES_LIST_QUERY_KEY });
        setView('overviewTagged');
        setShowFormActions(false);
      }
    } catch {
      // Error already logged by mutation; keep form open
    }
  };

  const handleDeletePage = async (pageId: string) => {
    if (!window.confirm('Delete this page?')) return;
    try {
      await deletePageMutation.mutateAsync(pageId);
      queryClient.invalidateQueries({ queryKey: CHECK_SLUG_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PAGES_LIST_QUERY_KEY });
    } catch {
      // Error already logged by mutation
    }
  };


  const col = { display: 'flex', flexDirection: 'column' as const, flex: 1, gap: '1rem' };

  if (isMinimized) {
    return (
      <div style={{ ...editorStyles.panel, padding: '0.5rem' }}>
        <div style={editorStyles.panelHeader}>
          <h2 style={{ ...editorStyles.headerTitle, fontSize: '1.125rem' }}>Tag Page</h2>
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
        <h2 style={{ ...editorStyles.headerTitle, fontSize: '1.125rem' }}>Tag Page</h2>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <EditorButton variant="icon" title="Minimize" onClick={() => setIsMinimized(true)}>
            <iconify-icon icon="mdi:window-minimize" style={{ fontSize: '1.125rem' }} />
          </EditorButton>
        </div>
      </div>
      <div style={editorStyles.panelBody}>
        {slugCheckLoading && (view === 'overviewTagged' || view === 'overviewUntagged') && (
          <div style={{ ...col, alignItems: 'center', justifyContent: 'center', padding: '2rem', color: '#64748b', fontSize: '0.875rem' }}>
            <iconify-icon icon="mdi:loading" className="editor-spinner" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }} />
            <span>Checking page…</span>
          </div>
        )}
        {!slugCheckLoading && view === 'overviewTagged' && (
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
            <EditorButton variant="primary" style={{ width: '100%' }} onClick={showTagPageForm}>
              Tag Page
            </EditorButton>
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
              <span style={{ ...editorStyles.badge, background: '#3b82f6', color: '#fff', minWidth: '1.5rem', height: '1.5rem' }}>{pagesListLoading ? '…' : filteredPagesList.length}</span>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>Current URL</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>List of tagged Pages on this URL</p>
            <div style={editorStyles.searchWrap}>
              <iconify-icon icon="mdi:magnify" style={editorStyles.searchIcon} />
              <EditorInput
                type="text"
                placeholder="Search Pages"
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
            {pagesListLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', color: '#64748b', fontSize: '0.875rem' }}>
                <iconify-icon icon="mdi:loading" className="editor-spinner" style={{ fontSize: '1.25rem', marginRight: '0.5rem' }} />
                <span>Loading pages…</span>
              </div>
            ) : (
              filteredPagesList.map((p) => (
                <div key={p.page_id} style={{ ...editorStyles.pageItem, marginBottom: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b', flex: 1 }}>{p.name || 'Unnamed'}</span>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <EditorButton variant="iconSm" title="Edit" onClick={() => showEditPageForm(p)}>
                      <iconify-icon icon="mdi:pencil" />
                    </EditorButton>
                    <EditorButton variant="iconSm" title="Delete" onClick={() => handleDeletePage(p.page_id)}>
                      <iconify-icon icon="mdi:delete-outline" />
                    </EditorButton>
                  </div>
                </div>
              ))
            )}
            <EditorButton variant="primary" style={{ width: '100%', marginTop: '1rem' }} onClick={showTagPageForm}>
              Tag Page
            </EditorButton>
          </div>
        )}

        {!slugCheckLoading && view === 'overviewUntagged' && (
          <div style={{ ...col, textAlign: 'center', padding: '2.5rem 1.5rem' }}>
            <div style={{ ...editorStyles.emptyStateIcon, width: '6rem', height: '6rem', marginBottom: '1.5rem', background: 'linear-gradient(to bottom right, #dbeafe, #bfdbfe, #93c5fd)' }}>
              <iconify-icon icon="mdi:tag-plus" style={{ fontSize: '3rem', color: '#3b82f6' }} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>Let's start tagging!</h3>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '2rem', lineHeight: 1.625, maxWidth: '20rem', margin: '0 auto 2rem' }}>
              Start by first tagging this page and then features to get going.
            </p>
            <EditorButton variant="primary" style={{ width: '100%', maxWidth: '20rem', margin: '0 auto' }} onClick={showTagPageForm}>
              Tag Page
            </EditorButton>
          </div>
        )}

        {view === 'tagPageFormView' && (
          <div style={{ ...col, gap: '1.5rem' }}>
            <a
              href="#"
              style={editorStyles.link}
              onClick={(e) => {
                e.preventDefault();
                setEditingPageId(null);
                refreshOverview();
                setShowFormActions(false);
              }}
            >
              <iconify-icon icon="mdi:arrow-left" /> Back
            </a>
            <div>
              <div style={editorStyles.sectionLabel}>{editingPageId ? 'EDIT PAGE' : 'PAGE SETUP'}</div>
              {!editingPageId && (
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
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
                    Page Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <EditorInput
                    type="text"
                    placeholder="Enter page name"
                    value={pageName}
                    onInput={(e) => setPageName((e.target as HTMLInputElement).value)}
                  />
                  {pageNameError && (
                    <p style={{ fontSize: '0.875rem', color: '#dc2626', marginTop: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <iconify-icon icon="mdi:alert-circle" /> Please enter a page name.
                    </p>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>Description</label>
                  <EditorTextarea
                    placeholder="Click to add description"
                    value={pageDescription}
                    onInput={(e) => setPageDescription((e.target as HTMLTextAreaElement).value)}
                    minHeight="5rem"
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
                <EditorButton variant="iconSm">
                  <iconify-icon icon="mdi:delete-outline" />
                </EditorButton>
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
                <EditorInput type="text" placeholder="e.g. //*/path/to/page" value={selectionUrl} onInput={(e) => setSelectionUrl((e.target as HTMLInputElement).value)} />
              </div>
            </div>
          </div>
        )}
      </div>
      {showFormActions && (
        <div style={editorStyles.footer}>
          <EditorButton
            variant="secondary"
            onClick={() => {
              setEditingPageId(null);
              refreshOverview();
            }}
            disabled={saving}
          >
            Cancel
          </EditorButton>
          <EditorButton variant="primary" style={{ flex: 1 }} onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <iconify-icon icon="mdi:loading" className="editor-spinner" style={{ fontSize: '1.125rem', marginRight: '0.375rem' }} />
                {editingPageId ? 'Updating…' : 'Saving…'}
              </>
            ) : editingPageId ? (
              'Update'
            ) : (
              'Save'
            )}
          </EditorButton>
        </div>
      )}
    </div>
  );
}
