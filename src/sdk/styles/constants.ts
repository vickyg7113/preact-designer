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
    overlay: 2147483640,
    guides: 2147483641,
    tooltip: 2147483642,
    highlight: 2147483643,
    editor: 2147483644,
    controls: 2147483645,
    badge: 2147483646,
    loading: 2147483647, // Max safe 32-bit signed int
  },
} as const;
