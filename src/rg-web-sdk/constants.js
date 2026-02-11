/**
 * RG Web SDK - Constants
 * (copied from rg-web-sdk/src/constants.js)
 */

export const SDK_VERSION = '1.0.0';
export const SDK_NAME = 'rg-web-sdk';
export const SDK_SOURCE = 'web';
export const DATA_VERSION = 1;

// Storage keys
export const STORAGE_KEYS = {
  VISITOR_ID: '__rg_visitor_id',
  ACCOUNT_ID: '__rg_account_id',
  SESSION_ID: '__rg_session_id',
  SESSION_START: '__rg_session_start',
  SESSION_LAST_ACTIVITY: '__rg_session_last_activity',
  EVENT_QUEUE: '__rg_event_queue',
  OPT_OUT: '__rg_opt_out',
  VISITOR_TRAITS: '__rg_visitor_traits',
  ACCOUNT_TRAITS: '__rg_account_traits',
};

// Default configuration
export const DEFAULT_CONFIG = {
  apiHost: 'https://api.rg.io',
  autoCapture: true,
  autoPageViews: true,
  persistence: 'localStorage', // 'localStorage' | 'cookie' | 'memory'
  sessionTimeout: 30, // minutes
  batchSize: 50, // events
  batchInterval: 10, // seconds
  privacyConfig: {
    maskInputs: true,
    maskTextContent: false,
    sensitiveSelectors: [
      'input[type="password"]',
      'input[name*="password"]',
      'input[id*="password"]',
      'input[name*="card"]',
      'input[name*="cvv"]',
      'input[name*="cvc"]',
      'input[autocomplete="cc-number"]',
      'input[autocomplete="cc-exp"]',
      'input[autocomplete="cc-csc"]',
      'input[name*="ssn"]',
      'input[name*="tax"]',
      '[data-rg-ignore]',
      '[data-private]',
      '.rg-ignore',
    ],
  },
  doNotProcess: [],
  requireConsent: false,
};

// Event types
export const EVENT_TYPES = {
  PAGE_VIEW: 'page_view',
  CLICK: 'click',
  INPUT: 'input',
  SCROLL: 'scroll',
  FOCUS: 'focus',
  BLUR: 'blur',
  ERROR: 'error',
  CUSTOM: 'custom',
};

export const EVENT_CATEGORIES = {
  NAVIGATION: 'navigation',
  ENGAGEMENT: 'engagement',
  DIAGNOSTIC: 'diagnostic',
  CUSTOM: 'custom',
};

// Interaction types (behavioral classification)
export const INTERACTION_TYPES = {
  NORMAL: 'normal',
  RAGE_CLICK: 'rage_click',
  DEAD_CLICK: 'dead_click',
  ERROR_CLICK: 'error_click',
  U_TURN: 'u_turn',
};

// Behavioral detection configuration
export const BEHAVIORAL_CONFIG = {
  rageClickThreshold: 3,
  rageClickWindow: 1000,
  deadClickDelay: 300,
  errorClickWindow: 2000,
  uturnThreshold: 5000,
};

// Retry configuration
export const RETRY_DELAYS = [1000, 2000, 5000, 10000, 30000]; // milliseconds
export const MAX_RETRIES = 5;

// Queue limits
export const MAX_QUEUE_SIZE = 1000;
export const MAX_PERSISTED_SIZE = 100;
export const MAX_EVENT_SIZE = 10 * 1024; // 10KB

// Rate limiting (events per second)
export const RATE_LIMITS = {
  click: { limit: 100, window: 1000 },
  scroll: { limit: 10, window: 1000 },
  input: { limit: 50, window: 1000 },
};

// Debounce delays (milliseconds)
export const DEBOUNCE_DELAYS = {
  pageView: 100,
  scroll: 500,
  resize: 250,
};

// PII patterns for masking
export const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  ipAddress: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
};

// Device type detection
export const DEVICE_TYPES = {
  MOBILE: 'mobile',
  TABLET: 'tablet',
  DESKTOP: 'desktop',
};

