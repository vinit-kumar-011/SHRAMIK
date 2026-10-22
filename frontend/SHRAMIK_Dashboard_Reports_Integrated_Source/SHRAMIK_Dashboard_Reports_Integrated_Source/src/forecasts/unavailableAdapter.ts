import { ForecastsApiError } from './restAdapter';
import type {
  AlertDetailResponse, EarlyWarning, ForecastFilterOptions, ForecastFilters, ForecastRequestOptions,
  ForecastSeriesResponse, ForecastsDataAdapter, MetricValue, ModelPerformanceResponse, RiskCell,
  RiskDetailResponse, RiskMatrixResponse, ScenarioComparisonResponse, ScenarioOptionsResponse,
} from './types';

/**
 * Fail-closed adapter used when the approved Forecasts API is not configured.
 * It intentionally does not delegate to mock fixtures, even if a stale demo flag
 * is present in a production build.
 */
export class UnavailableForecastsAdapter implements ForecastsDataAdapter {
  readonly mode = 'unavailable' as const;

  private fail<T>(options?: ForecastRequestOptions): Promise<T> {
    if (options?.signal?.aborted) {
      return Promise.reject(new DOMException('Aborted', 'AbortError'));
    }
    return Promise.reject(new ForecastsApiError(
      'Forecasts API is not configured. No validated official forecast, warning, scenario or model-evaluation result is available. Configure VITE_SHRAMIK_API_BASE_URL after deploying the approved service.',
      503,
      'SERVICE_UNAVAILABLE',
    ));
  }

  getFilterOptions(options?: ForecastRequestOptions): Promise<ForecastFilterOptions> {
    return this.fail(options);
  }
  getOverview(_filters: ForecastFilters, options?: ForecastRequestOptions): Promise<{ kpis: MetricValue[]; meta: import('./types').DataMeta }> {
    return this.fail(options);
  }
  getSeries(_filters: ForecastFilters, _viewBy: ForecastSeriesResponse['viewBy'], options?: ForecastRequestOptions): Promise<ForecastSeriesResponse> {
    return this.fail(options);
  }
  getWarnings(_filters: ForecastFilters, _params?: { limit?: number; category?: string }, options?: ForecastRequestOptions): Promise<{ items: EarlyWarning[]; counts: Record<string, number>; meta: import('./types').DataMeta }> {
    return this.fail(options);
  }
  getRiskMatrix(_filters: ForecastFilters, _entityType: RiskCell['entityType'], options?: ForecastRequestOptions): Promise<RiskMatrixResponse> {
    return this.fail(options);
  }
  getStateRiskMap(_filters: ForecastFilters, _entityType: RiskCell['entityType'], options?: ForecastRequestOptions): Promise<import('./types').StateRiskMapResponse> {
    return this.fail(options);
  }
  getRiskDetails(_filters: ForecastFilters, _regionCode: string, _entityCode: string, options?: ForecastRequestOptions): Promise<RiskDetailResponse> {
    return this.fail(options);
  }
  getScenarioOptions(_filters: ForecastFilters, options?: ForecastRequestOptions): Promise<ScenarioOptionsResponse> {
    return this.fail(options);
  }
  compareScenarios(_filters: ForecastFilters, _scenarioIds: string[], _assumptionValues?: Record<string, number>, options?: ForecastRequestOptions): Promise<ScenarioComparisonResponse> {
    return this.fail(options);
  }
  getModelPerformance(_filters: ForecastFilters, options?: ForecastRequestOptions): Promise<ModelPerformanceResponse> {
    return this.fail(options);
  }
  getAlerts(_filters: ForecastFilters, _params?: { status?: string; severity?: string; query?: string; page?: number; pageSize?: number }, options?: ForecastRequestOptions): Promise<{ items: EarlyWarning[]; total: number; counts: Record<string, number>; meta: import('./types').DataMeta }> {
    return this.fail(options);
  }
  getAlertDetail(_id: string, options?: ForecastRequestOptions): Promise<AlertDetailResponse> {
    return this.fail(options);
  }
  acknowledgeAlert(_id: string, options?: ForecastRequestOptions): Promise<EarlyWarning> {
    return this.fail(options);
  }
  updateAlert(_id: string, _patch: { status?: EarlyWarning['status']; assigneeId?: string | null; assigneeLabel?: string | null }, options?: ForecastRequestOptions): Promise<EarlyWarning> {
    return this.fail(options);
  }
  addAlertNote(_id: string, _note: string, options?: ForecastRequestOptions): Promise<{ id: string; createdAt: string }> {
    return this.fail(options);
  }
}
