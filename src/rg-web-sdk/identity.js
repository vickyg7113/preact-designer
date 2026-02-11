/**
 * RG Web SDK - Identity Manager
 * (copied from rg-web-sdk/src/identity.js)
 */

import { STORAGE_KEYS } from './constants.js';
import { generateUUID, getTimestamp, log, merge, parseQueryParams } from './utils.js';

class IdentityManager {
  constructor(storage, config) {
    this.storage = storage;
    this.config = config;

    this.visitorId = null;
    this.visitorTraits = {};
    this.accountId = null;
    this.accountTraits = {};
    this.sessionId = null;
    this.sessionStartTime = null;
    this.sessionLastActivity = null;
    this.sessionEventCount = 0;

    this.sessionProperties = {};
    this.pendingIdentity = null;
  }

  initialize() {
    this._loadVisitor();
    this._loadAccount();
    this._loadOrCreateSession();

    if (this.pendingIdentity) {
      this.identify(this.pendingIdentity.visitor, this.pendingIdentity.account);
      this.pendingIdentity = null;
    }

    log('info', 'Identity initialized:', {
      visitorId: this.visitorId,
      accountId: this.accountId,
      sessionId: this.sessionId,
    });
  }

  _loadVisitor() {
    const storedVisitorId = this.storage.getItem(STORAGE_KEYS.VISITOR_ID);
    const storedTraits = this.storage.getItem(STORAGE_KEYS.VISITOR_TRAITS) || {};

    if (storedVisitorId) {
      this.visitorId = storedVisitorId;
      this.visitorTraits = storedTraits;
    } else {
      this.visitorId = 'anon_' + generateUUID();
      this._persistVisitor();
    }
  }

  _loadAccount() {
    const storedAccountId = this.storage.getItem(STORAGE_KEYS.ACCOUNT_ID);
    const storedTraits = this.storage.getItem(STORAGE_KEYS.ACCOUNT_TRAITS) || {};

    if (storedAccountId) {
      this.accountId = storedAccountId;
      this.accountTraits = storedTraits;
    }
  }

  _loadOrCreateSession() {
    const storedSessionId = this.storage.getItem(STORAGE_KEYS.SESSION_ID);
    const storedStartTime = this.storage.getItem(STORAGE_KEYS.SESSION_START);
    const storedLastActivity = this.storage.getItem(STORAGE_KEYS.SESSION_LAST_ACTIVITY);

    const now = Date.now();
    const sessionTimeout = this.config.sessionTimeout * 60 * 1000;

    if (storedSessionId && storedLastActivity) {
      const timeSinceLastActivity = now - new Date(storedLastActivity).getTime();

      if (timeSinceLastActivity < sessionTimeout) {
        this.sessionId = storedSessionId;
        this.sessionStartTime = storedStartTime;
        this.sessionLastActivity = storedLastActivity;
        this._updateSessionActivity();
        return;
      }
    }

    this._createNewSession();
  }

  _createNewSession() {
    this.sessionId = 'sess_' + generateUUID();
    this.sessionStartTime = getTimestamp();
    this.sessionLastActivity = getTimestamp();
    this.sessionEventCount = 0;

    this._captureSessionProperties();
    this._persistSession();

    log('info', 'New session created:', this.sessionId);
  }

  _captureSessionProperties() {
    const currentUrl = window.location.href;
    const queryParams = parseQueryParams(currentUrl);

    this.sessionProperties = {
      referrer: document.referrer || null,
      referrer_domain: document.referrer ? new URL(document.referrer).hostname : null,
      utm_source: queryParams.utm_source || null,
      utm_medium: queryParams.utm_medium || null,
      utm_campaign: queryParams.utm_campaign || null,
      utm_term: queryParams.utm_term || null,
      utm_content: queryParams.utm_content || null,
      landing_page: currentUrl,
    };
  }

  _updateSessionActivity() {
    this.sessionLastActivity = getTimestamp();
    this.sessionEventCount++;
    this.storage.setItem(STORAGE_KEYS.SESSION_LAST_ACTIVITY, this.sessionLastActivity);
  }

  _persistVisitor() {
    this.storage.setItem(STORAGE_KEYS.VISITOR_ID, this.visitorId);
    this.storage.setItem(STORAGE_KEYS.VISITOR_TRAITS, this.visitorTraits);
  }

  _persistAccount() {
    if (this.accountId) {
      this.storage.setItem(STORAGE_KEYS.ACCOUNT_ID, this.accountId);
      this.storage.setItem(STORAGE_KEYS.ACCOUNT_TRAITS, this.accountTraits);
    }
  }

