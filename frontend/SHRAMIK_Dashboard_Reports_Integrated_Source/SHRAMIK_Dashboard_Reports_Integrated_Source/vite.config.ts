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
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalizedId = id.replace(/\\/g, '/');
            if (normalizedId.includes('/node_modules/')) {
              if (
                normalizedId.includes('/node_modules/recharts/') ||
                /\/node_modules\/d3-[^/]+\//.test(normalizedId) ||
                normalizedId.includes('/node_modules/victory-vendor/')
              ) return 'vendor-charts';
              if (normalizedId.includes('/node_modules/lucide-react/')) return 'vendor-icons';
              if (/\/node_modules\/(react|react-dom|scheduler)\//.test(normalizedId)) return 'vendor-react';
            }
            const moduleChunks: Array<[string, string]> = [
              ['/src/demand/', 'module-demand'],
              ['/src/supply/', 'module-supply'],
              ['/src/skill-gaps/', 'module-skill-gaps'],
              ['/src/forecasts/', 'module-forecasts'],
              ['/src/emerging-skills/', 'module-emerging-skills'],
              ['/src/scenario-simulator/', 'module-scenario-simulator'],
              ['/src/data-sources/', 'module-data-sources'],
              ['/src/data-quality/', 'module-data-quality'],
              ['/src/administration/', 'module-administration'],
              ['/src/reports/', 'module-reports'],
            ];
            return moduleChunks.find(([pathFragment]) => normalizedId.includes(pathFragment))?.[1];
          },
        },
      },
    },
  };
});
