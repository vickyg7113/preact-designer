/**
 * RG Web SDK - Behavioral Detector
 * (copied from rg-web-sdk/src/behavioral-detector.js)
 */

import { INTERACTION_TYPES, BEHAVIORAL_CONFIG } from './constants.js';
import { log } from './utils.js';

class BehavioralDetector {
  constructor() {
    this.clickHistory = [];
    this.deadClickTimers = new Map();
    this.recentErrors = [];
    this.navigationHistory = [];

    this._setupErrorListener();
    this._setupNavigationListener();
  }

  detectClickInteraction(element, clickEvent) {
    const elementKey = this._getElementKey(element);
    const now = Date.now();

    const rageClick = this._detectRageClick(elementKey, now);
    if (rageClick) {
      return INTERACTION_TYPES.RAGE_CLICK;
    }

    const errorClick = this._detectErrorClick(elementKey, now);
    if (errorClick) {
      return INTERACTION_TYPES.ERROR_CLICK;
    }

    this._scheduleDeadClickCheck(element, elementKey, now);
    return INTERACTION_TYPES.NORMAL;
  }

  detectUTurn() {
    const now = Date.now();
    const history = this.navigationHistory;

    if (history.length < 2) return false;

    const current = history[history.length - 1];
    const previous = history[history.length - 2];

    if (
      current.url === previous.url &&
      now - previous.time < BEHAVIORAL_CONFIG.uturnThreshold
    ) {
      return true;
    }

    return false;
  }

  _detectRageClick(elementKey, now) {
    this.clickHistory.push({ elementKey, time: now });

    this.clickHistory = this.clickHistory.filter(
      (click) => now - click.time < BEHAVIORAL_CONFIG.rageClickWindow
    );

    const sameElementClicks = this.clickHistory.filter(
      (click) => click.elementKey === elementKey
    );

    return sameElementClicks.length >= BEHAVIORAL_CONFIG.rageClickThreshold;
  }

  _detectErrorClick(elementKey, now) {
    this.recentErrors = this.recentErrors.filter(
      (error) => now - error.time < BEHAVIORAL_CONFIG.errorClickWindow
    );
    return this.recentErrors.length > 0;
  }

  _scheduleDeadClickCheck(element, elementKey, clickTime) {
    if (this.deadClickTimers.has(elementKey)) {
      clearTimeout(this.deadClickTimers.get(elementKey));
    }

    const timerId = setTimeout(() => {
      const isDeadClick = this._isDeadClick(element, clickTime);

      if (isDeadClick) {
        log('debug', 'Dead click detected:', elementKey);
      }

      this.deadClickTimers.delete(elementKey);
    }, BEHAVIORAL_CONFIG.deadClickDelay);

    this.deadClickTimers.set(elementKey, timerId);
  }

  _isDeadClick(element) {
    const interactiveTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
    if (interactiveTags.includes(element.tagName)) {
      return false;
    }

    if (element.onclick || element.hasAttribute('onclick')) {
      return false;
    }

    let parent = element.parentElement;
    while (parent) {
      if (interactiveTags.includes(parent.tagName)) {
        return false;
      }
      parent = parent.parentElement;
    }

    return true;
  }

  _setupErrorListener() {
    window.addEventListener('error', (event) => {
      this.recentErrors.push({
        message: event.message,
        time: Date.now(),
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.recentErrors.push({
        message: event.reason?.message || 'Promise rejection',
        time: Date.now(),
      });
    });
  }

  _setupNavigationListener() {
    this.navigationHistory.push({
      url: window.location.href,
      time: Date.now(),
    });

    const recordNavigation = () => {
      this.navigationHistory.push({
        url: window.location.href,
        time: Date.now(),
      });

      if (this.navigationHistory.length > 10) {
        this.navigationHistory.shift();
      }
    };

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      originalPushState.apply(this, args);
      recordNavigation();
    };

    history.replaceState = function (...args) {
      originalReplaceState.apply(this, args);
      recordNavigation();
    };

    window.addEventListener('popstate', recordNavigation);
  }

  _getElementKey(element) {
    if (element.id) return `#${element.id}`;

    const tag = element.tagName?.toLowerCase();
    const text = (element.textContent || '').substring(0, 20);
    const rect = element.getBoundingClientRect();

    return `${tag}:${text}:${Math.round(rect.left)},${Math.round(rect.top)}`;
  }

  destroy() {
    this.deadClickTimers.forEach((timerId) => clearTimeout(timerId));
    this.deadClickTimers.clear();

    this.clickHistory = [];
    this.recentErrors = [];
    this.navigationHistory = [];
  }
}

export default BehavioralDetector;

