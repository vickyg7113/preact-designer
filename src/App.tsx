import { useEffect } from 'preact/hooks';
import { init } from './sdk';
import { Launcher } from './components/Launcher';
import './app.css';

function isDesignerMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const url = new URL(window.location.href);
    return url.searchParams.get('designer') === 'true';
  } catch {
    return false;
  }
}

export function App() {
  const showLauncher = !isDesignerMode();

  useEffect(() => {
    if (!showLauncher) {
      init({
        storageKey: 'rg-preact-designer-guides',
        editorMode: true,
      });
    }
  }, [showLauncher]);

  if (showLauncher) {
    return <Launcher />;
  }

  return (
    <div class="app target-page">
      <h1>RG Preact Designer</h1>
      <p>
        Visual Designer SDK is active. Click elements on this page to create guides, or use the
        editor panel.
      </p>
      <div class="demo-content">
        <button id="demo-btn" data-testid="demo-button">
          Demo Button
        </button>
        <p id="demo-text">Click elements on this page to create guides when in editor mode.</p>
      </div>
    </div>
  );
}
