import { SDK_STYLES } from '../styles/constants';

interface SpotlightOverlayProps {
    targetRect: DOMRect | null;
}

/**
 * SpotlightOverlay - Custom overlay that highlights a target element using box-shadow.
 * It uses pointer-events: none to ensure clicks pass through to the underlying application.
 */
export function SpotlightOverlay({ targetRect }: SpotlightOverlayProps) {
    if (!targetRect) return null;

    const padding = 5;

    return (
        <div
            id="designer-spotlight-overlay"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                pointerEvents: 'none',
                zIndex: SDK_STYLES.zIndex.overlay,
                overflow: 'hidden',
            }}
        >
            <div
                id="designer-spotlight-hole"
                style={{
                    position: 'absolute',
                    top: targetRect.top - padding,
                    left: targetRect.left - padding,
                    width: targetRect.width + padding * 2,
                    height: targetRect.height + padding * 2,
                    borderRadius: '5px',
                    border: '1.5px solid #222222',
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4)',
                    pointerEvents: 'none',
                    transition: 'all 0.3s ease-in-out',
                }}
            />
        </div>
    );
}
