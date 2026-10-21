import type { SupplyInsightsDataAdapter } from './types';
import { mockSupplyInsightsDataAdapter } from './mockAdapter';
import { RestSupplyInsightsDataAdapter } from './restAdapter';
import { UnavailableSupplyInsightsDataAdapter } from './unavailableAdapter';

export function createSupplyInsightsDataAdapter(baseUrl?: string): SupplyInsightsDataAdapter {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  if (env?.VITE_SHRAMIK_USE_DEMO_DATA === 'true' && !baseUrl) return mockSupplyInsightsDataAdapter;
  const configuredBase = baseUrl ?? env?.VITE_SUPPLY_API_BASE_URL;
  return configuredBase?.trim()
    ? new RestSupplyInsightsDataAdapter(configuredBase.trim())
    : new UnavailableSupplyInsightsDataAdapter();
}
