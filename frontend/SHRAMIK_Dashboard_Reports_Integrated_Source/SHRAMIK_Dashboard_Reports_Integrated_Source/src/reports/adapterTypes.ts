import type { ReportConfig, ReportDocumentModel, ReportListItem, ReportsOptions, ReportStatus, ReportSectionKey } from './types';
export interface ReportListQuery {
  query?: string; reportType?: string; geographyId?: string; status?: ReportStatus | '';
  periodStart?: string; periodEnd?: string; page?: number; pageSize?: number;
}
export interface ReportListResult { items: ReportListItem[]; total: number; page: number; pageSize: number; provenance: import('./types').ProvenanceState }
export interface ExportResult { kind: 'BROWSER_PRINT' | 'SERVER_PDF' | 'CSV'; status: 'READY' | 'NOT_CONFIGURED' | 'FAILED'; downloadUrl?: string; message?: string }
export interface ReportsDataAdapter {
  mode: 'demo' | 'rest' | 'published';
  getOptions(signal?: AbortSignal): Promise<ReportsOptions>;
  createReport(config: ReportConfig, signal?: AbortSignal): Promise<{ reportId: string; status: ReportStatus; document?: ReportDocumentModel; message?: string }>;
  getReport(reportId: string, signal?: AbortSignal): Promise<ReportDocumentModel>;
  listReports(query: ReportListQuery, signal?: AbortSignal): Promise<ReportListResult>;
  duplicateReport(reportId: string, signal?: AbortSignal): Promise<{ config: ReportConfig; message?: string }>;
  retryReport(reportId: string, signal?: AbortSignal): Promise<{ reportId: string; status: ReportStatus; message?: string }>;
  deleteReport?(reportId: string, signal?: AbortSignal): Promise<{ deleted: boolean; message?: string }>;
  exportCsv(reportId: string, sectionKey: ReportSectionKey, signal?: AbortSignal): Promise<{ status: 'READY' | 'NOT_CONFIGURED' | 'FAILED'; csvText?: string; downloadUrl?: string; message?: string }>;
  exportPdf?(reportId: string, signal?: AbortSignal): Promise<ExportResult>;
}
