import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true, restoreMocks: true, clearMocks: true },
  build: { sourcemap: true, emptyOutDir: true, target: 'es2022' },
});
