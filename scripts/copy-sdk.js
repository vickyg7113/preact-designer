/**
 * Copy built SDK files to cdn/visual-designer/v1/ (same structure as visual-designer)
 */
import { mkdirSync, copyFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const srcDir = join(root, 'dist', 'sdk');
const destDir = join(root, 'cdn', 'visual-designer', 'v1');

const files = [
  ['visual-designer.js', 'visual-designer.js'],
  ['visual-designer.umd.cjs', 'visual-designer.umd.cjs'],
];

if (!existsSync(srcDir)) {
  console.error('Error: dist/sdk not found. Run npm run build:sdk first.');
  process.exit(1);
}

mkdirSync(destDir, { recursive: true });

for (const [srcName, destName] of files) {
  const src = join(srcDir, srcName);
  const dest = join(destDir, destName);
  if (existsSync(src)) {
    copyFileSync(src, dest);
    console.log(`Copied ${srcName} -> cdn/visual-designer/v1/${destName}`);
  } else {
    console.warn(`Warning: ${srcName} not found`);
  }
}
