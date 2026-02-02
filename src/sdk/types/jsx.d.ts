import type { JSX } from 'preact';

declare module 'preact' {
  export namespace JSX {
    interface IntrinsicElements {
      'iconify-icon': JSX.HTMLAttributes<HTMLElement> & { icon?: string };
    }
  }
}
