import { createForecastsAdapter } from './adapter';
import type { AlertStatus, EntityType, ForecastFilters, ForecastSeriesResponse, RiskCell } from './types';

/** Keeps the developer-handoff page API call style while delegating to the canonical typed adapter. */
export function createForecastsDataAdapter() {
  const adapter = createForecastsAdapter();
  return {
    mode: adapter.mode,
    getFilterOptions: (signal?: AbortSignal) => adapter.getFilterOptions({ signal }),
    getOverview: (filters: ForecastFilters, signal?: AbortSignal) => adapter.getOverview(filters, { signal }),
    getSeries: (filters: ForecastFilters, viewBy: ForecastSeriesResponse['viewBy'], signal?: AbortSignal) => adapter.getSeries(filters, viewBy, { signal }),
    getWarnings: (filters: ForecastFilters, params?: { limit?: number; category?: string }, signal?: AbortSignal) => adapter.getWarnings(filters, params, { signal }),
    getRiskMatrix: (filters: ForecastFilters, entityType: RiskCell['entityType'], signal?: AbortSignal) => adapter.getRiskMatrix(filters, entityType, { signal }),
    getStateRiskMap: (filters: ForecastFilters, entityType: EntityType, signal?: AbortSignal) => adapter.getStateRiskMap(filters, entityType, { signal }),
    getRiskDetails: (filters: ForecastFilters, regionCode: string, entityCode: string, entityType: EntityType, signal?: AbortSignal) => adapter.getRiskDetails(filters, regionCode, entityCode, { signal, entityType }),
    getScenarioOptions: (filters: ForecastFilters, signal?: AbortSignal) => adapter.getScenarioOptions(filters, { signal }),
    compareScenarios: (filters: ForecastFilters, scenarioIds: string[], assumptions: Record<string, number>, signal?: AbortSignal) => adapter.compareScenarios(filters, scenarioIds, assumptions, { signal }),
    getModelPerformance: (filters: ForecastFilters, signal?: AbortSignal) => adapter.getModelPerformance(filters, { signal }),
    getAlerts: (filters: ForecastFilters, params?: { status?: string; severity?: string; query?: string; page?: number; pageSize?: number }, signal?: AbortSignal) => adapter.getAlerts(filters, params, { signal }),
    getAlertDetail: (id: string, signal?: AbortSignal) => adapter.getAlertDetail(id, { signal }),
    acknowledgeAlert: (id: string, signal?: AbortSignal) => adapter.acknowledgeAlert(id, { signal }),
    updateAlert: (id: string, patch: { status?: AlertStatus; assigneeId?: string | null; assigneeLabel?: string | null }, signal?: AbortSignal) => adapter.updateAlert(id, patch, { signal }),
    addAlertNote: (id: string, note: string, signal?: AbortSignal) => adapter.addAlertNote(id, note, { signal }),
  };
}
