import type { LabourMarketDataAdapter, RegionOption } from '../api/contracts';
import type {
  ReportBlock, ReportConfig, ReportDataRow, ReportDocumentModel, ReportListItem, ReportMetric,
  ReportSection, ReportSectionKey, ReportsOptions, ReportStatus,
} from './types';
import type { ReportsDataAdapter, ReportListQuery, ReportListResult } from './adapterTypes';

const SECTION_OPTIONS: ReportsOptions['sections'] = [
  { key: 'EXECUTIVE_SUMMARY', label: 'Published Indicator Summary', description: 'Published, source-backed indicators available for the selected geography.', required: true },
  { key: 'DEMAND', label: 'Labour Demand Analysis', description: 'Unavailable until validated demand observations and compatible reporting outputs exist.' },
  { key: 'SUPPLY', label: 'Labour Supply Analysis', description: 'Training capacity and registrations are not interchangeable with available workers.' },
  { key: 'SKILL_GAPS', label: 'Skill Gap Analysis', description: 'Requires comparable, validated demand and supply observations.' },
  { key: 'EMERGING_SKILLS', label: 'Emerging Skills', description: 'Requires validated emerging-skill signals and supporting evidence.' },
  { key: 'FORECASTS', label: 'Forecasts & Early Warnings', description: 'Requires validated forecast results, model metadata and early-warning outputs.' },
  { key: 'SCENARIO', label: 'Scenario Analysis', description: 'Requires an available simulation service and a compatible validated baseline.' },
  { key: 'REGIONAL', label: 'Geographic Indicator Snapshot', description: 'Published indicators for the selected geography; this is not a cross-region ranking.' },
  { key: 'SECTOR', label: 'Sector Breakdown', description: 'Requires comparable sector-level demand and supply values.' },
  { key: 'OCCUPATION', label: 'Occupation Analysis', description: 'Requires validated occupation-coded analytical outputs.' },
  { key: 'POLICY_RECOMMENDATIONS', label: 'Policy Recommendations', description: 'Recommendations are not generated without linked, validated findings.' },
  { key: 'SOURCES_METHOD', label: 'Sources & Methodology', description: 'Source labels, dates, interpretation notes and reporting limitations.', required: true },
];
const REPORT_TYPES: ReportsOptions['reportTypes'] = ['STATE', 'SECTOR', 'SKILL', 'POLICY_BRIEF', 'CUSTOM'];
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const today = () => new Date().toISOString().slice(0, 10);
const provenanceToReport = (value: string): ReportDocumentModel['provenance'] => {
  if (value === 'source-backed') return 'SOURCE_BACKED';
  if (value === 'derived') return 'DERIVED';
  if (value === 'mixed') return 'MIXED';
  if (value === 'mock') return 'SYNTHETIC_DEMO';
  return 'NOT_AVAILABLE';
};
const csvCell = (value: unknown): string => {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
};
const toCsv = (rows: unknown[][]) => rows.map(row => row.map(csvCell).join(',')).join('\r\n');

