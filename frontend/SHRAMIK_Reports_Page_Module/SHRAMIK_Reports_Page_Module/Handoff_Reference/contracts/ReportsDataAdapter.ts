import type {
  ReportConfig,
  ReportDocumentModel,
  ReportListItem,
  ReportsOptions,
  ReportStatus,
  ReportSectionKey,
} from './report.types';

export interface ReportListQuery {
  query?: string;
  reportType?: string;
  geographyId?: string;
  status?: ReportStatus;
  periodStart?: string;
  periodEnd?: string;
  page?: number;
  pageSize?: number;
}

export interface ReportListResult {
  items: ReportListItem[];
  total: number;
  page: number;
  pageSize: number;
  provenance: 'SOURCE_BACKED' | 'SYNTHETIC_DEMO';
}

export interface ExportResult {
  kind: 'BROWSER_PRINT' | 'SERVER_PDF' | 'CSV';
  status: 'READY' | 'NOT_CONFIGURED' | 'FAILED';
  downloadUrl?: string;
  message?: string;
}

export interface ReportsDataAdapter {
  getOptions(signal?: AbortSignal): Promise<ReportsOptions>;
  createReport(config: ReportConfig, signal?: AbortSignal): Promise<{ reportId: string; status: ReportStatus; document?: ReportDocumentModel; message?: string }>;
  getReport(reportId: string, signal?: AbortSignal): Promise<ReportDocumentModel>;
  listReports(query: ReportListQuery, signal?: AbortSignal): Promise<ReportListResult>;
  duplicateReport(reportId: string, signal?: AbortSignal): Promise<{ config: ReportConfig; message?: string }>;
  retryReport(reportId: string, signal?: AbortSignal): Promise<{ reportId: string; status: ReportStatus; message?: string }>;
  saveReport?(document: ReportDocumentModel, signal?: AbortSignal): Promise<{ saved: boolean; message?: string }>;
  exportCsv(reportId: string, sectionKey: ReportSectionKey, signal?: AbortSignal): Promise<{ status: 'READY' | 'NOT_CONFIGURED' | 'FAILED'; csvText?: string; message?: string }>;
  exportPdf?(reportId: string, signal?: AbortSignal): Promise<ExportResult>;
}
