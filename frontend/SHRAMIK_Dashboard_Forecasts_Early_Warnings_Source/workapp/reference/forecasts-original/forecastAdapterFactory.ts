import { MockForecastsAdapter } from './mockForecastsAdapter';
import type { ForecastsDataAdapter } from '../types/forecasts';

export function createForecastsAdapter(): ForecastsDataAdapter {
  const apiBaseUrl = import.meta.env.VITE_SHRAMIK_API_BASE_URL;
  if (!apiBaseUrl) {
    return new MockForecastsAdapter();
  }
  return new MockForecastsAdapter();
}
