import type { EditorMessage, ElementSelectedMessage } from '../types';

/**
 * Editor Frame - Manages isolated editor UI iframe
 */
export class EditorFrame {
  private iframe: HTMLIFrameElement | null = null;
  private dragHandle: HTMLElement | null = null;
  private gripButton: HTMLElement | null = null;
  private messageCallback: ((message: EditorMessage) => void) | null = null;
  private isReady: boolean = false;
  private mode: string | null = null;
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private dragThreshold: number = 3; // Reduced threshold for more responsive dragging
  private mouseDownX: number = 0;
  private mouseDownY: number = 0;
  private isMouseDown: boolean = false;

  /**
   * Create and show editor iframe
   */
  create(onMessage: (message: EditorMessage) => void, mode?: string | null): void {
    console.log('[Visual Designer] EditorFrame.create() called with mode:', mode);
    if (this.iframe) {
      console.warn('[Visual Designer] EditorFrame already created, skipping');
      return;
    }

    this.mode = mode || null;
    this.messageCallback = onMessage;
    console.log('[Visual Designer] Creating editor iframe with mode:', this.mode);
    this.iframe = document.createElement('iframe');
    this.iframe.id = 'designer-editor-frame';
    this.iframe.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 600px;
      height: 800px;
      max-height: 90vh;
      border: none;
      border-radius: 12px;
      background: white;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
      z-index: 999999;
      display: none;
      overflow: hidden;
    `;

    // Create drag handle overlay
    this.createDragHandle();

    // Load editor HTML as blob URL for POC
    // In production, this would be a separate HTML file served statically
    this.loadEditorHtml();

    // Set up message listener
    window.addEventListener('message', this.handleMessage);

    // Ensure document.body exists before appending
    const appendIframe = () => {
      if (document.body) {
        document.body.appendChild(this.iframe!);
        if (this.dragHandle) {
          document.body.appendChild(this.dragHandle);
        }
        // Wait for iframe to load
        if (this.iframe) {
          this.iframe.onload = () => {
            this.isReady = true;
            this.sendMessage({ type: 'EDITOR_READY' });
            this.updateDragHandlePosition();
          };
        }
      } else {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', appendIframe);
        } else {
          setTimeout(appendIframe, 100);
        }
      }
    };

    appendIframe();
  }

  /**
   * Show editor frame
   */
  show(): void {
    console.log('[Visual Designer] EditorFrame.show() called');
    if (this.iframe) {
      console.log('[Visual Designer] Showing iframe');
      this.iframe.style.display = 'block';
      this.updateDragHandlePosition();
    } else {
      console.warn('[Visual Designer] Cannot show iframe - iframe is null');
    }
    if (this.dragHandle) {
      console.log('[Visual Designer] Showing drag handle');
      this.dragHandle.style.display = 'block';
    } else {
      console.warn('[Visual Designer] Cannot show drag handle - dragHandle is null');
    }
  }

  /**
   * Hide editor frame
   */
  hide(): void {
    if (this.iframe) {
      this.iframe.style.display = 'none';
    }
    if (this.dragHandle) {
      this.dragHandle.style.display = 'none';
    }
  }

  /**
   * Send message to editor iframe
   */
  sendElementSelected(message: ElementSelectedMessage): void {
    this.sendMessage(message);
    this.show();
  }

  /**
   * Notify editor iframe that selection was cleared (selector deactivated)
   */
  sendClearSelectionAck(): void {
    this.sendMessage({ type: 'CLEAR_SELECTION_ACK' });
  }

  sendTagPageSavedAck(): void {
    this.sendMessage({ type: 'TAG_PAGE_SAVED_ACK' });
  }

  sendTagFeatureSavedAck(): void {
    this.sendMessage({ type: 'TAG_FEATURE_SAVED_ACK' });
  }

  /**
   * Destroy editor frame
   */
  destroy(): void {
    window.removeEventListener('message', this.handleMessage);
    // Remove all mouse event listeners (both document and window)
    document.removeEventListener('mousemove', this.handleMouseMove, true);
    document.removeEventListener('mouseup', this.handleMouseUp, true);
    window.removeEventListener('mousemove', this.handleMouseMove, true);
    window.removeEventListener('mouseup', this.handleMouseUp, true);
    if (this.iframe) {
      this.iframe.remove();
      this.iframe = null;
    }
    if (this.dragHandle) {
      this.dragHandle.remove();
      this.dragHandle = null;
    }
    this.gripButton = null;
    this.isReady = false;
    this.messageCallback = null;
    this.isDragging = false;
    this.isMouseDown = false;
    // Restore cursor and selection
    document.body.style.cursor = '';
    document.documentElement.style.cursor = '';
    document.body.style.userSelect = '';
    document.documentElement.style.userSelect = '';
  }

  /**
   * Send message to iframe
   */
  private sendMessage(message: EditorMessage): void {
    if (!this.iframe || !this.isReady) {
      // Queue message if iframe not ready
      setTimeout(() => this.sendMessage(message), 100);
      return;
    }

    const iframeWindow = this.iframe.contentWindow;
    if (iframeWindow) {
      iframeWindow.postMessage(message, '*');
    }
  }

  /**
   * Load editor HTML content
   */
  private loadEditorHtml(): void {
    // For POC, use embedded HTML for reliability
    // In production, this would load from a CDN or static server
    this.loadEditorHtmlFallback();
  }

  /**
   * Fallback: Load editor HTML inline (embedded version)
   */
  private loadEditorHtmlFallback(): void {
    // Embedded editor HTML - this is a fallback if the file can't be loaded
    // In production, this would be loaded from a CDN or static server
    const htmlContent = this.getEditorHtmlContent();
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    if (this.iframe) {
      this.iframe.src = url;
    }
  }

  /**
   * Get embedded editor HTML content
   * This is a fallback - in production, load from a static file
   */
  private getEditorHtmlContent(): string {
    // Return the editor HTML content based on mode (no selector editor for tag-page / tag-feature)
    if (this.mode === 'tag-page') {
      return this.getTagPageHtmlContent();
    }
    if (this.mode === 'tag-feature') {
      return this.getTagFeatureHtmlContent();
    }
    // Default: guide form (selector + guide content)
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Visual Designer Editor</title>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://code.iconify.design/iconify-icon/3.0.2/iconify-icon.min.js"></script>
  <style>
    iconify-icon { display: inline-block; width: 1em; height: 1em; vertical-align: -0.125em; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif; padding: 20px; background: #f8fafc; color: #111827; line-height: 1.5; height: 100%; overflow-y: auto; }
    .editor-container { display: flex; flex-direction: column; gap: 20px; max-width: 100%; min-height: 100%; }
    .header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 14px; border-bottom: 2px solid #e2e8f0; margin-bottom: 4px; }
    .header h2 { font-size: 18px; font-weight: 600; color: #0f172a; letter-spacing: -0.01em; }
    .close-btn { background: none; border: none; font-size: 22px; cursor: pointer; color: #64748b; padding: 4px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px; transition: all 0.2s; }
    .close-btn:hover { color: #0f172a; background: #f1f5f9; }
    .form-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
    .form-group:last-of-type { margin-bottom: 0; }
    label { font-size: 13px; font-weight: 600; color: #475569; letter-spacing: 0.01em; }
    input[type="text"], textarea { padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; font-family: 'Montserrat', inherit; transition: border-color 0.2s, box-shadow 0.2s; background: #fff; }
    input[type="text"]:focus, textarea:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15); }
    textarea { resize: vertical; min-height: 88px; line-height: 1.5; }
    .selector-preview { padding: 10px 14px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; font-family: 'Monaco', 'Courier New', monospace; color: #475569; word-break: break-all; line-height: 1.4; }
    .element-info { padding: 14px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; font-size: 12px; }
    .element-info strong { display: block; margin-bottom: 6px; color: #1e40af; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
    .placement-group { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .placement-btn { padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s; }
    .placement-btn:hover { border-color: #3b82f6; background: #eff6ff; color: #1d4ed8; }
    .placement-btn.active { border-color: #3b82f6; background: #3b82f6; color: white; }
    .actions { display: flex; gap: 10px; padding-top: 16px; margin-top: 16px; border-top: 1px solid #e2e8f0; }
    .btn { flex: 1; padding: 11px 18px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-primary { background: #3b82f6; color: white; }
    .btn-primary:hover { background: #2563eb; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35); }
    .btn-secondary { background: #f1f5f9; color: #475569; }
    .btn-secondary:hover { background: #e2e8f0; color: #0f172a; }
    .empty-state { text-align: center; padding: 40px 20px; color: #64748b; font-size: 14px; background: #f8fafc; border: 1px dashed #e2e8f0; border-radius: 12px; }
    .empty-state .select-element-btn { margin-top: 16px; padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'Montserrat', inherit; }
    .empty-state .select-element-btn:hover { background: #2563eb; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35); }
    .error { padding: 10px 14px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #b91c1c; font-size: 13px; display: none; margin-top: 12px; }
    .error.show { display: block; }
  </style>
</head>
<body>
  <div class="editor-container">
    <div class="header">
      <h2>Create Guide</h2>
      <button class="close-btn" id="closeBtn" aria-label="Close"><iconify-icon icon="mdi:close"></iconify-icon></button>
    </div>
    <div id="emptyState" class="empty-state">
      <div>Click on an element in the page to create a guide</div>
      <button type="button" class="select-element-btn" id="selectElementBtn">Select element</button>
    </div>
    <div id="editorForm" style="display: none;">
      <div class="form-group">
        <label>Selector</label>
        <div class="selector-preview" id="selectorPreview">-</div>
      </div>
      <div class="element-info" id="elementInfo" style="display: none;">
        <strong>Element Info</strong>
        <div id="elementInfoContent"></div>
      </div>
      <div class="form-group">
        <label for="guideContent">Guide Content</label>
        <textarea id="guideContent" placeholder="Enter the guide text that will be shown to users..." required></textarea>
      </div>
      <div class="form-group">
        <label>Placement</label>
        <div class="placement-group">
          <button class="placement-btn" data-placement="top">Top</button>
          <button class="placement-btn" data-placement="right">Right</button>
          <button class="placement-btn" data-placement="bottom">Bottom</button>
          <button class="placement-btn" data-placement="left">Left</button>
        </div>
      </div>
      <div class="error" id="errorMessage"></div>
      <div class="actions">
        <button class="btn btn-secondary" id="cancelBtn">Cancel</button>
        <button class="btn btn-secondary" id="clearSelectionBtn">Clear Selection</button>
        <button class="btn btn-primary" id="saveBtn">Save Guide</button>
      </div>
    </div>
  </div>
  <script>
    let selectedPlacement = 'right';
    let currentSelector = '';
    let currentElementInfo = null;
    const placementButtons = document.querySelectorAll('.placement-btn');
    placementButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        placementButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedPlacement = btn.dataset.placement;
      });
    });
    document.querySelector('[data-placement="right"]').classList.add('active');
    document.getElementById('closeBtn').addEventListener('click', () => sendMessage({ type: 'CANCEL' }));
    document.getElementById('cancelBtn').addEventListener('click', () => sendMessage({ type: 'CANCEL' }));
    document.getElementById('selectElementBtn').addEventListener('click', () => sendMessage({ type: 'ACTIVATE_SELECTOR' }));
    document.getElementById('clearSelectionBtn').addEventListener('click', () => sendMessage({ type: 'CLEAR_SELECTION_CLICKED' }));
    document.getElementById('saveBtn').addEventListener('click', () => {
      const content = document.getElementById('guideContent').value.trim();
      if (!content) { showError('Please enter guide content'); return; }
      if (!currentSelector) { showError('No element selected'); return; }
      sendMessage({ type: 'SAVE_GUIDE', guide: { page: window.location.pathname || '/', selector: currentSelector, content: content, placement: selectedPlacement, status: 'active' } });
    });
    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message.type === 'ELEMENT_SELECTED') {
        currentSelector = message.selector;
        currentElementInfo = message.elementInfo;
        document.getElementById('emptyState').style.display = 'none';
        document.getElementById('editorForm').style.display = 'block';
        document.getElementById('selectorPreview').textContent = currentSelector;
        if (currentElementInfo) {
          const infoContent = document.getElementById('elementInfoContent');
          infoContent.innerHTML = '<div><strong>Tag:</strong> ' + currentElementInfo.tagName + '</div>' + (currentElementInfo.id ? '<div><strong>ID:</strong> ' + currentElementInfo.id + '</div>' : '') + (currentElementInfo.className ? '<div><strong>Class:</strong> ' + currentElementInfo.className + '</div>' : '') + (currentElementInfo.textContent ? '<div><strong>Text:</strong> ' + currentElementInfo.textContent + '</div>' : '');
          document.getElementById('elementInfo').style.display = 'block';
        }
        document.getElementById('guideContent').value = '';
        hideError();
      }
      if (message.type === 'CLEAR_SELECTION_ACK') {
        currentSelector = '';
        currentElementInfo = null;
        document.getElementById('emptyState').style.display = 'block';
        document.getElementById('editorForm').style.display = 'none';
        document.getElementById('selectorPreview').textContent = '-';
        document.getElementById('elementInfo').style.display = 'none';
        hideError();
      }
    });
    function sendMessage(message) { window.parent.postMessage(message, '*'); }
    function showError(message) { const errorEl = document.getElementById('errorMessage'); errorEl.textContent = message; errorEl.classList.add('show'); }
    function hideError() { const errorEl = document.getElementById('errorMessage'); errorEl.classList.remove('show'); }
    window.addEventListener('load', () => sendMessage({ type: 'EDITOR_READY' }));
  </script>
</body>
  </html>`;
  }

