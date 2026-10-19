import type { ReportConfig, ReportDocumentModel, ReportListItem, ReportsOptions, ReportSectionKey, ReportStatus } from './types';
import type { ReportsDataAdapter, ReportListQuery, ReportListResult, ExportResult } from './adapterTypes';

export class ReportsApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly retryable: boolean;
  constructor(message: string, status: number, code?: string, retryable = false) {
    super(message); this.name = 'ReportsApiError'; this.status = status; this.code = code; this.retryable = retryable;
  }
}
const asObject = (value: unknown): Record<string, any> => value && typeof value === 'object' ? value as Record<string, any> : {};
const asArray = <T,>(value: unknown): T[] => Array.isArray(value) ? value as T[] : [];
const provenance = (value: unknown): ReportDocumentModel['provenance'] => ['SOURCE_BACKED', 'DERIVED', 'MIXED', 'SYNTHETIC_DEMO', 'NOT_AVAILABLE'].includes(String(value)) ? value as ReportDocumentModel['provenance'] : 'NOT_AVAILABLE';
function normalizeDocument(input: unknown): ReportDocumentModel {
  const raw = asObject(input);
  const scope = asObject(raw.scope);
  const meta = asObject(raw.metadata ?? raw.meta);
  const period = asObject(raw.period);
  return {
    id: String(raw.id ?? raw.reportId ?? ''),
    version: typeof raw.version === 'number' ? raw.version : undefined,
    title: String(raw.title ?? 'Untitled SHRAMIK report'),
    reportType: raw.reportType ?? 'CUSTOM',
    geographyLabels: asArray<string>(raw.geographyLabels ?? scope.labels),
    period: { start: String(period.start ?? ''), end: String(period.end ?? ''), label: period.label },
    referenceYear: typeof raw.referenceYear === 'number' ? raw.referenceYear : undefined,
    createdAt: typeof (raw.createdAt ?? raw.generatedAt) === 'string' ? raw.createdAt ?? raw.generatedAt : undefined,
    templateVersion: String(raw.templateVersion ?? 'unknown'),
    provenance: provenance(raw.provenance ?? meta.provenance),
    configSnapshot: raw.configSnapshot && typeof raw.configSnapshot === 'object' ? raw.configSnapshot as ReportConfig : raw.config && typeof raw.config === 'object' ? raw.config as ReportConfig : undefined,
    sections: asArray<ReportDocumentModel['sections'][number]>(raw.sections),
    metadata: {
      sourceSnapshotIds: asArray<string>(meta.sourceSnapshotIds ?? meta.dataSnapshotIds),
      methodologyVersion: typeof meta.methodologyVersion === 'string' ? meta.methodologyVersion : undefined,
      sourceLabels: asArray<string>(meta.sourceLabels),
      limitations: asArray<string>(meta.limitations),
      generatedByLabel: typeof meta.generatedByLabel === 'string' ? meta.generatedByLabel : undefined,
    },
  };
}
function normalizeListItem(input: unknown): ReportListItem {
  const raw = asObject(input); const scope = asObject(raw.scope); const p = asObject(raw.period); const caps = asObject(raw.capabilities); const meta = asObject(raw.metadata ?? raw.meta);
  return {
    id: String(raw.id ?? raw.reportId ?? ''), title: String(raw.title ?? 'Untitled report'), reportType: raw.reportType ?? 'CUSTOM',
    geographyLabels: asArray<string>(raw.geographyLabels ?? scope.labels),
    period: { start: String(p.start ?? ''), end: String(p.end ?? ''), label: p.label },
    status: (['QUEUED','RUNNING','COMPLETED','FAILED','CANCELLED','NOT_CONFIGURED'].includes(String(raw.status)) ? raw.status : 'NOT_CONFIGURED') as ReportStatus,
    createdAt: typeof (raw.createdAt ?? raw.generatedAt) === 'string' ? raw.createdAt ?? raw.generatedAt : undefined,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
    provenance: provenance(raw.provenance ?? meta.provenance),
    capabilities: {
      open: caps.open !== false, duplicate: caps.duplicate === true, retry: caps.retry === true,
      delete: caps.delete === true, pdf: caps.pdf === true, csv: caps.csv === true,
    },
  };
}
const sectionLabels: Record<string, string> = {
  EXECUTIVE_SUMMARY: 'Executive Summary', DEMAND: 'Demand Analysis', SUPPLY: 'Supply Analysis', SKILL_GAPS: 'Skill Gap Analysis',
  EMERGING_SKILLS: 'Emerging Skills', FORECASTS: 'Forecasts & Early Warnings', SCENARIO: 'Scenario Analysis', REGIONAL: 'Regional Breakdown',
  SECTOR: 'Sector Breakdown', OCCUPATION: 'Occupation Analysis', POLICY_RECOMMENDATIONS: 'Policy Recommendations', SOURCES_METHOD: 'Data Sources & Methodology',
};

