import type { DataQualityDataAdapter } from './types';
import { mockDataQualityDataAdapter } from './mockAdapter';
import { RestDataQualityDataAdapter } from './restAdapter';

export function createDataQualityDataAdapter(baseUrl?: string): DataQualityDataAdapter {
  const configuredBase = baseUrl ?? (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_DATA_QUALITY_API_BASE_URL;
  return configuredBase?.trim()
    ? new RestDataQualityDataAdapter(configuredBase.trim())
    : mockDataQualityDataAdapter;
}
