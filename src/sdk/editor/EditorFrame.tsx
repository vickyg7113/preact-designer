import { render } from 'preact';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GuideEditor } from './components/GuideEditor';
import { TagPageEditor } from './components/TagPageEditor';
import { TagFeatureEditor } from './components/TagFeatureEditor';
import type { EditorMessage, ElementSelectedMessage, ElementInfo } from '../types';

// Editor styles (minimal - iconify base only)
import { editorStylesCss } from './editorStyles';

/** Query client for editor iframe (Tag Page uses React Query mutation inside component) */
const editorQueryClient = new QueryClient({
  defaultOptions: { mutations: { retry: 0 } },
});

/**
 * Editor Frame - Manages isolated editor UI iframe (Preact-based)
 */
export class EditorFrame {
  private iframe: HTMLIFrameElement | null = null;
  private dragHandle: HTMLElement | null = null;
  private gripButton: HTMLElement | null = null;
  private messageCallback: ((message: EditorMessage) => void) | null = null;
  private isReady: boolean = false;
  private mode: string | null = null;
  private elementSelectedState: { selector: string; elementInfo: ElementInfo; xpath?: string } | null = null;
  private tagPageSavedAckCounter = 0;
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
      border-radius: 16px;
      background: white;
      border: 1px solid rgba(0, 0, 0, 0.06);
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
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
        // Wait for iframe to load - Preact components render here (they send EDITOR_READY on mount)
        if (this.iframe) {
          this.iframe.onload = () => {
            this.isReady = true;
            this.renderEditorContent();
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
   * Send element selected to editor (updates Preact component props)
   */
  sendElementSelected(message: ElementSelectedMessage): void {
    this.elementSelectedState = { selector: message.selector, elementInfo: message.elementInfo, xpath: message.xpath };
    this.renderEditorContent();
    this.show();
  }

  /**
   * Notify editor that selection was cleared (selector deactivated)
   */
  sendClearSelectionAck(): void {
    this.elementSelectedState = null;
    this.renderEditorContent();
  }

  sendTagPageSavedAck(): void {
    this.tagPageSavedAckCounter += 1;
    this.renderEditorContent();
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
   * Load editor HTML content (minimal shell - Preact renders the UI)
   */
  private loadEditorHtml(): void {
    const htmlContent = this.getMinimalEditorHtml();
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    if (this.iframe) {
      this.iframe.src = url;
    }
  }

  /**
   * Render Preact editor component into iframe
   */
  private renderEditorContent(): void {
    if (!this.iframe || !this.isReady) return;

    const doc = this.iframe.contentDocument;
    const root = doc?.getElementById('designer-editor-root');
    if (!doc || !root) return;

    const onMessage = (msg: EditorMessage) => this.messageCallback?.(msg);

    const editorContent =
      this.mode === 'tag-page' ? (
        <TagPageEditor onMessage={onMessage} />
      ) : this.mode === 'tag-feature' ? (
        <TagFeatureEditor
          onMessage={onMessage}
          elementSelected={this.elementSelectedState}
        />
      ) : (
        <GuideEditor
          onMessage={onMessage}
          elementSelected={this.elementSelectedState}
        />
      );

    render(
      <QueryClientProvider client={editorQueryClient}>
        {editorContent}
      </QueryClientProvider>,
      root
    );
  }

  /**
   * Minimal HTML shell - Preact components provide the UI
   */
  private getMinimalEditorHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Visual Designer Editor</title>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://code.iconify.design/iconify-icon/3.0.2/iconify-icon.min.js"></script>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Montserrat',-apple-system,BlinkMacSystemFont,sans-serif;padding:20px;color:#0f172a;line-height:1.6;height:100%;overflow-y:auto;-webkit-font-smoothing:antialiased}</style>
  <style>${editorStylesCss}</style>
</head>
<body>
  <div id="designer-editor-root"></div>
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
    if (message.type === 'CANCEL' || message.type === 'GUIDE_SAVED') {
      this.hide();
    }
  };
}
