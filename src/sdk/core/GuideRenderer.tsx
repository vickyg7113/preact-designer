import { render } from 'preact';
import { SelectorEngine } from './SelectorEngine';
import { getCurrentPage, scrollIntoViewIfNeeded, resolveStepContent } from '../utils/dom';
import { GuideTooltip } from '../components/GuideTooltip';
import { LiveGuideCard } from '../components/LiveGuideCard';
import { GuideModal } from '../components/GuideModal';
import { GuideBanner } from '../components/GuideBanner';
import { SpotlightOverlay } from '../components/SpotlightOverlay';
import { SDK_STYLES } from '../styles/constants';
import type { Guide, GuideByIdData, GuideTemplateMapItem } from '../types';

function getArrowStyle(placement: Guide['placement']): Record<string, string> {
  const base = { position: 'absolute' as const };
  switch (placement) {
    case 'top':
      return { ...base, bottom: '-8px', left: '50%', transform: 'translateX(-50%)', borderWidth: '8px 8px 0 8px', borderColor: `${SDK_STYLES.primary} transparent transparent transparent` };
    case 'bottom':
      return { ...base, top: '-8px', left: '50%', transform: 'translateX(-50%)', borderWidth: '0 8px 8px 8px', borderColor: `transparent transparent ${SDK_STYLES.primary} transparent` };
    case 'left':
      return { ...base, right: '-8px', top: '50%', transform: 'translateY(-50%)', borderWidth: '8px 0 8px 8px', borderColor: `transparent transparent transparent ${SDK_STYLES.primary}` };
    case 'right':
    default:
      return { ...base, left: '-8px', top: '50%', transform: 'translateY(-50%)', borderWidth: '8px 8px 8px 0', borderColor: `transparent ${SDK_STYLES.primary} transparent transparent` };
  }
}

