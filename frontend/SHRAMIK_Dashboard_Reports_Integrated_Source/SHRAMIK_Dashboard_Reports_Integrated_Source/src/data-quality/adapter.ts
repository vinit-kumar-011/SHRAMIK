import type { DataQualityDataAdapter } from './types';
import { mockDataQualityDataAdapter } from './mockAdapter';
import { RestDataQualityDataAdapter } from './restAdapter';
import { UnavailableDataQualityDataAdapter } from './unavailableAdapter';

export function createDataQualityDataAdapter(baseUrl?: string): DataQualityDataAdapter {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  if (env?.VITE_SHRAMIK_USE_DEMO_DATA === 'true' && !baseUrl) return mockDataQualityDataAdapter;
  const configuredBase = baseUrl ?? env?.VITE_DATA_QUALITY_API_BASE_URL;
  return configuredBase?.trim()
    ? new RestDataQualityDataAdapter(configuredBase.trim())
    : new UnavailableDataQualityDataAdapter();
}
