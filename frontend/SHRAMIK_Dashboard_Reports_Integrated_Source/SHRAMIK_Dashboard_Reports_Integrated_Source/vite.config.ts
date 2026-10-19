import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Migrated pages are prepared into this package before dev/build. Keep Vite's
// browser file access confined to this app rather than exposing sibling folders.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { host: '0.0.0.0' },
  preview: { host: '0.0.0.0' },
});
