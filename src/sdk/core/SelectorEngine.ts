import type { SelectorResult } from '../types';

/**
 * Selector Engine - Generates stable, replayable selectors for DOM elements
 */
export class SelectorEngine {
  static generateSelector(element: Element): SelectorResult {
    if (element.id) {
      return {
        selector: `#${this.escapeSelector(element.id)}`,
        confidence: 'high',
        method: 'id',
      };
    }

    if (element.hasAttribute('data-testid')) {
      const testId = element.getAttribute('data-testid');
      return {
        selector: `[data-testid="${this.escapeAttribute(testId!)}"]`,
        confidence: 'high',
        method: 'data-testid',
      };
    }

    const dataAttrs = this.getSemanticDataAttributes(element);
    if (dataAttrs.length > 0) {
      const attr = dataAttrs[0];
      const value = element.getAttribute(attr);
      return {
        selector: `[${attr}="${this.escapeAttribute(value!)}"]`,
        confidence: 'high',
        method: 'data-attribute',
      };
    }

    const ariaSelector = this.generateAriaSelector(element);
    if (ariaSelector) {
      return { selector: ariaSelector, confidence: 'medium', method: 'aria' };
    }

    const pathSelector = this.generatePathSelector(element);
    if (pathSelector) {
      return { selector: pathSelector, confidence: 'medium', method: 'path' };
    }

    return {
      selector: element.tagName.toLowerCase(),
      confidence: 'low',
      method: 'tag',
    };
  }

  static findElement(selector: string): Element | null {
    try {
      return document.querySelector(selector);
    } catch {
      return null;
    }
  }

  static validateSelector(selector: string): boolean {
    try {
      return document.querySelector(selector) !== null;
    } catch {
      return false;
    }
  }

  private static getSemanticDataAttributes(element: Element): string[] {
    const semantic = ['data-id', 'data-name', 'data-role', 'data-component', 'data-element'];
    const found: string[] = [];
    for (const attr of semantic) {
      if (element.hasAttribute(attr)) found.push(attr);
    }
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      if (attr.name.startsWith('data-') && !found.includes(attr.name)) {
        found.push(attr.name);
      }
    }
    return found;
  }

  private static generateAriaSelector(element: Element): string | null {
    const role = element.getAttribute('role');
    const ariaLabel = element.getAttribute('aria-label');
    if (role) {
      let sel = `[role="${this.escapeAttribute(role)}"]`;
      if (ariaLabel) sel += `[aria-label="${this.escapeAttribute(ariaLabel)}"]`;
      return sel;
    }
    return null;
  }

  private static generatePathSelector(element: Element): string | null {
    const path: string[] = [];
    let current: Element | null = element;

    while (current && current !== document.body && current !== document.documentElement) {
      let sel = current.tagName.toLowerCase();
      if (current.id) {
        sel += `#${this.escapeSelector(current.id)}`;
        path.unshift(sel);
        break;
      }
      if (current.className && typeof current.className === 'string') {
        const classes = current.className
          .split(/\s+/)
          .filter((c) => c && !c.startsWith('designer-'))
          .slice(0, 2);
        if (classes.length > 0) sel += '.' + classes.map((c) => this.escapeSelector(c)).join('.');
      }
      const parent: Element | null = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          (c: Element) => c.tagName === current!.tagName
        );
        if (siblings.length > 1) {
          sel += `:nth-of-type(${siblings.indexOf(current) + 1})`;
        }
      }
      path.unshift(sel);
      current = parent;
      if (path.length >= 5) break;
    }
    return path.length > 0 ? path.join(' > ') : null;
  }

  private static escapeSelector(s: string): string {
    return typeof CSS !== 'undefined' && CSS.escape
      ? CSS.escape(s)
      : s.replace(/([!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~])/g, '\\$1');
  }

  private static escapeAttribute(value: string): string {
    return value.replace(/"/g, '\\"').replace(/'/g, "\\'");
  }
}
