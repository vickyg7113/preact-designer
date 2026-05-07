import { useState, useEffect, useMemo, useRef } from 'preact/hooks';
import type { ElementInfo, EditorMessage, GuideUpdatePayload, GuideTemplateMapItem } from '../../types';
import { getCurrentPage, resolveStepContent } from '../../utils/dom';
import { editorStyles } from '../editorStyles';
import { EditorButton } from './EditorButton';
import { InlineTemplateEditor } from './InlineTemplateEditor';
import { useGuideById } from '../../hooks/useGuideById';
import { useUpdateGuideMutation } from '../../hooks/useUpdateGuideMutation';

export interface GuideEditorProps {
  onMessage: (msg: EditorMessage) => void;
  elementSelected?: { selector: string; elementInfo: ElementInfo; xpath?: string } | null;
  guideId?: string | null;
  templateId?: string | null;
}

const PLACEMENTS = ['top', 'right', 'bottom', 'left'] as const;

// 3×3 position grid — null cells are invisible spacers
const POSITION_GRID = [
  'top-left',    'top',    'top-right',
  null,          'center', null,
  'bottom-left', 'bottom', 'bottom-right',
] as const;

const POSITION_ICONS: Record<string, string> = {
  'top-left': '↖', 'top': '↑', 'top-right': '↗',
  'center': '●',
  'bottom-left': '↙', 'bottom': '↓', 'bottom-right': '↘',
};

const POSITION_LABELS: Record<string, string> = {
  'top-left': 'Top Left', 'top': 'Top', 'top-right': 'Top Right',
  'center': 'Center',
  'bottom-left': 'Bottom Left', 'bottom': 'Bottom', 'bottom-right': 'Bottom Right',
};

