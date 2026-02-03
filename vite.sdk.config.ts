import { defineConfig } from 'vite';
import { resolve } from 'path';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/sdk/index.ts'),
      name: 'VisualDesigner',
      fileName: 'visual-designer',
      formats: ['es', 'umd'],
    },
    outDir: 'dist/sdk',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        globals: {},
      },
    },
  },
});
