import type { ElementInfo } from '../types';

/**
 * Get element information for editor display
 */
export function getElementInfo(element: Element): ElementInfo {
  const rect = element.getBoundingClientRect();
  const attributes: Record<string, string> = {};

  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i];
    attributes[attr.name] = attr.value;
  }

  return {
    tagName: element.tagName.toLowerCase(),
    id: element.id || undefined,
    className: element.className?.toString() || undefined,
    textContent: element.textContent?.trim().substring(0, 50) || undefined,
    attributes,
    boundingRect: rect,
  };
}

/**
 * Check if element is visible
 */
export function isElementVisible(element: Element): boolean {
  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    element.getBoundingClientRect().height > 0 &&
    element.getBoundingClientRect().width > 0
  );
}

/**
 * Get current page path
 */
export function getCurrentPage(): string {
  return window.location.pathname || '/';
}

/**
 * Create a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if element is in viewport
 */
export function isInViewport(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * Scroll element into view if needed
 */
export function scrollIntoViewIfNeeded(element: Element): void {
  if (!isInViewport(element)) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
