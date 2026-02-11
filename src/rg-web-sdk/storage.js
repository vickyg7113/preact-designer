/**
 * RG Web SDK - Storage Adapter
 * (copied from rg-web-sdk/src/storage.js)
 */

import { log, safeJsonParse, safeJsonStringify } from './utils.js';

class StorageAdapter {
  constructor(preferredStorage = 'localStorage') {
    this.preferredStorage = preferredStorage;
    this.storageType = this._detectAvailableStorage();
    this.memoryStorage = {};
  }

  _detectAvailableStorage() {
    if (this.preferredStorage === 'localStorage' && this._testStorage(window.localStorage)) {
      return 'localStorage';
    }

    if (this._testStorage(window.sessionStorage)) {
      return 'sessionStorage';
    }

    log('warn', 'No persistent storage available, using in-memory storage');
    return 'memory';
  }

  _testStorage(storage) {
    try {
      const testKey = '__rg_storage_test__';
      storage.setItem(testKey, 'test');
      storage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  _getStorage() {
    if (this.storageType === 'localStorage') {
      return window.localStorage;
    } else if (this.storageType === 'sessionStorage') {
      return window.sessionStorage;
    }
    return null;
  }

  setItem(key, value) {
    try {
      const storage = this._getStorage();
      const serialized = safeJsonStringify(value);

      if (!serialized) {
        log('warn', 'Failed to serialize value for key:', key);
        return false;
      }

      if (storage) {
        storage.setItem(key, serialized);
      } else {
        this.memoryStorage[key] = serialized;
      }

      return true;
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        log('warn', 'Storage quota exceeded, attempting cleanup');
        this._cleanup();

        try {
          const storage = this._getStorage();
          if (storage) {
            storage.setItem(key, safeJsonStringify(value));
          } else {
            this.memoryStorage[key] = safeJsonStringify(value);
          }
          return true;
        } catch (e2) {
          log('error', 'Failed to set item after cleanup:', key, e2);
          return false;
        }
      }

      log('error', 'Failed to set item:', key, e);
      return false;
    }
  }

  getItem(key) {
    try {
      const storage = this._getStorage();
      let value;

      if (storage) {
        value = storage.getItem(key);
      } else {
        value = this.memoryStorage[key];
      }

      if (value === null || value === undefined) {
        return null;
      }

      return safeJsonParse(value, null);
    } catch (e) {
      log('error', 'Failed to get item:', key, e);
      return null;
    }
  }

  removeItem(key) {
    try {
      const storage = this._getStorage();

      if (storage) {
        storage.removeItem(key);
      } else {
        delete this.memoryStorage[key];
      }

      return true;
    } catch (e) {
      log('error', 'Failed to remove item:', key, e);
      return false;
    }
  }

  hasItem(key) {
    const value = this.getItem(key);
    return value !== null && value !== undefined;
  }

  clear() {
    try {
      const storage = this._getStorage();

      if (storage) {
        const keys = Object.keys(storage);
        keys.forEach((key) => {
          if (key.startsWith('__rg_')) {
            storage.removeItem(key);
          }
        });
      } else {
        this.memoryStorage = {};
      }

      return true;
    } catch (e) {
      log('error', 'Failed to clear storage:', e);
      return false;
    }
  }

  _cleanup() {
    const storage = this._getStorage();
    if (!storage) return;

    try {
      const nonCriticalKeys = ['__rg_event_queue'];
      nonCriticalKeys.forEach((key) => {
        storage.removeItem(key);
      });
    } catch (e) {
      log('error', 'Cleanup failed:', e);
    }
  }

  getStorageType() {
    return this.storageType;
  }

  isPersistent() {
    return this.storageType !== 'memory';
  }
}

export default StorageAdapter;