  /**
   * Get Tag Page HTML content: overview (tagged / untagged) + form view
   */
  private getTagPageHtmlContent(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tag Page - Visual Designer</title>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://code.iconify.design/iconify-icon/3.0.2/iconify-icon.min.js"></script>
  <style>
    iconify-icon { display: inline-block; width: 1em; height: 1em; vertical-align: -0.125em; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif; background: #fff; color: #111827; height: 100%; overflow-y: auto; line-height: 1.5; }
    .tag-page-container { display: flex; flex-direction: column; min-height: 100%; }
    .header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #e2e8f0; }
    .header h2 { font-size: 17px; font-weight: 600; color: #0f172a; }
    .header-actions { display: flex; align-items: center; gap: 8px; }
    .header-actions span { cursor: pointer; color: #64748b; font-size: 18px; padding: 4px 8px; border-radius: 6px; }
    .header-actions span:hover { background: #f1f5f9; color: #0f172a; }
    .content { flex: 1; padding: 20px; overflow-y: auto; }
    .tag-page-view { display: none; }
    .tag-page-view.active { display: flex; flex-direction: column; flex: 1; }
    .section-title { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
    .overview-tagged .current-url-card {
      display: flex; align-items: center; justify-content: space-between;
      background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px;
      margin-bottom: 16px; cursor: pointer; transition: box-shadow 0.2s, border-color 0.2s;
    }
    .overview-tagged .current-url-card:hover { border-color: #cbd5e1; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .current-url-card .left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
    .pill { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; flex-shrink: 0; }
    .pill-tagged { background: #10b981; color: #fff; }
    .pill-untagged { background: #f59e0b; color: #fff; }
    .current-url-card .label { font-size: 14px; font-weight: 600; color: #0f172a; }
    .current-url-card .url { font-size: 13px; color: #64748b; margin-top: 4px; word-break: break-all; }
    .current-url-card .chevron { color: #94a3b8; font-size: 18px; flex-shrink: 0; }
    .overview-untagged { text-align: center; padding: 32px 24px; }
    .overview-untagged .illustration {
      width: 120px; height: 100px; margin: 0 auto 24px; background: linear-gradient(135deg, #e0e7ff 0%, #fce7f3 50%, #fef3c7 100%);
      border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 48px;
    }
    .overview-untagged h3 { font-size: 18px; font-weight: 600; color: #0f172a; margin-bottom: 8px; }
    .overview-untagged p { font-size: 14px; color: #64748b; margin-bottom: 24px; line-height: 1.5; }
    .tag-page-btn { width: 100%; padding: 12px 20px; background: #14b8a6; color: #fff; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'Montserrat', inherit; margin-top: 8px; }
    .tag-page-btn:hover { background: #0d9488; box-shadow: 0 4px 12px rgba(20,184,166,0.35); }
    .tagged-detail .back-link { display: block; color: #3b82f6; font-size: 13px; margin-bottom: 16px; text-decoration: none; }
    .tagged-detail .back-link:hover { text-decoration: underline; }
    .tagged-detail .current-url-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .tagged-detail .current-url-header .badge { display: inline-flex; align-items: center; justify-content: center; min-width: 24px; height: 24px; padding: 0 8px; border-radius: 999px; background: #8b5cf6; color: #fff; font-size: 12px; font-weight: 600; }
    .tagged-detail .current-url-header h3 { font-size: 16px; font-weight: 600; color: #0f172a; }
    .tagged-detail .current-url-subtitle { font-size: 13px; color: #64748b; margin-bottom: 16px; }
    .tagged-detail .search-wrap { position: relative; margin-bottom: 16px; }
    .tagged-detail .search-wrap input { width: 100%; padding: 10px 36px 10px 36px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; font-family: 'Montserrat', inherit; }
    .tagged-detail .search-wrap .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 14px; pointer-events: none; }
    .tagged-detail .search-wrap .clear-btn { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); padding: 4px 8px; background: none; border: none; color: #64748b; font-size: 12px; cursor: pointer; }
    .tagged-detail .search-wrap .clear-btn:hover { color: #0f172a; }
    .tagged-detail .page-list-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 8px; background: #fff; cursor: pointer; transition: border-color 0.2s; }
    .tagged-detail .page-list-item:hover { border-color: #cbd5e1; }
    .tagged-detail .page-list-item .name { font-size: 14px; font-weight: 500; color: #0f172a; flex: 1; }
    .tagged-detail .page-list-item .actions { display: flex; gap: 8px; }
    .tagged-detail .page-list-item .actions span { padding: 4px; cursor: pointer; color: #64748b; font-size: 14px; border-radius: 4px; }
    .tagged-detail .page-list-item .actions span:hover { color: #0f172a; background: #f1f5f9; }
    .tagged-detail .page-list-item .actions .delete:hover { color: #dc2626; background: #fef2f2; }
    .tag-page-form .section { margin-bottom: 24px; }
    .radio-group { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
    .radio-item { display: flex; align-items: center; gap: 10px; cursor: pointer; }
    .radio-item input { width: 16px; height: 16px; accent-color: #3b82f6; }
    .radio-item label { font-size: 14px; color: #0f172a; cursor: pointer; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px; }
    .form-group label .required { color: #dc2626; }
    .form-group input, .form-group textarea { width: 100%; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; font-family: 'Montserrat', inherit; }
    .form-group input:focus, .form-group textarea:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }
    .form-group textarea { resize: vertical; min-height: 80px; }
    .rule-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .rule-header span { font-size: 13px; font-weight: 600; color: #0f172a; }
    .rule-delete { cursor: pointer; color: #64748b; padding: 4px; border-radius: 4px; }
    .rule-delete:hover { color: #dc2626; background: #fef2f2; }
    .info-icon { color: #64748b; font-size: 14px; margin-left: 4px; cursor: help; }
    .error { font-size: 13px; color: #dc2626; margin-top: 6px; display: none; }
    .error.show { display: block; }
    .actions { display: flex; gap: 12px; padding: 16px 20px; border-top: 1px solid #e2e8f0; background: #fff; margin-top: auto; }
    .btn { flex: 1; padding: 12px 20px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'Montserrat', inherit; transition: all 0.2s; }
    .btn-cancel { background: #f1f5f9; color: #475569; }
    .btn-cancel:hover { background: #e2e8f0; color: #0f172a; }
    .btn-save { background: #14b8a6; color: #fff; }
    .btn-save:hover { background: #0d9488; box-shadow: 0 4px 12px rgba(20,184,166,0.35); }
  </style>
</head>
<body>
  <div class="tag-page-container">
    <div class="header">
      <h2>Tag Page</h2>
      <div class="header-actions">
        <span title="Menu"><iconify-icon icon="mdi:dots-horizontal"></iconify-icon></span>
        <span class="minimize-btn" id="minimizeBtn" title="Minimize"><iconify-icon icon="mdi:window-minimize"></iconify-icon></span>
      </div>
    </div>
    <div class="content">
      <!-- Overview: current URL already tagged -->
      <div id="overviewTagged" class="tag-page-view overview-tagged">
        <div class="section-title">PAGES OVERVIEW</div>
        <div class="current-url-card" id="currentUrlCardTagged">
          <div class="left">
            <span class="pill pill-tagged">Tagged</span>
            <div>
              <div class="label">Current URL</div>
              <div class="url" id="currentUrlDisplayTagged">-</div>
            </div>
          </div>
          <span class="chevron"><iconify-icon icon="mdi:chevron-right"></iconify-icon></span>
        </div>
        <button type="button" class="tag-page-btn" id="tagPageBtnFromTagged">Tag Page</button>
      </div>
      <!-- Tagged URL detail: list of tagged pages for current URL -->
      <div id="taggedPagesDetailView" class="tag-page-view tagged-detail">
        <a href="#" class="back-link" id="backFromTaggedDetail"><iconify-icon icon="mdi:arrow-left"></iconify-icon> Back to overview</a>
        <div class="current-url-header">
          <span class="badge" id="taggedCountBadge">0</span>
          <h3>Current URL</h3>
        </div>
        <div class="current-url-subtitle">List of tagged Pages on this URL</div>
        <div class="search-wrap">
          <span class="search-icon"><iconify-icon icon="mdi:magnify"></iconify-icon></span>
          <input type="text" id="searchPagesInput" placeholder="Search Pages" />
          <button type="button" class="clear-btn" id="clearSearchBtn" style="display:none;">Clear</button>
        </div>
        <div id="taggedPagesList"></div>
        <button type="button" class="tag-page-btn" id="tagPageBtnFromDetail" style="margin-top:16px;">Tag Page</button>
      </div>
      <!-- Overview: current URL not tagged -->
      <div id="overviewUntagged" class="tag-page-view overview-untagged">
        <div class="illustration" aria-hidden="true"><iconify-icon icon="mdi:calendar" style="font-size:48px;"></iconify-icon></div>
        <h3>Let's start tagging!</h3>
        <p>Start by first tagging this page and then features to get going.</p>
        <button type="button" class="tag-page-btn" id="tagPageBtnFromUntagged">Tag Page</button>
      </div>
      <!-- Form: create/edit page -->
      <div id="tagPageFormView" class="tag-page-view tag-page-form">
        <a href="#" class="back-link" id="backFromTagPageForm" style="display:block;color:#3b82f6;font-size:13px;margin-bottom:16px;"><iconify-icon icon="mdi:arrow-left"></iconify-icon> Back</a>
        <div class="section">
          <div class="section-title">PAGE SETUP</div>
          <div class="radio-group">
            <div class="radio-item">
              <input type="radio" id="createNew" name="pageSetup" value="create" checked>
              <label for="createNew">Create New Page</label>
            </div>
            <div class="radio-item">
              <input type="radio" id="mergeExisting" name="pageSetup" value="merge">
              <label for="mergeExisting">Merge with Existing</label>
            </div>
          </div>
          <div class="form-group">
            <label>Page Name <span class="required">*</span></label>
            <input type="text" id="pageName" placeholder="Enter page name" required>
            <div class="error" id="pageNameError">This page name is already in use. Try another?</div>
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea id="pageDescription" placeholder="Click to add description"></textarea>
          </div>
        </div>
        <div class="section">
          <div class="section-title">INCLUDE PAGE RULES <span class="info-icon" title="Define how this page is identified"><iconify-icon icon="mdi:information-outline"></iconify-icon></span></div>
          <div class="rule-header">
            <span>Include Rule 1</span>
            <span class="rule-delete" id="deleteRule1" title="Delete rule"><iconify-icon icon="mdi:delete-outline"></iconify-icon></span>
          </div>
          <div class="radio-group">
            <div class="radio-item">
              <input type="radio" id="suggestedMatch" name="ruleType" value="suggested" checked>
              <label for="suggestedMatch">Suggested Match</label>
            </div>
            <div class="radio-item">
              <input type="radio" id="exactMatch" name="ruleType" value="exact">
              <label for="exactMatch">Exact Match</label>
            </div>
            <div class="radio-item">
              <input type="radio" id="ruleBuilder" name="ruleType" value="builder">
              <label for="ruleBuilder">Rule Builder</label>
            </div>
          </div>
          <div class="form-group">
            <label>Selection URL</label>
            <input type="text" id="selectionUrl" placeholder="e.g. //*/path/to/page">
          </div>
        </div>
      </div>
    </div>
    <div class="actions" id="tagPageFormActions" style="display: none;">
      <button class="btn btn-cancel" id="cancelBtn">Cancel</button>
      <button class="btn btn-save" id="saveBtn">Save</button>
    </div>
  </div>
  <script>
    function sendMessage(m) { window.parent.postMessage(m, '*'); }
    var STORAGE_KEY = 'designerTaggedPages';
    function getCurrentUrl() {
      try {
        var p = window.parent.location;
        return (p.host || p.hostname || '') + (p.pathname || '/') + (p.search || '') + (p.hash || '');
      } catch (e) { return window.location.href || ''; }
    }
    function normalizeUrl(u) {
      u = (u || '').replace(/^https?:\\/\\//i, '').replace(/\\/$/, '');
      return u || '';
    }
    function getTaggedPages() {
      try {
        var raw = localStorage.getItem(STORAGE_KEY) || '[]';
        return JSON.parse(raw);
      } catch (e) { return []; }
    }
    function isCurrentUrlTagged() {
      var current = normalizeUrl(getCurrentUrl());
      var list = getTaggedPages();
      return list.some(function(p) { return p && normalizeUrl(p.url) === current; });
    }
    function showView(viewId) {
      document.querySelectorAll('.tag-page-view').forEach(function(el) { el.classList.remove('active'); });
      var el = document.getElementById(viewId);
      if (el) el.classList.add('active');
      document.getElementById('tagPageFormActions').style.display = viewId === 'tagPageFormView' ? 'flex' : 'none';
    }
    function refreshOverview() {
      var tagged = isCurrentUrlTagged();
      showView(tagged ? 'overviewTagged' : 'overviewUntagged');
      document.getElementById('currentUrlDisplayTagged').textContent = getCurrentUrl() || '(current page)';
    }
    function getPagesForCurrentUrl() {
      var current = normalizeUrl(getCurrentUrl());
      return getTaggedPages().filter(function(p) { return p && normalizeUrl(p.url) === current; });
    }
    function renderTaggedPagesList(filter) {
      var pages = getPagesForCurrentUrl();
      var q = (filter || '').toLowerCase().trim();
      if (q) pages = pages.filter(function(p) { return (p.pageName || '').toLowerCase().indexOf(q) !== -1; });
      var list = document.getElementById('taggedPagesList');
      list.innerHTML = '';
      pages.forEach(function(p) {
        var name = p.pageName || 'Unnamed';
        var item = document.createElement('div');
        item.className = 'page-list-item';
        item.innerHTML = '<span class="name">' + escapeHtml(name) + '</span>' +
          '<div class="actions">' +
          '<span class="edit" title="Edit" data-page-name="' + escapeHtml(name) + '"><iconify-icon icon="mdi:pencil"></iconify-icon></span>' +
          '<span class="delete" title="Delete" data-page-name="' + escapeHtml(name) + '"><iconify-icon icon="mdi:delete-outline"></iconify-icon></span>' +
          '</div>';
        list.appendChild(item);
      });
    }
    function escapeHtml(s) {
      var div = document.createElement('div');
      div.textContent = s;
      return div.innerHTML;
    }
    function showTaggedDetailView() {
      var pages = getPagesForCurrentUrl();
      showView('taggedPagesDetailView');
      document.getElementById('taggedCountBadge').textContent = String(pages.length);
      document.getElementById('searchPagesInput').value = '';
      document.getElementById('clearSearchBtn').style.display = 'none';
      renderTaggedPagesList('');
    }
    document.getElementById('minimizeBtn').addEventListener('click', function() { sendMessage({ type: 'CANCEL' }); });
    function getSuggestedSelectionUrl() {
      try {
        var p = window.parent.location;
        var path = (p.pathname || '/').replace(/^\\//, '');
        var search = p.search || '';
        var hash = p.hash || '';
        return '//*/' + path + search + hash;
      } catch (e) { return '//*/'; }
    }
    function showTagPageForm() {
      showView('tagPageFormView');
      document.getElementById('tagPageFormActions').style.display = 'flex';
      document.getElementById('selectionUrl').value = getSuggestedSelectionUrl();
    }
    document.getElementById('currentUrlCardTagged').addEventListener('click', showTaggedDetailView);
    document.getElementById('searchPagesInput').addEventListener('input', function() {
      var val = this.value;
      document.getElementById('clearSearchBtn').style.display = val ? 'block' : 'none';
      renderTaggedPagesList(val);
    });
    document.getElementById('clearSearchBtn').addEventListener('click', function() {
      document.getElementById('searchPagesInput').value = '';
      this.style.display = 'none';
      renderTaggedPagesList('');
    });
    document.getElementById('taggedPagesList').addEventListener('click', function(e) {
      var target = e.target;
      if (!target || !target.closest) return;
      var editBtn = target.closest('.edit');
      var deleteBtn = target.closest('.delete');
      if (editBtn) {
        var pageName = editBtn.getAttribute('data-page-name');
        if (pageName) sendMessage({ type: 'EDIT_TAG_PAGE', payload: { pageName: pageName } });
      }
      if (deleteBtn) {
        var pageName = deleteBtn.getAttribute('data-page-name');
        if (pageName && window.confirm('Delete page "' + pageName + '"?')) {
          var current = normalizeUrl(getCurrentUrl());
          var list = getTaggedPages().filter(function(p) {
            return !(p && p.pageName === pageName && normalizeUrl(p.url) === current);
          });
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
            var remaining = getPagesForCurrentUrl();
            if (remaining.length === 0) {
              refreshOverview();
            } else {
              document.getElementById('taggedCountBadge').textContent = String(remaining.length);
              renderTaggedPagesList(document.getElementById('searchPagesInput').value);
            }
          } catch (err) {}
        }
      }
    });
    document.getElementById('tagPageBtnFromTagged').addEventListener('click', showTagPageForm);
    document.getElementById('tagPageBtnFromUntagged').addEventListener('click', showTagPageForm);
    document.getElementById('tagPageBtnFromDetail').addEventListener('click', showTagPageForm);
    document.getElementById('backFromTaggedDetail').addEventListener('click', function(e) { e.preventDefault(); refreshOverview(); });
    document.getElementById('backFromTagPageForm').addEventListener('click', function(e) { e.preventDefault(); refreshOverview(); document.getElementById('tagPageFormActions').style.display = 'none'; });
    document.getElementById('cancelBtn').addEventListener('click', function() { refreshOverview(); });
    document.getElementById('saveBtn').addEventListener('click', function() {
      var pageName = document.getElementById('pageName').value.trim();
      var pageNameError = document.getElementById('pageNameError');
      if (!pageName) { pageNameError.classList.add('show'); return; }
      pageNameError.classList.remove('show');
      var pageSetup = document.querySelector('input[name="pageSetup"]:checked').value;
      var description = document.getElementById('pageDescription').value.trim();
      var ruleType = document.querySelector('input[name="ruleType"]:checked').value;
      var selectionUrl = document.getElementById('selectionUrl').value.trim();
      sendMessage({
        type: 'SAVE_TAG_PAGE',
        payload: {
          pageSetup: pageSetup,
          pageName: pageName,
          description: description || undefined,
          includeRules: [{ ruleType: ruleType, selectionUrl: selectionUrl || '' }]
        }
      });
    });
    window.addEventListener('message', function(event) {
      var d = event.data;
      if (d && d.type === 'TAG_PAGE_SAVED_ACK') { refreshOverview(); }
    });
    var lastKnownUrl = '';
    function checkUrlChange() {
      var current = getCurrentUrl();
      if (current !== lastKnownUrl) {
        lastKnownUrl = current;
        refreshOverview();
      }
    }
    function startUrlChangeDetection() {
      lastKnownUrl = getCurrentUrl();
      try {
        window.parent.addEventListener('hashchange', checkUrlChange);
        window.parent.addEventListener('popstate', checkUrlChange);
      } catch (e) {}
      setInterval(checkUrlChange, 1500);
    }
    window.addEventListener('load', function() {
      refreshOverview();
      lastKnownUrl = getCurrentUrl();
      startUrlChangeDetection();
      sendMessage({ type: 'EDITOR_READY' });
    });
  </script>
</body>
</html>`;
  }

  /**
   * Get Tag Feature HTML content: Features tab overview + selector form when "Tag Feature" is clicked
   */
  private getTagFeatureHtmlContent(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tag Feature - Visual Designer</title>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://code.iconify.design/iconify-icon/3.0.2/iconify-icon.min.js"></script>
  <style>
    iconify-icon { display: inline-block; width: 1em; height: 1em; vertical-align: -0.125em; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif; background: #f8fafc; color: #111827; height: 100%; overflow-y: auto; line-height: 1.5; }
    .tag-feature-container { display: flex; flex-direction: column; min-height: 100%; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #e2e8f0; }
    .header h2 { font-size: 17px; font-weight: 600; color: #0f172a; }
    .header-actions { display: flex; align-items: center; gap: 8px; }
    .header-actions span { cursor: pointer; color: #64748b; font-size: 18px; padding: 4px 8px; border-radius: 6px; }
    .header-actions span:hover { background: #f1f5f9; color: #0f172a; }
    .tabs { display: flex; gap: 0; border-bottom: 1px solid #e2e8f0; padding: 0 20px; }
    .tab { padding: 14px 20px; background: none; border: none; font-size: 14px; font-weight: 500; color: #64748b; cursor: pointer; position: relative; font-family: 'Montserrat', inherit; }
    .tab:hover { color: #0f172a; }
    .tab.active { color: #0f172a; font-weight: 600; }
    .tab.active::after { content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 3px; background: #14b8a6; border-radius: 3px 3px 0 0; }
    .content { flex: 1; overflow-y: auto; padding: 24px 20px; background: #f8fafc; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    .section-title { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; margin-top: 20px; }
    .section-title:first-child { margin-top: 0; }
    .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 18px; margin-bottom: 12px; cursor: pointer; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
    .card:hover { border-color: #cbd5e1; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .card-content { display: flex; align-items: center; justify-content: space-between; }
    .card-left { display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0; }
    .badge { display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; font-size: 12px; font-weight: 600; min-width: 28px; height: 28px; padding: 0 10px; color: #fff; flex-shrink: 0; }
    .badge-teal { background: #14b8a6; }
    .badge-purple { background: #8b5cf6; }
    .card-text { flex: 1; min-width: 0; }
    .card-title { font-size: 14px; font-weight: 600; color: #0f172a; margin-bottom: 4px; }
    .card-description { font-size: 13px; color: #64748b; line-height: 1.4; }
    .chevron { color: #94a3b8; font-size: 18px; flex-shrink: 0; }
    .heatmap-row { display: flex; align-items: center; justify-content: space-between; padding: 18px 0; border-top: 1px solid #e2e8f0; margin-top: 24px; }
    .heatmap-label { font-size: 14px; font-weight: 500; color: #0f172a; }
    .heatmap-controls { display: flex; align-items: center; gap: 12px; }
    .toggle-switch { position: relative; width: 44px; height: 24px; background: #cbd5e1; border-radius: 12px; cursor: pointer; transition: background 0.2s; }
    .toggle-switch.active { background: #10b981; }
    .toggle-switch::after { content: ''; position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; background: #fff; border-radius: 50%; transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.15); }
    .toggle-switch.active::after { transform: translateX(20px); }
    .plus-icon { width: 28px; height: 28px; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b; font-size: 18px; transition: all 0.2s; background: #fff; }
    .plus-icon:hover { border-color: #3b82f6; color: #3b82f6; background: #eff6ff; }
    .tag-feature-btn { width: 100%; padding: 12px 20px; background: #14b8a6; color: #fff; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'Montserrat', inherit; margin-top: 24px; box-shadow: 0 2px 8px rgba(20,184,166,0.25); }
    .tag-feature-btn:hover { background: #0d9488; transform: translateY(-1px); box-shadow: 0 6px 16px rgba(20,184,166,0.35); }
    .overview-actions { display: flex; gap: 12px; margin-top: 24px; }
    .overview-actions .tag-feature-btn { margin-top: 0; flex: 1; }
    .clear-selection-btn { padding: 12px 20px; background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'Montserrat', inherit; transition: all 0.2s; }
    .clear-selection-btn:hover { background: #e2e8f0; color: #0f172a; }
    .view { display: none; }
    .view.active { display: flex; flex-direction: column; min-height: 100%; }
    .selector-form .form-group { margin-bottom: 16px; }
    .selector-form label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px; }
    .selector-form label .required { color: #dc2626; }
    .selector-form input { width: 100%; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; font-family: 'Montserrat', inherit; }
    .selector-preview { padding: 10px 12px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; font-family: monospace; color: #475569; word-break: break-all; }
    .element-info { padding: 12px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; font-size: 12px; color: #1e40af; margin-top: 8px; }
    .error { font-size: 13px; color: #dc2626; margin-top: 6px; display: none; }
    .error.show { display: block; }
    .form-actions { display: flex; gap: 12px; padding: 16px 20px; border-top: 1px solid #e2e8f0; margin-top: auto; }
    .btn { flex: 1; padding: 12px 20px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.2s; }
    .btn-cancel { background: #f1f5f9; color: #475569; }
    .btn-cancel:hover { background: #e2e8f0; color: #0f172a; }
    .btn-save { background: #14b8a6; color: #fff; }
    .btn-save:hover { background: #0d9488; box-shadow: 0 4px 12px rgba(20,184,166,0.35); }
    .back-link { color: #3b82f6; font-size: 13px; cursor: pointer; margin-bottom: 16px; }
    .back-link:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="tag-feature-container">
    <div class="header">
      <h2>Manage Pages, Features, and AI agents</h2>
      <div class="header-actions">
        <span title="Menu"><iconify-icon icon="mdi:dots-horizontal"></iconify-icon></span>
        <span id="minimizeBtn" title="Minimize"><iconify-icon icon="mdi:window-minimize"></iconify-icon></span>
      </div>
    </div>
    <div class="tabs">
      <button class="tab active" data-tab="features">Features</button>
      <button class="tab" data-tab="pages">Pages</button>
      <button class="tab" data-tab="ai-agents">AI agents</button>
    </div>
    <div class="content">
      <div id="overviewView" class="view active" style="display: block;">
        <div id="featuresTab" class="tab-content active">
          <div class="section-title">FEATURES OVERVIEW</div>
          <div class="card">
            <div class="card-content">
              <div class="card-left">
                <span class="badge badge-teal" id="suggestedCount">7</span>
                <div class="card-text">
                  <div class="card-title">Suggested Features</div>
                  <div class="card-description">List of untagged elements on this page</div>
                </div>
              </div>
              <span class="chevron"><iconify-icon icon="mdi:chevron-right"></iconify-icon></span>
            </div>
          </div>
          <div class="card">
            <div class="card-content">
              <div class="card-left">
                <span class="badge badge-purple" id="taggedCount">111</span>
                <div class="card-text">
                  <div class="card-title">Tagged Features</div>
                  <div class="card-description">List of tagged Features on this page</div>
                </div>
              </div>
              <span class="chevron"><iconify-icon icon="mdi:chevron-right"></iconify-icon></span>
            </div>
          </div>
          <div class="heatmap-row">
            <span class="heatmap-label">Heatmap</span>
            <div class="heatmap-controls">
              <div class="toggle-switch" id="heatmapToggle"></div>
              <div class="plus-icon"><iconify-icon icon="mdi:plus"></iconify-icon></div>
            </div>
          </div>
          <div class="overview-actions">
            <button class="tag-feature-btn" id="tagFeatureBtn">Tag Feature</button>
            <button class="clear-selection-btn" id="overviewClearSelectionBtn">Clear Selection</button>
          </div>
        </div>
      </div>
      <div id="selectorFormView" class="view" style="display: none;">
        <div style="padding: 20px; flex: 1;">
          <a class="back-link" id="backFromForm"><iconify-icon icon="mdi:arrow-left"></iconify-icon> Back to overview</a>
          <h3 style="margin-bottom: 16px; font-size: 16px;">Tag Feature</h3>
          <div class="selector-form">
            <div class="form-group">
              <label>Selector</label>
              <div class="selector-preview" id="selectorPreview">-</div>
            </div>
            <div class="form-group" id="elementInfoGroup" style="display: none;">
              <label>Element info</label>
              <div class="element-info" id="elementInfoContent"></div>
            </div>
            <div class="form-group">
              <label>Feature Name <span class="required">*</span></label>
              <input type="text" id="featureNameInput" placeholder="Enter feature name">
              <div class="error" id="featureNameError">Please enter a feature name.</div>
            </div>
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn-cancel" id="formCancelBtn">Cancel</button>
          <button class="btn btn-cancel" id="clearSelectionBtn">Clear Selection</button>
          <button class="btn btn-save" id="formSaveBtn">Save</button>
        </div>
      </div>
    </div>
  </div>
  <script>
    function sendMessage(m) { window.parent.postMessage(m, '*'); }
    var FEATURES_STORAGE_KEY = 'designerTaggedFeatures';
    var HEATMAP_STORAGE_KEY = 'designerHeatmapEnabled';
    var currentSelector = '';
    var currentElementInfo = null;
    function getCurrentUrl() {
      try {
        var p = window.parent.location;
        return (p.host || p.hostname || '') + (p.pathname || '/') + (p.search || '') + (p.hash || '');
      } catch (e) { return window.location.href || ''; }
    }
    function normalizeUrl(u) {
      u = (u || '').replace(/^https?:\\/\\//i, '').replace(/\\/$/, '');
      return u || '';
    }
    function getTaggedFeatures() {
      try {
        var raw = localStorage.getItem(FEATURES_STORAGE_KEY) || '[]';
        return JSON.parse(raw);
      } catch (e) { return []; }
    }
    function getFeaturesForCurrentUrl() {
      var current = normalizeUrl(getCurrentUrl());
      return getTaggedFeatures().filter(function(f) { return f && normalizeUrl(f.url) === current; });
    }
    function refreshTaggedCount() {
      var count = getFeaturesForCurrentUrl().length;
      document.getElementById('taggedCount').textContent = String(count);
    }
    function showOverview() {
      document.getElementById('overviewView').style.display = 'block';
      document.getElementById('selectorFormView').style.display = 'none';
      currentSelector = '';
      currentElementInfo = null;
      document.getElementById('selectorPreview').textContent = '-';
      document.getElementById('elementInfoGroup').style.display = 'none';
      document.getElementById('featureNameInput').value = '';
      document.getElementById('featureNameError').classList.remove('show');
      refreshTaggedCount();
    }
    document.getElementById('minimizeBtn').addEventListener('click', function() { sendMessage({ type: 'CANCEL' }); });
    document.getElementById('tagFeatureBtn').addEventListener('click', function() {
      sendMessage({ type: 'TAG_FEATURE_CLICKED' });
    });
    document.getElementById('overviewClearSelectionBtn').addEventListener('click', function() {
      sendMessage({ type: 'CLEAR_SELECTION_CLICKED' });
    });
    document.getElementById('clearSelectionBtn').addEventListener('click', function() {
      sendMessage({ type: 'CLEAR_SELECTION_CLICKED' });
    });
    document.querySelectorAll('.tab').forEach(function(tab) {
      tab.addEventListener('click', function() {
        var t = tab.dataset.tab;
        document.querySelectorAll('.tab').forEach(function(x) { x.classList.remove('active'); });
        tab.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(function(c) { c.classList.remove('active'); });
        var panel = document.getElementById(t + 'Tab');
        if (panel) panel.classList.add('active');
      });
    });
    document.getElementById('heatmapToggle').addEventListener('click', function() {
      this.classList.toggle('active');
      var enabled = this.classList.contains('active');
      try { localStorage.setItem(HEATMAP_STORAGE_KEY, String(enabled)); } catch (e) {}
      sendMessage({ type: 'HEATMAP_TOGGLE', enabled: enabled });
    });
    document.getElementById('backFromForm').addEventListener('click', function() { showOverview(); });
    document.getElementById('formCancelBtn').addEventListener('click', function() { showOverview(); });
    document.getElementById('formSaveBtn').addEventListener('click', function() {
      var name = (document.getElementById('featureNameInput').value || '').trim();
      var err = document.getElementById('featureNameError');
      if (!name) { err.classList.add('show'); return; }
      err.classList.remove('show');
      sendMessage({
        type: 'SAVE_TAG_FEATURE',
        payload: {
          featureName: name,
          selector: currentSelector,
          elementInfo: currentElementInfo
        }
      });
    });
    window.addEventListener('message', function(event) {
      var d = event.data;
      if (!d) return;
      if (d.type === 'ELEMENT_SELECTED') {
        currentSelector = d.selector || '';
        currentElementInfo = d.elementInfo || null;
        document.getElementById('selectorPreview').textContent = currentSelector || '-';
        var infoEl = document.getElementById('elementInfoContent');
        var infoGroup = document.getElementById('elementInfoGroup');
        if (currentElementInfo) {
          var tag = currentElementInfo.tagName || '';
          var id = currentElementInfo.id || '';
          var cls = (currentElementInfo.className || (currentElementInfo.attributes && currentElementInfo.attributes.class)) || '';
          var text = (currentElementInfo.textContent || '').slice(0, 80);
          infoEl.innerHTML = 'Tag: ' + tag + (id ? ' | ID: ' + id : '') + (cls ? ' | Class: ' + cls : '') + (text ? ' | Text: ' + text : '');
          infoGroup.style.display = 'block';
        } else {
          infoGroup.style.display = 'none';
        }
        document.getElementById('featureNameInput').value = '';
        document.getElementById('featureNameError').classList.remove('show');
        document.getElementById('overviewView').style.display = 'none';
        document.getElementById('selectorFormView').style.display = 'flex';
      }
      if (d.type === 'CLEAR_SELECTION_ACK') {
        showOverview();
      }
      if (d.type === 'TAG_FEATURE_SAVED_ACK') {
        showOverview();
      }
    });
    window.addEventListener('load', function() {
      refreshTaggedCount();
      var heatmapEnabled = localStorage.getItem(HEATMAP_STORAGE_KEY) === 'true';
      var toggleEl = document.getElementById('heatmapToggle');
      if (heatmapEnabled && toggleEl) toggleEl.classList.add('active');
      sendMessage({ type: 'EDITOR_READY' });
    });
  </script>
</body>
</html>`;
  }

  /**
   * Create drag handle overlay
   */
  private createDragHandle(): void {
    if (this.dragHandle) {
      return;
    }

    this.dragHandle = document.createElement('div');
    this.dragHandle.id = 'designer-editor-drag-handle';
    this.dragHandle.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 400px;
      height: 70px;
      background: transparent;
      cursor: default;
      z-index: 1000000;
      display: none;
      pointer-events: none;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
    `;

    // Wrapper for grip icon - ONLY this area is draggable and shows move cursor
    const gripButton = document.createElement('div');
    gripButton.style.cssText = `
      position: absolute;
      top: 30%;
      left: 50%;
      transform: translate(-50%, -50%);
      cursor: grab;
      pointer-events: auto;
      padding: 6px 8px;
      border-radius: 6px;
      background: transparent;
      border: none;
      z-index: 1;
      transition: background 0.2s, border-color 0.2s;
    `;
    gripButton.onmouseenter = () => {
      gripButton.style.background = 'transparent';
      gripButton.style.border = 'none';
    };
    gripButton.onmouseleave = () => {
      gripButton.style.background = 'transparent';
      gripButton.style.border = 'none';
    };

    // Add grip icon (Iconify drag icon)
    const gripIcon = document.createElement('iconify-icon');
    gripIcon.setAttribute('icon', 'pepicons-print:dots-x');
    gripIcon.style.cssText = 'font-size: 18px; color: #64748b; pointer-events: none;';
    gripButton.appendChild(gripIcon);
    this.dragHandle.appendChild(gripButton);

    // Mouse event handlers - ONLY on grip icon (not entire header)
    // Use capture phase to ensure we catch all events
    this.gripButton = gripButton;
    gripButton.addEventListener('mousedown', this.handleMouseDown, true);
    document.addEventListener('mousemove', this.handleMouseMove, true);
    document.addEventListener('mouseup', this.handleMouseUp, true);
    // Also listen on window to catch events outside document
    window.addEventListener('mousemove', this.handleMouseMove, true);
    window.addEventListener('mouseup', this.handleMouseUp, true);
  }

  /**
   * Update drag handle position to match iframe
   */
  private updateDragHandlePosition(): void {
    if (!this.iframe || !this.dragHandle) {
      return;
    }

    const rect = this.iframe.getBoundingClientRect();
    this.dragHandle.style.top = `${rect.top}px`;
    this.dragHandle.style.left = `${rect.left}px`;
    this.dragHandle.style.width = `${rect.width}px`;
  }

  /**
   * Handle mouse down on drag handle
   */
  private handleMouseDown = (e: MouseEvent): void => {
    if (!this.iframe || !this.dragHandle) {
      return;
    }

    // Store initial mouse position
    this.mouseDownX = e.clientX;
    this.mouseDownY = e.clientY;
    this.isMouseDown = true;
    this.isDragging = false;

    const rect = this.iframe.getBoundingClientRect();
    this.dragStartX = e.clientX - rect.left;
    this.dragStartY = e.clientY - rect.top;

    // Prevent text selection immediately when clicking grip icon
    e.preventDefault();
    e.stopPropagation();
  };

  /**
   * Handle mouse move during drag
   */
  private handleMouseMove = (e: MouseEvent): void => {
    // Must have started mousedown and have iframe/dragHandle
    if (!this.isMouseDown || !this.iframe || !this.dragHandle) {
      return;
    }

    // Check if mouse has moved enough to start dragging
    if (!this.isDragging) {
      const deltaX = Math.abs(e.clientX - this.mouseDownX);
      const deltaY = Math.abs(e.clientY - this.mouseDownY);
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance > this.dragThreshold) {
        // Start dragging - once started, entire form becomes draggable
        this.isDragging = true;
        document.body.style.cursor = 'grabbing';
        document.documentElement.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
        document.documentElement.style.userSelect = 'none';
        // Let cursor show through iframe (iframe captures pointer and shows its own cursor otherwise)
        if (this.iframe) this.iframe.style.pointerEvents = 'none';
        if (this.gripButton) this.gripButton.style.cursor = 'grabbing';
      } else {
        // Not enough movement yet - wait for more movement
        return;
      }
    }

    // Once dragging has started, continue smoothly regardless of mouse position
    // This allows dragging to continue even if mouse moves outside the grip icon
    // Prevent default to avoid text selection and other unwanted behaviors
    e.preventDefault();
    e.stopPropagation();

    // Calculate new position based on current mouse position
    const newX = e.clientX - this.dragStartX;
    const newY = e.clientY - this.dragStartY;

    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const iframeWidth = this.iframe.offsetWidth;

    // Constrain to viewport bounds (allow some overflow for better UX)
    const constrainedX = Math.max(-iframeWidth + 50, Math.min(newX, viewportWidth - 50));
    const constrainedY = Math.max(0, Math.min(newY, viewportHeight - 100)); // Leave at least 100px visible

    // Update iframe position smoothly
    this.iframe.style.left = `${constrainedX}px`;
    this.iframe.style.top = `${constrainedY}px`;
    this.iframe.style.right = 'auto';
    this.iframe.style.bottom = 'auto';

    // Update drag handle position to match
    this.dragHandle.style.left = `${constrainedX}px`;
    this.dragHandle.style.top = `${constrainedY}px`;
  };

  /**
   * Handle mouse up to end drag
   */
  private handleMouseUp = (e: MouseEvent): void => {
    // Only process if we actually had a mousedown
    if (!this.isMouseDown) {
      return;
    }

    // End dragging - restore normal cursor and selection
    this.isDragging = false;
    this.isMouseDown = false;
    
    document.body.style.cursor = '';
    document.documentElement.style.cursor = '';
    document.body.style.userSelect = '';
    document.documentElement.style.userSelect = '';
    if (this.iframe) this.iframe.style.pointerEvents = '';
    if (this.gripButton) this.gripButton.style.cursor = 'grab';

    // Prevent any default behavior
    e.preventDefault();
    e.stopPropagation();
  };

  /**
   * Handle messages from iframe
   */
  private handleMessage = (event: MessageEvent): void => {
    // In production, verify event.origin for security
    // For POC, we'll accept messages from any origin

    const message = event.data as EditorMessage;

    if (!message || !message.type) {
      return;
    }

    // Forward message to callback
    if (this.messageCallback) {
      this.messageCallback(message);
    }

    // Handle specific message types (hide editor on cancel or after save)
    // SAVE_TAG_PAGE / SAVE_TAG_FEATURE: do NOT hide - keep panel open so user can tag more
    if (message.type === 'CANCEL' || message.type === 'GUIDE_SAVED') {
      this.hide();
    }
  };
}