function unavailableSection(key: ReportSectionKey): ReportSection {
  const descriptions: Partial<Record<ReportSectionKey, { title: string; reason: string; next: string }>> = {
    DEMAND: { title: 'Demand Analysis', reason: 'Validated labour-demand observations and a published report aggregate are not available through the current public data contract. Registration counts and job-programme signals must not be relabelled as labour demand.', next: 'Load and validate demand_observations, then publish an auditable demand summary API.' },
    SUPPLY: { title: 'Supply Analysis', reason: 'The current source snapshot includes indicators such as registration totals and training capacity, but these do not measure the available workforce. No validated supply output is available to report as workforce supply.', next: 'Load comparable supply_observations and document population, unit, geography and reference-period definitions.' },
    SKILL_GAPS: { title: 'Skill Gap Analysis', reason: 'A defensible gap requires a comparable demand/supply pair with matching occupation or skill, geography, time period and units. That validated pair is not currently available.', next: 'Validate both observation series before publishing demand minus supply.' },
    EMERGING_SKILLS: { title: 'Emerging Skills', reason: 'No validated emerging-skill signal with evidence and provenance is exposed by the published dashboard contract.', next: 'Publish emerging_skill_signals backed by approved observations and taxonomy mappings.' },
    FORECASTS: { title: 'Forecasts & Early Warnings', reason: 'Forecast results and early-warning records are not available from the current reporting adapter. This document does not invent forecasts or confidence scores.', next: 'Run the validated pipeline, store forecast_results and early_warnings, and expose a versioned read API.' },
    SCENARIO: { title: 'Scenario Analysis', reason: 'No authenticated scenario service is configured for this report. A fixed synthetic interface example is not a computed scenario for the selected scope.', next: 'Connect a validated simulation API and record the baseline run, assumptions, training lag and result provenance.' },
    SECTOR: { title: 'Sector Breakdown', reason: 'A sector catalogue can describe sectors, but it is not a sector-level demand/supply estimate. Compatible published sector analysis is unavailable.', next: 'Publish comparable, source-backed sector observations and aggregations.' },
    OCCUPATION: { title: 'Occupation Analysis', reason: 'Occupation catalogues and taxonomy mappings alone do not establish job counts, shortages or forecasts. Validated occupation analytical outputs are unavailable.', next: 'Link validated observations to reviewed NCO/NSQF mappings and publish occupation-level results.' },
    POLICY_RECOMMENDATIONS: { title: 'Policy Recommendations', reason: 'No recommendations are generated from missing or unvalidated findings. This section is unavailable rather than being filled with generic policy claims.', next: 'Add evidence-linked rules and require source citations, uncertainty and human review for recommendations.' },
  };
  const item = descriptions[key] ?? { title: key.replaceAll('_', ' '), reason: 'The current published data contract does not provide validated information for this section.', next: 'Connect a validated, provenance-aware reporting endpoint.' };
  return {
    key, title: item.title, status: 'UNAVAILABLE',
    blocks: [{ kind: 'unavailable', reason: item.reason, nextStep: item.next }],
  };
}

function indicatorMetric(card: Awaited<ReturnType<LabourMarketDataAdapter['getDashboard']>>['kpis'][number]): ReportMetric {
  const provenance = provenanceToReport(card.meta.provenance);
  return {
    key: card.id,
    label: card.title,
    value: card.value,
    formattedValue: card.formattedValue,
    unit: card.unit,
    definition: card.subtitle,
    provenance,
    sourceLabel: card.meta.sourceLabel,
    qualityStatus: 'CAUTION',
    note: [card.context, ...(card.meta.notes ?? [])].filter(Boolean).join(' '),
  };
}

export class PublishedReportsAdapter implements ReportsDataAdapter {
  readonly mode = 'published' as const;
  private reports = new Map<string, ReportDocumentModel>();
  private configs = new Map<string, ReportConfig>();
  private nextId = 1;
  private regionsPromise?: Promise<RegionOption[]>;

  constructor(private readonly dataAdapter: LabourMarketDataAdapter) {}

  private async regions(signal?: AbortSignal): Promise<RegionOption[]> {
    if (!this.regionsPromise) {
      this.regionsPromise = this.dataAdapter.getRegions(signal).then((items) => {
        const byCode = new Map<string, RegionOption>();
        byCode.set('IN', { code: 'IN', label: 'India (National)', level: 'national' });
        items.forEach((item) => {
          if (item.code !== 'IN') byCode.set(item.code, item);
        });
        return [...byCode.values()];
      }).catch((error) => {
        this.regionsPromise = undefined;
        if (signal?.aborted) throw error;
        return [{ code: 'IN', label: 'India (National)', level: 'national' }];
      });
    }
    return this.regionsPromise;
  }