export class RestReportsAdapter implements ReportsDataAdapter {
  readonly mode = 'rest' as const;
  constructor(private readonly baseUrl: string, private readonly getAccessToken: () => string | null = () => null) {}
  private async request<T>(path: string, init: RequestInit = {}, signal?: AbortSignal): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    if (init.body !== undefined) headers.set('Content-Type', 'application/json');
    const token = this.getAccessToken(); if (token) headers.set('Authorization', `Bearer ${token}`);
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl.replace(/\/$/, '')}${path}`, { ...init, headers, signal: signal ?? init.signal, credentials: 'include' });
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new ReportsApiError(error instanceof Error ? `Reports service is unreachable: ${error.message}` : 'Reports service is unreachable.', 0, 'NETWORK_ERROR', true);
    }
    const text = await response.text();
    let payload: any = {};
    try { payload = text ? JSON.parse(text) : {}; } catch { payload = { message: text.slice(0, 500) }; }
    if (!response.ok) {
      const err = asObject(payload.error);
      throw new ReportsApiError(String(err.message ?? payload.message ?? `Reports request failed (${response.status}).`), response.status, typeof err.code === 'string' ? err.code : undefined, err.retryable === true || response.status >= 500);
    }
    return payload as T;
  }
  async getOptions(signal?: AbortSignal): Promise<ReportsOptions> {
    const raw = asObject(await this.request('/api/v1/reports/options', {}, signal));
    const meta = asObject(raw.meta); const exports = asObject(raw.exports);
    const geo = asArray<any>(raw.geographies ?? raw.supportedGeographies).map((item) => ({ id: String(item.id), label: String(item.label ?? item.name ?? item.id), level: String(item.level ?? 'UNKNOWN') }));
    const periods = asArray<any>(raw.periods ?? raw.availablePeriods).map((item) => ({ start: String(item.start), end: String(item.end), label: item.label }));
    const sections = asArray<any>(raw.sections).map((item) => typeof item === 'string' ? ({ key: item, label: sectionLabels[item] ?? item, description: '', required: item === 'EXECUTIVE_SUMMARY' || item === 'SOURCES_METHOD' }) : ({ key: item.key, label: String(item.label ?? sectionLabels[item.key] ?? item.key), description: String(item.description ?? ''), required: item.required === true || item.key === 'EXECUTIVE_SUMMARY' || item.key === 'SOURCES_METHOD' }));
    return {
      reportTypes: asArray<ReportsOptions['reportTypes'][number]>(raw.reportTypes), sections: sections as ReportsOptions['sections'], geographies: geo, periods,
      referenceYears: asArray<number>(raw.referenceYears), exportCapabilities: {
        serverPdf: exports.pdf === 'SERVER' || exports.pdf === 'SERVER_PDF' || exports.pdf === true, browserPrint: exports.pdf === 'PRINT_FALLBACK' || exports.browserPrint === true,
        csv: exports.csv === true, xlsx: exports.xlsx === true,
      },
      provenance: provenance(meta.provenance),
      sourceSnapshots: asArray<any>(raw.sourceSnapshots ?? raw.availableSnapshots).map((item) => ({ id: String(item.id), label: String(item.label ?? item.id), asOfDate: item.asOfDate })),
    };
  }
  async createReport(config: ReportConfig, signal?: AbortSignal) {
    const raw = asObject(await this.request('/api/v1/reports', { method: 'POST', body: JSON.stringify(config) }, signal));
    const status = (raw.status ?? 'QUEUED') as ReportStatus;
    const documentValue = raw.document ?? (Array.isArray(raw.sections) ? raw : null);
    return { reportId: String(raw.reportId ?? raw.id ?? ''), status, document: documentValue ? normalizeDocument(documentValue) : undefined, message: typeof raw.message === 'string' ? raw.message : undefined };
  }
  async getReport(reportId: string, signal?: AbortSignal): Promise<ReportDocumentModel> {
    const raw = asObject(await this.request(`/api/v1/reports/${encodeURIComponent(reportId)}`, {}, signal));
    const doc = raw.document ?? (raw.report && asObject(raw.report).sections ? raw.report : raw);
    if (!Array.isArray(asObject(doc).sections)) {
      const status = String(raw.status ?? asObject(raw.report).status ?? 'RUNNING');
      throw new ReportsApiError(`Report ${reportId} is ${status.toLowerCase()}; its structured document is not available yet.`, 202, 'REPORT_NOT_READY', true);
    }
    return normalizeDocument(doc);
  }
  async listReports(query: ReportListQuery, signal?: AbortSignal): Promise<ReportListResult> {
    const params = new URLSearchParams();
    if (query.query) params.set('query', query.query);
    if (query.reportType) params.set('type', query.reportType);
    if (query.geographyId) params.set('geographyId', query.geographyId);
    if (query.status) params.set('status', query.status);
    if (query.periodStart) params.set('periodStart', query.periodStart);
    if (query.periodEnd) params.set('periodEnd', query.periodEnd);
    params.set('page', String(query.page ?? 1)); params.set('pageSize', String(query.pageSize ?? 10));
    const raw = asObject(await this.request(`/api/v1/reports?${params.toString()}`, {}, signal));
    return { items: asArray(raw.items).map(normalizeListItem), total: Number(raw.total ?? 0), page: Number(raw.page ?? query.page ?? 1), pageSize: Number(raw.pageSize ?? query.pageSize ?? 10), provenance: provenance(raw.provenance) };
  }
  async duplicateReport(reportId: string, signal?: AbortSignal) {
    const raw = asObject(await this.request(`/api/v1/reports/${encodeURIComponent(reportId)}/duplicate`, { method: 'POST', body: '{}' }, signal));
    return { config: asObject(raw.config) as unknown as ReportConfig, message: typeof raw.message === 'string' ? raw.message : undefined };
  }
  async retryReport(reportId: string, signal?: AbortSignal) {
    const raw = asObject(await this.request(`/api/v1/reports/${encodeURIComponent(reportId)}/regenerate`, { method: 'POST', body: '{}' }, signal));
    return { reportId: String(raw.reportId ?? raw.id ?? reportId), status: (raw.status ?? 'QUEUED') as ReportStatus, message: typeof raw.message === 'string' ? raw.message : undefined };
  }
  async deleteReport(reportId: string, signal?: AbortSignal) {
    const raw = asObject(await this.request(`/api/v1/reports/${encodeURIComponent(reportId)}`, { method: 'DELETE' }, signal));
    return { deleted: raw.deleted === true || raw.status === 'DELETED', message: typeof raw.message === 'string' ? raw.message : undefined };
  }
  async exportCsv(reportId: string, sectionKey: ReportSectionKey, signal?: AbortSignal) {
    const raw = asObject(await this.request(`/api/v1/reports/${encodeURIComponent(reportId)}/exports`, { method: 'POST', body: JSON.stringify({ format: 'CSV', sectionKey }) }, signal));
    if (typeof raw.csvText === 'string') return { status: 'READY' as const, csvText: raw.csvText, message: 'CSV returned by the Reports service.' };
    if (typeof raw.downloadUrl === 'string' && raw.status === 'COMPLETED') return { status: 'READY' as const, downloadUrl: raw.downloadUrl, message: 'CSV export is ready for authorised download.' };
    if (raw.status === 'QUEUED' || raw.status === 'RUNNING') return { status: 'NOT_CONFIGURED' as const, message: 'The backend accepted the export job but has not returned a completed download. Check the Reports service job status.' };
    return { status: 'FAILED' as const, message: String(raw.message ?? 'Reports service did not return CSV content or a completed download.') };
  }
  async exportPdf(reportId: string, signal?: AbortSignal): Promise<ExportResult> {
    const raw = asObject(await this.request(`/api/v1/reports/${encodeURIComponent(reportId)}/exports`, { method: 'POST', body: JSON.stringify({ format: 'PDF' }) }, signal));
    if (typeof raw.downloadUrl === 'string' && (raw.status === 'COMPLETED' || raw.status === 'READY')) return { kind: 'SERVER_PDF', status: 'READY', downloadUrl: raw.downloadUrl, message: 'Authorised report PDF is ready.' };
    if (raw.status === 'QUEUED' || raw.status === 'RUNNING') return { kind: 'SERVER_PDF', status: 'NOT_CONFIGURED', message: 'The backend accepted the PDF job but did not return a completed download URL.' };
    return { kind: 'SERVER_PDF', status: 'FAILED', message: String(raw.message ?? 'PDF export did not complete.') };
  }
}
