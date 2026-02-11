/**
 * RG Web SDK - Privacy Engine
 * (copied from rg-web-sdk/src/privacy.js)
 */

import { STORAGE_KEYS, PII_PATTERNS } from './constants.js';
import { log, truncate } from './utils.js';

class PrivacyEngine {
  constructor(storage, config) {
    this.storage = storage;
    this.config = config;
    this.consentGranted = !config.requireConsent;
  }

  processEvent(event) {
    if (this.isOptedOut()) {
      return null;
    }

    if (this.config.requireConsent && !this.consentGranted) {
      return null;
    }

    if (this.isInDoNotProcessList(event.visitor_id)) {
      return null;
    }

    if (event._originalElement && this.isSensitiveElement(event._originalElement)) {
      return null;
    }

    event = this.maskPII(event);
    event = this.removeBlacklistedFields(event);
    delete event._originalElement;

    return event;
  }

  isOptedOut() {
    return this.storage.getItem(STORAGE_KEYS.OPT_OUT) === true;
  }

  isInDoNotProcessList(visitorId) {
    return this.config.doNotProcess?.includes(visitorId) || false;
  }

  isSensitiveElement(element) {
    if (!element) return false;

    const sensitiveSelectors = this.config.privacyConfig?.sensitiveSelectors || [];

    for (const selector of sensitiveSelectors) {
      try {
        if (element.matches(selector) || element.closest(selector)) {
          return true;
        }
      } catch {
        log('warn', 'Invalid sensitive selector:', selector);
      }
    }

    return false;
  }

  maskPII(event) {
    const fieldsToMask = ['element_text', 'error_message', 'error_stack', 'page_url', 'page_title'];

    for (const field of fieldsToMask) {
      if (event[field] && typeof event[field] === 'string') {
        event[field] = this.maskPIIInText(event[field]);
      }
    }

    if (event.custom_properties) {
      event.custom_properties = this._maskPIIInObject(event.custom_properties);
    }

    if (event.console_logs && Array.isArray(event.console_logs)) {
      event.console_logs = event.console_logs.map((entry) => this.maskPIIInText(entry));
    }

    return event;
  }

  maskPIIInText(text) {
    if (!text) return text;

    let masked = text;

    masked = masked.replace(PII_PATTERNS.email, '[EMAIL_REDACTED]');
    masked = masked.replace(PII_PATTERNS.phone, '[PHONE_REDACTED]');
    masked = masked.replace(PII_PATTERNS.ssn, '[SSN_REDACTED]');
    masked = masked.replace(PII_PATTERNS.creditCard, '[CC_REDACTED]');
    masked = masked.replace(PII_PATTERNS.ipAddress, '[IP_REDACTED]');

    const customPatterns = this.config.privacyConfig?.customPIIPatterns || [];
    for (const pattern of customPatterns) {
      try {
        masked = masked.replace(pattern, '[REDACTED]');
      } catch {
        log('warn', 'Invalid custom PII pattern:', pattern);
      }
    }

    return masked;
  }

  _maskPIIInObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    const masked = Array.isArray(obj) ? [] : {};

    for (const key in obj) {
      const value = obj[key];

      if (typeof value === 'string') {
        masked[key] = this.maskPIIInText(value);
      } else if (typeof value === 'object' && value !== null) {
        masked[key] = this._maskPIIInObject(value);
      } else {
        masked[key] = value;
      }
    }

    return masked;
  }

  removeBlacklistedFields(event) {
    const blacklist = [
      'field_value',
      'clipboard_content',
      'localStorage_keys',
      'cookies',
      '_originalElement',
    ];

    for (const field of blacklist) {
      delete event[field];
    }

    return event;
  }

  shouldMaskInput() {
    return this.config.privacyConfig?.maskInputs !== false;
  }

  shouldMaskTextContent() {
    return this.config.privacyConfig?.maskTextContent === true;
  }

  grantConsent() {
    this.consentGranted = true;
    log('info', 'User consent granted');
  }

  revokeConsent() {
    this.consentGranted = false;
    log('info', 'User consent revoked');
  }

  optOut() {
    this.storage.setItem(STORAGE_KEYS.OPT_OUT, true);
    log('info', 'User opted out');
  }

  optIn() {
    this.storage.removeItem(STORAGE_KEYS.OPT_OUT);
    log('info', 'User opted in');
  }

  validateEventSize(event) {
    const eventSize = JSON.stringify(event).length;
    const maxSize = 10 * 1024;

    if (eventSize > maxSize) {
      log('warn', 'Event exceeds max size, truncating:', eventSize);
      return this.truncateEvent(event);
    }

    return event;
  }

  truncateEvent(event) {
    if (event.element_text) {
      event.element_text = truncate(event.element_text, 100);
    }

    if (event.error_stack) {
      event.error_stack = truncate(event.error_stack, 500);
    }

    if (event.console_logs) {
      event.console_logs = event.console_logs.slice(0, 5);
    }

    if (event.custom_properties) {
      const propsSize = JSON.stringify(event.custom_properties).length;
      if (propsSize > 5000) {
        event.custom_properties = { _truncated: true };
      }
    }

    return event;
  }

  sanitizeURL(url) {
    try {
      const urlObj = new URL(url);
      const sensitiveParams = ['token', 'key', 'password', 'secret', 'api_key', 'access_token'];

      sensitiveParams.forEach((param) => {
        if (urlObj.searchParams.has(param)) {
          urlObj.searchParams.set(param, '[REDACTED]');
        }
      });

      return urlObj.toString();
    } catch {
      return url;
    }
  }
}

export default PrivacyEngine;