  async getOptions(signal?: AbortSignal): Promise<ReportsOptions> {
    const geographies = (await this.regions(signal)).map((region) => ({
      id: region.code, label: region.label, level: region.level === 'national' ? 'COUNTRY' : 'STATE_UT',
    }));
    return {
      reportTypes: [...REPORT_TYPES],
      sections: clone(SECTION_OPTIONS),
      geographies,
      periods: [{ start: '2020-01-01', end: today(), label: 'Requested scope; each indicator retains its published period' }],
      referenceYears: [],
      exportCapabilities: { serverPdf: false, browserPrint: true, csv: true, xlsx: false },
      provenance: 'SOURCE_BACKED',
    };
  }

  async createReport(config: ReportConfig, signal?: AbortSignal): Promise<{ reportId: string; status: ReportStatus; document?: ReportDocumentModel; message?: string }> {
    if (!config.title.trim()) throw new Error('Enter a report title before generating.');
    if (config.geographyIds.length !== 1) throw new Error('Choose exactly one geography. Cross-geography report aggregation is not available yet.');
    if (!config.sectionKeys.length) throw new Error('Select at least one report section.');
    const geographyId = config.geographyIds[0];
    const regions = await this.regions(signal);
    const geography = regions.find((item) => item.code === geographyId);
    if (!geography) throw new Error('The selected geography is not available. Refresh report options and choose a listed region.');
    const dashboard = await this.dataAdapter.getDashboard({ regionCode: geography.code, periodYears: 5, signal });
    const metrics = dashboard.kpis.map(indicatorMetric);
    const sourceBackedMetrics = metrics.filter((metric) => metric.provenance === 'SOURCE_BACKED');
    const docProvenance: ReportDocumentModel['provenance'] = !metrics.length
      ? 'NOT_AVAILABLE'
      : metrics.every((metric) => metric.provenance === 'SOURCE_BACKED') ? 'SOURCE_BACKED' : 'MIXED';
    const uniqueSources = new Map<string, { name: string; asOfDate?: string; notes?: string[] }>();
    dashboard.kpis.forEach((card) => {
      const existing = uniqueSources.get(card.meta.sourceLabel) ?? { name: card.meta.sourceLabel, notes: [] };
      if (card.meta.updatedAt && (!existing.asOfDate || card.meta.updatedAt > existing.asOfDate)) existing.asOfDate = card.meta.updatedAt;
      existing.notes = [...new Set([...(existing.notes ?? []), ...(card.meta.notes ?? [])])];
      uniqueSources.set(card.meta.sourceLabel, existing);
    });
    const dataRows: ReportDataRow[] = dashboard.kpis.map((card) => ({
      id: card.id,
      cells: {
        indicator: card.title, value: card.formattedValue, unit: card.unit,
        source: card.meta.sourceLabel, asOf: card.meta.updatedAt ?? 'Not supplied',
      },
    }));
    const regionTable: ReportBlock = {
      kind: 'table', title: 'Published indicators for ' + geography.label,
      columns: [
        { key: 'indicator', label: 'Indicator' }, { key: 'value', label: 'Published value' },
        { key: 'unit', label: 'Unit' }, { key: 'source', label: 'Source' }, { key: 'asOf', label: 'As of' },
      ],
      rows: dataRows,
      caption: 'Values retain each source indicator’s own definition, unit and publication period. This table is not a forecast or a demand/supply estimate.',
    };
    const limitations = [
      'The requested report dates are saved as scope metadata only. The current public dashboard contract does not filter each indicator to this date range; individual source reference periods remain authoritative.',
      'This report library is held in browser memory only. The current repository has no configured Reports API for durable report storage, server PDF generation or access-controlled report snapshots.',
      'No validated demand/supply, skill-gap, forecast, emerging-skill or early-warning results are inferred from registrations, training seats or catalogues.',
      ...(dashboard.meta.notes ?? []),
    ];
    const sections: ReportSection[] = config.sectionKeys.map((key) => {
      if (key === 'EXECUTIVE_SUMMARY') {
        if (!metrics.length) return {
          key, title: 'Published Indicator Summary', status: 'UNAVAILABLE',
          blocks: [{ kind: 'unavailable', reason: 'No published indicators were returned for the selected geography.', nextStep: 'Check source coverage and try again after the public dashboard reader is available.' }],
        };
        const blocks: ReportBlock[] = [
          { kind: 'paragraph', text: 'This is a snapshot of ' + sourceBackedMetrics.length + ' source-backed published indicators for ' + dashboard.regionName + '. It is not an occupation forecast, labour-supply estimate or calculated skill gap.' },
          { kind: 'metric_grid', metrics },
          { kind: 'callout', tone: 'limitation', title: 'Interpret with source definitions', text: 'Indicators may cover different reference periods and populations. Cumulative registrations are not active jobseekers; training capacity is not completed training; published labour-force rates are benchmarks, not SHRAMIK model predictions.' },
        ];
        return { key, title: 'Published Indicator Summary', status: 'READY', blocks };
      }
      if (key === 'SOURCES_METHOD') {
        const blocks: ReportBlock[] = [
          { kind: 'methodology', title: 'Published-indicator reporting method', version: 'published-indicators-v1', text: 'The report captures indicator values returned by the SHRAMIK public dashboard adapter. It preserves the adapter’s source label, update date, unit, definition and interpretation notes. The selected date range is not applied as a database filter, and no missing analytical output is imputed.' },
          { kind: 'source_list', sources: [...uniqueSources.values()].map((source) => ({ ...source, notes: source.notes?.join(' ') })) },
          { kind: 'callout', tone: 'warning', title: 'Unavailable analytical outputs', text: 'Demand, supply, gaps, forecasts, early warnings and emerging-skill signals require validated result tables and reporting endpoints. These sections remain unavailable until those outputs are published.' },
        ];
        return { key, title: 'Sources & Methodology', status: 'READY', blocks };
      }
      if (key === 'REGIONAL') {
        if (!dashboard.kpis.length) return unavailableSection(key);
        return { key, title: 'Geographic Indicator Snapshot', status: 'READY', blocks: [regionTable] };
      }
      return unavailableSection(key);
    });
    const reportId = 'published-report-' + String(this.nextId++).padStart(4, '0');
    const generatedAt = new Date().toISOString();
    const geographyLabel = geography.label;
    const document: ReportDocumentModel = {
      id: reportId, version: 1, title: config.title.trim(), reportType: config.reportType,
      geographyLabels: [geographyLabel], period: clone(config.period), referenceYear: config.referenceYear,
      createdAt: generatedAt, templateVersion: config.templateVersion || 'shramik-published-report-v1',
      provenance: docProvenance, configSnapshot: clone(config), sections,
      metadata: {
        sourceSnapshotIds: [],
        methodologyVersion: 'published-indicators-v1',
        sourceLabels: [...uniqueSources.keys()],
        limitations,
        generatedByLabel: 'Published-indicator snapshot · in-browser library · not a validated forecast',
      },
    };
    this.reports.set(reportId, clone(document));
    this.configs.set(reportId, clone(config));
    return {
      reportId, status: 'COMPLETED', document: clone(document),
      message: 'Captured published source-backed indicators. Unsupported analytical sections are marked unavailable; the report is not persisted to a server.',
    };
  }

