import type { SupplyInsightsDataAdapter, SupplySnapshot } from './types';

export class UnavailableSupplyInsightsDataAdapter implements SupplyInsightsDataAdapter {
  readonly mode = 'unavailable' as const;

  async getSnapshot(_geographyCode: string, signal?: AbortSignal): Promise<SupplySnapshot> {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    throw new Error('Supply Insights API is not configured. No validated workforce-supply output is available. Configure VITE_SUPPLY_API_BASE_URL after deploying the approved service, or explicitly enable demo mode with VITE_SHRAMIK_USE_DEMO_DATA=true.');
  }
}
