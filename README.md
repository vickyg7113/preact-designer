# RG Preact Designer

Visual Designer SDK built with Preact. Create guides, tag pages, and tag features on your web application.

---

## Prerequisites

- **Node.js** 18+ 
- **npm** 9+

---

## Installation

```bash
npm install
```

---

## Launcher UI

The app includes a **Launcher** (similar to visual-designer's `launcher.html`) built with Preact:

1. **Mode selection:** Tag Page, Tag Feature, or Guide
2. **Target URL input:** Enter any URL (absolute, relative, or domain-only)
3. **Launch Designer:** Opens the target URL in a new tab with `?designer=true&mode=<mode>`

When you visit the app without `?designer=true`, you see the Launcher. When you launch a URL (e.g. your own app or `http://localhost:5173`), the target page loads with the designer enabled.

---

## Build Commands

| Command | Description | Output |
|---------|-------------|--------|
| `npm run dev` | Start development server | http://localhost:5173 |
| `npm run build` | Build the demo app | `dist/` |
| `npm run build:sdk` | Build the SDK library | `dist/sdk/` |
| `npm run preview` | Preview production build | http://localhost:4173 |

---

## SDK Build Output

After `npm run build:sdk`:

- **dist/sdk/** – Build output
- **cdn/visual-designer/v1/** – Copy of built files (same structure as visual-designer)
  - `visual-designer.js` (ES module)
  - `visual-designer.umd.cjs` (UMD)

---

## Usage

### 1. As an ES module (bundled app)

```ts
import { init, getInstance } from './sdk';

// Initialize
const sdk = init({
  storageKey: 'my-app-guides',
  editorMode: false,
  onGuideSaved: (guide) => console.log('Guide saved:', guide),
  onGuideDismissed: (guideId) => console.log('Guide dismissed:', guideId),
});

// Enable editor mode
sdk.enableEditor();

// Get guides
const guides = sdk.getGuides();
const pageGuides = sdk.getGuidesForCurrentPage();

// Disable editor
sdk.disableEditor();
```

### 2. As a script (global)

```html
<script src="path/to/visual-designer.umd.cjs"></script>
<script>
  window.VisualDesigner.init({ storageKey: 'my-guides' });
  window.VisualDesigner.enableEditor();
</script>
```

### 3. Snippet pattern (Pendo-style, same as visual-designer)

Use this when you load the SDK early but only call `initialize()` **after** the user logs in. The snippet creates a stub (`window.visualDesigner`) that queues calls until the real script loads, then the SDK replaces the stub with real methods.

**Snippet (place before `</body>`):**

```html
<script>
  (function (cdnUrl) {
    (function (r, e, v, a, i) {
      var w, x, y, z, t;
      a = r[i] = r[i] || {};
      a._q = a._q || [];
      w = ["initialize", "identify", "enableEditor", "disableEditor", "loadGuides", "getGuides"];
      for (x = 0, y = w.length; x < y; ++x) {
        (function (m) {
          a[m] = a[m] || function () {
            a._q[m === w[0] ? "unshift" : "push"]([m].concat([].slice.call(arguments, 0)));
          };
        })(w[x]);
      }
      z = e.createElement(v);
      z.async = !0;
      z.src = cdnUrl;
      z.onload = function() {
        setTimeout(function() {
          if (r.VisualDesigner && r.VisualDesigner._processQueue) {
            r.VisualDesigner._processQueue(a._q);
          }
        }, 100);
      };
      t = e.getElementsByTagName(v)[0];
      t.parentNode.insertBefore(z, t);
    })(window, document, "script", null, "visualDesigner");
  })("YOUR_CDN_BASE/visual-designer.umd.cjs");
</script>
```

Replace `YOUR_CDN_BASE/visual-designer.umd.cjs` with your deployed SDK URL (e.g. `https://your-domain.com/dist/sdk/visual-designer.umd.cjs`).

**After login (e.g. in React):**

```javascript
const visualDesigner = window.visualDesigner || window.VisualDesigner;
if (visualDesigner && visualDesigner.initialize) {
  visualDesigner.initialize({ storageKey: 'my-guides' });
}
```

**Queued methods:** `initialize`, `identify`, `enableEditor`, `disableEditor`, `loadGuides`, `getGuides`. Calls made before the script loads are queued and replayed when the SDK is ready.

**Flow with `?designer=true`:** When the launcher opens the target URL with `?designer=true&mode=guide` (or `mode=tag-page` / `mode=tag-feature`), the SDK stores `designerMode` and `designerModeType` in localStorage. After login, when you call `visualDesigner.initialize(config)`, the SDK initializes and, if `designerMode` is in localStorage, enables the designer and shows the editor.

---

## Enable Editor Mode

**Option A – URL parameter**

Add `?designer=true` to the URL:

```
https://yoursite.com/page?designer=true
```

Optional mode: `?designer=true&mode=tag-page` or `mode=tag-feature`

**Option B – Programmatic**

```ts
window.VisualDesigner.enableEditor();
```

**Option C – Config**

```ts
init({ editorMode: true });
```

---

## API Integration

The SDK includes an API client for the Visual Designer backend (`https://devgw.revgain.ai/rg-pex`):

- **iud header:** Read from `localStorage.designerIud` (set when launcher passes `?iud=` in URL)
- **Tag Page:** When saving a tag page, the SDK calls `POST /pages` with `{ name, slug, description, status }`
- **apiClient:** Exported for custom API calls (`window.VisualDesigner.apiClient`)

**Launcher:** Enter a Designer IUD in the launcher to pass it to the target URL. The target page stores it in localStorage and uses it for API headers.

---

## SDK Config Options

| Option | Type | Description |
|--------|------|-------------|
| `storageKey` | `string` | localStorage key for guides (default: `visual-designer-guides`) |
| `editorMode` | `boolean` | Start in editor mode on init |
| `onGuideSaved` | `(guide) => void` | Called when a guide is saved |
| `onGuideDismissed` | `(guideId) => void` | Called when user dismisses a guide |

---

## Project Structure

```
src/
├── sdk/                    # SDK source
│   ├── components/         # Preact UI components
│   ├── core/               # DesignerSDK, EditorMode, renderers
│   ├── editor/             # EditorFrame (iframe)
│   ├── styles/             # Shared design tokens
│   ├── types/              # TypeScript types
│   ├── utils/              # dom, storage helpers
│   └── index.ts            # SDK entry
├── App.tsx                 # Demo app
├── main.tsx
└── index.css
```

---

## Editor Modes

| Mode | Description |
|------|-------------|
| **Guide** (default) | Create tooltip guides on page elements |
| **tag-page** | Tag pages with names and rules |
| **tag-feature** | Tag features with selectors and heatmap |

---

## License

Private