  async getReport(reportId: string): Promise<ReportDocumentModel> {
    const document = this.reports.get(reportId);
    if (!document) throw new Error('Report ' + reportId + ' is not in this browser session library.');
    return clone(document);
  }

  async listReports(query: ReportListQuery): Promise<ReportListResult> {
    const needle = query.query?.trim().toLocaleLowerCase() ?? '';
    let items: ReportListItem[] = [...this.reports.values()].map((document) => ({
      id: document.id, title: document.title, reportType: document.reportType,
      geographyLabels: document.geographyLabels, period: document.period, status: 'COMPLETED',
      createdAt: document.createdAt ?? undefined, updatedAt: document.createdAt ?? undefined,
      provenance: document.provenance,
      capabilities: {
        open: true, duplicate: Boolean(document.configSnapshot), retry: false, delete: true, pdf: false,
        csv: document.sections.some((section) => section.blocks.some((block) => block.kind === 'table' || block.kind === 'metric_grid' || block.kind === 'chart')),
      },
    }));
    items = items.filter((item) =>
      (!needle || (item.title + ' ' + item.id).toLocaleLowerCase().includes(needle)) &&
      (!query.reportType || item.reportType === query.reportType) &&
      (!query.geographyId || (this.configs.get(item.id)?.geographyIds ?? []).includes(query.geographyId)) &&
      (!query.status || item.status === query.status) &&
      (!query.periodStart || item.period.end >= query.periodStart) &&
      (!query.periodEnd || item.period.start <= query.periodEnd)
    ).sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
    const total = items.length;
    const page = Math.max(1, Math.trunc(query.page ?? 1));
    const pageSize = Math.min(50, Math.max(1, Math.trunc(query.pageSize ?? 10)));
    return { items: items.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize, provenance: total ? 'SOURCE_BACKED' : 'NOT_AVAILABLE' };
  }