  _persistSession() {
    this.storage.setItem(STORAGE_KEYS.SESSION_ID, this.sessionId);
    this.storage.setItem(STORAGE_KEYS.SESSION_START, this.sessionStartTime);
    this.storage.setItem(STORAGE_KEYS.SESSION_LAST_ACTIVITY, this.sessionLastActivity);
  }

  identify(visitor, account = null) {
    if (visitor && visitor.id) {
      if (this.visitorId && this.visitorId !== visitor.id && !this.visitorId.startsWith('anon_')) {
        log('warn', `Visitor ID changed from ${this.visitorId} to ${visitor.id}`);
      }

      this.visitorId = visitor.id;

      const { id, ...traits } = visitor;
      this.visitorTraits = merge(this.visitorTraits, traits);

      this._persistVisitor();
    }

    if (account && account.id) {
      if (this.accountId && this.accountId !== account.id) {
        log('info', `Account changed from ${this.accountId} to ${account.id}`);
      }

      this.accountId = account.id;

      const { id, ...traits } = account;
      this.accountTraits = merge(this.accountTraits, traits);

      this._persistAccount();
    }

    log('info', 'Identity updated:', {
      visitorId: this.visitorId,
      accountId: this.accountId,
    });
  }

  queueIdentify(visitor, account = null) {
    this.pendingIdentity = { visitor, account };
  }

  getIdentityContext() {
    this._updateSessionActivity();

    const sessionDuration = this.sessionStartTime
      ? Math.floor(new Date() - new Date(this.sessionStartTime))
      : 0;

    return {
      visitor_id: this.visitorId,
      account_id: this.accountId,
      session_id: this.sessionId,

      session_start_time: this.sessionStartTime,
      session_duration_ms: sessionDuration,
      session_event_count: this.sessionEventCount,

      visitor_email: this.visitorTraits.email || null,
      visitor_name: this._getVisitorName(),
      visitor_role: this.visitorTraits.role || null,
      visitor_created_at: this.visitorTraits.createdAt || null,
      visitor_custom: this._getCustomVisitorTraits(),

      account_name: this.accountTraits.name || null,
      account_plan: this.accountTraits.plan || null,
      account_mrr: this.accountTraits.mrr || null,
      account_industry: this.accountTraits.industry || null,
      account_custom: this._getCustomAccountTraits(),

      ...this.sessionProperties,
    };
  }

  _getVisitorName() {
    if (this.visitorTraits.name) {
      return this.visitorTraits.name;
    }

    const firstName = this.visitorTraits.firstName || '';
    const lastName = this.visitorTraits.lastName || '';

    if (firstName || lastName) {
      return [firstName, lastName].filter(Boolean).join(' ').trim() || null;
    }

    return null;
  }

  _getCustomVisitorTraits() {
    const knownFields = ['email', 'name', 'role', 'createdAt'];
    const custom = {};

    for (const key in this.visitorTraits) {
      if (!knownFields.includes(key)) {
        custom[key] = this.visitorTraits[key];
      }
    }

    return Object.keys(custom).length > 0 ? custom : null;
  }

  _getCustomAccountTraits() {
    const knownFields = ['name', 'plan', 'mrr', 'industry'];
    const custom = {};

    for (const key in this.accountTraits) {
      if (!knownFields.includes(key)) {
        custom[key] = this.accountTraits[key];
      }
    }

    return Object.keys(custom).length > 0 ? custom : null;
  }

  getVisitorId() {
    return this.visitorId;
  }

  getAccountId() {
    return this.accountId;
  }

  getSessionId() {
    return this.sessionId;
  }

  reset() {
    this.storage.removeItem(STORAGE_KEYS.VISITOR_ID);
    this.storage.removeItem(STORAGE_KEYS.VISITOR_TRAITS);
    this.storage.removeItem(STORAGE_KEYS.ACCOUNT_ID);
    this.storage.removeItem(STORAGE_KEYS.ACCOUNT_TRAITS);
    this.storage.removeItem(STORAGE_KEYS.SESSION_ID);
    this.storage.removeItem(STORAGE_KEYS.SESSION_START);
    this.storage.removeItem(STORAGE_KEYS.SESSION_LAST_ACTIVITY);

    this.visitorId = 'anon_' + generateUUID();
    this.visitorTraits = {};
    this.accountId = null;
    this.accountTraits = {};

    this._createNewSession();
    this._persistVisitor();

    log('info', 'Identity reset');
  }
}

export default IdentityManager;

