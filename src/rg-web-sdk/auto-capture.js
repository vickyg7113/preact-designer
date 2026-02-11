/**
 * RG Web SDK - Auto-Capture Engine
 * (copied from rg-web-sdk/src/auto-capture.js)
 */

import {
  EVENT_TYPES,
  EVENT_CATEGORIES,
  DEBOUNCE_DELAYS,
  RATE_LIMITS,
  INTERACTION_TYPES,
} from './constants.js';
import {
  log,
  debounce,
  getElementXPath,
  getElementSelector,
  getElementText,
  isElementVisible,
} from './utils.js';
import BehavioralDetector from './behavioral-detector.js';

class AutoCaptureEngine {
  constructor(eventBuilder, privacyEngine, config) {
    this.eventBuilder = eventBuilder;
    this.privacyEngine = privacyEngine;
    this.config = config;

    this.listeners = [];
    this.lastPageViewTime = 0;
    this.lastPageViewUrl = null;
    this.scrollMilestones = {
      25: false,
      50: false,
      75: false,
      100: false,
    };
    this.rateLimiters = {};
    this.onEventCapture = null;
    this.isRunning = false;
    this.behavioralDetector = new BehavioralDetector();
  }

  start(onEventCapture) {
    if (this.isRunning) {
      log('warn', 'Auto-capture already running');
      return;
    }

    this.onEventCapture = onEventCapture;
    this.isRunning = true;

    if (this.config.autoPageViews) {
      this._startPageViewTracking();
    }

    if (this.config.autoCapture) {
      this._startClickTracking();
      this._startInputTracking();
      this._startScrollTracking();
      this._startErrorTracking();
    }

    log('info', 'Auto-capture started');
  }

  stop() {
    if (!this.isRunning) return;

    this.listeners.forEach(({ target, event, handler, options }) => {
      target.removeEventListener(event, handler, options);
    });
    this.listeners = [];

    if (this.behavioralDetector) {
      this.behavioralDetector.destroy();
    }

    this.isRunning = false;
    log('info', 'Auto-capture stopped');
  }

  _addListener(target, event, handler, options = false) {
    target.addEventListener(event, handler, options);
    this.listeners.push({ target, event, handler, options });
  }

  _checkRateLimit(eventType) {
    const limit = RATE_LIMITS[eventType];
    if (!limit) return true;

    if (!this.rateLimiters[eventType]) {
      this.rateLimiters[eventType] = [];
    }

    const now = Date.now();
    const limiter = this.rateLimiters[eventType];

    this.rateLimiters[eventType] = limiter.filter((t) => now - t < limit.window);

    if (this.rateLimiters[eventType].length >= limit.limit) {
      return false;
    }

    this.rateLimiters[eventType].push(now);
    return true;
  }

  _emit(eventData) {
    if (!this.onEventCapture) return;

    const event = this.eventBuilder.buildEvent(eventData);
    const sanitizedEvent = this.privacyEngine.processEvent(event);

    if (sanitizedEvent) {
      this.onEventCapture(sanitizedEvent);
    }
  }

  _startPageViewTracking() {
    this._capturePageView();

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    const capturePageView = debounce(() => this._capturePageView(), DEBOUNCE_DELAYS.pageView);

    history.pushState = function (...args) {
      originalPushState.apply(this, args);
      capturePageView();
    };

    history.replaceState = function (...args) {
      originalReplaceState.apply(this, args);
      capturePageView();
    };

    this._addListener(window, 'popstate', () => {
      capturePageView();
    });

    this._addListener(window, 'hashchange', () => {
      capturePageView();
    });
  }

  _capturePageView() {
    const now = Date.now();
    const currentUrl = window.location.href;

    if (now - this.lastPageViewTime < DEBOUNCE_DELAYS.pageView) {
      return;
    }

    if (currentUrl === this.lastPageViewUrl) {
      return;
    }

    this.lastPageViewTime = now;
    this.lastPageViewUrl = currentUrl;
    this.scrollMilestones = { 25: false, 50: false, 75: false, 100: false };

    const isUTurn = this.behavioralDetector.detectUTurn();

    this._emit({
      event_name: EVENT_TYPES.PAGE_VIEW,
      event_type: EVENT_CATEGORIES.NAVIGATION,
      interaction_type: isUTurn ? INTERACTION_TYPES.U_TURN : INTERACTION_TYPES.NORMAL,
    });
  }

  _startClickTracking() {
    this._addListener(
      document,
      'click',
      (e) => this._handleClick(e),
      { capture: true }
    );
  }

