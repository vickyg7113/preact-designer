/**
 * RG Web SDK - Event Builder
 * (copied from rg-web-sdk/src/event-builder.js)
 */

import { SDK_VERSION, SDK_NAME, SDK_SOURCE, DATA_VERSION } from './constants.js';
import {
  generateUUID,
  getTimestamp,
  getDateString,
  getDeviceType,
  getBrowserInfo,
  getOSInfo,
  getTimezone,
} from './utils.js';

class EventBuilder {
  constructor(identityManager) {
    this.identityManager = identityManager;
    this.deviceInfo = this._captureDeviceInfo();
  }

  _captureDeviceInfo() {
    const { browserName, browserVersion } = getBrowserInfo();
    const { osName, osVersion } = getOSInfo();

    return {
      device_type: getDeviceType(),
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      browser_name: browserName,
      browser_version: browserVersion,
      os_name: osName,
      os_version: osVersion,
      user_agent: navigator.userAgent,
      language: navigator.language,
      timezone: getTimezone(),
    };
  }

  buildEvent(eventData) {
    const timestamp = getTimestamp();
    const identityContext = this.identityManager.getIdentityContext();

    const event = {
      event_id: 'evt_' + generateUUID(),
      visitor_id: identityContext.visitor_id,
      account_id: identityContext.account_id,
      session_id: identityContext.session_id,

      event_name: eventData.event_name,
      event_type: eventData.event_type,
      timestamp,
      event_date: getDateString(),

      page_url: window.location.href,
      page_title: document.title,
      page_path: window.location.pathname,
      page_hash: window.location.hash || null,
      page_query: window.location.search || null,

      element_id: eventData.element_id || null,
      element_classes: eventData.element_class || [],
      element_tag: eventData.element_tag || null,
      element_text: eventData.element_text || null,
      element_href: eventData.element_href || null,
      element_xpath: eventData.element_xpath || null,
      element_selector: eventData.element_selector || null,

      session_start_time: identityContext.session_start_time,
      session_duration_ms: identityContext.session_duration_ms,
      session_event_count: identityContext.session_event_count,

      visitor_email: identityContext.visitor_email,
      visitor_name: identityContext.visitor_name,
      visitor_role: identityContext.visitor_role,
      visitor_created_at: identityContext.visitor_created_at,
      visitor_custom: identityContext.visitor_custom,

      account_name: identityContext.account_name,
      account_plan: identityContext.account_plan,
      account_mrr: identityContext.account_mrr,
      account_industry: identityContext.account_industry,
      account_custom: identityContext.account_custom,

      ...this.deviceInfo,

      referrer: identityContext.referrer,
      referrer_domain: identityContext.referrer_domain,
      utm_source: identityContext.utm_source,
      utm_medium: identityContext.utm_medium,
      utm_campaign: identityContext.utm_campaign,
      utm_term: identityContext.utm_term,
      utm_content: identityContext.utm_content,

      country: null,
      region: null,
      city: null,
      latitude: null,
      longitude: null,

      properties: eventData.custom_properties || null,

      interaction_type: eventData.interaction_type || 'normal',

      sdk_version: SDK_VERSION,
      sdk_name: SDK_NAME,
      sdk_source: SDK_SOURCE,
      data_version: DATA_VERSION,
      captured_at: timestamp,

      error_message: eventData.error_message || null,
      error_stack: eventData.error_stack || null,
      console_logs: eventData.console_logs || null,
    };

    if (eventData.event_name === 'click') {
      event.element_position_x = eventData.click_x || null;
      event.element_position_y = eventData.click_y || null;
      event.click_button = eventData.click_button || null;
      event.modifier_alt = eventData.modifier_alt || false;
      event.modifier_ctrl = eventData.modifier_ctrl || false;
      event.modifier_shift = eventData.modifier_shift || false;
      event.modifier_meta = eventData.modifier_meta || false;
    }

    if (eventData.event_name === 'scroll') {
      event.scroll_depth_percent = eventData.scroll_depth_percent || null;
      event.scroll_y = eventData.scroll_y || null;
      event.milestone_25 = eventData.milestone_25 || false;
      event.milestone_50 = eventData.milestone_50 || false;
      event.milestone_75 = eventData.milestone_75 || false;
      event.milestone_100 = eventData.milestone_100 || false;
    }

    if (eventData.event_name === 'input') {
      event.element_type = eventData.element_type || null;
      event.element_name = eventData.element_name || null;
      event.element_placeholder = eventData.element_placeholder || null;
      event.form_id = eventData.form_id || null;
      event.form_name = eventData.form_name || null;
      event.field_value = null;
    }

    if (eventData.event_name === 'error') {
      event.error_type = eventData.error_type || null;
      event.error_line = eventData.error_line || null;
      event.error_column = eventData.error_column || null;
      event.error_filename = eventData.error_filename || null;
    }

    if (eventData._originalElement) {
      event._originalElement = eventData._originalElement;
    }

    return event;
  }

  buildPageViewEvent(properties = {}) {
    return this.buildEvent({
      event_name: 'page_view',
      event_type: 'navigation',
      custom_properties: properties,
    });
  }

  buildCustomEvent(eventName, properties = {}) {
    return this.buildEvent({
      event_name: eventName,
      event_type: 'custom',
      custom_properties: properties,
    });
  }

  updateDeviceInfo() {
    this.deviceInfo.viewport_width = window.innerWidth;
    this.deviceInfo.viewport_height = window.innerHeight;
  }
}

export default EventBuilder;

