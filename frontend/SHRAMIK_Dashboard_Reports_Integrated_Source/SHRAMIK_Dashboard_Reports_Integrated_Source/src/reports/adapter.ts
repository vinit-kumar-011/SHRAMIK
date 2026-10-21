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
  if (env?.VITE_SHRAMIK_USE_DEMO_DATA === 'true') return new DemoReportsAdapter();
  const baseUrl = env?.VITE_SHRAMIK_API_BASE_URL?.trim();
  if (baseUrl) return new RestReportsAdapter(baseUrl);
  return new PublishedReportsAdapter(createLabourMarketDataAdapter());
}
export type { ReportsDataAdapter } from './adapterTypes';
