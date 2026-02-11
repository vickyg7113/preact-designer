# Revgain Unified SDK Injection Snippet

Use the following snippet to load the Revgain SDK onto your website. This snippet handles both **Analytics (Events)** and **Visual Design (Editor/Guides)**.

### 1. The Injection Snippet

Place this code before the closing `</body>` tag on your website:

```html
<script>
  (function (cdnUrl) {
    (function (r, e, v, a, i) {
      var w, x, y, z, t;
      a = r[i] = r[i] || {};
      a._q = a._q || [];
      // Methods to queue until the full SDK loads
      w = ["init", "initialize", "identify", "track", "page", "enableEditor", "disableEditor", "loadGuides", "getGuides"];
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
          // Process the queue using the unified Revgain object
          if (r.revgain && r.revgain._processQueue) {
            r.revgain._processQueue(a._q);
          }
        }, 100);
      };
      t = e.getElementsByTagName(v)[0];
      t.parentNode.insertBefore(z, t);
    })(window, document, "script", null, "revgain");
  })("/revgain.umd.cjs"); // Replace with your actual CDN path
</script>
```

### 2. Complete Unified Initialization (for AuthConfig.tsx)

Copy this into your component to initialize everything at once when the user is authenticated. This version preserves all original logic, retry mechanisms, and privacy settings.

```typescript
const revgainInitialized = useRef(false);

const initializeRevgain = (userData: any) => {
  // 1. Prevent double initialization
  if (revgainInitialized.current) return;

  // 2. Access unified API (supports 'revgain', 'rg', and 'VisualDesigner' aliases)
  const api = (window as any).revgain || (window as any).VisualDesigner;
  
  if (!api) {
    // Retry logic: If script is still loading, try again in 1s
    setTimeout(() => {
      const retryApi = (window as any).revgain || (window as any).VisualDesigner;
      if (retryApi && !revgainInitialized.current) {
        initializeRevgain(userData);
      }
    }, 1000);
    return;
  }

  try {
    console.log("=== Revgain Unified SDK Initialization ===");
    console.log("userData (raw):", userData);

    // 3. Extract Identity Details
    const visitorId = userData.sub || userData.id || userData.email || 'unknown';
    const email = userData.email || userData.emailAddress;
    const firstName = userData.given_name || userData.firstName || userData.first_name;
    const lastName = userData.family_name || userData.lastName || userData.last_name;
    const accountId = userData.organizationId || userData.accountId || userData.realm || 'default';
    const accountName = userData.organizationName || userData.accountName || userData.realm || 'Default Account';
    const payingStatus = userData.subscriptionTier || userData.payingStatus || userData.plan || 'free';

    // 4. API Configuration
    const apiKey = import.meta.env.VITE_RG_API_KEY || process.env.REACT_APP_RG_API_KEY || "1234567890";
    const apiHost = import.meta.env.VITE_RG_API_HOST || process.env.REACT_APP_RG_API_HOST || "https://devgw.revgain.ai/rg-pex";
    
    // 5. Unified Initialization
    // Configures both Engines with your specific parameters
    api.init({
      // Analytics Properties
      apiKey: apiKey,
      apiHost: apiHost,
      autoCapture: true,
      autoPageViews: false, // Manual for SPAs
      batchSize: 50,
      batchInterval: 10,
      privacyConfig: {
        maskInputs: true,
        maskTextContent: false,
        sensitiveSelectors: [
          'input[type="password"]',
          'input[name*="password"]',
          '[data-rg-ignore]',
          '[data-private]',
        ],
      },
      // Designer Properties
      storageKey: 'rg-guides'
    });

    // 6. Identify User
    // Updates identity for both Analytics (Events) and Designer (Targeting)
    api.identify(
      {
        id: visitorId,
        email: email,
        firstName: firstName,
        lastName: lastName,
      },
      {
        id: accountId,
        name: accountName,
        payingStatus: payingStatus,
      }
    );

    // 7. Manual Page View Track (300ms delay to ensure DOM is ready)
    setTimeout(() => {
      if (api && typeof api.page === 'function') {
        api.page(window.location.pathname, {
          path: window.location.pathname,
          search: window.location.search,
          hash: window.location.hash,
        });
      }
    }, 300);

    revgainInitialized.current = true;
    console.log('✅ Revgain Unified SDK initialized successfully');
  } catch (error) {
    console.error('Error initializing Revgain SDK:', error);
  }
};
```

### 3. Key Benefits

*   **Atomic Identity**: `identify` updates both the analytics visitor ID and the designer targeting rules at the exact same moment.
*   **Detailed Context**: Preserves all fine-grained user and account metadata for both event tracking and guide segmentation.
*   **Privacy & Reliability**: Includes full PII masking rules and ensures reliable event delivery through optimized batching.
*   **Zero Latency**: You can call `revgain.track()` or `revgain.identify()` immediately; they are queued and processed safely once the script loads.
