import type { SupplyInsightsDataAdapter } from './types';
import { mockSupplyInsightsDataAdapter } from './mockAdapter';
import { RestSupplyInsightsDataAdapter } from './restAdapter';

export function createSupplyInsightsDataAdapter(baseUrl?: string): SupplyInsightsDataAdapter {
  const configuredBase = baseUrl ?? (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_SUPPLY_API_BASE_URL;
  return configuredBase?.trim()
    ? new RestSupplyInsightsDataAdapter(configuredBase.trim())
    : mockSupplyInsightsDataAdapter;
}
