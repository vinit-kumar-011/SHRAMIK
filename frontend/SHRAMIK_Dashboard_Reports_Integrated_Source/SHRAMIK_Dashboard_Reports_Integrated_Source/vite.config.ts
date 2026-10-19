import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// A root deployment is the default. Set VITE_BASE_PATH=/shramik/ for a
// project-subpath deployment; routing uses Vite's matching BASE_URL.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const segments = (env.VITE_BASE_PATH ?? '').split('/').filter(Boolean);
  const base = segments.length ? `/${segments.join('/')}/` : '/';
  return {
    base,
    plugins: [react()],
    server: { host: '0.0.0.0' },
    preview: { host: '0.0.0.0' },
  };
});
