/**
 * RG Web SDK - Entry Point (embedded into rg-preact-designer)
 * (copied from rg-web-sdk/src/index.js)
 */

import RGSDK from './sdk.js';

const sdkInstance = new RGSDK();

const rg = {
  initialize: (config) => {
    sdkInstance.initialize(config);
  },
  identify: (visitor, account) => {
    sdkInstance.identify(visitor, account);
  },
  track: (eventName, properties) => {
    sdkInstance.track(eventName, properties);
  },
  page: (name, properties) => {
    sdkInstance.page(name, properties);
  },
  flush: () => {
    return sdkInstance.flush();
  },
  optOut: () => {
    sdkInstance.optOut();
  },
  optIn: () => {
    sdkInstance.optIn();
  },
  grantConsent: () => {
    sdkInstance.grantConsent();
  },
  revokeConsent: () => {
    sdkInstance.revokeConsent();
  },
  reset: () => {
    sdkInstance.reset();
  },
  getVisitorId: () => {
    return sdkInstance.getVisitorId();
  },
  getAccountId: () => {
    return sdkInstance.getAccountId();
  },
  getSessionId: () => {
    return sdkInstance.getSessionId();
  },
  getStats: () => {
    return sdkInstance.getStats();
  },
  debug: (enable) => {
    sdkInstance.debug(enable);
  },
  version: '1.0.0',
};

export default rg;

if (typeof window !== 'undefined') {
  window.rg = rg;
}

