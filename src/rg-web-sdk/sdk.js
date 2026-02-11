/**
 * RG Web SDK - Main SDK Class
 * (copied from rg-web-sdk/src/sdk.js)
 */

import { DEFAULT_CONFIG, SDK_VERSION } from './constants.js';
import { log, merge } from './utils.js';
import StorageAdapter from './storage.js';
import IdentityManager from './identity.js';
import EventBuilder from './event-builder.js';
import PrivacyEngine from './privacy.js';
import AutoCaptureEngine from './auto-capture.js';
import EventQueue from './event-queue.js';
import TransportLayer from './transport.js';

class RGSDK {
  constructor() {
    this.initialized = false;
    this.config = null;

    this.storage = null;
    this.identityManager = null;
    this.eventBuilder = null;
    this.privacyEngine = null;
    this.autoCaptureEngine = null;
    this.eventQueue = null;
    this.transportLayer = null;

    this.pendingIdentify = null;
  }

  initialize(config) {
    if (this.initialized) {
      log('warn', 'SDK already initialized');
      return;
    }

    if (!config || !config.apiKey) {
      throw new Error('API key is required');
    }

    this.config = merge(DEFAULT_CONFIG, config);

    log('info', 'Initializing RG SDK...', {
      version: SDK_VERSION,
      config: this.config,
    });

    this._initializeModules();

    this.initialized = true;

    if (this.pendingIdentify) {
      this.identify(this.pendingIdentify.visitor, this.pendingIdentify.account);
      this.pendingIdentify = null;
    }

    log('info', 'RG SDK initialized successfully');
  }

  _initializeModules() {
    this.storage = new StorageAdapter(this.config.persistence);

    this.identityManager = new IdentityManager(this.storage, this.config);
    this.identityManager.initialize();

    this.eventBuilder = new EventBuilder(this.identityManager);

    this.privacyEngine = new PrivacyEngine(this.storage, this.config);

    this.eventQueue = new EventQueue(this.storage);

    this.transportLayer = new TransportLayer(this.config, this.eventQueue);
    this.transportLayer.start();

    this.autoCaptureEngine = new AutoCaptureEngine(
      this.eventBuilder,
      this.privacyEngine,
      this.config,
    );

    if (this.config.autoCapture || this.config.autoPageViews) {
      this.autoCaptureEngine.start((event) => this._handleCapturedEvent(event));
    }
  }

  _handleCapturedEvent(event) {
    event = this.privacyEngine.validateEventSize(event);
    this.eventQueue.enqueue(event);
    this.transportLayer.checkBatchSize();
  }

  identify(visitor, account = null) {
    if (!this.initialized) {
      this.pendingIdentify = { visitor, account };
      log('info', 'Identity queued, will be applied after initialization');
      return;
    }

    this.identityManager.identify(visitor, account);
  }

  track(eventName, properties = {}) {
    if (!this.initialized) {
      log('warn', 'SDK not initialized, cannot track event');
      return;
    }

    if (!eventName || typeof eventName !== 'string') {
      log('warn', 'Event name is required and must be a string');
      return;
    }

    const event = this.eventBuilder.buildCustomEvent(eventName, properties);
    const sanitizedEvent = this.privacyEngine.processEvent(event);

    if (sanitizedEvent) {
      const validatedEvent = this.privacyEngine.validateEventSize(sanitizedEvent);
      this.eventQueue.enqueue(validatedEvent);
      this.transportLayer.checkBatchSize();
    }
  }

  page(name = null, properties = {}) {
    if (!this.initialized) {
      log('warn', 'SDK not initialized, cannot track page view');
      return;
    }

    const pageProperties = { ...properties };
    if (name) {
      pageProperties.page_name = name;
    }

    const event = this.eventBuilder.buildPageViewEvent(pageProperties);
    const sanitizedEvent = this.privacyEngine.processEvent(event);

    if (sanitizedEvent) {
      const validatedEvent = this.privacyEngine.validateEventSize(sanitizedEvent);
      this.eventQueue.enqueue(validatedEvent);
      this.transportLayer.checkBatchSize();
    }
  }

  async flush() {
    if (!this.initialized) {
      log('warn', 'SDK not initialized');
      return;
    }

    await this.transportLayer.flush();
  }

  optOut() {
    if (!this.initialized) {
      log('warn', 'SDK not initialized');
      return;
    }

    if (this.autoCaptureEngine) {
      this.autoCaptureEngine.stop();
    }

    this.eventQueue.clear();
    this.privacyEngine.optOut();

    log('info', 'User opted out of tracking');
  }

  optIn() {
    if (!this.initialized) {
      log('warn', 'SDK not initialized');
      return;
    }

    this.privacyEngine.optIn();

    if (this.config.autoCapture || this.config.autoPageViews) {
      this.autoCaptureEngine.start((event) => this._handleCapturedEvent(event));
    }

    log('info', 'User opted in to tracking');
  }

  grantConsent() {
    if (!this.initialized) {
      log('warn', 'SDK not initialized');
      return;
    }

    this.privacyEngine.grantConsent();
  }

  revokeConsent() {
    if (!this.initialized) {
      log('warn', 'SDK not initialized');
      return;
    }

    this.privacyEngine.revokeConsent();
    this.eventQueue.clear();
  }

  reset() {
    if (!this.initialized) {
      log('warn', 'SDK not initialized');
      return;
    }

    this.identityManager.reset();
    log('info', 'Identity reset');
  }

  getVisitorId() {
    if (!this.initialized) return null;
    return this.identityManager.getVisitorId();
  }

  getAccountId() {
    if (!this.initialized) return null;
    return this.identityManager.getAccountId();
  }

  getSessionId() {
    if (!this.initialized) return null;
    return this.identityManager.getSessionId();
  }

  getStats() {
    if (!this.initialized) return null;

    return {
      queue: this.eventQueue.getStats(),
      transport: this.transportLayer.getStats(),
      storage: {
        type: this.storage.getStorageType(),
        persistent: this.storage.isPersistent(),
      },
    };
  }

  debug(enable = true) {
    this.config.debug = enable;
    log('info', `Debug mode ${enable ? 'enabled' : 'disabled'}`);
  }
}

export default RGSDK;

