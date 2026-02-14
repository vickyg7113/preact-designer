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

    const containsSel = this.generateContainsSelector(element);
    if (containsSel) return containsSel;

    const pathFromAnchor = this.generatePathFromAnchorToElement(element);
    if (pathFromAnchor) return pathFromAnchor;

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

  /** Generate absolute XPath for an element (e.g. /html[1]/body[1]/div[1]/...) */
  static getXPath(element: Element): string {
    if (element.id && document.querySelector(`#${CSS.escape(element.id)}`) === element) {
      return `//*[@id="${element.id.replace(/"/g, '\\"')}"]`;
    }
    const parts: string[] = [];
    let current: Element | null = element;
    while (current && current !== document.documentElement) {
      const tag = current.tagName.toLowerCase();
      const parent: Element | null = current.parentElement;
      if (!parent) {
        parts.unshift(tag);
        break;
      }
      const siblings = Array.from(parent.children).filter((el: Element) => el.tagName === current!.tagName);
      const index = siblings.indexOf(current!) + 1;
      parts.unshift(`${tag}[${index}]`);
      current = parent;
    }
    const xpathParts = parts.join('/');
    let res = xpathParts ? `/${xpathParts}` : '';

    // Normalize: ensure it starts with /html[1] if it's an absolute-ish path missing it
    if (!res.startsWith('/html')) {
      res = '/html[1]' + (res.startsWith('/') ? res : '/' + res);
    }

    return res;
  }

  static findElement(selector: string): Element | null {
    try {
      if (selector.startsWith('/') || selector.startsWith('//')) {
        return this.findElementByXPath(selector);
      }
      const parsed = this.parseContainsAndDescendant(selector);
      if (parsed) {
        const anchor = this.findElementWithContains(parsed.anchorPart);
        if (!anchor) return null;
        if (parsed.descendantPart) {
          const child = anchor.querySelector(parsed.descendantPart);
          return child ? child : null;
        }
        return anchor;
      }
      const endContainsMatch = selector.match(/(.*):contains\('((?:[^'\\]|\\.)*)'\)$/);
      if (endContainsMatch) {
        return this.findElementWithContains(selector);
      }
      return document.querySelector(selector);
    } catch {
      return null;
    }
  }

  /** "anchorPart:contains('x') > descendantPart" -> { anchorPart, descendantPart } */
  private static parseContainsAndDescendant(selector: string): { anchorPart: string; descendantPart: string | null } | null {
    const m = selector.match(/:contains\('((?:[^'\\]|\\.)*)'\)/);
    if (!m) return null;
    const endOfContains = selector.indexOf(m[0]) + m[0].length;
    const after = selector.slice(endOfContains);
    const arrow = after.indexOf(' > ');
    if (arrow === -1) return null;
    return {
      anchorPart: selector.slice(0, endOfContains + arrow).trim(),
      descendantPart: after.slice(arrow + 3).trim() || null,
    };
  }

  static findElementByXPath(xpath: string): Element | null {
    try {
      let normalizedXpath = xpath;
      if (normalizedXpath.startsWith('/body')) {
        normalizedXpath = '/html[1]' + normalizedXpath;
      }
      const result = document.evaluate(normalizedXpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      return result.singleNodeValue as Element | null;
    } catch {
      return null;
    }
  }

  private static findElementWithContains(selector: string): Element | null {
    const match = selector.match(/(.*):contains\('((?:[^'\\]|\\.)*)'\)$/);
    if (!match) return null;
    const base = match[1].trim();
    const text = match[2].replace(/\\'/g, "'");
    const needle = this.normalizeText(text);
    const candidates = document.querySelectorAll(base);
    for (let i = 0; i < candidates.length; i++) {
      if (this.normalizeText(candidates[i].textContent || '').includes(needle)) return candidates[i];
    }
    return null;
  }

  static validateSelector(selector: string): boolean {
    try {
      return this.findElement(selector) !== null;
    } catch {
      return false;
    }
  }

  /**
   * Waits for an element to appear in the DOM using MutationObserver.
   * Leverages findElement for consistent behavior with XPaths/Selectors.
   */
  static waitForElement(selector: string, timeout = 5000): Promise<Element> {
    return new Promise((resolve, reject) => {
      // 1. Initial check
      const element = this.findElement(selector);
      if (element) return resolve(element);

      // 2. Set up observer
      const observer = new MutationObserver(() => {
        const el = this.findElement(selector);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });

      observer.observe(document.body, {
        childList: true,
      });

      // 3. Handle timeout
      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element not found: ${selector}`));
      }, timeout);
    });
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

  private static normalizeText(s: string): string {
    return (s || '').trim().replace(/\s+/g, ' ');
  }

  /** Single segment: tag + classes + nth-of-type (no id) */
  private static buildSegment(el: Element): string {
    let sel = el.tagName.toLowerCase();
    if (el.className && typeof el.className === 'string') {
      const classes = el.className
        .split(/\s+/)
        .filter((c) => c && !c.startsWith('designer-'))
        .slice(0, 2);
      if (classes.length > 0) sel += '.' + classes.map((c) => this.escapeSelector(c)).join('.');
    }
    const parent = el.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter((c: Element) => c.tagName === el.tagName);
      if (siblings.length > 1) sel += `:nth-of-type(${siblings.indexOf(el) + 1})`;
    }
    return sel;
  }

  /** Path from ancestor down to element (inclusive): [ancestor, ..., element] */
  private static getPathFromAncestorToElement(ancestor: Element, element: Element): Element[] {
    const path: Element[] = [];
    let current: Element | null = element;
    while (current && current !== ancestor) {
      path.unshift(current);
      current = current.parentElement;
    }
    if (current === ancestor) path.unshift(ancestor);
    return path;
  }

  /** Contains selector when element has meaningful text: path + :contains('text') */
  private static generateContainsSelector(element: Element): SelectorResult | null {
    const raw = (element.textContent || '').trim();
    const text = raw.replace(/\s+/g, ' ').slice(0, 200);
    if (text.length < 2) return null;
    const pathSelector = this.generatePathSelector(element);
    if (!pathSelector) return null;
    const escaped = text.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    return {
      selector: `${pathSelector}:contains('${escaped}')`,
      confidence: 'high',
      method: 'contains',
    };
  }

  /**
   * Find first ancestor (step by step) that has id or meaningful text.
   * Used when the selected element (e.g. icon) has no id and no text.
   */
  private static findAnchor(element: Element): { anchor: Element; hasId: boolean } | null {
    let current: Element | null = element.parentElement;
    while (current && current !== document.body && current !== document.documentElement) {
      if (current.id) return { anchor: current, hasId: true };
      const text = (current.textContent || '').trim().replace(/\s+/g, ' ');
      if (text.length >= 2) return { anchor: current, hasId: false };
      current = current.parentElement;
    }
    return null;
  }

  /**
   * When element has no id and no text (e.g. icon): traverse to parent with id or text,
   * then return selector = entire path from that anchor to the selected element.
   */
  private static generatePathFromAnchorToElement(element: Element): SelectorResult | null {
    const found = this.findAnchor(element);
    if (!found) return null;
    const { anchor, hasId } = found;
    const path = this.getPathFromAncestorToElement(anchor, element);
    if (path.length < 2) return null;
    const maxPathDepth = 12;
    if (path.length > maxPathDepth) return null;
    const segments: string[] = [];
    if (hasId) {
      segments.push(`#${this.escapeSelector(anchor.id)}`);
      for (let i = 1; i < path.length; i++) segments.push(this.buildSegment(path[i]));
    } else {
      const anchorText = (anchor.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 200);
      if (anchorText.length < 2) return null;
      const pathToAnchor = this.generatePathSelector(anchor);
      if (!pathToAnchor) return null;
      const escaped = anchorText.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      segments.push(`${pathToAnchor}:contains('${escaped}')`);
      for (let i = 1; i < path.length; i++) segments.push(this.buildSegment(path[i]));
    }
    return {
      selector: segments.join(' > '),
      confidence: 'high',
      method: 'path-from-anchor',
    };
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
