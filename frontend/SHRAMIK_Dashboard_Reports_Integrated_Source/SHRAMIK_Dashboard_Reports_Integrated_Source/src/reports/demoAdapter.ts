import fixture from '../../examples/mock-state-report.json';
import type { ReportConfig, ReportDocumentModel, ReportListItem, ReportsOptions, ReportSection, ReportSectionKey, ReportStatus } from './types';
import type { ReportsDataAdapter, ReportListQuery, ReportListResult } from './adapterTypes';

const SECTION_OPTIONS: ReportsOptions['sections'] = [
  { key: 'EXECUTIVE_SUMMARY', label: 'Executive Summary', description: 'Key findings and high-level indicators.', required: true },
  { key: 'DEMAND', label: 'Demand Analysis', description: 'Labour demand levels, trends and projections.' },
  { key: 'SUPPLY', label: 'Supply Analysis', description: 'Available workforce and training pipeline.' },
  { key: 'SKILL_GAPS', label: 'Skill Gap Analysis', description: 'Demand minus supply where measures are compatible.' },
  { key: 'EMERGING_SKILLS', label: 'Emerging Skills', description: 'Skills with emerging demand signals.' },
  { key: 'FORECASTS', label: 'Forecasts & Early Warnings', description: 'Future outlook, risks and forecast uncertainty.' },
  { key: 'SCENARIO', label: 'Scenario Analysis', description: 'Alternative futures and intervention assumptions.' },
  { key: 'REGIONAL', label: 'Regional Breakdown', description: 'State/UT and district views where coverage permits.' },
  { key: 'SECTOR', label: 'Sector Breakdown', description: 'Sector-wise demand and workforce structure.' },
  { key: 'OCCUPATION', label: 'Occupation Analysis', description: 'Occupation group and taxonomy analysis.' },
  { key: 'POLICY_RECOMMENDATIONS', label: 'Policy Recommendations', description: 'Evidence-linked implications; omitted when unsupported.' },
  { key: 'SOURCES_METHOD', label: 'Data Sources & Methodology', description: 'Source lineage, definitions, coverage and limitations.', required: true },
];
const TYPES: ReportsOptions['reportTypes'] = ['STATE', 'SECTOR', 'SKILL', 'POLICY_BRIEF', 'CUSTOM'];
const TYPE_LABEL: Record<ReportConfig['reportType'], string> = { STATE: 'State Report', SECTOR: 'Sector Report', SKILL: 'Skill Report', POLICY_BRIEF: 'Policy Brief', CUSTOM: 'Custom Report' };
const GEO: ReportsOptions['geographies'] = [
  { id: 'IN', label: 'India', level: 'COUNTRY' },
  { id: 'IN-KA', label: 'Karnataka', level: 'STATE_UT' },
  { id: 'IN-MH', label: 'Maharashtra', level: 'STATE_UT' },
  { id: 'IN-TN', label: 'Tamil Nadu', level: 'STATE_UT' },
];
const PERIODS = [
  { start: '2025-01-01', end: '2030-12-31', label: '2025–2030 (illustrative)' },
  { start: '2024-01-01', end: '2029-12-31', label: '2024–2029 (illustrative)' },
];
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export class DemoReportsAdapter implements ReportsDataAdapter {
  readonly mode = 'demo' as const;
  private documents = new Map<string, ReportDocumentModel>();
  private configs = new Map<string, ReportConfig>();
  private sequence = 1;

  constructor() {
    const base = clone(fixture as ReportDocumentModel);
    this.documents.set(base.id, base);
    this.configs.set(base.id, {
      reportType: 'STATE', title: base.title, geographyIds: ['IN-KA'], period: base.period, referenceYear: base.referenceYear,
      sectionKeys: base.sections.map((section) => section.key), sourcePolicy: { mode: 'LATEST_VALIDATED' },
      options: { includeUncertainty: true, includeDataAppendix: false }, templateVersion: base.templateVersion,
    });
  }

  async getOptions(): Promise<ReportsOptions> {
    return {
      reportTypes: TYPES,
      sections: clone(SECTION_OPTIONS),
      geographies: clone(GEO),
      periods: clone(PERIODS),
      referenceYears: [2029, 2030],
      exportCapabilities: { serverPdf: false, browserPrint: true, csv: true, xlsx: false },
      provenance: 'SYNTHETIC_DEMO',
    };
  }

  private buildDocument(config: ReportConfig, id: string, version = 1): ReportDocumentModel {
    const base = clone(fixture as ReportDocumentModel);
    const available = new Map(base.sections.map((section) => [section.key, section]));
    const sections: ReportSection[] = config.sectionKeys.map((key) => {
      const supplied = available.get(key);
      if (supplied) return clone(supplied);
      const option = SECTION_OPTIONS.find((item) => item.key === key);
      return {
        key, title: option?.label ?? key, status: 'UNAVAILABLE',
        blocks: [{ kind: 'unavailable', reason: 'The demo fixture does not contain approved structured data for this section.', nextStep: 'Connect the report assembly API to include a validated result; this placeholder is not a zero or an empty finding.' }],
      };
    });
    const geoLabels = config.geographyIds.map((id) => GEO.find((geo) => geo.id === id)?.label ?? id);
    const isOtherScope = !(config.geographyIds.length === 1 && config.geographyIds[0] === 'IN-KA');
    const scopeNote = isOtherScope || (config.options.compareGeographyIds?.length ?? 0) > 0 ? 'The sample metrics are generic synthetic fixture values and are not geographically estimated for the selected scope. Comparison geography selections are configuration metadata only in this demo; no comparison result was computed.' : '';
    if (scopeNote && sections.length) {
      const executive = sections.find((section) => section.key === 'EXECUTIVE_SUMMARY');
      if (executive) executive.blocks.unshift({ kind: 'callout', tone: 'limitation', title: 'Scope limitation', text: scopeNote });
    }
    const limitations = [...base.metadata.limitations];
    if (scopeNote) limitations.push(scopeNote);
    if (config.sourcePolicy.mode === 'FIXED_SNAPSHOT') limitations.push('Fixed snapshot selection is illustrative in demo mode; no backend source snapshot was read.');
    return {
      ...base,
      id,
      version,
      title: config.title.trim() || `${TYPE_LABEL[config.reportType]} — ${geoLabels.join(', ')}`,
      reportType: config.reportType,
      geographyLabels: geoLabels,
      period: clone(config.period),
      referenceYear: config.referenceYear,
      createdAt: undefined,
      templateVersion: config.templateVersion,
      provenance: 'SYNTHETIC_DEMO',
      configSnapshot: clone(config),
      sections,
      metadata: { ...base.metadata, sourceSnapshotIds: config.sourcePolicy.mode === 'FIXED_SNAPSHOT' ? [...(config.sourcePolicy.snapshotIds ?? [])] : [], limitations, generatedByLabel: 'SYNTHETIC_DEMO · Illustrative preview only · Not for publication' },
    };
  }

  async createReport(config: ReportConfig): Promise<{ reportId: string; status: ReportStatus; document?: ReportDocumentModel; message?: string }> {
    if (!config.title.trim()) throw new Error('Enter a report title before generating.');
    if (!config.geographyIds.length) throw new Error('Select at least one supported geography.');
    if (!config.sectionKeys.length) throw new Error('Select at least one report section.');
    const id = `demo-report-${String(this.sequence++).padStart(4, '0')}`;
    const document = this.buildDocument(config, id);
    this.documents.set(id, document);
    this.configs.set(id, clone(config));
    return { reportId: id, status: 'COMPLETED', document, message: 'Generated from the synthetic report fixture. No source-backed report was produced.' };
  }

  async getReport(reportId: string): Promise<ReportDocumentModel> {
    const doc = this.documents.get(reportId);
    if (!doc) throw new Error(`Report ${reportId} was not found in this demo library.`);
    return clone(doc);
  }

  async listReports(query: ReportListQuery): Promise<ReportListResult> {
    const geoLabel = GEO.find((geo) => geo.id === query.geographyId)?.label ?? query.geographyId;
    const filtered: ReportListItem[] = [...this.documents.values()].map((doc) => ({
      id: doc.id, title: doc.title, reportType: doc.reportType, geographyLabels: doc.geographyLabels, period: doc.period,
      status: 'COMPLETED' as const, provenance: doc.provenance,
      capabilities: { open: true, duplicate: true, retry: false, delete: true, pdf: true, csv: true },
    })).filter((item) => {
      const q = query.query?.trim().toLowerCase();
      if (q && !`${item.title} ${item.id} ${item.geographyLabels.join(' ')}`.toLowerCase().includes(q)) return false;
      if (query.reportType && item.reportType !== query.reportType) return false;
      if (geoLabel && !item.geographyLabels.includes(geoLabel)) return false;
      if (query.status && item.status !== query.status) return false;
      if (query.periodStart && item.period.end < query.periodStart) return false;
      if (query.periodEnd && item.period.start > query.periodEnd) return false;
      return true;
    });
    const pageSize = Math.max(1, Math.min(query.pageSize ?? 10, 50));
    const page = Math.max(1, query.page ?? 1);
    return { items: filtered.slice((page - 1) * pageSize, page * pageSize), total: filtered.length, page, pageSize, provenance: 'SYNTHETIC_DEMO' };
  }

  async duplicateReport(reportId: string): Promise<{ config: ReportConfig; message?: string }> {
    const config = this.configs.get(reportId);
    if (!config) throw new Error(`Report ${reportId} was not found; it cannot be duplicated.`);
    return { config: { ...clone(config), title: `Copy of ${config.title}` }, message: 'Copied the configuration only. Generate a new report to create a new demo snapshot.' };
  }

  async retryReport(reportId: string): Promise<{ reportId: string; status: ReportStatus; message?: string }> {
    if (!this.documents.has(reportId)) throw new Error(`Report ${reportId} was not found in this demo library.`);
    return { reportId, status: 'NOT_CONFIGURED', message: 'Retry is not available for completed demo reports.' };
  }

  async deleteReport(reportId: string): Promise<{ deleted: boolean; message?: string }> {
    const deleted = this.documents.delete(reportId);
    this.configs.delete(reportId);
    return { deleted, message: deleted ? 'Removed the report from the in-memory demo library for this session.' : 'Report not found.' };
  }

  async exportCsv(reportId: string, sectionKey: ReportSectionKey): Promise<{ status: 'READY' | 'NOT_CONFIGURED' | 'FAILED'; csvText?: string; message?: string }> {
    const doc = this.documents.get(reportId);
    if (!doc) return { status: 'FAILED', message: 'Report not found in the demo library.' };
    const section = doc.sections.find((item) => item.key === sectionKey);
    if (!section) return { status: 'NOT_CONFIGURED', message: 'That section is not present in this report snapshot.' };
    const lines: string[][] = [
      ['Report', doc.title],
      ['Report ID', doc.id],
      ['Provenance', doc.provenance],
      ['Export scope', section.title],
      ['Period', doc.period.label || `${doc.period.start} to ${doc.period.end}`],
      [],
    ];
    let tableCount = 0;
    for (const block of section.blocks) {
      if (block.kind === 'table') {
        tableCount++;
        lines.push([block.title], block.columns.map((column) => `${column.label}${column.unit ? ` (${column.unit})` : ''}`));
        for (const row of block.rows) lines.push(block.columns.map((column) => row.cells[column.key] == null ? '' : String(row.cells[column.key])));
        lines.push([]);
      } else if (block.kind === 'metric_grid') {
        lines.push(['Metric', 'Value', 'Unit', 'Period', 'Provenance', 'Definition / note']);
        for (const metric of block.metrics) lines.push([metric.label, metric.value == null ? '' : metric.formattedValue ?? String(metric.value), metric.unit, metric.period ?? '', metric.provenance, metric.definition ?? metric.note ?? '']);
        lines.push([]);
      } else if (block.kind === 'chart') {
        lines.push([block.title], ['Series', block.xLabel ?? 'Period', `Value (${block.unit ?? block.yLabel ?? 'unit not supplied'})`]);
        for (const series of block.series) for (const point of series.points) lines.push([series.name, String(point.x), point.y == null ? '' : String(point.y)]);
        lines.push([]);
      }
    }
    if (!tableCount && !lines.some((line) => line[0] === 'Metric') && lines.length <= 6) return { status: 'NOT_CONFIGURED', message: 'This section has no structured rows, metrics or chart series to export.' };
    const csvText = lines.map((line) => line.map((cell) => {
      const value = String(cell ?? '');
      return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
    }).join(',')).join('\r\n') + '\r\n';
    return { status: 'READY', csvText, message: 'CSV prepared from structured report content. Provenance is included in the file.' };
  }
}
