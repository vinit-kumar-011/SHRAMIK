import type { ReportsDataAdapter } from './adapterTypes';
import { createLabourMarketDataAdapter } from '../api/adapter';
import { DemoReportsAdapter } from './demoAdapter';
import { PublishedReportsAdapter } from './publishedAdapter';
import { RestReportsAdapter } from './restAdapter';

/**
 * The published adapter is the safe default: it builds reports from real, published
 * dashboard indicators and explicitly labels analytics the data layer cannot support.
 * Synthetic fixtures are opt-in only; an unconfigured REST API is never assumed live.
 */
export function createReportsAdapter(): ReportsDataAdapter {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const showcaseMode = env?.MODE === 'production' || env?.VITE_SHRAMIK_SHOWCASE_MODE === 'true';
  if (!showcaseMode && env?.VITE_SHRAMIK_USE_DEMO_DATA === 'true') return new DemoReportsAdapter();
  const baseUrl = env?.VITE_SHRAMIK_API_BASE_URL?.trim();
  const dataMode = env?.VITE_SHRAMIK_DATA_MODE?.trim().toLowerCase();
  // Keep Reports on published Supabase indicators unless REST mode is explicitly opted in.
  // A configured base URL alone is not evidence that the proposed Reports API is deployed.
  if (dataMode === 'rest' && baseUrl) return new RestReportsAdapter(baseUrl);
  return new PublishedReportsAdapter(createLabourMarketDataAdapter());
}
export type { ReportsDataAdapter } from './adapterTypes';
