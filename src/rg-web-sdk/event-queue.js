/**
 * RG Web SDK - Event Queue
 * (copied from rg-web-sdk/src/event-queue.js)
 */

import { STORAGE_KEYS, MAX_QUEUE_SIZE, MAX_PERSISTED_SIZE } from './constants.js';
import { log } from './utils.js';

class EventQueue {
  constructor(storage) {
    this.storage = storage;
    this.queue = [];
    this.maxSize = MAX_QUEUE_SIZE;
    this.maxPersistedSize = MAX_PERSISTED_SIZE;

    this._restore();
  }

  _restore() {
    try {
      const persisted = this.storage.getItem(STORAGE_KEYS.EVENT_QUEUE);

      if (persisted && Array.isArray(persisted)) {
        this.queue = persisted;
        log('info', `Restored ${this.queue.length} events from storage`);
      }
    } catch (e) {
      log('error', 'Failed to restore events from storage:', e);
    }
  }

  _persist() {
    try {
      const toPersist = this.queue.slice(-this.maxPersistedSize);
      this.storage.setItem(STORAGE_KEYS.EVENT_QUEUE, toPersist);
    } catch (e) {
      log('error', 'Failed to persist events to storage:', e);
    }
  }

  enqueue(event) {
    if (this.queue.length >= this.maxSize) {
      const dropped = this.queue.shift();
      log('warn', 'Event queue full, dropping oldest event:', dropped.event_id);
    }

    this.queue.push(event);
    this._persist();

    return true;
  }

  peek(count) {
    return this.queue.slice(0, count);
  }

  dequeue(count) {
    const removed = this.queue.splice(0, count);
    this._persist();
    return removed;
  }

  flush() {
    const events = [...this.queue];
    this.queue = [];
    this.storage.removeItem(STORAGE_KEYS.EVENT_QUEUE);
    return events;
  }

  size() {
    return this.queue.length;
  }

  isEmpty() {
    return this.queue.length === 0;
  }

  clear() {
    this.queue = [];
    this.storage.removeItem(STORAGE_KEYS.EVENT_QUEUE);
    log('info', 'Event queue cleared');
  }

  getStats() {
    return {
      size: this.queue.length,
      maxSize: this.maxSize,
      percentFull: Math.round((this.queue.length / this.maxSize) * 100),
    };
  }
}

export default EventQueue;

