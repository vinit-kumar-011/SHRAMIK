import type {
  GapDetailPayload, GapEntityType, GapFilterOptions, GapFilters, GapInsight, GapLandscape,
  GapMetricKey, GapOverview, RankedSkillsQuery, RankedSkillsResponse, RegionalGapResponse,
  SectorFlowResponse, SkillGapDataAdapter,
} from './types';

/** Fail-closed adapter. Unconfigured official views report unavailable instead of sample shortages. */
export class UnavailableSkillGapDataAdapter implements SkillGapDataAdapter {
  readonly mode = 'unavailable' as const;

  private fail<T>(signal?: AbortSignal): Promise<T> {
    if (signal?.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
    return Promise.reject(new Error(
      'Skill Gap Analysis API is not configured. No validated official district-by-skill shortage estimate is available. Configure VITE_SHRAMIK_API_BASE_URL after deploying the approved service.',
    ));
  }

  getFilterOptions(signal?: AbortSignal): Promise<GapFilterOptions> { return this.fail(signal); }
  getOverview(_filters: GapFilters, signal?: AbortSignal): Promise<GapOverview> { return this.fail(signal); }
  getGapLandscape(_filters: GapFilters, signal?: AbortSignal): Promise<GapLandscape> { return this.fail(signal); }
  getRegionalGaps(_filters: GapFilters, _metric: GapMetricKey, signal?: AbortSignal): Promise<RegionalGapResponse> { return this.fail(signal); }
  getRankedSkills(_filters: GapFilters, _query: RankedSkillsQuery, signal?: AbortSignal): Promise<RankedSkillsResponse> { return this.fail(signal); }
  getSkillGapInsights(_filters: GapFilters, signal?: AbortSignal): Promise<GapInsight[]> { return this.fail(signal); }
  getSectorFlow(_filters: GapFilters, _sectorCode: string, signal?: AbortSignal): Promise<SectorFlowResponse> { return this.fail(signal); }
  getDetail(_type: GapEntityType, _id: string, _filters: GapFilters, signal?: AbortSignal): Promise<GapDetailPayload> { return this.fail(signal); }
}