  _handleClick(event) {
    if (!this._checkRateLimit('click')) {
      return;
    }

    const target = event.target;

    if (!isElementVisible(target)) {
      return;
    }

    const interactionType = this.behavioralDetector.detectClickInteraction(target, event);

    const elementData = {
      event_name: EVENT_TYPES.CLICK,
      event_type: EVENT_CATEGORIES.ENGAGEMENT,

      element_id: target.id || null,
      element_class: target.classList ? Array.from(target.classList) : [],
      element_tag: target.tagName?.toLowerCase() || null,
      element_text: getElementText(target),
      element_href: target.href || target.closest('a')?.href || null,
      element_xpath: getElementXPath(target),
      element_selector: getElementSelector(target),

      click_x: event.clientX,
      click_y: event.clientY,
      click_button: event.button,

      modifier_alt: event.altKey,
      modifier_ctrl: event.ctrlKey,
      modifier_shift: event.shiftKey,
      modifier_meta: event.metaKey,

      interaction_type: interactionType,

      _originalElement: target,
    };

    this._emit(elementData);
  }

  _startInputTracking() {
    this._addListener(
      document,
      'focus',
      (e) => this._handleInput(e, 'focus'),
      { capture: true }
    );

    this._addListener(
      document,
      'blur',
      (e) => this._handleInput(e, 'blur'),
      { capture: true }
    );

    this._addListener(
      document,
      'change',
      (e) => this._handleInput(e, 'change'),
      { capture: true }
    );
  }

  _handleInput(event, interactionType) {
    const target = event.target;

    if (!this._isFormElement(target)) {
      return;
    }

    if (!this._checkRateLimit('input')) {
      return;
    }

    const elementData = {
      event_name: EVENT_TYPES.INPUT,
      event_type: EVENT_CATEGORIES.ENGAGEMENT,

      element_id: target.id || null,
      element_tag: target.tagName?.toLowerCase() || null,
      element_type: target.type || null,
      element_name: target.name || null,
      element_placeholder: target.placeholder || null,

      interaction_type: interactionType,

      form_id: target.form?.id || null,
      form_name: target.form?.name || null,

      field_value: null,

      _originalElement: target,
    };

    this._emit(elementData);
  }

  _isFormElement(element) {
    const formTags = ['INPUT', 'TEXTAREA', 'SELECT'];
    return formTags.includes(element.tagName);
  }

  _startScrollTracking() {
    const handleScroll = debounce(() => this._handleScroll(), DEBOUNCE_DELAYS.scroll);
    this._addListener(window, 'scroll', handleScroll);
  }

  _handleScroll() {
    if (!this._checkRateLimit('scroll')) {
      return;
    }

    const scrollHeight = document.documentElement.scrollHeight;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const clientHeight = window.innerHeight;

    const scrollableHeight = scrollHeight - clientHeight;
    const scrollPercent =
      scrollableHeight > 0 ? Math.round((scrollTop / scrollableHeight) * 100) : 100;

    let newMilestone = false;
    const milestones = { 25: false, 50: false, 75: false, 100: false };

    if (scrollPercent >= 25 && !this.scrollMilestones[25]) {
      milestones[25] = true;
      this.scrollMilestones[25] = true;
      newMilestone = true;
    }

    if (scrollPercent >= 50 && !this.scrollMilestones[50]) {
      milestones[50] = true;
      this.scrollMilestones[50] = true;
      newMilestone = true;
    }

    if (scrollPercent >= 75 && !this.scrollMilestones[75]) {
      milestones[75] = true;
      this.scrollMilestones[75] = true;
      newMilestone = true;
    }

    if (scrollPercent >= 100 && !this.scrollMilestones[100]) {
      milestones[100] = true;
      this.scrollMilestones[100] = true;
      newMilestone = true;
    }

    if (newMilestone) {
      this._emit({
        event_name: EVENT_TYPES.SCROLL,
        event_type: EVENT_CATEGORIES.ENGAGEMENT,

        scroll_depth_percent: scrollPercent,
        scroll_y: scrollTop,

        milestone_25: milestones[25],
        milestone_50: milestones[50],
        milestone_75: milestones[75],
        milestone_100: milestones[100],
      });
    }
  }

  _startErrorTracking() {
    this._addListener(window, 'error', (event) => {
      this._handleError(event);
    });

    this._addListener(window, 'unhandledrejection', (event) => {
      this._handlePromiseRejection(event);
    });
  }

  _handleError(event) {
    this._emit({
      event_name: EVENT_TYPES.ERROR,
      event_type: EVENT_CATEGORIES.DIAGNOSTIC,

      error_message: event.message,
      error_type: event.error?.name || 'Error',
      error_stack: event.error?.stack || null,
      error_line: event.lineno || null,
      error_column: event.colno || null,
      error_filename: event.filename || null,
    });
  }

  _handlePromiseRejection(event) {
    const reason = event.reason;

    this._emit({
      event_name: EVENT_TYPES.ERROR,
      event_type: EVENT_CATEGORIES.DIAGNOSTIC,

      error_message: reason?.message || String(reason),
      error_type: reason?.name || 'UnhandledRejection',
      error_stack: reason?.stack || null,
    });
  }

  capturePage(name, properties = {}) {
    this._emit({
      event_name: EVENT_TYPES.PAGE_VIEW,
      event_type: EVENT_CATEGORIES.NAVIGATION,
      custom_properties: { page_name: name, ...properties },
    });
  }
}

export default AutoCaptureEngine;