const STATUS_OPTIONS: Array<{
  value: 'draft' | 'active' | 'inactive' | 'archived';
  label: string;
  bg: string;
  color: string;
  border: string;
  icon: string;
}> = [
  { value: 'draft',    label: 'Draft',    bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1', icon: 'mdi:pencil-outline' },
  { value: 'active',   label: 'Active',   bg: '#dcfce7', color: '#16a34a', border: '#86efac', icon: 'mdi:check-circle-outline' },
  { value: 'inactive', label: 'Inactive', bg: '#fef9c3', color: '#ca8a04', border: '#fde047', icon: 'mdi:pause-circle-outline' },
  { value: 'archived', label: 'Archived', bg: '#fee2e2', color: '#dc2626', border: '#fca5a5', icon: 'mdi:archive-outline' },
];

export function GuideEditor({
  onMessage,
  elementSelected,
  guideId = null,
  templateId = null,
}: GuideEditorProps) {
  const [selector, setSelector] = useState('');
  const [xpath, setXpath] = useState<string | undefined>(undefined);
  const [elementInfo, setElementInfo] = useState<ElementInfo | null>(null);
  const [error, setError] = useState('');
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);

  const [showTriggerStep, setShowTriggerStep] = useState(false);
  const [triggerAction, setTriggerAction] = useState<'automatic' | 'on_click'>('on_click');
  const [triggerElement, setTriggerElement] = useState<{
    selector: string;
    xpath?: string;
    elementInfo?: ElementInfo;
  } | null>(null);
  const [selectionModeActive, setSelectionModeActive] = useState(false);
  const [autoClickTarget, setAutoClickTarget] = useState(false);

  const [layoutMode, setLayoutMode] = useState<'anchored' | 'floating'>('anchored');
  const [floatingStyle, setFloatingStyle] = useState<'modal' | 'banner'>('modal');
  const [modalPosition, setModalPosition] = useState<'center' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('center');
  const [bannerPosition, setBannerPosition] = useState<'top' | 'bottom'>('top');

  // Staged content from InlineTemplateEditor (blocks JSON); null = use saved API content
  const [editedContentOverride, setEditedContentOverride] = useState<string | null>(null);
  const [showContentEditor, setShowContentEditor] = useState(false);

  // UI feedback states
  const [stepSaved, setStepSaved] = useState(false);
  const [triggerSaved, setTriggerSaved] = useState(false);
  const [statusSaved, setStatusSaved] = useState(false);

  const [guideStatus, setGuideStatus] = useState<'draft' | 'active' | 'inactive' | 'archived'>('draft');

  // Survives the React Query refetch so we can re-select the right step by template_id
  // when the API returns new map_id values after a PUT
  const postSaveTemplateId = useRef<string | null>(null);

  const { data: guideData, isLoading: guideLoading } = useGuideById(guideId);
  const guide = guideData?.data;
  const activeSteps = useMemo(() => {
    if (!guide) return [];
    return (guide.templates && guide.templates.length > 0) ? guide.templates : (guide.steps || []);
  }, [guide]);
  const updateGuideMutation = useUpdateGuideMutation();

  const sortedActiveSteps = useMemo(
    () => [...activeSteps].sort((a, b) => a.step_order - b.step_order),
    [activeSteps]
  );

  const selectedStep = useMemo(() => {
    if (!selectedMapId) return null;
    return activeSteps.find((t) => t.map_id === selectedMapId);
  }, [selectedMapId, activeSteps]);

  const selectedStepIndex = useMemo(
    () => sortedActiveSteps.findIndex(s => s.map_id === selectedMapId),
    [sortedActiveSteps, selectedMapId]
  );

  // Extract a readable title from a step's content JSON
  const getStepTitle = (item: GuideTemplateMapItem): string => {
    try {
      const parsed = JSON.parse(resolveStepContent(item) || '{}');
      return (
        parsed.title ||
        parsed.blocks?.[0]?.settings?.content?.slice(0, 24) ||
        item.template.title ||
        ''
      );
    } catch {
      return item.template.title || '';
    }
  };

  useEffect(() => {
    if (activeSteps.length === 0) return;

    if (templateId) {
      const step = activeSteps.find((t) => t.template_id === templateId);
      if (step) setSelectedMapId(step.map_id);
      return;
    }

    // If we have a pending post-save template_id, use it to find the new map_id
    // (the API may return fresh map_ids after a PUT)
    if (postSaveTemplateId.current) {
      const step = activeSteps.find((t) => t.template_id === postSaveTemplateId.current);
      postSaveTemplateId.current = null;
      if (step) { setSelectedMapId(step.map_id); return; }
    }

    // If current selectedMapId is stale (not found in fresh activeSteps), fall back to first step
    const stillValid = activeSteps.some((t) => t.map_id === selectedMapId);
    if (!selectedMapId || !stillValid) {
      setSelectedMapId(activeSteps[0].map_id);
    }
  }, [activeSteps, templateId]);

  useEffect(() => {
    if (guide) {
      setTriggerAction(guide.target_segment ? 'on_click' : 'automatic');
      const s = guide.status as 'draft' | 'active' | 'inactive' | 'archived';
      if (s === 'draft' || s === 'active' || s === 'inactive' || s === 'archived') setGuideStatus(s);
    }
  }, [guide]);

  useEffect(() => {
    setEditedContentOverride(null);
    if (selectedStep) {
      setAutoClickTarget(selectedStep.auto_click_target ?? false);
      setLayoutMode(selectedStep.x_path ? 'anchored' : 'floating');
      try {
        const parsed = JSON.parse(resolveStepContent(selectedStep) || '{}');
        const renderAs = parsed.layout?.renderAs;
        const pos = parsed.layout?.position;
        if (renderAs === 'banner') {
          setFloatingStyle('banner');
          setBannerPosition(pos === 'bottom' ? 'bottom' : 'top');
        } else {
          setFloatingStyle('modal');
          setModalPosition(pos ?? 'center');
        }
      } catch {
        setFloatingStyle('modal');
        setModalPosition('center');
      }
    } else {
      setAutoClickTarget(false);
      setModalPosition('center');
      setLayoutMode('floating');
    }
  }, [selectedStep, guideId]);

  useEffect(() => {
    onMessage({ type: 'EDITOR_READY' });
  }, []);

  useEffect(() => {
    if (elementSelected) {
      if (showTriggerStep) {
        setTriggerElement({
          selector: elementSelected.selector,
          xpath: elementSelected.xpath,
          elementInfo: elementSelected.elementInfo,
        });
      } else {
        setSelector(elementSelected.selector);
        setXpath(elementSelected.xpath);
        setElementInfo(elementSelected.elementInfo);
        setError('');
      }
    } else {
      if (showTriggerStep) {
        setTriggerElement(null);
      }
    }
  }, [elementSelected, showTriggerStep]);

  const handleClearSelection = () => {
    setSelectionModeActive(false);
    setSelector('');
    setXpath(undefined);
    setElementInfo(null);
    setError('');
    onMessage({ type: 'CLEAR_SELECTION_CLICKED' });
  };

  // Removes the saved target element from this step (switches step to floating)
  const handleClearTargetElement = () => {
    setSelectionModeActive(false);
    setSelector('');
    setXpath(undefined);
    setElementInfo(null);
    setLayoutMode('floating');
    setError('');
    onMessage({ type: 'CLEAR_SELECTION_CLICKED' });
  };

  const handleRevertToExisting = () => {
    setSelectionModeActive(false);
    setSelector('');
    setXpath(undefined);
    setElementInfo(null);
    setError('');
    onMessage({ type: 'CLEAR_SELECTION_CLICKED' });
  };

  const getUpdatedContent = (existingContent: string, isFloating: boolean) => {
    try {
      const parsed = JSON.parse(existingContent || '{}');
      if (isFloating) {
        if (!parsed.layout) parsed.layout = {};
        if (floatingStyle === 'banner') {
          parsed.layout.renderAs = 'banner';
          parsed.layout.position = bannerPosition;
        } else {
          parsed.layout.renderAs = 'modal';
          parsed.layout.position = modalPosition;
        }
      }
      return JSON.stringify(parsed);
    } catch {
      if (isFloating) {
        const layout = floatingStyle === 'banner'
          ? { renderAs: 'banner', position: bannerPosition }
          : { renderAs: 'modal', position: modalPosition };
        return JSON.stringify({ layout });
      }
      return existingContent;
    }
  };

  const handleUpdate = async () => {
    if (!guide || !guideId) return;
    const currentUrl = getCurrentPage();
    const currentXpath = xpath ?? (selector && (selector.startsWith('/') || selector.startsWith('//')) ? selector : null);

    const templatesPayload = activeSteps
      .slice()
      .sort((a, b) => a.step_order - b.step_order)
      .map((step) => {
        const isSelected = step.map_id === selectedMapId;
        let finalXpath = step.x_path;
        if (isSelected) {
          finalXpath = layoutMode === 'floating' ? null : (xpath || selector || step.x_path);
        }
        const stepIsFloating = !finalXpath;
        const baseContent = isSelected
          ? (editedContentOverride ?? resolveStepContent(step))
          : resolveStepContent(step);
        return {
          template_id: step.template_id,
          step_order: step.step_order,
          url: isSelected ? currentUrl : (step.url ?? currentUrl),
          x_path: finalXpath,
          auto_click_target: isSelected ? autoClickTarget : (step.auto_click_target ?? false),
          content: isSelected ? getUpdatedContent(baseContent, stepIsFloating) : baseContent,
        };
      });

    const payload: GuideUpdatePayload = {
      guide_name: guide.guide_name ?? '',
      description: guide.description ?? '',
      target_segment: guide.target_segment ?? null,
      guide_category: guide.guide_category ?? null,
      target_page: guide.target_page ?? currentUrl,
      type: guide.type ?? 'modal',
      trigger_type: triggerAction === 'automatic' ? 'page_load' : 'click',
      status: guide.status ?? 'draft',
      priority: guide.priority ?? 0,
      templates: templatesPayload,
    };

    setError('');
    // Store template_id before the mutation so the useEffect can re-select the correct
    // step after React Query refetches (the API may return new map_id values)
    postSaveTemplateId.current = selectedStep?.template_id ?? null;
    try {
      await updateGuideMutation.mutateAsync({ guideId, payload });
      handleRevertToExisting();
      setStepSaved(true);
      setTimeout(() => setStepSaved(false), 2000);
    } catch (err) {
      postSaveTemplateId.current = null;
      const message = err instanceof Error ? err.message : 'Failed to update guide';
      setError(message);
    }
  };

  const handleUpdateAction = async () => {
    if (!guide || !guideId) return;
    const currentUrl = getCurrentPage();
    const triggerXpath = triggerAction === 'automatic'
      ? null
      : (triggerElement?.xpath ?? (triggerElement?.selector?.startsWith('/') || triggerElement?.selector?.startsWith('//') ? triggerElement?.selector : null) ?? null);

    const templatesPayload = activeSteps
      .slice()
      .sort((a, b) => a.step_order - b.step_order)
      .map((step) => {
        const isSelected = step.map_id === selectedMapId;
        let finalXpath = step.x_path;
        if (isSelected) {
          finalXpath = layoutMode === 'floating' ? null : (xpath || selector || step.x_path);
        }
        const stepIsFloating = !finalXpath;
        return {
          template_id: step.template_id,
          step_order: step.step_order,
          url: isSelected ? currentUrl : (step.url ?? currentUrl),
          x_path: finalXpath,
          auto_click_target: isSelected ? autoClickTarget : (step.auto_click_target ?? false),
          content: isSelected ? getUpdatedContent(resolveStepContent(step), stepIsFloating) : resolveStepContent(step),
        };
      });

    const payload: GuideUpdatePayload = {
      guide_name: guide.guide_name ?? '',
      description: guide.description ?? '',
      target_segment: triggerXpath,
      guide_category: guide.guide_category ?? null,
      target_page: currentUrl,
      type: guide.type ?? 'modal',
      trigger_type: triggerAction === 'automatic' ? 'page_load' : 'click',
      status: guide.status ?? 'draft',
      priority: guide.priority ?? 0,
      templates: templatesPayload,
    };

    setError('');
    try {
      await updateGuideMutation.mutateAsync({ guideId, payload });
      handleRevertToExisting();
      setTriggerSaved(true);
      setTimeout(() => {
        setTriggerSaved(false);
        setShowTriggerStep(false);
      }, 1200);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update guide';
      setError(message);
    }
  };

  const handleStatusUpdate = async (newStatus: 'draft' | 'active' | 'inactive' | 'archived') => {
    if (!guide || !guideId) return;
    const currentUrl = getCurrentPage();
    const templatesPayload = activeSteps
      .slice()
      .sort((a, b) => a.step_order - b.step_order)
      .map((step) => ({
        template_id: step.template_id,
        step_order: step.step_order,
        url: step.url ?? currentUrl,
        x_path: step.x_path,
        auto_click_target: step.auto_click_target ?? false,
        content: resolveStepContent(step),
      }));

    const payload: GuideUpdatePayload = {
      guide_name: guide.guide_name ?? '',
      description: guide.description ?? '',
      target_segment: guide.target_segment ?? null,
      guide_category: guide.guide_category ?? null,
      target_page: guide.target_page ?? currentUrl,
      type: guide.type ?? 'modal',
      trigger_type: guide.trigger_type ?? null,
      status: newStatus,
      priority: guide.priority ?? 0,
      templates: templatesPayload,
    };

    setGuideStatus(newStatus);
    setError('');
    try {
      await updateGuideMutation.mutateAsync({ guideId, payload });
      setStatusSaved(true);
      setTimeout(() => setStatusSaved(false), 2000);
    } catch (err) {
      const s = guide.status as 'draft' | 'active' | 'inactive' | 'archived';
      setGuideStatus(['draft', 'active', 'inactive', 'archived'].includes(s) ? s : 'draft');
      const message = err instanceof Error ? err.message : 'Failed to update status';
      setError(message);
    }
  };

  const showTemplatesView = !!guideId && !!guide;

  const currentXpathDisplay = xpath || selector || selectedStep?.x_path || '';
  const triggerXpathDisplay = triggerElement?.xpath ?? triggerElement?.selector ?? '';

  return (
    <div style={editorStyles.root}>
      {showContentEditor && selectedStep && (
        <InlineTemplateEditor
          initialContent={editedContentOverride ?? resolveStepContent(selectedStep)}
          stepLabel={getStepTitle(selectedStep) || `Step ${selectedStepIndex + 1}`}
          onSave={(content) => {
            setEditedContentOverride(content);
            setShowContentEditor(false);
            onMessage({ type: 'COLLAPSE_FROM_FULLSCREEN' });
          }}
          onClose={() => {
            setShowContentEditor(false);
            onMessage({ type: 'COLLAPSE_FROM_FULLSCREEN' });
          }}
          onPreview={(content) => {
            onMessage({
              type: 'PREVIEW_CONTENT',
              content: getUpdatedContent(content, layoutMode === 'floating'),
              xpath: floatingStyle === 'banner' ? null : (xpath || selectedStep.x_path || null),
              layoutMode: floatingStyle === 'banner' ? 'floating' : layoutMode,
              position: floatingStyle === 'banner' ? bannerPosition : modalPosition,
            });
          }}
        />
      )}

      {/* ── Header ── */}
      <div style={editorStyles.header}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <h2 style={editorStyles.headerTitle}>
            {showTriggerStep
              ? 'Configure Trigger'
              : showTemplatesView
                ? (guide?.guide_name ?? 'Guide')
                : 'Create Guide'}
          </h2>
          {showTriggerStep && guide?.guide_name && (
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              for "{guide.guide_name}"
            </span>
          )}
        </div>
        <EditorButton variant="icon" onClick={() => onMessage({ type: 'CANCEL' })} aria-label="Close">
          <iconify-icon icon="mdi:close" style={{ fontSize: '1.25rem' }} />
        </EditorButton>
      </div>

      {/* ── Trigger Config Screen ── */}
      {showTriggerStep ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          <EditorButton
            variant="secondary"
            style={{ alignSelf: 'flex-start' }}
            onClick={() => {
              setSelectionModeActive(false);
              setShowTriggerStep(false);
              setTriggerElement(null);
              onMessage({ type: 'CLEAR_SELECTION_CLICKED' });
            }}
          >
            <iconify-icon icon="mdi:arrow-left" style={{ marginRight: '0.4rem' }} />
            Back to Steps
          </EditorButton>

          {/* Currently triggers on */}
          {guide?.target_segment && (
            <div style={editorStyles.section}>
              <label style={editorStyles.label}>Currently triggers on</label>
              <div style={{
                ...editorStyles.selectorBox,
                marginTop: '0.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <iconify-icon icon="mdi:cursor-default-click" style={{ fontSize: '0.9rem', color: '#3b82f6', flexShrink: 0 }} />
                <span title={guide.target_segment} style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {guide.target_segment.length > 55 ? guide.target_segment.slice(0, 55) + '…' : guide.target_segment}
                </span>
              </div>
            </div>
          )}

          {/* Trigger type */}
          <div style={editorStyles.section}>
            <label style={editorStyles.label}>When should this guide appear?</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
              {(['automatic', 'on_click'] as const).map((val) => {
                const isActive = triggerAction === val;
                return (
                  <label
                    key={val}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      borderRadius: '0.75rem',
                      border: isActive ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                      background: isActive ? 'rgba(59,130,246,0.05)' : '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="triggerAction"
                      value={val}
                      checked={isActive}
                      onChange={() => setTriggerAction(val)}
                      style={{ marginTop: '0.1rem', accentColor: '#3b82f6' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                        {val === 'automatic' ? 'On page load' : 'When an element is clicked'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.125rem' }}>
                        {val === 'automatic'
                          ? 'Guide appears automatically when the page loads'
                          : 'Guide appears when a specific element is clicked'}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Trigger element picker — only when on_click */}
          {triggerAction === 'on_click' && (
            <div style={editorStyles.section}>
              <label style={editorStyles.label}>Which element triggers this guide?</label>
              {triggerElement ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                  {/* Friendly element display */}
                  <div style={{
                    padding: '0.75rem',
                    border: '1px solid #bbf7d0',
                    borderRadius: '0.75rem',
                    background: '#f0fdf4',
                  }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#166534' }}>
                      {triggerElement.elementInfo?.tagName?.toLowerCase() ?? 'element'}
                      {triggerElement.elementInfo?.textContent && (
                        <span style={{ fontWeight: 400, color: '#15803d' }}>
                          {' '}· "{triggerElement.elementInfo.textContent.slice(0, 30)}"
                        </span>
                      )}
                    </div>
                    {triggerElement.elementInfo?.id && (
                      <div style={{ fontSize: '0.7rem', color: '#4ade80', marginTop: '0.125rem' }}>
                        #{triggerElement.elementInfo.id}
                      </div>
                    )}
                    <div style={{ marginTop: '0.25rem', fontFamily: 'monospace', fontSize: '0.68rem', color: '#86efac', wordBreak: 'break-all' }}>
                      {triggerXpathDisplay.slice(0, 60)}{triggerXpathDisplay.length > 60 ? '…' : ''}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <EditorButton
                      variant="secondary"
                      style={{ flex: 1 }}
                      onClick={() => {
                        setSelectionModeActive(true);
                        onMessage({ type: 'ACTIVATE_SELECTOR' });
                      }}
                    >
                      <iconify-icon icon="mdi:cursor-default-click" style={{ marginRight: '0.3rem' }} />
                      Change
                    </EditorButton>
                    {selectionModeActive && (
                      <EditorButton
                        variant="secondary"
                        onClick={() => {
                          setSelectionModeActive(false);
                          onMessage({ type: 'CLEAR_SELECTION_CLICKED' });
                        }}
                      >
                        Done
                      </EditorButton>
                    )}
                    {guide?.target_segment && (
                      <EditorButton
                        variant="secondary"
                        style={{ borderColor: '#fca5a5', color: '#dc2626' }}
                        onClick={() => {
                          setSelectionModeActive(false);
                          setTriggerElement(null);
                          onMessage({ type: 'CLEAR_SELECTION_CLICKED' });
                        }}
                      >
                        Clear
                      </EditorButton>
                    )}
                  </div>
                </div>
              ) : (
                <EditorButton
                  variant={selectionModeActive ? 'primary' : 'secondary'}
                  style={{ marginTop: '0.25rem' }}
                  onClick={() => {
                    setSelectionModeActive(true);
                    onMessage({ type: 'ACTIVATE_SELECTOR' });
                  }}
                >
                  <iconify-icon icon="mdi:cursor-default-click" style={{ marginRight: '0.4rem' }} />
                  {selectionModeActive ? 'Click an element on the page…' : 'Select element'}
                </EditorButton>
              )}
            </div>
          )}

          <div style={{ ...editorStyles.actionRow, marginTop: '0.5rem' }}>
            <EditorButton
              variant="primary"
              style={{ flex: 1 }}
              onClick={handleUpdateAction}
              disabled={updateGuideMutation.isPending || triggerSaved}
            >
              {updateGuideMutation.isPending
                ? 'Saving…'
                : triggerSaved
                  ? '✓ Trigger saved'
                  : 'Save Trigger'}
            </EditorButton>
          </div>

          {error && (
            <div style={editorStyles.errorBox}>
              <iconify-icon icon="mdi:alert-circle" />
              {error}
            </div>
          )}
        </div>

      ) : (
        /* ── Main Step Editor ── */
        <>
          {guideId && guideLoading ? (
            <div style={{ ...editorStyles.emptyState, padding: '2rem' }}>
              <iconify-icon icon="mdi:loading" className="editor-spinner" style={{ fontSize: '2rem', color: '#3b82f6' }} />
              <p style={editorStyles.emptyStateText}>Loading guide…</p>
            </div>
          ) : guideId && !guide ? (
            <div style={{ ...editorStyles.emptyState, padding: '2rem' }}>
              <iconify-icon icon="mdi:alert-circle" style={{ fontSize: '2rem', color: '#94a3b8' }} />
              <p style={editorStyles.emptyStateText}>Guide not found.</p>
            </div>
          ) : showTemplatesView && sortedActiveSteps.length > 0 ? (
            <>
              {/* ── Step pills ── */}
              <div style={editorStyles.section}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={editorStyles.label}>Steps</label>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>
                    {selectedStepIndex + 1} of {sortedActiveSteps.length}
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  gap: '0.4rem',
                  overflowX: 'auto',
                  paddingBottom: '0.25rem',
                  marginTop: '0.4rem',
                }}>
                  {sortedActiveSteps.map((item, index) => {
                    const isSelected = selectedMapId === item.map_id;
                    const title = getStepTitle(item) || `Step ${index + 1}`;
                    return (
                      <button
                        key={item.map_id}
                        onClick={() => setSelectedMapId(item.map_id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.3rem 0.75rem',
                          borderRadius: '9999px',
                          border: isSelected ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                          background: isSelected ? 'rgba(59,130,246,0.08)' : '#f8fafc',
                          color: isSelected ? '#1d4ed8' : '#64748b',
                          fontSize: '0.78rem',
                          fontWeight: isSelected ? 700 : 500,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          fontFamily: editorStyles.root.fontFamily as string,
                        }}
                      >
                        <span style={{ opacity: 0.55, fontSize: '0.7rem' }}>{index + 1}</span>
                        {title.length > 20 ? title.slice(0, 20) + '…' : title}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Guide Status ── */}
              <div style={editorStyles.section}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={editorStyles.label}>Guide Status</label>
                  {statusSaved && (
                    <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600 }}>✓ Saved</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {STATUS_OPTIONS.map((opt) => {
                    const isSelected = guideStatus === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => handleStatusUpdate(opt.value)}
                        disabled={updateGuideMutation.isPending}
                        style={{
                          flex: 1,
                          padding: '0.5rem 0.25rem',
                          borderRadius: '0.625rem',
                          border: `2px solid ${isSelected ? opt.border : '#e2e8f0'}`,
                          background: isSelected ? opt.bg : '#f8fafc',
                          color: isSelected ? opt.color : '#94a3b8',
                          fontSize: '0.72rem',
                          fontWeight: isSelected ? 700 : 500,
                          cursor: updateGuideMutation.isPending ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.2rem',
                          transition: 'all 0.15s',
                          fontFamily: editorStyles.root.fontFamily as string,
                          opacity: updateGuideMutation.isPending ? 0.6 : 1,
                        }}
                      >
                        <iconify-icon icon={opt.icon} style={{ fontSize: '1rem' }} />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Edit Content + Preview buttons ── */}
              <div style={editorStyles.section}>
                <label style={editorStyles.label}>Content</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <EditorButton
                    variant="secondary"
                    style={{ flex: 1 }}
                    onClick={() => {
                      onMessage({ type: 'EXPAND_TO_FULLSCREEN' });
                      setShowContentEditor(true);
                    }}
                  >
                    <iconify-icon icon="mdi:pencil-outline" style={{ marginRight: '0.4rem' }} />
                    Edit Content
                  </EditorButton>
                  <EditorButton
                    variant="secondary"
                    style={{ flexShrink: 0 }}
                    onClick={() => {
                      if (!selectedStep) return;
                      const rawContent = editedContentOverride ?? resolveStepContent(selectedStep);
                      onMessage({
                        type: 'PREVIEW_CONTENT',
                        content: getUpdatedContent(rawContent, layoutMode === 'floating'),
                        xpath: floatingStyle === 'banner' ? null : (xpath || selectedStep.x_path || null),
                        layoutMode: floatingStyle === 'banner' ? 'floating' : layoutMode,
                        position: floatingStyle === 'banner' ? bannerPosition : modalPosition,
                      });
                    }}
                    title="Preview on page"
                  >
                    <iconify-icon icon="mdi:eye-outline" style={{ fontSize: '1rem' }} /> Preview
                  </EditorButton>
                </div>
                {editedContentOverride && (
                  <div style={{
                    fontSize: '0.72rem',
                    color: '#f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    marginTop: '0.1rem',
                  }}>
                    <iconify-icon icon="mdi:circle" style={{ fontSize: '0.5rem' }} />
                    Unsaved content changes — click Save Step to commit
                  </div>
                )}
              </div>

              {/* ── Layout & element config ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* Layout dropdown — always shown */}
                <div style={editorStyles.section}>
                  <label style={editorStyles.label}>Layout</label>
                  <select
                    value={layoutMode}
                    onChange={(e) => {
                      const val = (e.target as HTMLSelectElement).value as 'anchored' | 'floating';
                      setLayoutMode(val);
                      if (val === 'floating') {
                        handleClearSelection();
                      } else if (!xpath && !selector && !selectedStep?.x_path) {
                        setSelectionModeActive(true);
                        onMessage({ type: 'ACTIVATE_SELECTOR' });
                      }
                    }}
                    style={{
                      width: '100%',
                      marginTop: '0.25rem',
                      padding: '0.625rem 1rem',
                      fontFamily: editorStyles.root.fontFamily as string,
                      fontSize: '0.875rem',
                      color: '#334155',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.75rem',
                      background: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="anchored">Anchored to Element (Tooltip)</option>
                    <option value="floating">Floating on Page</option>
                  </select>
                </div>

                {/* When floating: Modal vs Banner style toggle */}
                {layoutMode === 'floating' && (
                  <div style={editorStyles.section}>
                    <label style={editorStyles.label}>Style</label>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                      {(['modal', 'banner'] as const).map((style) => {
                        const isActive = floatingStyle === style;
                        return (
                          <button
                            key={style}
                            onClick={() => setFloatingStyle(style)}
                            style={{
                              flex: 1,
                              padding: '0.6rem',
                              borderRadius: '0.75rem',
                              border: `2px solid ${isActive ? '#3b82f6' : '#e2e8f0'}`,
                              background: isActive ? 'rgba(59,130,246,0.08)' : '#f8fafc',
                              color: isActive ? '#1d4ed8' : '#94a3b8',
                              fontSize: '0.78rem',
                              fontWeight: isActive ? 700 : 500,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.35rem',
                              fontFamily: editorStyles.root.fontFamily as string,
                              transition: 'all 0.15s',
                            }}
                          >
                            <iconify-icon
                              icon={style === 'modal' ? 'mdi:card-outline' : 'mdi:dock-top'}
                              style={{ fontSize: '1rem' }}
                            />
                            {style === 'modal' ? 'Modal' : 'Banner'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {layoutMode === 'anchored' ? (
                  /* ── Anchored: element picker ── */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label style={editorStyles.label}>Target Element</label>

                    {/* Element card — three states */}
                    {elementInfo ? (
                      /* State 1: freshly selected from page (has local elementInfo) */
                      <div style={{
                        position: 'relative',
                        padding: '0.75rem',
                        border: '1px solid #bfdbfe',
                        borderRadius: '0.75rem',
                        background: 'rgba(239,246,255,0.6)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                              <span>{elementInfo.tagName.toLowerCase()}</span>
                              {elementInfo.textContent && (
                                <span style={{ fontWeight: 400, color: '#475569' }}>
                                  {' '}· "{elementInfo.textContent.slice(0, 30)}{elementInfo.textContent.length > 30 ? '…' : ''}"
                                </span>
                              )}
                            </div>
                            {elementInfo.id && (
                              <div style={{ fontSize: '0.72rem', color: '#93c5fd', marginTop: '0.1rem' }}>#{elementInfo.id}</div>
                            )}
                            <div style={{ marginTop: '0.25rem', fontFamily: 'monospace', fontSize: '0.68rem', color: '#94a3b8', wordBreak: 'break-all' }}>
                              {currentXpathDisplay.length > 60 ? currentXpathDisplay.slice(0, 60) + '…' : currentXpathDisplay}
                            </div>
                          </div>
                          {/* Discard this pick and revert to whatever was previously saved */}
                          <button
                            onClick={handleRevertToExisting}
                            title="Discard this selection"
                            style={{
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                              padding: '0.2rem 0.45rem',
                              borderRadius: '0.4rem',
                              border: '1px solid #fca5a5',
                              background: '#fff1f2',
                              color: '#dc2626',
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontFamily: editorStyles.root.fontFamily as string,
                            }}
                          >
                            <iconify-icon icon="mdi:close" style={{ fontSize: '0.68rem' }} />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : selectedStep?.x_path ? (
                      /* State 2: saved from API — no local edit in progress */
                      <div style={{
                        position: 'relative',
                        padding: '0.75rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.75rem',
                        background: '#f8fafc',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <iconify-icon icon="mdi:check-circle" style={{ fontSize: '0.85rem', color: '#22c55e' }} />
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>Element saved</span>
                          </div>
                          {/* Clear element button */}
                          <button
                            onClick={handleClearTargetElement}
                            title="Remove target element (step becomes floating)"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '0.4rem',
                              border: '1px solid #fca5a5',
                              background: '#fff1f2',
                              color: '#dc2626',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontFamily: editorStyles.root.fontFamily as string,
                            }}
                          >
                            <iconify-icon icon="mdi:close" style={{ fontSize: '0.7rem' }} />
                            Clear
                          </button>
                        </div>
                        <div style={{ marginTop: '0.35rem', fontFamily: 'monospace', fontSize: '0.68rem', color: '#94a3b8', wordBreak: 'break-all' }}>
                          {selectedStep.x_path.length > 60 ? selectedStep.x_path.slice(0, 60) + '…' : selectedStep.x_path}
                        </div>
                      </div>
                    ) : (
                      /* State 3: nothing selected yet */
                      <div style={{
                        padding: '0.75rem',
                        border: '1px solid #fed7aa',
                        borderRadius: '0.75rem',
                        background: '#fff7ed',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}>
                        <iconify-icon icon="mdi:alert-circle-outline" style={{ fontSize: '1rem', color: '#f97316', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.8rem', color: '#c2410c' }}>
                          No element selected — use "Select Element" below
                        </span>
                      </div>
                    )}

                    {/* Auto-click toggle */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.625rem 0.75rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.75rem',
                      background: '#fafafa',
                    }}>
                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>Auto-click on Next</div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.1rem' }}>
                          Clicks this element when user advances
                        </div>
                      </div>
                      <button
                        onClick={() => setAutoClickTarget(!autoClickTarget)}
                        style={editorStyles.toggle(autoClickTarget)}
                        aria-label="Toggle auto-click"
                      >
                        <div style={editorStyles.toggleThumb(autoClickTarget)} />
                      </button>
                    </div>

                    {/* Select / Change / Done buttons */}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <EditorButton
                        variant={selectionModeActive ? 'primary' : 'secondary'}
                        style={{ flex: 1 }}
                        onClick={() => {
                          setSelectionModeActive(true);
                          onMessage({ type: 'ACTIVATE_SELECTOR' });
                        }}
                      >
                        <iconify-icon icon="mdi:cursor-default-click" style={{ marginRight: '0.3rem' }} />
                        {currentXpathDisplay ? 'Change Element' : 'Select Element'}
                      </EditorButton>
                      {selectionModeActive && (
                        <EditorButton
                          variant="secondary"
                          onClick={() => {
                            setSelectionModeActive(false);
                            onMessage({ type: 'CLEAR_SELECTION_CLICKED' });
                          }}
                        >
                          Done
                        </EditorButton>
                      )}
                    </div>
                  </div>
                ) : floatingStyle === 'modal' ? (
                  /* ── Floating Modal: 3×3 position grid ── */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={editorStyles.label}>Position on screen</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', marginTop: '0.25rem' }}>
                      {POSITION_GRID.map((pos, i) => {
                        if (!pos) {
                          return <div key={i} />;
                        }
                        const isActive = modalPosition === pos;
                        return (
                          <button
                            key={pos}
                            onClick={() => setModalPosition(pos as any)}
                            title={POSITION_LABELS[pos]}
                            style={{
                              aspectRatio: '1.4 / 1',
                              borderRadius: '0.6rem',
                              border: isActive ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                              background: isActive ? 'rgba(59,130,246,0.08)' : '#f8fafc',
                              color: isActive ? '#1d4ed8' : '#94a3b8',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.15rem',
                              fontFamily: editorStyles.root.fontFamily as string,
                              transition: 'all 0.15s',
                            }}
                          >
                            <span style={{ fontSize: '1rem', lineHeight: 1 }}>{POSITION_ICONS[pos]}</span>
                            <span style={{ fontSize: '0.6rem', fontWeight: isActive ? 700 : 500 }}>
                              {POSITION_LABELS[pos]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* ── Floating Banner: top / bottom picker ── */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={editorStyles.label}>Banner position</label>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                      {(['top', 'bottom'] as const).map((pos) => {
                        const isActive = bannerPosition === pos;
                        return (
                          <button
                            key={pos}
                            onClick={() => setBannerPosition(pos)}
                            style={{
                              flex: 1,
                              padding: '0.6rem',
                              borderRadius: '0.75rem',
                              border: `2px solid ${isActive ? '#3b82f6' : '#e2e8f0'}`,
                              background: isActive ? 'rgba(59,130,246,0.08)' : '#f8fafc',
                              color: isActive ? '#1d4ed8' : '#94a3b8',
                              fontSize: '0.78rem',
                              fontWeight: isActive ? 700 : 500,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.35rem',
                              fontFamily: editorStyles.root.fontFamily as string,
                              transition: 'all 0.15s',
                            }}
                          >
                            <iconify-icon
                              icon={pos === 'top' ? 'mdi:dock-top' : 'mdi:dock-bottom'}
                              style={{ fontSize: '1rem' }}
                            />
                            {pos === 'top' ? 'Top' : 'Bottom'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Save Step */}
                <div style={{ marginTop: '0.25rem' }}>
                  <EditorButton
                    variant="primary"
                    style={{ width: '100%', height: '42px' }}
                    onClick={handleUpdate}
                    disabled={updateGuideMutation.isPending || stepSaved}
                  >
                    {updateGuideMutation.isPending
                      ? 'Saving…'
                      : stepSaved
                        ? '✓ Step saved'
                        : 'Save Step'}
                  </EditorButton>
                </div>
              </div>

              {/* ── Set Trigger button ── */}
              <div style={editorStyles.actionRow}>
                <EditorButton
                  variant="secondary"
                  style={{ flex: 1 }}
                  onClick={() => setShowTriggerStep(true)}
                >
                  <iconify-icon icon="mdi:lightning-bolt" style={{ marginRight: '0.4rem', color: '#f59e0b' }} />
                  Set Trigger
                </EditorButton>
              </div>

              {error && (
                <div style={editorStyles.errorBox}>
                  <iconify-icon icon="mdi:alert-circle" />
                  {error}
                </div>
              )}
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
