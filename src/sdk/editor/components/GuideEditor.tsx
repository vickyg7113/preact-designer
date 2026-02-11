import { useState, useEffect } from 'preact/hooks';
import type { ElementInfo, EditorMessage } from '../../types';
import { getCurrentPage } from '../../utils/dom';
import { editorStyles } from '../editorStyles';
import { EditorButton } from './EditorButton';
import { useGuideById } from '../../hooks/useGuideById';
import { useUpdateGuideMutation } from '../../hooks/useUpdateGuideMutation';
import { LayoutTemplateCard } from './LayoutTemplateCard';

export interface GuideEditorProps {
  onMessage: (msg: EditorMessage) => void;
  elementSelected?: { selector: string; elementInfo: ElementInfo; xpath?: string } | null;
  guideId?: string | null;
  templateId?: string | null;
}

const PLACEMENTS = ['top', 'right', 'bottom', 'left'] as const;

export function GuideEditor({
  onMessage,
  elementSelected,
  guideId = null,
  templateId = null,
}: GuideEditorProps) {
  const [selector, setSelector] = useState('');
  const [xpath, setXpath] = useState<string | undefined>(undefined);
  const [elementInfo, setElementInfo] = useState<ElementInfo | null>(null);
  const [content, setContent] = useState('');
  const [placement, setPlacement] = useState<(typeof PLACEMENTS)[number]>('right');
  const [error, setError] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(templateId ?? null);

  /** When true, show trigger config step (Action + Element) after Next */
  const [showTriggerStep, setShowTriggerStep] = useState(false);
  /** Trigger: 'automatic' | 'on_click', default On click */
  const [triggerAction, setTriggerAction] = useState<'automatic' | 'on_click'>('on_click');
  /** Element selected for triggering the guide (when Action = On click) */
  const [triggerElement, setTriggerElement] = useState<{
    selector: string;
    xpath?: string;
    elementInfo?: ElementInfo;
  } | null>(null);
  /** True only when selector is actually active (user clicked Select element and is waiting to pick). Cleared when selection received or parent clears. */
  const [selectionModeActive, setSelectionModeActive] = useState(false);

  const { data: guideData, isLoading: guideLoading } = useGuideById(guideId);
  const guide = guideData?.data;
  const templates = guide?.templates ?? [];
  const updateGuideMutation = useUpdateGuideMutation();

  /** Selected template’s step (first match by template_id) – for showing its xpath */
  const selectedStep = selectedTemplateId
    ? templates.find((t) => t.template_id === selectedTemplateId)
    : null;

  // Preselect template from URL when guide has loaded
  useEffect(() => {
    if (guide && templateId && templates.some((t) => t.template_id === templateId)) {
      setSelectedTemplateId(templateId);
    }
  }, [guide, templateId, templates]);

  useEffect(() => {
    onMessage({ type: 'EDITOR_READY' });
  }, []);

  // Same pattern as TagFeatureEditor: one effect, route by current view (showTriggerStep).
  useEffect(() => {
    if (elementSelected) {
      // Don't set selectionModeActive to false here - let user manually hide selector
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
        setContent('');
        setError('');
      }
    } else {
      // Only clear selection mode when elementSelected is explicitly null
      if (showTriggerStep) {
        setTriggerElement(null);
      }
      // Template state (selector, elementInfo) is only cleared via handleClearSelection, not when elementSelected becomes null,
      // so that going Back from trigger step (which sends CLEAR) does not wipe the template selection.
    }
  }, [elementSelected, showTriggerStep]);

  const handleSave = () => {
    const trimmed = content.trim();
    if (!trimmed) {
      setError('Please enter guide content');
      return;
    }
    if (!selector) {
      setError('No element selected');
      return;
    }
    setError('');
    onMessage({
      type: 'SAVE_GUIDE',
      guide: {
        page: getCurrentPage(),
        selector,
        content: trimmed,
        placement,
        status: 'active',
      },
    });
  };

  const handleClearSelection = () => {
    setSelectionModeActive(false);
    setSelector('');
    setXpath(undefined);
    setElementInfo(null);
    setContent('');
    setError('');
    onMessage({ type: 'CLEAR_SELECTION_CLICKED' });
  };

  /** Clear current selection and revert to existing xpath from backend */
  const handleRevertToExisting = () => {
    setSelectionModeActive(false);
    setSelector('');
    setXpath(undefined);
    setElementInfo(null);
    setContent('');
    setError('');
    onMessage({ type: 'CLEAR_SELECTION_CLICKED' });
  };

  /** Build guide update payload and call PUT /guides/:guide_id */
  const handleUpdate = async () => {
    if (!guide || !guideId) return;
    const currentUrl = getCurrentPage();
    const selectedXpath =
      xpath ?? (selector && (selector.startsWith('/') || selector.startsWith('//')) ? selector : null);

    const templatesPayload = (guide.steps ?? guide.templates ?? [])
      .slice()
      .sort((a, b) => a.step_order - b.step_order)
      .map((step) => ({
        template_id: step.template_id,
        step_order: step.step_order,
        url: step.template_id === selectedTemplateId ? currentUrl : (step.url ?? currentUrl),
        x_path: step.template_id === selectedTemplateId ? selectedXpath : step.x_path,
      }));

    const payload = {
      guide_name: guide.guide_name ?? '',
      description: guide.description ?? '',
      target_segment: guide.target_segment ?? null,
      guide_category: guide.guide_category ?? null,
      target_page: guide.target_page ?? currentUrl,
      type: guide.type ?? 'modal',
      status: guide.status ?? 'draft',
      priority: guide.priority ?? 0,
      templates: templatesPayload,
    };

    setError('');
    try {
      await updateGuideMutation.mutateAsync({ guideId, payload });
      handleRevertToExisting();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update guide';
      setError(message);
    }
  };

  /** Update guide with trigger action: target_segment = trigger xpath, target_page = current URL */
  const handleUpdateAction = async () => {
    if (!guide || !guideId) return;
    const currentUrl = getCurrentPage();
    const triggerXpath = triggerElement?.xpath ?? (triggerElement?.selector?.startsWith('/') || triggerElement?.selector?.startsWith('//') ? triggerElement?.selector : null) ?? null;

    const templatesPayload = (guide.steps ?? guide.templates ?? [])
      .slice()
      .sort((a, b) => a.step_order - b.step_order)
      .map((step) => ({
        template_id: step.template_id,
        step_order: step.step_order,
        url: step.url ?? currentUrl,
        x_path: step.x_path,
      }));

    const payload = {
      guide_name: guide.guide_name ?? '',
      description: guide.description ?? '',
      target_segment: triggerXpath,
      guide_category: guide.guide_category ?? null,
      target_page: currentUrl,
      type: guide.type ?? 'modal',
      status: guide.status ?? 'draft',
      priority: guide.priority ?? 0,
      templates: templatesPayload,
    };

    setError('');
    try {
      await updateGuideMutation.mutateAsync({ guideId, payload });
      handleRevertToExisting();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update guide';
      setError(message);
    }
  };

  const formatElementInfo = (info: ElementInfo) => {
    const parts: string[] = [];
    if (info.tagName) parts.push(`Tag: ${info.tagName}`);
    if (info.id) parts.push(`ID: ${info.id}`);
    if (info.className) parts.push(`Class: ${info.className}`);
    if (info.textContent) parts.push(`Text: ${info.textContent}`);
    return parts.join(' | ');
  };

  // When we have guideId, show guide name + template list (preselect templateId from URL)
  const showTemplatesView = !!guideId && !!guide;

  return (
    <div style={editorStyles.root}>
      <div style={editorStyles.header}>
        <h2 style={editorStyles.headerTitle}>
          {showTemplatesView ? (guide?.guide_name ?? 'Guide') : 'Create Guide'}
        </h2>
        <EditorButton variant="icon" onClick={() => onMessage({ type: 'CANCEL' })} aria-label="Close">
          <iconify-icon icon="mdi:close" style={{ fontSize: '1.25rem' }} />
        </EditorButton>
      </div>

      {showTriggerStep ? (
        <div style={{ ...editorStyles.section, paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
            <iconify-icon icon="mdi:arrow-left" style={{ marginRight: '0.5rem' }} />
            Back
          </EditorButton>
          {guide?.target_segment && (
            <div style={editorStyles.section}>
              <label style={editorStyles.label}>Current target segment</label>
              <div style={{ ...editorStyles.selectorBox, marginTop: '0.5rem' }} title={guide.target_segment}>
                {guide.target_segment.length > 60 ? guide.target_segment.slice(0, 60) + '…' : guide.target_segment}
              </div>
            </div>
          )}
          <div style={editorStyles.section}>
            <label style={editorStyles.label}>Action</label>
            <select
              value={triggerAction}
              onChange={(e) => setTriggerAction((e.target as HTMLSelectElement).value as 'automatic' | 'on_click')}
              style={{
                width: '100%',
                marginTop: '0.5rem',
                padding: '0.625rem 1rem',
                fontFamily: editorStyles.root.fontFamily,
                fontSize: '0.875rem',
                color: '#334155',
                border: '1px solid #e2e8f0',
                borderRadius: '0.75rem',
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              <option value="automatic">Automatic</option>
              <option value="on_click">On click</option>
            </select>
          </div>
          <div style={editorStyles.section}>
            <label style={editorStyles.label}>Trigger Element</label>
            {triggerElement ? (
              <>
                <div style={{ ...editorStyles.selectorBox, marginTop: '0.5rem' }} title={triggerElement.xpath ?? triggerElement.selector}>
                  {(triggerElement.xpath ?? triggerElement.selector) || '-'}
                </div>
                {triggerElement.elementInfo && (
                  <div style={{ ...editorStyles.elementInfo, marginTop: '0.5rem' }}>
                    <strong style={editorStyles.elementInfoTitle}>Element Info</strong>
                    <div style={editorStyles.elementInfoText}>{formatElementInfo(triggerElement.elementInfo)}</div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <EditorButton
                    variant={selectionModeActive ? 'primary' : 'secondary'}
                    style={{ flex: 1 }}
                    onClick={() => {
                      setSelectionModeActive(true);
                      onMessage({ type: 'ACTIVATE_SELECTOR' });
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
                  {guide?.target_segment && (
                    <EditorButton
                      variant="secondary"
                      style={{ flex: 1, borderColor: '#ef4444', color: '#dc2626' }}
                      onClick={() => {
                        setSelectionModeActive(false);
                        setTriggerElement(null);
                        onMessage({ type: 'CLEAR_SELECTION_CLICKED' });
                      }}
                    >
                      <iconify-icon icon="mdi:undo" style={{ marginRight: '0.25rem' }} />
                      Clear Trigger
                    </EditorButton>
                  )}
                </div>
              </>
            ) : (
              <EditorButton
                variant={selectionModeActive ? 'primary' : 'secondary'}
                style={{ marginTop: '0.5rem' }}
                onClick={() => {
                  setSelectionModeActive(true);
                  onMessage({ type: 'ACTIVATE_SELECTOR' });
                }}
              >
                <iconify-icon icon="mdi:selection-marker" />
                Select element
              </EditorButton>
            )}
          </div>
          <div style={{ ...editorStyles.actionRow, marginTop: '0.5rem' }}>
            <EditorButton
              variant="primary"
              style={{ flex: 1 }}
              onClick={handleUpdateAction}
              disabled={updateGuideMutation.isPending}
            >
              {updateGuideMutation.isPending ? 'Updating…' : 'Update Action'}
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
          ) : showTemplatesView && templates.length > 0 ? (
            <>
              <div style={editorStyles.section}>
                <label style={editorStyles.label}>Templates</label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: '1rem',
                  }}
                >
                  {templates
                    .sort((a, b) => a.step_order - b.step_order)
                    .map((item) => (
                      <LayoutTemplateCard
                        key={`${item.template_id}-${item.step_order}`}
                        item={item}
                        selected={selectedTemplateId === item.template_id}
                        onClick={() => setSelectedTemplateId(item.template_id)}
                      />
                    ))}
                </div>
              </div>
              <div style={editorStyles.section}>
                <label style={editorStyles.label}>Element for selected template</label>
                {selector ? (
                  <>
                    <div style={editorStyles.selectorBox} title={xpath ?? selector}>
                      {((xpath ?? selector).length > 60 ? (xpath ?? selector).slice(0, 60) + '…' : (xpath ?? selector))}
                    </div>
                    {elementInfo && (
                      <div style={{ ...editorStyles.elementInfo, marginTop: '0.5rem' }}>
                        <strong style={editorStyles.elementInfoTitle}>Element Info</strong>
                        <div style={editorStyles.elementInfoText}>{formatElementInfo(elementInfo)}</div>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                      <EditorButton
                        variant={selectionModeActive ? 'primary' : 'secondary'}
                        style={{ flex: 1 }}
                        onClick={() => {
                          setSelectionModeActive(true);
                          onMessage({ type: 'ACTIVATE_SELECTOR' });
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
                      {selectedStep?.x_path && (
                        <EditorButton
                          variant="secondary"
                          style={{ flex: 1, borderColor: '#ef4444', color: '#dc2626' }}
                          onClick={handleRevertToExisting}
                        >
                          <iconify-icon icon="mdi:undo" style={{ marginRight: '0.25rem' }} />
                          Clear Selection
                        </EditorButton>
                      )}
                    </div>
                    <div style={{ ...editorStyles.actionRow, marginTop: '1rem', borderTop: 'none', paddingTop: 0 }}>
                      <EditorButton
                        variant="primary"
                        style={{ flex: 1 }}
                        onClick={handleUpdate}
                        disabled={updateGuideMutation.isPending}
                      >
                        {updateGuideMutation.isPending ? 'Updating…' : 'Update'}
                      </EditorButton>
                    </div>
                  </>
                ) : selectedStep?.x_path ? (
                  <>
                    <div style={editorStyles.selectorBox} title={selectedStep.x_path}>
                      {selectedStep.x_path.length > 60 ? selectedStep.x_path.slice(0, 60) + '…' : selectedStep.x_path}
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                      <EditorButton
                        variant={selectionModeActive ? 'primary' : 'secondary'}
                        style={{ flex: 1 }}
                        onClick={() => {
                          setSelectionModeActive(true);
                          onMessage({ type: 'ACTIVATE_SELECTOR' });
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
                    <div style={{ ...editorStyles.actionRow, marginTop: '1rem', borderTop: 'none', paddingTop: 0 }}>
                      <EditorButton
                        variant="primary"
                        style={{ flex: 1 }}
                        onClick={handleUpdate}
                        disabled={updateGuideMutation.isPending}
                      >
                        {updateGuideMutation.isPending ? 'Updating…' : 'Update'}
                      </EditorButton>
                    </div>
                  </>
                ) : (
                  <EditorButton
                    variant={selectionModeActive ? 'primary' : 'secondary'}
                    onClick={() => {
                      setSelectionModeActive(true);
                      onMessage({ type: 'ACTIVATE_SELECTOR' });
                    }}
                  >
                    <iconify-icon icon="mdi:selection-marker" />
                    Select element
                  </EditorButton>
                )}
              </div>
              <div style={{ ...editorStyles.actionRow, marginTop: '0.5rem' }}>
                <EditorButton variant="primary" onClick={() => setShowTriggerStep(true)}>
                  Next
                </EditorButton>
              </div>
              {showTemplatesView && error && (
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
