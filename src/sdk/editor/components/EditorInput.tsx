import type { JSX } from 'preact';
import { editorStyles } from '../editorStyles';

export interface EditorInputProps {
  type?: 'text' | 'email' | 'password';
  value: string;
  onInput: (e: Event) => void;
  placeholder?: string;
  id?: string;
  style?: JSX.CSSProperties;
  disabled?: boolean;
  'aria-label'?: string;
}

export function EditorInput({
  type = 'text',
  value,
  onInput,
  placeholder,
  id,
  style: styleOverride,
  disabled,
  'aria-label': ariaLabel,
}: EditorInputProps) {
  const style: JSX.CSSProperties = styleOverride ? { ...editorStyles.input, ...styleOverride } : editorStyles.input;
  return (
    <input
      type={type}
      value={value}
      onInput={onInput}
      placeholder={placeholder}
      id={id}
      style={style}
      disabled={disabled}
      aria-label={ariaLabel}
    />
  );
}

export interface EditorTextareaProps {
  value: string;
  onInput: (e: Event) => void;
  placeholder?: string;
  id?: string;
  minHeight?: string | number;
  style?: JSX.CSSProperties;
  disabled?: boolean;
  'aria-label'?: string;
}

export function EditorTextarea({
  value,
  onInput,
  placeholder,
  id,
  minHeight,
  style: styleOverride,
  disabled,
  'aria-label': ariaLabel,
}: EditorTextareaProps) {
  const style: JSX.CSSProperties = styleOverride
    ? { ...editorStyles.textarea, ...styleOverride, ...(minHeight != null && { minHeight: typeof minHeight === 'number' ? `${minHeight}px` : minHeight }) }
    : minHeight != null
      ? { ...editorStyles.textarea, minHeight: typeof minHeight === 'number' ? `${minHeight}px` : minHeight }
      : editorStyles.textarea;
  return (
    <textarea
      value={value}
      onInput={onInput}
      placeholder={placeholder}
      id={id}
      style={style}
      disabled={disabled}
      aria-label={ariaLabel}
    />
  );
}
