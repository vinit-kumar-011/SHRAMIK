import { defineConfig, loadEnv, type Plugin, type ViteDevServer, type PreviewServer } from 'vite';
import react from '@vitejs/plugin-react';
import { createPublicSupabaseDataHandler } from './api/shramik-data';

function installLocalDataProxy(
  server: Pick<ViteDevServer, 'middlewares'> | Pick<PreviewServer, 'middlewares'>,
  handler: ReturnType<typeof createPublicSupabaseDataHandler>,
): void {
  server.middlewares.use('/api/shramik-data', async (req, res, next) => {
    if (req.method !== 'GET') {
      next();
      return;
    }
    const url = new URL(req.url || '', 'http://localhost');
    const query: Record<string, string | string[] | undefined> = {};
    url.searchParams.forEach((value, key) => {
      const prior = query[key];
      query[key] = prior === undefined ? value : Array.isArray(prior) ? [...prior, value] : [prior, value];
    });
    const proxyResponse = {
      setHeader(name: string, value: string) {
        res.setHeader(name, value);
        return this;
      },
      status(code: number) {
        res.statusCode = code;
        return this;
      },
      json(body: unknown) {
        if (!res.headersSent) res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(body));
      },
    };
    try {
      await handler({ method: req.method, query }, proxyResponse);
    } catch (error) {
      if (res.headersSent) return;
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Local Supabase proxy failed.' }));
    }
  });
}

function shramikLocalDataProxy(handler: ReturnType<typeof createPublicSupabaseDataHandler>): Plugin {
  return {
    name: 'shramik-local-supabase-proxy',
    configureServer(server) {
      installLocalDataProxy(server, handler);
    },
    configurePreviewServer(server) {
      installLocalDataProxy(server, handler);
    },
  };
}

// A root deployment is the default. Set VITE_BASE_PATH=/shramik/ for a
// project-subpath deployment; routing uses Vite's matching BASE_URL.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const dataHandler = createPublicSupabaseDataHandler(env);
  const segments = (env.VITE_BASE_PATH ?? '').split('/').filter(Boolean);
  const base = segments.length ? `/${segments.join('/')}/` : '/';
  const analyticsProxyTarget = env.VITE_SHRAMIK_API_PROXY_TARGET || 'http://127.0.0.1:8000';
  return {
    base,
    plugins: [react(), shramikLocalDataProxy(dataHandler)],
    server: {
      host: '0.0.0.0',
      proxy: { '/api/v1': { target: analyticsProxyTarget, changeOrigin: true } },
    },
    preview: {
      host: '0.0.0.0',
      proxy: { '/api/v1': { target: analyticsProxyTarget, changeOrigin: true } },
    },
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
