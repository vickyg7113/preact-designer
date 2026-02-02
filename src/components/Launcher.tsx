import { useState, useCallback } from 'preact/hooks';
import './launcher.css';

type Mode = 'guide' | 'tag-page' | 'tag-feature';

const STORAGE_KEY = 'visual-designer-last-url';

function normalizeTargetUrl(input: string): string {
  const trimmed = (input || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('//')) return window.location.protocol + trimmed;
  if (trimmed.startsWith('/') || trimmed.startsWith('./'))
    return new URL(trimmed, window.location.origin).href;
  if (/^[\w.-]+\.(html?|php|aspx?)$/i.test(trimmed) || (trimmed.indexOf('/') === -1 && trimmed.indexOf('.') === -1))
    return new URL(trimmed, window.location.origin).href;
  return 'https://' + trimmed;
}

export function Launcher() {
  const [mode, setMode] = useState<Mode>('guide');
  const [guideUrl, setGuideUrl] = useState(() => localStorage.getItem(STORAGE_KEY) || '');
  const [tagPageUrl, setTagPageUrl] = useState(() => localStorage.getItem(STORAGE_KEY) || '');
  const [tagFeatureUrl, setTagFeatureUrl] = useState(() => localStorage.getItem(STORAGE_KEY) || '');
  const [error, setError] = useState('');
  const [tagPageError, setTagPageError] = useState('');
  const [tagFeatureError, setTagFeatureError] = useState('');

  const getUrlForMode = useCallback((): string => {
    if (mode === 'guide') return guideUrl.trim();
    if (mode === 'tag-page') return tagPageUrl.trim();
    return tagFeatureUrl.trim() || guideUrl.trim();
  }, [mode, guideUrl, tagPageUrl, tagFeatureUrl]);

  const launchDesigner = useCallback(() => {
    let targetUrl = getUrlForMode();

    if (!targetUrl) {
      if (mode === 'tag-page') setTagPageError('Please enter a URL.');
      else if (mode === 'tag-feature') setTagFeatureError('Please enter a URL in the Target URL field.');
      else setError('Please enter a URL.');
      return;
    }

    targetUrl = normalizeTargetUrl(targetUrl);

    try {
      new URL(targetUrl);
    } catch {
      const msg = 'Please enter a valid URL (including domain).';
      if (mode === 'tag-page') setTagPageError(msg);
      else if (mode === 'tag-feature') setTagFeatureError(msg);
      else setError(msg);
      return;
    }

    setError('');
    setTagPageError('');
    setTagFeatureError('');

    localStorage.setItem(STORAGE_KEY, targetUrl);

    const urlObj = new URL(targetUrl);
    urlObj.searchParams.set('designer', 'true');
    urlObj.searchParams.set('mode', mode);
    const finalUrl = urlObj.toString();

    const win = window.open(finalUrl, '_blank');
    if (!win) {
      const msg = 'Popup blocked! Please allow popups for this site.';
      if (mode === 'tag-page') setTagPageError(msg);
      else if (mode === 'tag-feature') setTagFeatureError(msg);
      else setError(msg);
    }
  }, [mode, getUrlForMode]);

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    launchDesigner();
  };

  return (
    <div class="launcher-wrapper">
      <div class="launcher-container">
        <div class="launcher-header">
          <h1>Launch Visual Designer</h1>
          <p>Select a mode and launch the designer</p>
        </div>

        <div class="mode-selection">
          <button
            type="button"
            class={`mode-btn ${mode === 'tag-page' ? 'active' : ''}`}
            onClick={() => setMode('tag-page')}
          >
            Tag Page
          </button>
          <button
            type="button"
            class={`mode-btn ${mode === 'tag-feature' ? 'active' : ''}`}
            onClick={() => setMode('tag-feature')}
          >
            Tag Feature
          </button>
          <button
            type="button"
            class={`mode-btn ${mode === 'guide' ? 'active' : ''}`}
            onClick={() => setMode('guide')}
          >
            Guide
          </button>
        </div>

        {mode === 'guide' && (
          <div class="form-view active">
            <form onSubmit={handleSubmit}>
              <div class="form-group">
                <label for="targetUrl">Target URL</label>
                <input
                  type="text"
                  id="targetUrl"
                  class="target-url-input"
                  placeholder="https://your-app.com/page"
                  value={guideUrl}
                  onInput={(e) => setGuideUrl((e.target as HTMLInputElement).value)}
                  autocomplete="off"
                />
              </div>
              <div class="button-row">
                <button type="button" class="btn btn-secondary" onClick={() => setGuideUrl('')}>
                  Clear
                </button>
                <button type="submit" class="btn btn-primary">
                  Launch Designer
                </button>
              </div>
              {error && <div class="error show">{error}</div>}
            </form>
            <div class="info-box">
              <strong>How it works</strong>
              Enter any target URL (your app, staging, or your own simulator). The launcher opens the
              URL in a new tab and appends <code>?designer=true&amp;mode=guide</code> so the SDK
              enables editor mode when your app calls <code>init()</code>.
            </div>
          </div>
        )}

        {mode === 'tag-feature' && (
          <div class="form-view active">
            <form onSubmit={handleSubmit}>
              <div class="form-group">
                <label for="tagFeatureUrl">Target URL</label>
                <input
                  type="text"
                  id="tagFeatureUrl"
                  class="target-url-input"
                  placeholder="https://your-app.com/page"
                  value={tagFeatureUrl}
                  onInput={(e) => setTagFeatureUrl((e.target as HTMLInputElement).value)}
                  autocomplete="off"
                />
              </div>
              <div class="button-row">
                <button type="button" class="btn btn-secondary" onClick={() => setTagFeatureUrl('')}>
                  Clear
                </button>
                <button type="submit" class="btn btn-primary">
                  Launch Tag Feature
                </button>
              </div>
              {tagFeatureError && <div class="error show">{tagFeatureError}</div>}
            </form>
            <div class="info-box">
              <strong>Tag Feature Mode</strong>
              Enter any target URL. The Tag Feature UI will appear in the editor sidebar on the target
              website.
            </div>
          </div>
        )}

        {mode === 'tag-page' && (
          <div class="form-view active">
            <form onSubmit={handleSubmit}>
              <div class="form-group">
                <label for="tagPageUrl">Target URL</label>
                <input
                  type="text"
                  id="tagPageUrl"
                  class="target-url-input"
                  placeholder="https://your-app.com/page"
                  value={tagPageUrl}
                  onInput={(e) => setTagPageUrl((e.target as HTMLInputElement).value)}
                  autocomplete="off"
                />
              </div>
              <div class="button-row">
                <button type="button" class="btn btn-secondary" onClick={() => setTagPageUrl('')}>
                  Clear
                </button>
                <button type="submit" class="btn btn-primary">
                  Tag Page
                </button>
              </div>
              {tagPageError && <div class="error show">{tagPageError}</div>}
            </form>
            <div class="info-box">
              <strong>Tag Page Mode</strong>
              Enter any target URL. Launch the designer in Tag Page mode to tag and manage pages.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
