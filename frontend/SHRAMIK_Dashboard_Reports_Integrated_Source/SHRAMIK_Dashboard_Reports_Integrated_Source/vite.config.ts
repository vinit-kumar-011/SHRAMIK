import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = fileURLToPath(new URL('.', import.meta.url));
const frontendRoot = resolve(appRoot, '../..');

// Some migrated page modules still live in their handoff folders. Allow Vite's
// dev server to read those files while the integration consolidates them.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    fs: { allow: [frontendRoot] },
  },
  preview: { host: '0.0.0.0' },
});