  async duplicateReport(reportId: string): Promise<{ config: ReportConfig; message?: string }> {
    const config = this.configs.get(reportId);
    if (!config) throw new Error('Report ' + reportId + ' is not in this browser session library.');
    return { config: clone(config), message: 'Configuration copied. Generating another report will capture a fresh published-indicator snapshot.' };
  }

  async retryReport(reportId: string, signal?: AbortSignal): Promise<{ reportId: string; status: ReportStatus; message?: string }> {
    const config = this.configs.get(reportId);
    if (!config) throw new Error('Report ' + reportId + ' is not in this browser session library.');
    const result = await this.createReport(config, signal);
    return { reportId: result.reportId, status: result.status, message: result.message };
  }

  async deleteReport(reportId: string): Promise<{ deleted: boolean; message?: string }> {
    const deleted = this.reports.delete(reportId);
    this.configs.delete(reportId);
    return { deleted, message: deleted ? 'Removed from this browser-session library only.' : 'Report was not found in this session.' };
  }

  async exportCsv(reportId: string, sectionKey: ReportSectionKey): Promise<{ status: 'READY' | 'NOT_CONFIGURED' | 'FAILED'; csvText?: string; message?: string }> {
    const document = this.reports.get(reportId);
    if (!document) return { status: 'FAILED', message: 'Report was not found in this browser session.' };
    const section = document.sections.find((item) => item.key === sectionKey);
    if (!section) return { status: 'NOT_CONFIGURED', message: 'This section is not included in the selected report snapshot.' };
    const rows: unknown[][] = [
      ['Report title', document.title], ['Report ID', document.id], ['Report provenance', document.provenance],
      ['Section', section.title], ['Section status', section.status], [],
    ];
    for (const block of section.blocks) {
      if (block.kind === 'metric_grid') {
        rows.push(['Indicator', 'Value', 'Unit', 'Provenance', 'Source', 'Quality', 'Interpretation']);
        block.metrics.forEach((metric) => rows.push([metric.label, metric.formattedValue ?? metric.value, metric.unit, metric.provenance, metric.sourceLabel, metric.qualityStatus, metric.note]));
      } else if (block.kind === 'table') {
        rows.push(block.columns.map((column) => column.label));
        block.rows.forEach((row) => rows.push(block.columns.map((column) => row.cells[column.key] ?? '')));
      } else if (block.kind === 'chart') {
        rows.push(['Chart', block.title, 'Unit', block.unit ?? '']);
        block.series.forEach((series) => series.points.forEach((point) => rows.push([series.name, point.x, point.y])));
      }
    }
    const hasTabular = section.blocks.some((block) => block.kind === 'metric_grid' || block.kind === 'table' || block.kind === 'chart');
    if (!hasTabular) return { status: 'NOT_CONFIGURED', message: 'This section has no structured rows to export.' };
    return { status: 'READY', csvText: toCsv(rows), message: 'Export contains only values present in this published report snapshot.' };
  }
}
