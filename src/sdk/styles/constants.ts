/**
 * Shared design tokens for SDK UI (DRY)
 */
export const SDK_STYLES = {
  fontFamily: "'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif",
  primary: "#3b82f6",
  primaryHover: "#2563eb",
  border: "#e2e8f0",
  text: "#111827",
  textMuted: "#64748b",
  bg: "#ffffff",
  bgMuted: "#f8fafc",
  shadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
  shadowHover: "0 6px 16px rgba(0, 0, 0, 0.2)",
  borderRadius: "8px",
  zIndex: {
    overlay: 999995,
    guides: 999996,
    tooltip: 999997,
    highlight: 999998,
    editor: 999999,
    controls: 1000000,
    badge: 1000001,
    loading: 1000002,
  },
} as const;
