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
  if (env?.VITE_SHRAMIK_USE_DEMO_DATA === 'true') return new MockLabourMarketDataAdapter();
  if (baseUrl) {
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
