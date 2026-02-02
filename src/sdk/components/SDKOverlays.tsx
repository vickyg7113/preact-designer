import { render } from 'preact';
import { ExitEditorButton } from './ExitEditorButton';
import { RedBorderOverlay } from './RedBorderOverlay';
import { StudioBadge } from './StudioBadge';
import { LoadingOverlay } from './LoadingOverlay';

export interface SDKOverlaysState {
  showExitButton: boolean;
  showRedBorder: boolean;
  showBadge: boolean;
  showLoading: boolean;
  onExitEditor: () => void;
}

export function SDKOverlays(state: SDKOverlaysState) {
  return (
    <>
      {state.showExitButton && <ExitEditorButton onExit={state.onExitEditor} />}
      {state.showRedBorder && <RedBorderOverlay />}
      {state.showBadge && <StudioBadge />}
      {state.showLoading && <LoadingOverlay />}
    </>
  );
}

export function renderSDKOverlays(container: HTMLElement, state: SDKOverlaysState) {
  render(<SDKOverlays {...state} />, container);
}
