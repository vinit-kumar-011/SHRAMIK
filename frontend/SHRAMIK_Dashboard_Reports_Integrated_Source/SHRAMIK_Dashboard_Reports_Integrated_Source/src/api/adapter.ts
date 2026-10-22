import type { LabourMarketDataAdapter } from './contracts';
import { MockLabourMarketDataAdapter } from './mock-adapter';
import { RestLabourMarketDataAdapter } from './rest-adapter';
import { SupabaseLabourMarketDataAdapter } from './supabase-adapter';

/**
 * One switch controls data mode for the entire dashboard.
 * No component imports demo-data directly or embeds an API URL.
 */
export function createLabourMarketDataAdapter(): LabourMarketDataAdapter {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const baseUrl = env?.VITE_SHRAMIK_API_BASE_URL?.trim();
  const dataMode = env?.VITE_SHRAMIK_DATA_MODE?.trim().toLowerCase();
  const showcaseMode = env?.MODE === 'production' || env?.VITE_SHRAMIK_SHOWCASE_MODE === 'true';
  if (!showcaseMode && env?.VITE_SHRAMIK_USE_DEMO_DATA === 'true') return new MockLabourMarketDataAdapter();
  // A configured URL must not silently switch production to an API that may not be deployed.
  // Supabase-backed public reads (through /api/shramik-data) are the default.
  if (dataMode === 'rest' && baseUrl) {
    return new RestLabourMarketDataAdapter({
      baseUrl,
      // Prefer secure httpOnly cookies. Use this callback only if your app already
      // owns a token provider; never store bearer tokens in localStorage here.
      getAccessToken: () => null,
    });
  }
  return new SupabaseLabourMarketDataAdapter();
}

export type { LabourMarketDataAdapter } from './contracts';
