import type { ForecastsDataAdapter } from './types';
import { MockForecastsAdapter } from './mockAdapter';
import { RestForecastsAdapter } from './restAdapter';

export function createForecastsAdapter(): ForecastsDataAdapter {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const baseUrl = env?.VITE_SHRAMIK_API_BASE_URL?.trim();
  if (baseUrl) {
    return new RestForecastsAdapter({ baseUrl, getAccessToken: () => null });
  }
  return new MockForecastsAdapter();
}
export type { ForecastsDataAdapter } from './types';
