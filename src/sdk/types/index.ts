/**
 * Guide metadata structure
 */
export interface Guide {
  id: string;
  page: string;
  selector: string;
  content: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
  targeting?: GuideTargeting;
  status: 'active' | 'inactive' | 'draft';
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Targeting rules for guides
 */
export interface GuideTargeting {
  role?: string;
  userId?: string;
  userSegment?: string;
  [key: string]: unknown;
}

/**
 * Storage structure
 */
export interface StorageData {
  guides: Guide[];
  version: string;
}

/**
 * Element information for editor
 */
export interface ElementInfo {
  tagName: string;
  id?: string;
  className?: string;
  textContent?: string;
  attributes: Record<string, string>;
  boundingRect: DOMRect;
}

/**
 * Selector generation result
 */
export interface SelectorResult {
  selector: string;
  confidence: 'high' | 'medium' | 'low';
  method: string;
}

/**
 * Tag Page / Tag Feature payloads
 */
export interface TagPageRule {
  ruleType: 'suggested' | 'exact' | 'builder';
  selectionUrl: string;
}

export interface TagPagePayload {
  pageSetup: 'create' | 'merge';
  pageName: string;
  description?: string;
  includeRules: TagPageRule[];
}

export interface TagFeaturePayload {
  featureSetup?: 'create' | 'merge';
  featureName: string;
  description?: string;
  includeRules?: TagPageRule[];
  /** Set when saving from element selection flow */
  selector?: string;
  elementInfo?: ElementInfo;
}

/** Tagged feature stored in localStorage */
export interface TaggedFeature {
  id: string;
  featureName: string;
  selector: string;
  url: string;
  elementInfo?: ElementInfo;
  createdAt: string;
}

/**
 * Editor message types
 */
export type EditorMessageType =
  | 'ELEMENT_SELECTED'
  | 'SAVE_GUIDE'
  | 'SAVE_TAG_PAGE'
  | 'SAVE_TAG_FEATURE'
  | 'TAG_FEATURE_CLICKED'
  | 'ACTIVATE_SELECTOR'
  | 'CLEAR_SELECTION_CLICKED'
  | 'CLEAR_SELECTION_ACK'
  | 'CANCEL'
  | 'EDITOR_READY'
  | 'GUIDE_SAVED'
  | 'EXIT_EDITOR_MODE'
  | 'HEATMAP_TOGGLE'
  | 'TAG_FEATURE_SAVED_ACK';

/**
 * Messages sent from SDK to Editor iframe
 */
export interface ElementSelectedMessage {
  type: 'ELEMENT_SELECTED';
  selector: string;
  elementInfo: ElementInfo;
}

/**
 * Messages sent from Editor iframe to SDK
 */
export interface SaveGuideMessage {
  type: 'SAVE_GUIDE';
  guide: Omit<Guide, 'id' | 'createdAt' | 'updatedAt'>;
}

export interface CancelMessage {
  type: 'CANCEL';
}

export interface EditorReadyMessage {
  type: 'EDITOR_READY';
}

export interface GuideSavedMessage {
  type: 'GUIDE_SAVED';
  guideId: string;
}

export interface ExitEditorModeMessage {
  type: 'EXIT_EDITOR_MODE';
}

export interface TagFeatureClickMessage {
  type: 'TAG_FEATURE_CLICKED';
}

export interface ActivateSelectorMessage {
  type: 'ACTIVATE_SELECTOR';
}

export interface ClearSelectionClickMessage {
  type: 'CLEAR_SELECTION_CLICKED';
}

export interface ClearSelectionAckMessage {
  type: 'CLEAR_SELECTION_ACK';
}

export interface TagPageSavedAckMessage {
  type: 'TAG_PAGE_SAVED_ACK';
}

export interface HeatmapToggleMessage {
  type: 'HEATMAP_TOGGLE';
  enabled: boolean;
}

export interface TagFeatureSavedAckMessage {
  type: 'TAG_FEATURE_SAVED_ACK';
}

export interface SaveTagPageMessage {
  type: 'SAVE_TAG_PAGE';
  payload: TagPagePayload;
}

export interface SaveTagFeatureMessage {
  type: 'SAVE_TAG_FEATURE';
  payload: TagFeaturePayload;
}

/**
 * Union type for all editor messages
 */
export type EditorMessage =
  | ElementSelectedMessage
  | SaveGuideMessage
  | SaveTagPageMessage
  | SaveTagFeatureMessage
  | TagFeatureClickMessage
  | ActivateSelectorMessage
  | ClearSelectionClickMessage
  | ClearSelectionAckMessage
  | TagPageSavedAckMessage
  | TagFeatureSavedAckMessage
  | HeatmapToggleMessage
  | CancelMessage
  | EditorReadyMessage
  | GuideSavedMessage
  | ExitEditorModeMessage;

/**
 * SDK configuration options
 */
export interface SDKConfig {
  storageKey?: string;
  editorMode?: boolean;
  apiEndpoint?: string;
  onGuideSaved?: (guide: Guide) => void;
  onGuideDismissed?: (guideId: string) => void;
}