function computeTooltipPosition(
  targetElement: Element,
  placement: Guide['placement'],
  tooltipWidth: number,
  tooltipHeight: number
): { top: number; left: number; arrowStyle: Record<string, string> } {
  const targetRect = targetElement.getBoundingClientRect();
  let top = 0;
  let left = 0;

  switch (placement) {
    case 'top':
      top = targetRect.top - tooltipHeight - 12;
      left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
      break;
    case 'bottom':
      top = targetRect.bottom + 12;
      left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
      break;
    case 'left':
      top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
      left = targetRect.left - tooltipWidth - 12;
      break;
    case 'right':
    default:
      top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
      left = targetRect.right + 12;
      break;
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (left < 10) left = 10;
  else if (left + tooltipWidth > vw - 10) left = vw - tooltipWidth - 10;
  if (top < 10) top = 10;
  else if (top + tooltipHeight > vh - 10) top = vh - tooltipHeight - 10;

  return { top, left, arrowStyle: getArrowStyle(placement) };
}

/**
 * Guide Renderer - Renders guides for end users using Preact
 */
export class GuideRenderer {
  private container: HTMLElement | null = null;
  private onDismiss: (guide: GuideByIdData, stepIndex: number) => void | Promise<void> = () => { };
  private onNext: (guide: GuideByIdData, currentStepIndex: number, totalSteps: number) => void | Promise<void> = () => { };
  private onPollResponse: (guide: GuideByIdData, templateId: string, blockId: string, pollType: string, question: string, value: string, stepIndex: number) => void = () => { };
  private lastGuides: Guide[] = [];
  private triggeredGuide: GuideByIdData | null = null;
  private currentStepIndex: number = 0;
  private dismissedThisSession = new Set<string>();
  private surveyPendingAnswers = new Map<string, { pollType: string; question: string; value: string }>();

  setOnDismiss(cb: (guide: GuideByIdData, stepIndex: number) => void | Promise<void>) {
    this.onDismiss = cb;
  }

  setOnNext(cb: (guide: GuideByIdData, currentStepIndex: number, totalSteps: number) => void | Promise<void>) {
    this.onNext = cb;
  }

  setOnPollResponse(cb: (guide: GuideByIdData, templateId: string, blockId: string, pollType: string, question: string, value: string, stepIndex: number) => void) {
    this.onPollResponse = cb;
  }

  private isSurveyMode(): boolean {
    return this.triggeredGuide?.type === 'survey';
  }

  private firePollResponse(blockId: string, pollType: string, question: string, value: string): void {
    if (!this.triggeredGuide) return;
    if (this.isSurveyMode()) {
      this.surveyPendingAnswers.set(blockId, { pollType, question, value });
      return;
    }
    const activeTemplates = (this.triggeredGuide.templates || []).filter(t => t.is_active);
    const sortedTemplates = [...activeTemplates].sort((a, b) => a.step_order - b.step_order);
    const currentTemplate = sortedTemplates[this.currentStepIndex];
    if (currentTemplate) {
      this.onPollResponse(this.triggeredGuide, currentTemplate.template_id, blockId, pollType, question, value, this.currentStepIndex);
    }
  }

  private flushSurveyAnswers(): void {
    if (!this.triggeredGuide || this.surveyPendingAnswers.size === 0) return;
    const activeTemplates = (this.triggeredGuide.templates || []).filter(t => t.is_active);
    const sortedTemplates = [...activeTemplates].sort((a, b) => a.step_order - b.step_order);
    const currentTemplate = sortedTemplates[this.currentStepIndex];
    if (!currentTemplate) return;
    for (const [blockId, { pollType, question, value }] of this.surveyPendingAnswers) {
      this.onPollResponse(this.triggeredGuide, currentTemplate.template_id, blockId, pollType, question, value, this.currentStepIndex);
    }
    this.surveyPendingAnswers.clear();
  }

  renderGuides(guides: Guide[]): void {
    this.lastGuides = guides;
    const currentPage = getCurrentPage();
    const pageGuides = guides.filter(
      (g) => g.page === currentPage && g.status === 'active' && !this.dismissedThisSession.has(g.id)
    );

    this.ensureContainer();
    if (!this.container) return;

    const tooltips: { guide: Guide; target: Element; pos: { top: number; left: number; arrowStyle: Record<string, string> } }[] = [];
    const triggeredTooltips: { template: GuideTemplateMapItem; target: Element; pos: { top: number; left: number }; targetRect: DOMRect; placement: 'top' | 'right' | 'bottom' | 'left' }[] = [];

    for (const guide of pageGuides) {
      const target = SelectorEngine.findElement(guide.selector);
      if (!target) continue;
      scrollIntoViewIfNeeded(target);
      const pos = computeTooltipPosition(target, guide.placement, 280, 80);
      tooltips.push({ guide, target, pos });
    }

    if (this.triggeredGuide && !this.dismissedThisSession.has(this.triggeredGuide.guide_id)) {
      const activeTemplates = (this.triggeredGuide.templates || []).filter(t => t.is_active);
      const sortedTemplates = [...activeTemplates].sort((a, b) => a.step_order - b.step_order);
      const template = sortedTemplates[this.currentStepIndex];

      if (template) {
        if (template.x_path) {
          const target = SelectorEngine.findElement(template.x_path);
          if (target) {
            scrollIntoViewIfNeeded(target);
            let stepPlacement: 'top' | 'right' | 'bottom' | 'left' = 'bottom';
            try {
              const stepContent = JSON.parse(resolveStepContent(template) || '{}');
              const p = stepContent.layout?.placement;
              if (p === 'top' || p === 'right' || p === 'bottom' || p === 'left') stepPlacement = p;
            } catch { /* keep default */ }
            const pos = computeTooltipPosition(target, stepPlacement, 300, 160);
            const targetRect = target.getBoundingClientRect();
            triggeredTooltips.push({ template, target, pos, targetRect, placement: stepPlacement });
          } else {
            console.warn(`[Visual Designer] Target element not found for template "${template.template_id}" using selector: ${template.x_path}`);
          }
        }
      }
    }

    const activeTemplates = (this.triggeredGuide?.templates || []).filter(t => t.is_active);
    const sortedTemplates = [...activeTemplates].sort((a, b) => a.step_order - b.step_order);
    const currentTemplate = sortedTemplates[this.currentStepIndex];
    const isBanner = !!currentTemplate && !currentTemplate.x_path && (() => {
      try { return JSON.parse(resolveStepContent(currentTemplate)).layout?.renderAs === 'banner'; } catch { return false; }
    })();
    const isFloating = !isBanner && !currentTemplate?.x_path;

    if (tooltips.length === 0 && triggeredTooltips.length === 0 && !currentTemplate) {
      render(null, this.container);
      return;
    }

    render(
      <div
        id="designer-guides-container"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: SDK_STYLES.zIndex.guides,
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {triggeredTooltips.length > 0 && (
          <SpotlightOverlay targetRect={triggeredTooltips[0].targetRect} />
        )}
        {tooltips.map(({ guide, pos }) => (
          <GuideTooltip
            key={guide.id}
            guide={guide}
            top={pos.top}
            left={pos.left}
            arrowStyle={pos.arrowStyle}
            onDismiss={() => this.dismissGuide(guide.id)}
          />
        ))}
        {triggeredTooltips.map(({ template, pos, placement, targetRect }) => (
          <LiveGuideCard
            key={this.triggeredGuide!.guide_id}
            template={template}
            top={pos.top}
            left={pos.left}
            placement={placement}
            targetRect={targetRect}
            onDismiss={() => this.dismissTriggeredGuide()}
            onNext={() => this.handleNext()}
            onBack={() => this.handleBack()}
            isFirstStep={this.currentStepIndex === 0}
            isLastStep={this.currentStepIndex === sortedTemplates.length - 1}
            stepIndex={this.currentStepIndex + 1}
            totalSteps={sortedTemplates.length}
            onPollChange={(blockId, pollType, question, value) => this.firePollResponse(blockId, pollType, question, value)}
            surveyMode={this.isSurveyMode()}
          />
        ))}

        {isBanner && currentTemplate && (
          <GuideBanner
            key={`${this.triggeredGuide!.guide_id}-${this.currentStepIndex}`}
            content={resolveStepContent(currentTemplate)}
            onDismiss={() => this.dismissTriggeredGuide()}
            onNext={() => this.handleNext()}
            onBack={() => this.handleBack()}
            onAction={(url) => window.location.href = url}
            isFirstStep={this.currentStepIndex === 0}
            isLastStep={this.currentStepIndex === sortedTemplates.length - 1}
            onPollChange={(blockId, pollType, question, value) => this.firePollResponse(blockId, pollType, question, value)}
            surveyMode={this.isSurveyMode()}
          />
        )}

        {isFloating && currentTemplate && (
          <GuideModal
            key={`${this.triggeredGuide!.guide_id}-${this.currentStepIndex}`}
            content={resolveStepContent(currentTemplate)}
            onDismiss={() => this.dismissTriggeredGuide()}
            onNext={() => this.handleNext()}
            onBack={() => this.handleBack()}
            onAction={(url) => window.location.href = url}
            isFirstStep={this.currentStepIndex === 0}
            isLastStep={this.currentStepIndex === sortedTemplates.length - 1}
            onPollChange={(blockId, pollType, question, value) => this.firePollResponse(blockId, pollType, question, value)}
            surveyMode={this.isSurveyMode()}
          />
        )}
      </div>,
      this.container
    );
  }

  async renderTriggeredGuide(guide: GuideByIdData): Promise<void> {
    this.triggeredGuide = guide;
    this.currentStepIndex = 0;
    this.dismissedThisSession.delete(guide.guide_id); // Re-show if triggered again

    // Wait for the first step's element if it exists
    const activeTemplates = (guide.templates || []).filter(t => t.is_active);
    const sortedTemplates = [...activeTemplates].sort((a, b) => a.step_order - b.step_order);
    const firstTemplate = sortedTemplates[0];

    if (firstTemplate && firstTemplate.x_path) {
      try {
        await SelectorEngine.waitForElement(firstTemplate.x_path);
      } catch (err) {
        console.warn(`[Visual Designer] Timeout waiting for first step element: ${firstTemplate.x_path}`, err);
      }
    }

    this.renderGuides(this.lastGuides);
  }

  handleBack(): void {
    if (!this.triggeredGuide || this.currentStepIndex === 0) return;

    this.surveyPendingAnswers.clear();
    this.currentStepIndex--;

    const activeTemplates = (this.triggeredGuide.templates || []).filter(t => t.is_active);
    const sortedTemplates = [...activeTemplates].sort((a, b) => a.step_order - b.step_order);
    const prevStep = sortedTemplates[this.currentStepIndex];

    if (prevStep?.x_path) {
      const el = SelectorEngine.findElement(prevStep.x_path);
      if (el) scrollIntoViewIfNeeded(el);
    }

    this.renderGuides(this.lastGuides);
  }

  async handleNext(): Promise<void> {
    if (!this.triggeredGuide) return;

    if (this.isSurveyMode()) this.flushSurveyAnswers();

    const activeTemplates = (this.triggeredGuide.templates || []).filter(t => t.is_active);
    const sortedTemplates = [...activeTemplates].sort((a, b) => a.step_order - b.step_order);
    const currentStep = sortedTemplates[this.currentStepIndex];

    // Trigger event for the step just passed BEFORE any potential navigation
    // NOTE: We do NOT await this to ensure the UI progresses immediately (Zero Latency)
    this.onNext(this.triggeredGuide, this.currentStepIndex, sortedTemplates.length);

    // Auto-click underlying element if enabled for this step
    if (currentStep && currentStep.auto_click_target && currentStep.x_path) {
      console.log(`[Visual Designer] Auto-clicking target element for step: ${currentStep.template_id}`);
      const element = SelectorEngine.findElement(currentStep.x_path);
      if (element instanceof HTMLElement) {
        element.click();
      } else if (element) {
        (element as any).click?.();
      }
    }

    if (this.currentStepIndex < sortedTemplates.length - 1) {
      this.currentStepIndex++;

      // Wait for the NEXT step's element to appear
      const nextStep = sortedTemplates[this.currentStepIndex];
      if (nextStep && nextStep.x_path) {
        try {
          // Temporarily hide triggering guide while waiting for next target
          this.renderGuides(this.lastGuides);
          await SelectorEngine.waitForElement(nextStep.x_path);
        } catch (err) {
          console.warn(`[Visual Designer] Target element not found for step: ${nextStep.template_id}`);
        }
      }

      this.renderGuides(this.lastGuides);
    } else {
      this.dismissTriggeredGuide();
    }
  }

  dismissTriggeredGuide(): void {
    if (this.triggeredGuide) {
      const guideData = this.triggeredGuide;
      const sIdx = this.currentStepIndex;
      this.dismissedThisSession.add(guideData.guide_id);
      this.onDismiss(guideData, sIdx);
      this.triggeredGuide = null;
      this.renderGuides(this.lastGuides);
    }
  }

  updatePositions(guides: Guide[]): void {
    this.renderGuides(guides);
  }

  dismissGuide(guideId: string): void {
    this.dismissedThisSession.add(guideId);
    const guideData = this.lastGuides.find(g => g.id === guideId);
    if (guideData) {
      this.onDismiss({
        guide_id: guideData.id,
        guide_name: guideData.content || 'Untitled Guide',
        templates: [],
      } as any, 0);
    }
    this.renderGuides(this.lastGuides);
  }

  clear(): void {
    this.dismissedThisSession.clear();
    if (this.container) {
      render(null, this.container);
    }
  }

  clearTriggeredGuide(): void {
    this.triggeredGuide = null;
    this.currentStepIndex = 0;
    if (this.container) {
      render(null, this.container);
    }
  }

  private ensureContainer(): void {
    if (this.container) return;
    if (!document.body) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.ensureContainer());
        return;
      }
      setTimeout(() => this.ensureContainer(), 100);
      return;
    }
    this.container = document.createElement('div');
    this.container.id = 'designer-guides-root';
    this.container.style.position = 'fixed';
    this.container.style.top = '0';
    this.container.style.left = '0';
    this.container.style.width = '100vw';
    this.container.style.height = '100vh';
    this.container.style.pointerEvents = 'none';
    this.container.style.zIndex = String(SDK_STYLES.zIndex.guides);
    document.body.appendChild(this.container);
  }
}
