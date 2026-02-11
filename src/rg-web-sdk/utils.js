/**
 * RG Web SDK - Utility Functions
 * (copied from rg-web-sdk/src/utils.js)
 */

export function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getTimestamp() {
  return new Date().toISOString();
}

export function getDateString() {
  const date = new Date();
  return date.toISOString().split('T')[0];
}

export function getDeviceType() {
  const ua = navigator.userAgent;

  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }

  if (
    /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silfae|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/
      .test(ua)
  ) {
    return 'mobile';
  }

  return 'desktop';
}

export function getBrowserInfo() {
  const ua = navigator.userAgent;
  let browserName = 'Unknown';
  let browserVersion = 'Unknown';

  if (ua.indexOf('Chrome') > -1 && ua.indexOf('Edg') === -1) {
    browserName = 'Chrome';
    browserVersion = ua.match(/Chrome\/([\d.]+)/)?.[1] || 'Unknown';
  } else if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) {
    browserName = 'Safari';
    browserVersion = ua.match(/Version\/([\d.]+)/)?.[1] || 'Unknown';
  } else if (ua.indexOf('Firefox') > -1) {
    browserName = 'Firefox';
    browserVersion = ua.match(/Firefox\/([\d.]+)/)?.[1] || 'Unknown';
  } else if (ua.indexOf('Edg') > -1) {
    browserName = 'Edge';
    browserVersion = ua.match(/Edg\/([\d.]+)/)?.[1] || 'Unknown';
  } else if (ua.indexOf('MSIE') > -1 || ua.indexOf('Trident') > -1) {
    browserName = 'Internet Explorer';
    browserVersion = ua.match(/(?:MSIE |rv:)([\d.]+)/)?.[1] || 'Unknown';
  }

  return { browserName, browserVersion };
}

export function getOSInfo() {
  const ua = navigator.userAgent;
  let osName = 'Unknown';
  let osVersion = 'Unknown';

  if (ua.indexOf('Win') > -1) {
    osName = 'Windows';
    if (ua.indexOf('Windows NT 10.0') > -1) osVersion = '10';
    else if (ua.indexOf('Windows NT 6.3') > -1) osVersion = '8.1';
    else if (ua.indexOf('Windows NT 6.2') > -1) osVersion = '8';
    else if (ua.indexOf('Windows NT 6.1') > -1) osVersion = '7';
  } else if (ua.indexOf('Mac') > -1) {
    osName = 'macOS';
    osVersion = ua.match(/Mac OS X ([\d_]+)/)?.[1]?.replace(/_/g, '.') || 'Unknown';
  } else if (ua.indexOf('Linux') > -1) {
    osName = 'Linux';
  } else if (ua.indexOf('Android') > -1) {
    osName = 'Android';
    osVersion = ua.match(/Android ([\d.]+)/)?.[1] || 'Unknown';
  } else if (ua.indexOf('iOS') > -1 || ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) {
    osName = 'iOS';
    osVersion = ua.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, '.') || 'Unknown';
  }

  return { osName, osVersion };
}

export function getTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'Unknown';
  }
}

export function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

export function parseQueryParams(url) {
  try {
    const urlObj = new URL(url);
    const params = {};
    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  } catch {
    return {};
  }
}

export function truncate(str, maxLength = 200) {
  if (!str) return null;
  return str.length > maxLength ? str.substring(0, maxLength) : str;
}

export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;

  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map((item) => deepClone(item));

  const cloned = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}

export function merge(target, ...sources) {
  return Object.assign({}, target, ...sources);
}

export function isEmpty(value) {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function safeJsonParse(str, fallback = null) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

export function safeJsonStringify(obj, fallback = null) {
  try {
    return JSON.stringify(obj);
  } catch {
    return fallback;
  }
}

export function log(level, ...args) {
  if (typeof console !== 'undefined' && console[level]) {
    console[level]('[RG SDK]', ...args);
  }
}

export function getElementXPath(element) {
  if (!element) return null;

  if (element.id) {
    return `//*[@id="${element.id}"]`;
  }

  const parts = [];
  let current = element;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let index = 1;
    let sibling = current.previousSibling;

    while (sibling) {
      if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === current.tagName) {
        index++;
      }
      sibling = sibling.previousSibling;
    }

    const tagName = current.tagName.toLowerCase();
    parts.unshift(`${tagName}[${index}]`);
    current = current.parentNode;
  }

  return parts.length > 0 ? '/' + parts.join('/') : null;
}

export function getElementSelector(element) {
  if (!element) return null;

  if (element.id) {
    return `#${CSS.escape(element.id)}`;
  }

  const parts = [];
  let current = element;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let selector = current.tagName.toLowerCase();

    if (current.className && typeof current.className === 'string') {
      const classes = current.className
        .split(/\s+/)
        .filter((c) => c && !/^[0-9]/.test(c))
        .map((c) => '.' + CSS.escape(c))
        .join('');
      selector += classes;
    }

    parts.unshift(selector);

    try {
      if (document.querySelectorAll(parts.join(' > ')).length === 1) {
        break;
      }
    } catch {
      // ignore invalid selector
    }

    current = current.parentElement;

    if (parts.length > 10) break;
  }

  return parts.join(' > ') || null;
}

export function getElementText(element) {
  if (!element) return null;

  const text =
    element.getAttribute('aria-label') ||
    element.getAttribute('alt') ||
    element.getAttribute('title') ||
    (element.tagName === 'INPUT' ? element.value : null) ||
    element.textContent?.trim() ||
    null;

  return truncate(text, 200);
}

export function isElementVisible(element) {
  if (!element) return false;

  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0'
  );
}

