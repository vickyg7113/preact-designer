import { SelectorEngine } from './SelectorEngine';
import { getElementInfo, isElementVisible } from '../utils/dom';
import type { EditorMessage } from '../types';

const SDK_SELECTORS = '#designer-editor-frame, #designer-highlight-overlay, #designer-exit-editor-btn, #designer-red-border-overlay, #designer-studio-badge';

/**
 * Editor Mode - Handles DOM instrumentation when editor is active
 */
export class EditorMode {
  private isActive = false;
  private highlightOverlay: HTMLElement | null = null;
  private messageCallback: ((message: EditorMessage) => void) | null = null;

  activate(onMessage: (message: EditorMessage) => void): void {
    if (this.isActive) return;
    this.isActive = true;
    this.messageCallback = onMessage;
    this.createHighlightOverlay();
    this.attachEventListeners();
    this.addEditorStyles();
  }

  deactivate(): void {
    if (!this.isActive) return;
    this.isActive = false;
    this.removeEventListeners();
    this.removeHighlightOverlay();
    this.removeEditorStyles();
    this.messageCallback = null;
  }

  getActive(): boolean {
    return this.isActive;
  }

  private createHighlightOverlay(): void {
    if (!document.body) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.createHighlightOverlay());
        return;
      }
      setTimeout(() => this.createHighlightOverlay(), 100);
      return;
    }

    this.highlightOverlay = document.createElement('div');
    this.highlightOverlay.id = 'designer-highlight-overlay';
    this.highlightOverlay.style.cssText = `
      position: absolute;
      pointer-events: none;
      border: 2px solid #3b82f6;
      background-color: rgba(59, 130, 246, 0.1);
      z-index: 999998;
      transition: all 0.1s ease;
      box-sizing: border-box;
      display: none;
    `;
    document.body.appendChild(this.highlightOverlay);
  }

  private removeHighlightOverlay(): void {
    this.highlightOverlay?.remove();
    this.highlightOverlay = null;
  }

  private attachEventListeners(): void {
    document.addEventListener('mouseover', this.handleMouseOver, true);
    document.addEventListener('click', this.handleClick, true);
    document.addEventListener('keydown', this.handleKeyDown, true);
  }

  private removeEventListeners(): void {
    document.removeEventListener('mouseover', this.handleMouseOver, true);
    document.removeEventListener('click', this.handleClick, true);
    document.removeEventListener('keydown', this.handleKeyDown, true);
  }

  private handleMouseOver = (e: MouseEvent): void => {
    if (!this.isActive || !this.highlightOverlay) return;
    const target = e.target as Element;
    if (!target || target === this.highlightOverlay) return;
    if (target.closest(SDK_SELECTORS)) {
      this.hideHighlight();
      return;
    }
    if (!isElementVisible(target)) {
      this.hideHighlight();
      return;
    }
    this.highlightElement(target);
  };

  private handleClick = (e: MouseEvent): void => {
    if (!this.isActive) return;
    const target = e.target as Element;
    if (!target) return;
    if (target.closest(SDK_SELECTORS)) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    if (!isElementVisible(target)) return;
    this.selectElement(target);
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (!this.isActive) return;
    if (e.key === 'Escape') {
      this.messageCallback?.({ type: 'CANCEL' });
      this.hideHighlight();
    }
  };

  private highlightElement(element: Element): void {
    if (!this.highlightOverlay) return;
    const rect = element.getBoundingClientRect();
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    this.highlightOverlay.style.display = 'block';
    this.highlightOverlay.style.left = `${rect.left + scrollX}px`;
    this.highlightOverlay.style.top = `${rect.top + scrollY}px`;
    this.highlightOverlay.style.width = `${rect.width}px`;
    this.highlightOverlay.style.height = `${rect.height}px`;
  }

  private hideHighlight(): void {
    this.highlightOverlay && (this.highlightOverlay.style.display = 'none');
  }

  private selectElement(element: Element): void {
    this.highlightElement(element);
    const result = SelectorEngine.generateSelector(element);
    const elementInfo = getElementInfo(element);
    this.messageCallback?.({
      type: 'ELEMENT_SELECTED',
      selector: result.selector,
      elementInfo,
    });
  }

  private addEditorStyles(): void {
    const style = document.createElement('style');
    style.id = 'designer-editor-styles';
    style.textContent = `
      * { user-select: none !important; -webkit-user-select: none !important; -moz-user-select: none !important; -ms-user-select: none !important; }
      a, button, input, textarea, select { pointer-events: auto !important; }
    `;
    document.head.appendChild(style);
  }

  private removeEditorStyles(): void {
    document.getElementById('designer-editor-styles')?.remove();
  }
}
