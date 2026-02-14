import { render } from 'preact';
import { SelectorEngine } from './SelectorEngine';
import { getCurrentPage, scrollIntoViewIfNeeded } from '../utils/dom';
import { GuideTooltip } from '../components/GuideTooltip';
import { LiveGuideCard } from '../components/LiveGuideCard';
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
  private onDismiss: (guideId: string, stepIndex: number) => void = () => { };
  private onNext: (guideId: string, currentStepIndex: number, totalSteps: number) => void = () => { };
  private lastGuides: Guide[] = [];
  private triggeredGuide: GuideByIdData | null = null;
  private currentStepIndex: number = 0;
  private dismissedThisSession = new Set<string>();

  setOnDismiss(cb: (guideId: string, stepIndex: number) => void) {
    this.onDismiss = cb;
  }

  setOnNext(cb: (guideId: string, currentStepIndex: number, totalSteps: number) => void) {
    this.onNext = cb;
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
    const triggeredTooltips: { template: GuideTemplateMapItem; target: Element; pos: { top: number; left: number }; targetRect: DOMRect }[] = [];

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

      if (template && template.x_path) {
        const target = SelectorEngine.findElement(template.x_path);
        if (target) {
          scrollIntoViewIfNeeded(target);
          const pos = computeTooltipPosition(target, 'bottom', 300, 160);

          const targetRect = target.getBoundingClientRect();
          const targetCenter = targetRect.left + targetRect.width / 2;
          pos.left = targetCenter - 16 - 16;

          const vw = window.innerWidth;
          if (pos.left < 10) pos.left = 10;
          else if (pos.left + 300 > vw - 10) pos.left = vw - 300 - 10;

          triggeredTooltips.push({ template, target, pos, targetRect });
        } else {
          console.warn(`[Visual Designer] Target element not found for template "${template.template_id}" using selector: ${template.x_path}`);
        }
      }
    }

    if (tooltips.length === 0 && triggeredTooltips.length === 0) {
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
        {triggeredTooltips.map(({ template, pos }) => (
          <LiveGuideCard
            key={this.triggeredGuide!.guide_id}
            template={template}
            top={pos.top}
            left={pos.left}
            onDismiss={() => this.dismissTriggeredGuide()}
            onNext={() => this.handleNext()}
          />
        ))}
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

  async handleNext(): Promise<void> {
    if (!this.triggeredGuide) return;

    const activeTemplates = (this.triggeredGuide.templates || []).filter(t => t.is_active);
    const sortedTemplates = [...activeTemplates].sort((a, b) => a.step_order - b.step_order);
    const currentStep = sortedTemplates[this.currentStepIndex];

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
      // Trigger event for the step just passed
      this.onNext(this.triggeredGuide.guide_id, this.currentStepIndex, sortedTemplates.length);
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
      // Trigger event for the LAST step just passed
      this.onNext(this.triggeredGuide.guide_id, this.currentStepIndex, sortedTemplates.length);
      this.dismissTriggeredGuide();
    }
  }

  dismissTriggeredGuide(): void {
    if (this.triggeredGuide) {
      const gId = this.triggeredGuide.guide_id;
      const sIdx = this.currentStepIndex;
      this.dismissedThisSession.add(gId);
      this.onDismiss(gId, sIdx);
      this.triggeredGuide = null;
      this.renderGuides(this.lastGuides);
    }
  }

  updatePositions(guides: Guide[]): void {
    this.renderGuides(guides);
  }

  dismissGuide(guideId: string): void {
    this.dismissedThisSession.add(guideId);
    this.onDismiss(guideId, 0);
    this.renderGuides(this.lastGuides);
  }

  clear(): void {
    this.dismissedThisSession.clear();
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
