import { render } from 'preact';
import type { Guide } from '../types';
import { SelectorEngine } from './SelectorEngine';
import { getCurrentPage, scrollIntoViewIfNeeded } from '../utils/dom';
import { GuideTooltip } from '../components/GuideTooltip';
import { SDK_STYLES } from '../styles/constants';

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
  const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollY = window.pageYOffset || document.documentElement.scrollTop;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let top = 0;
  let left = 0;

  switch (placement) {
    case 'top':
      top = targetRect.top + scrollY - tooltipHeight - 12;
      left = targetRect.left + scrollX + targetRect.width / 2 - tooltipWidth / 2;
      break;
    case 'bottom':
      top = targetRect.bottom + scrollY + 12;
      left = targetRect.left + scrollX + targetRect.width / 2 - tooltipWidth / 2;
      break;
    case 'left':
      top = targetRect.top + scrollY + targetRect.height / 2 - tooltipHeight / 2;
      left = targetRect.left + scrollX - tooltipWidth - 12;
      break;
    case 'right':
    default:
      top = targetRect.top + scrollY + targetRect.height / 2 - tooltipHeight / 2;
      left = targetRect.right + scrollX + 12;
      break;
  }

  if (left < scrollX) left = scrollX + 10;
  else if (left + tooltipWidth > scrollX + vw) left = scrollX + vw - tooltipWidth - 10;
  if (top < scrollY) top = scrollY + 10;
  else if (top + tooltipHeight > scrollY + vh) top = scrollY + vh - tooltipHeight - 10;

  return { top, left, arrowStyle: getArrowStyle(placement) };
}

/**
 * Guide Renderer - Renders guides for end users using Preact
 */
export class GuideRenderer {
  private container: HTMLElement | null = null;
  private onDismiss: (guideId: string) => void = () => {};
  private lastGuides: Guide[] = [];
  private dismissedThisSession = new Set<string>();

  setOnDismiss(cb: (guideId: string) => void) {
    this.onDismiss = cb;
  }

  renderGuides(guides: Guide[]): void {
    this.lastGuides = guides;
    const currentPage = getCurrentPage();
    const pageGuides = guides.filter(
      (g) => g.page === currentPage && g.status === 'active' && !this.dismissedThisSession.has(g.id)
    );

    if (pageGuides.length === 0) return;

    this.ensureContainer();
    if (!this.container) return;

    const tooltips: { guide: Guide; target: Element; pos: { top: number; left: number; arrowStyle: Record<string, string> } }[] = [];

    for (const guide of pageGuides) {
      const target = SelectorEngine.findElement(guide.selector);
      if (!target) continue;
      scrollIntoViewIfNeeded(target);
      const pos = computeTooltipPosition(target, guide.placement, 280, 80);
      tooltips.push({ guide, target, pos });
    }

    render(
      <div
        id="designer-guides-container"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: SDK_STYLES.zIndex.guides,
        }}
      >
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
      </div>,
      this.container
    );
  }

  updatePositions(guides: Guide[]): void {
    this.renderGuides(guides);
  }

  dismissGuide(guideId: string): void {
    this.dismissedThisSession.add(guideId);
    this.onDismiss(guideId);
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
    document.body.appendChild(this.container);
  }
}
