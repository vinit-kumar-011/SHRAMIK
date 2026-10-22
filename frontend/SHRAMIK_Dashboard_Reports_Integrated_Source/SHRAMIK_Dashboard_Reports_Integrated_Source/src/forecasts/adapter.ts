import type { ForecastsDataAdapter } from './types';
import { MockForecastsAdapter } from './mockAdapter';
import { RestForecastsAdapter } from './restAdapter';
import { UnavailableForecastsAdapter } from './unavailableAdapter';

export function createForecastsAdapter(): ForecastsDataAdapter {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const baseUrl = env?.VITE_SHRAMIK_API_BASE_URL?.trim();
  const showcaseMode = env?.MODE === 'production' || env?.VITE_SHRAMIK_SHOWCASE_MODE === 'true';
  if (!showcaseMode && env?.VITE_SHRAMIK_USE_DEMO_DATA === 'true') return new MockForecastsAdapter();
  if (baseUrl) return new RestForecastsAdapter({ baseUrl, getAccessToken: () => null });
  return new UnavailableForecastsAdapter();
}
export type { ForecastsDataAdapter } from './types';
