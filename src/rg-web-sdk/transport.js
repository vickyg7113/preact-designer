/**
 * RG Web SDK - Transport Layer
 * (copied from rg-web-sdk/src/transport.js)
 */

import { RETRY_DELAYS, MAX_RETRIES, SDK_VERSION, SDK_NAME } from './constants.js';
import { generateUUID, getTimestamp, log } from './utils.js';

class TransportLayer {
  constructor(config, eventQueue) {
    this.config = config;
    this.eventQueue = eventQueue;

    this.batchTimer = null;
    this.retryQueue = new Map();
    this.isSending = false;
    this.stats = {
      sent: 0,
      failed: 0,
      retried: 0,
    };
  }

  start() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }

    const intervalMs = this.config.batchInterval * 1000;

    this.batchTimer = setInterval(() => {
      this._processBatch(true);
    }, intervalMs);

    this._setupUnloadHandler();

    log('info', 'Transport layer started');
  }

  stop() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }

    log('info', 'Transport layer stopped');
  }

  _setupUnloadHandler() {
    window.addEventListener('beforeunload', () => {
      this.flushSync();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flushSync();
      }
    });
  }

  _shouldSendBatch() {
    return this.eventQueue.size() >= this.config.batchSize;
  }

  _processBatch(forceSend = false) {
    if (this.isSending || this.eventQueue.isEmpty()) {
      return;
    }

    if (!this._shouldSendBatch() && !this._isFlushRequested && !forceSend) {
      return;
    }

    this._sendBatch();
  }

  _createBatch() {
    const maxEvents = this._isFlushRequested
      ? this.eventQueue.size()
      : this.config.batchSize;

    const events = this.eventQueue.peek(maxEvents);

    if (events.length === 0) {
      return null;
    }

    return {
      batch_id: 'batch_' + generateUUID(),
      events,
      event_count: events.length,
      batch_timestamp: getTimestamp(),
    };
  }

  async _sendBatch(batch = null, retryCount = 0) {
    if (!batch) {
      batch = this._createBatch();
    }

    if (!batch || batch.events.length === 0) {
      return;
    }

    this.isSending = true;

    try {
      const response = await this._makeRequest(batch);

      if (response.ok) {
        this.eventQueue.dequeue(batch.events.length);
        this.stats.sent += batch.events.length;

        log('info', `Batch sent successfully: ${batch.events.length} events`);
      } else {
        await this._handleErrorResponse(response, batch, retryCount);
      }
    } catch (error) {
      this._handleNetworkError(error, batch, retryCount);
    } finally {
      this.isSending = false;
    }
  }

  async _makeRequest(batch) {
    const url = `${this.config.apiHost}/raw-events`;

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.config.apiKey}`,
      'X-RG-SDK-Version': SDK_VERSION,
      'X-RG-SDK-Name': SDK_NAME,
    };

    return fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(batch),
      keepalive: true,
    });
  }

  async _handleErrorResponse(response, batch, retryCount) {
    const status = response.status;

    if (status >= 400 && status < 500) {
      if (status === 401) {
        log('error', 'Invalid API key. Please check your configuration.');
      } else {
        log('error', `Client error (${status}), dropping batch`);
      }

      this.eventQueue.dequeue(batch.events.length);
      this.stats.failed += batch.events.length;
      return;
    }

    if (status === 429 || status >= 500) {
      this._scheduleRetry(batch, retryCount);
    }
  }

  _handleNetworkError(error, batch, retryCount) {
    log('error', 'Network error:', error.message);
    this._scheduleRetry(batch, retryCount);
  }

  _scheduleRetry(batch, retryCount) {
    if (retryCount >= MAX_RETRIES) {
      log('error', `Max retries exceeded for batch ${batch.batch_id}, dropping events`);
      this.eventQueue.dequeue(batch.events.length);
      this.stats.failed += batch.events.length;
      return;
    }

    const delay = RETRY_DELAYS[retryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
    const nextRetry = Date.now() + delay;

    this.retryQueue.set(batch.batch_id, {
      batch,
      retryCount: retryCount + 1,
      nextRetry,
    });

    this.stats.retried++;

    log(
      'info',
      `Scheduling retry ${retryCount + 1}/${MAX_RETRIES} for batch ${batch.batch_id} in ${delay}ms`,
    );

    setTimeout(() => {
      const retryInfo = this.retryQueue.get(batch.batch_id);
      if (retryInfo) {
        this.retryQueue.delete(batch.batch_id);
        this._sendBatch(retryInfo.batch, retryInfo.retryCount);
      }
    }, delay);
  }

  async flush() {
    if (this.eventQueue.isEmpty()) {
      return;
    }

    log('info', 'Flushing event queue...');
    this._isFlushRequested = true;

    while (!this.eventQueue.isEmpty() && !this.isSending) {
      await this._sendBatch();
    }

    this._isFlushRequested = false;
  }

  flushSync() {
    if (this.eventQueue.isEmpty()) {
      return;
    }

    const batch = this._createBatch();
    if (!batch) return;

    if (navigator.sendBeacon) {
      const url = `${this.config.apiHost}/raw-events`;
      const data = JSON.stringify(batch);

      const success = navigator.sendBeacon(url, data);

      if (success) {
        this.eventQueue.dequeue(batch.events.length);
        log('info', `Sent ${batch.events.length} events via sendBeacon`);
      } else {
        log('warn', 'sendBeacon failed, events may be lost');
      }
    } else {
      log('warn', 'sendBeacon not available, events may be lost');
    }
  }

  checkBatchSize() {
    if (this._shouldSendBatch()) {
      this._processBatch();
    }
  }

  getStats() {
    return {
      ...this.stats,
      queueSize: this.eventQueue.size(),
      pendingRetries: this.retryQueue.size,
    };
  }

  resetStats() {
    this.stats = {
      sent: 0,
      failed: 0,
      retried: 0,
    };
  }
}

export default TransportLayer;

