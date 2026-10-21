import type { DataQualityDataAdapter, DataQualitySnapshot } from './types';

export class UnavailableDataQualityDataAdapter implements DataQualityDataAdapter {
  readonly mode = 'unavailable' as const;

  async getSnapshot(signal?: AbortSignal): Promise<DataQualitySnapshot> {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    throw new Error('Data Quality API is not configured. No live validation runs or issue records are available. Configure VITE_DATA_QUALITY_API_BASE_URL after deploying the approved service, or explicitly enable demo mode with VITE_SHRAMIK_USE_DEMO_DATA=true.');
  }
}
