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
 * Template nested in GET /guides?guide_id= response (data.templates / data.steps)
 */
export interface GuideTemplateNested {
  template_id: string;
  title: string;
  subtitle: string;
  content: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
  updated_by?: string | null;
  template_key: string;
}

/**
 * Template step/map item in GET /guides?guide_id= response
 */
export interface GuideTemplateMapItem {
  map_id: string;
  template_id: string;
  template: GuideTemplateNested;
  step_order: number;
  url: string | null;
  x_path: string | null;
  is_active: boolean;
  auto_click_target: boolean;
}

/**
 * GET /guides?guide_id= response data
 */
export interface GuideByIdData {
  guide_id: string;
  guide_name: string;
  description: string | null;
  target_segment: string | null;
  guide_category: string | null;
  target_page: string | null;
  type: string;
  status: string;
  priority: number;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  templates: GuideTemplateMapItem[];
  steps: GuideTemplateMapItem[];
}

export interface GuideByIdResponse {
  status: string;
  message: string;
  data: GuideByIdData;
}

/** Payload for PUT /guides/:guide_id (update guide) */
export interface GuideUpdatePayload {
  guide_name: string;
  description: string | null;
  target_segment: string | null;
  guide_category: string | null;
  target_page: string | null;
  type: string;
  status: string;
  priority: number;
  templates: Array<{
    template_id: string;
    step_order: number;
    url: string | null;
    x_path: string | null;
    auto_click_target: boolean;
  }>;
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

/** Rule for exact match (XPath) - used in create/update payload */
export interface ExactMatchRule {
  selector_type: 'xpath';
  selector_value: string;
  match_mode: 'exact';
  priority: number;
  is_active: boolean;
}

/** Rule as returned by GET /features API */
export interface FeatureRule {
  rule_id?: string;
  feature_id?: string;
  selector_type: string;
  selector_value: string;
  match_mode: string;
  priority: number;
  is_active: boolean;
  created_at?: string | null;
  created_by?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
}

/** Payload when Feature element matching = Exact match */
export interface ExactMatchFeaturePayload {
  name: string;
  slug: string;
  description: string;
  status: 'active' | 'inactive';
  rules: ExactMatchRule[];
}

/** Feature item from GET /features API */
export interface FeatureItem {
  feature_id: string;
  product_id: string | null;
  area_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  rules?: FeatureRule[];
  created_at?: string;
  created_by?: string;
  updated_at?: string;
  updated_by?: string;
}

/** Tagged feature (legacy / heatmap shape) */
export interface TaggedFeature {
  id: string;
  featureName: string;
  selector: string;
  url: string;
  elementInfo?: ElementInfo;
  createdAt?: string;
}

/**
 * Editor message types
 */
export type EditorMessageType =
  | 'ELEMENT_SELECTED'
  | 'SAVE_GUIDE'
  | 'EDIT_TAG_PAGE'
  | 'TAG_FEATURE_CLICKED'
  | 'ACTIVATE_SELECTOR'
  | 'CLEAR_SELECTION_CLICKED'
  | 'CLEAR_SELECTION_ACK'
  | 'CANCEL'
  | 'EDITOR_READY'
  | 'GUIDE_SAVED'
  | 'EXIT_EDITOR_MODE'
  | 'HEATMAP_TOGGLE'
  | 'FEATURES_FOR_HEATMAP';

/**
 * Messages sent from SDK to Editor iframe
 */
export interface ElementSelectedMessage {
  type: 'ELEMENT_SELECTED';
  selector: string;
  elementInfo: ElementInfo;
  xpath?: string;
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

export interface FeaturesForHeatmapMessage {
  type: 'FEATURES_FOR_HEATMAP';
  features: FeatureItem[];
}

export interface EditTagPageMessage {
  type: 'EDIT_TAG_PAGE';
  payload: { pageName: string };
}

/**
 * Union type for all editor messages
 */
export type EditorMessage =
  | ElementSelectedMessage
  | SaveGuideMessage
  | FeaturesForHeatmapMessage
  | EditTagPageMessage
  | TagFeatureClickMessage
  | ActivateSelectorMessage
  | ClearSelectionClickMessage
  | ClearSelectionAckMessage
  | TagPageSavedAckMessage
  | HeatmapToggleMessage
  | CancelMessage
  | EditorReadyMessage
  | GuideSavedMessage
  | ExitEditorModeMessage;

/** Payload for create page API (POST /pages) - used by React Query mutation */
export interface CreatePagePayload {
  name: string;
  slug: string;
  description?: string;
}

/**
 * SDK configuration options
 */
export interface SDKConfig {
  /** RevGain API Key (Required for Analytics) */
  apiKey?: string;
  /** Analytics API Host (Optional) */
  apiHost?: string;
  /** Whether to automatically capture user interactions (Default: true) */
  autoCapture?: boolean;
  /** Whether to automatically track page views (Default: true) */
  autoPageViews?: boolean;
  /** Events per batch (Default: 50) */
  batchSize?: number;
  /** Batch interval in seconds (Default: 10) */
  batchInterval?: number;
  /** Storage type for persistence (Default: localStorage) */
  persistence?: 'localStorage' | 'sessionStorage' | 'memory';
  /** Session timeout in minutes (Default: 30) */
  sessionTimeout?: number;
  /** Privacy configuration */
  privacyConfig?: {
    maskInputs?: boolean;
    maskTextContent?: boolean;
    sensitiveSelectors?: string[];
  };
  /** Visitor IDs to never track */
  doNotProcess?: string[];
  /** Require consent before tracking (Default: false) */
  requireConsent?: boolean;
  /** Enable debug logging */
  debug?: boolean;

  // Designer properties
  storageKey?: string;
  editorMode?: boolean;
  apiEndpoint?: string;
  onGuideSaved?: (guide: Guide) => void;
  onGuideDismissed?: (guideId: string) => void;
  /** Guide ID (e.g. from URL); SDK also sets this from guide_id when present in URL */
  guideId?: string | null;
  /** Template ID (e.g. from URL); SDK also sets this from template_id when present in URL */
  templateId?: string | null;
}

