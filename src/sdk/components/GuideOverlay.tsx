import { SDK_STYLES } from '../styles/constants';

interface GuideOverlayProps {
    onClick?: () => void;
}

export function GuideOverlay({ onClick }: GuideOverlayProps) {
    return (
        <div
            onClick={onClick}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(0, 0, 0, 0.4)',
                zIndex: SDK_STYLES.zIndex.overlay,
                pointerEvents: 'auto',
                transition: 'opacity 0.3s ease-in-out',
            }}
        />
    );
}
