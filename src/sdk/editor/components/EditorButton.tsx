import type { JSX } from 'preact';
import type { ComponentChildren } from 'preact';
import { editorStyles, EDITOR_FONT_FAMILY } from '../editorStyles';

export type EditorButtonVariant = 'primary' | 'secondary' | 'icon' | 'iconSm' | 'placement' | 'ghost';

export interface EditorButtonProps {
  variant: EditorButtonVariant;
  children?: ComponentChildren;
  onClick?: (e: Event) => void;
  type?: 'button' | 'submit';
  title?: string;
  /** Only for variant="placement" */
  active?: boolean;
  style?: JSX.CSSProperties;
  class?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

export function EditorButton({
  variant,
  children,
  onClick,
  type = 'button',
  title,
  active = false,
  style: styleOverride,
  class: className,
  disabled,
  'aria-label': ariaLabel,
}: EditorButtonProps) {
  const baseStyle: JSX.CSSProperties =
    variant === 'primary'
      ? editorStyles.primaryBtn
      : variant === 'secondary'
        ? editorStyles.secondaryBtn
        : variant === 'icon'
          ? editorStyles.iconBtn
          : variant === 'iconSm'
            ? editorStyles.iconBtnSm
            : variant === 'placement'
              ? editorStyles.placementBtn(active)
              : {
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  fontFamily: EDITOR_FONT_FAMILY,
                };

  const combinedStyle: JSX.CSSProperties = styleOverride ? { ...baseStyle, ...styleOverride } : baseStyle;

  return (
    <button
      type={type}
      style={combinedStyle}
      class={className}
      onClick={onClick}
      title={title}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}
