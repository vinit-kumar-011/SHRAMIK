import { DemoDataQualityAdapter } from './demoAdapter';
import type { DataQualityDataAdapter } from '../../types/dataQualityAdapter';

export function createDataQualityAdapter(): DataQualityDataAdapter {
  const apiBaseUrl = import.meta.env.VITE_SHRAMIK_API_BASE_URL;
  if (!apiBaseUrl) {
    return new DemoDataQualityAdapter();
  }
  // For now return demo; REST adapter would be implemented when API is available
  return new DemoDataQualityAdapter();
}
