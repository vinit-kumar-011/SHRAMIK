import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Activity, AlertCircle, ArrowRight, Check, ChevronDown, ChevronLeft, ChevronRight, Database, FileText, Info, RefreshCw, Search, SlidersHorizontal, X } from 'lucide-react';
import './reports.css';
import { ReportDocument } from './ReportDocument';
import { createReportsAdapter } from './adapter';
import type { ReportsDataAdapter, ReportListQuery } from './adapterTypes';
import type { ReportConfig, ReportDocumentModel, ReportListItem, ReportSectionKey, ReportStatus, ReportType, ReportView, ReportsOptions } from './types';

type ReportsPageProps = { dataAdapter?: ReportsDataAdapter; onNavigate?: (path: string, label?: string) => void; initialView?: ReportView; className?: string };
const VIEW_TABS: Array<{ key: ReportView; label: string; description: string }> = [
  { key: 'builder', label: 'Report Builder', description: 'Configure an evidence-backed intelligence document.' },
  { key: 'library', label: 'Report Library', description: 'Search and reopen saved report snapshots.' },
  { key: 'preview', label: 'Report Preview', description: 'Review the structured document before printing or exporting.' },
];
const TYPE_INFO: Record<ReportType, { title: string; desc: string; mark: string }> = {
  STATE: { title: 'State Report', desc: 'State/UT workforce demand, supply and skill intelligence.', mark: 'ST' },
  SECTOR: { title: 'Sector Report', desc: 'Sector patterns, occupations and workforce signals.', mark: 'SC' },
  SKILL: { title: 'Skill Report', desc: 'Evidence and limitations for a selected skill scope.', mark: 'SK' },
  POLICY_BRIEF: { title: 'Policy Brief', desc: 'A concise, decision-oriented summary of selected evidence.', mark: 'PB' },
  CUSTOM: { title: 'Custom Report', desc: 'Build a report from the sections you choose.', mark: 'CU' },
};
const statusLabel: Record<ReportStatus, string> = { QUEUED: 'Queued', RUNNING: 'Generating', COMPLETED: 'Completed', FAILED: 'Failed', CANCELLED: 'Cancelled', NOT_CONFIGURED: 'Not configured' };
const safeFileName = (value: string) => value.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) || 'shramik-report';
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function initialConfig(options: ReportsOptions): ReportConfig {
  const geography = options.geographies.find((item) => item.id === 'IN-KA') ?? options.geographies[0];
  const period = options.periods[0] ?? { start: '', end: '', label: 'Period not supplied' };
  const preferred: ReportSectionKey[] = ['EXECUTIVE_SUMMARY', 'DEMAND', 'SUPPLY', 'SKILL_GAPS', 'FORECASTS', 'SOURCES_METHOD'];
  const selected = options.sections.filter((section) => section.required || preferred.includes(section.key)).map((section) => section.key);
  return {
    reportType: options.reportTypes.includes('STATE') ? 'STATE' : options.reportTypes[0] ?? 'CUSTOM',
    title: `Labour Market Intelligence — ${geography?.label ?? 'India'}`,
    geographyIds: geography ? [geography.id] : [], period: clone(period), referenceYear: options.referenceYears[options.referenceYears.length - 1],
    sectionKeys: selected, sourcePolicy: { mode: 'LATEST_VALIDATED' }, options: { includeUncertainty: true, includeDataAppendix: false }, templateVersion: 'shramik-report-v1',
  };
}
function dateLabel(value?: string) {
  if (!value) return 'Not supplied';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}
function PeriodLabel({ period }: { period: { start: string; end: string; label?: string } }) { return <>{period.label || `${period.start || 'Start not supplied'} – ${period.end || 'End not supplied'}`}</>; }
function ProvenanceChip({ provenance }: { provenance: string }) {
  const text = provenance === 'SYNTHETIC_DEMO' ? 'SYNTHETIC_DEMO' : provenance.replaceAll('_', ' ');
  return <span className={`reports-provenance reports-prov-${provenance.toLowerCase()}`}><span aria-hidden="true"/>{text}</span>;
}

export function ReportsPage({ dataAdapter, initialView = 'builder', className = '' }: ReportsPageProps) {
  const [defaultAdapter] = useState<ReportsDataAdapter>(() => createReportsAdapter());
  const adapter = dataAdapter ?? defaultAdapter;
  const [activeView, setActiveView] = useState<ReportView>(initialView);
  const [options, setOptions] = useState<ReportsOptions | null>(null);
  const [config, setConfig] = useState<ReportConfig | null>(null);
  const [generatedConfig, setGeneratedConfig] = useState<ReportConfig | null>(null);
  const [reportDocument, setReportDocument] = useState<ReportDocumentModel | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState('');
  const [busyAction, setBusyAction] = useState<'generate' | 'open' | 'duplicate' | 'retry' | 'delete' | 'csv' | 'pdf' | ''>('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryType, setLibraryType] = useState('');
  const [libraryGeography, setLibraryGeography] = useState('');
  const [libraryStatus, setLibraryStatus] = useState<ReportStatus | ''>('');
  const [libraryPeriodStart, setLibraryPeriodStart] = useState('');
  const [libraryPeriodEnd, setLibraryPeriodEnd] = useState('');
  const [libraryResult, setLibraryResult] = useState<{ items: ReportListItem[]; total: number; page: number; pageSize: number; provenance: import('./types').ProvenanceState } | null>(null);
  const [libraryPage, setLibraryPage] = useState(1);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState('');
  const [libraryReload, setLibraryReload] = useState(0);
  const [selectedCsvSection, setSelectedCsvSection] = useState<ReportSectionKey | ''>('');
  const [outlineExpanded, setOutlineExpanded] = useState(true);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const optionsController = useRef<AbortController | null>(null);

  const loadOptions = useCallback(async () => {
    optionsController.current?.abort();
    const controller = new AbortController(); optionsController.current = controller;
    setOptionsLoading(true); setOptionsError('');
    try {
      const nextOptions = await adapter.getOptions(controller.signal);
      if (controller.signal.aborted) return;
      if (!nextOptions.reportTypes.length || !nextOptions.geographies.length || !nextOptions.periods.length || !nextOptions.sections.length) {
        throw new Error('The Reports service returned incomplete configuration options. Check supported report types, geographies, periods and sections.');
      }
      setOptions(nextOptions);
      setConfig((current) => current ?? initialConfig(nextOptions));
    } catch (reason) {
      if (!controller.signal.aborted) setOptionsError(reason instanceof Error ? reason.message : 'Reports configuration could not be loaded.');
    } finally { if (!controller.signal.aborted) setOptionsLoading(false); }
  }, [adapter]);
  useEffect(() => { void loadOptions(); return () => optionsController.current?.abort(); }, [loadOptions]);

  const isStale = !!reportDocument && !!generatedConfig && !!config && JSON.stringify(generatedConfig) !== JSON.stringify(config);
  const selectedSections = useMemo(() => options?.sections.filter((section) => config?.sectionKeys.includes(section.key)) ?? [], [options, config]);
  const requiredSectionKeys = useMemo(() => options?.sections.filter((section) => section.required).map((section) => section.key) ?? [], [options]);
  const validations = useMemo(() => {
    if (!config || !options) return [];
    const problems: string[] = [];
    if (!config.title.trim()) problems.push('Enter a report title.');
    if (!config.geographyIds.length) problems.push('Select at least one supported geography.');
    if (!options.periods.some((period) => period.start === config.period.start && period.end === config.period.end)) problems.push('Select a reporting period supported by the current data options.');
    if (!config.sectionKeys.length) problems.push('Select at least one report section.');
    const missingRequired = requiredSectionKeys.filter((key) => !config.sectionKeys.includes(key));
    if (missingRequired.length) problems.push(`Required sections are missing: ${missingRequired.map((key) => options.sections.find((item) => item.key === key)?.label ?? key).join(', ')}.`);
    if (config.sourcePolicy.mode === 'FIXED_SNAPSHOT' && !(config.sourcePolicy.snapshotIds?.length)) problems.push('Choose a supported snapshot for fixed-snapshot reporting.');
    return problems;
  }, [config, options, requiredSectionKeys]);

  const loadLibrary = useCallback(async (signal?: AbortSignal) => {
    const query: ReportListQuery = {
      query: librarySearch.trim() || undefined, reportType: libraryType || undefined, geographyId: libraryGeography || undefined,
      status: libraryStatus, periodStart: libraryPeriodStart || undefined, periodEnd: libraryPeriodEnd || undefined, page: libraryPage, pageSize: 8,
    };
    setLibraryLoading(true); setLibraryError('');
    try {
      const result = await adapter.listReports(query, signal);
      if (!signal?.aborted) setLibraryResult({ items: result.items, total: result.total, page: result.page, pageSize: result.pageSize, provenance: result.provenance });
    } catch (reason) { if (!signal?.aborted) setLibraryError(reason instanceof Error ? reason.message : 'The report library could not be loaded.'); }
    finally { if (!signal?.aborted) setLibraryLoading(false); }
  }, [adapter, librarySearch, libraryType, libraryGeography, libraryStatus, libraryPeriodStart, libraryPeriodEnd, libraryPage]);
  useEffect(() => {
    if (activeView !== 'library' || !options) return;
    const controller = new AbortController(); void loadLibrary(controller.signal);
    return () => controller.abort();
  }, [activeView, options, loadLibrary, libraryReload]);

  const updateConfig = (updater: (current: ReportConfig) => ReportConfig) => {
    setConfig((current) => current ? updater(current) : current);
    setMessage(''); setError(''); setValidationErrors([]);
  };
  const setField = <K extends keyof ReportConfig>(key: K, value: ReportConfig[K]) => updateConfig((current) => ({ ...current, [key]: value }));

  const generate = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!config || !options || busyAction) return;
    if (validations.length) { setValidationErrors(validations); setError('Review the required fields before generating this report.'); return; }
    setBusyAction('generate'); setError(''); setMessage(''); setValidationErrors([]);
    const snapshot = clone(config);
    const controller = new AbortController();
    try {
      const response = await adapter.createReport(snapshot, controller.signal);
      if (response.status === 'COMPLETED' && response.document) {
        setReportDocument(response.document); setGeneratedConfig(snapshot); setActiveView('preview');
        setSelectedCsvSection(response.document.sections.find((section) => section.blocks.some((block) => block.kind === 'table' || block.kind === 'metric_grid' || block.kind === 'chart'))?.key ?? response.document.sections[0]?.key ?? '');
        setMessage(response.message ?? 'Report preview is ready.');
        setLibraryReload((value) => value + 1);
      } else if (response.status === 'QUEUED' || response.status === 'RUNNING') {
        setMessage(`Report job ${response.reportId || '(ID not supplied)'} was accepted with status ${statusLabel[response.status]}. A completed document was not returned; check the Library for backend status updates.`);
        setActiveView('library'); setLibraryReload((value) => value + 1);
      } else if (response.status === 'NOT_CONFIGURED') {
        setError(response.message ?? 'Report generation is not configured on the backend.');
      } else {
        setError(response.message ?? `Report generation returned status ${statusLabel[response.status]}.`);
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Report generation failed. Your selections were preserved.'); }
    finally { setBusyAction(''); }
  };

  const configureFromDocument = (doc: ReportDocumentModel): ReportConfig => {
    const snapshot = doc.configSnapshot;
    if (snapshot) {
      const validGeographies = snapshot.geographyIds.filter((id) => options?.geographies.some((geo) => geo.id === id));
      const validPeriod = options?.periods.find((period) => period.start === snapshot.period.start && period.end === snapshot.period.end);
      const validSections = snapshot.sectionKeys.filter((key) => options?.sections.some((section) => section.key === key));
      return {
        ...clone(snapshot), reportType: options?.reportTypes.includes(snapshot.reportType) ? snapshot.reportType : options?.reportTypes[0] ?? 'CUSTOM',
        geographyIds: validGeographies.length ? validGeographies : options?.geographies.slice(0, 1).map((geo) => geo.id) ?? [],
        period: clone(validPeriod ?? options?.periods[0] ?? doc.period),
        referenceYear: snapshot.referenceYear !== undefined && options?.referenceYears.includes(snapshot.referenceYear) ? snapshot.referenceYear : options?.referenceYears[options.referenceYears.length - 1],
        sectionKeys: [...new Set([...validSections, ...(options?.sections.filter((section) => section.required).map((section) => section.key) ?? [])])],
      };
    }
    const geoIds = doc.geographyLabels.map((label) => options?.geographies.find((geo) => geo.label === label)?.id).filter((id): id is string => !!id);
    const supportedPeriod = options?.periods.find((period) => period.start === doc.period.start && period.end === doc.period.end) ?? options?.periods[0] ?? doc.period;
    const supportedType = options?.reportTypes.includes(doc.reportType) ? doc.reportType : options?.reportTypes[0] ?? 'CUSTOM';
    const supportedYear = doc.referenceYear !== undefined && options?.referenceYears.includes(doc.referenceYear) ? doc.referenceYear : options?.referenceYears[options.referenceYears.length - 1];
    return {
      reportType: supportedType, title: doc.title, geographyIds: geoIds.length ? geoIds : config?.geographyIds ?? [], period: clone(supportedPeriod), referenceYear: supportedYear,
      sectionKeys: [...new Set([...doc.sections.map((section) => section.key), ...(options?.sections.filter((section) => section.required).map((section) => section.key) ?? [])])], sourcePolicy: { mode: 'LATEST_VALIDATED' }, options: { includeUncertainty: true, includeDataAppendix: false }, templateVersion: doc.templateVersion,
    };
  };

  const openReport = async (item: ReportListItem) => {
    if (!item.capabilities.open || busyAction) return;
    setBusyAction('open'); setError(''); setMessage('');
    try {
      const doc = await adapter.getReport(item.id);
      const openedConfig = configureFromDocument(doc);
      setReportDocument(doc); setConfig(openedConfig); setGeneratedConfig(clone(openedConfig)); setActiveView('preview');
      setSelectedCsvSection(doc.sections.find((section) => section.blocks.some((block) => block.kind === 'table' || block.kind === 'metric_grid' || block.kind === 'chart'))?.key ?? doc.sections[0]?.key ?? '');
    } catch (reason) { setLibraryError(reason instanceof Error ? reason.message : 'Report could not be opened.'); }
    finally { setBusyAction(''); }
  };
  const duplicateReport = async (item: ReportListItem) => {
    if (!item.capabilities.duplicate || busyAction) return;
    setBusyAction('duplicate'); setError(''); setMessage('');
    try {
      const duplicate = await adapter.duplicateReport(item.id);
      setConfig(duplicate.config); setGeneratedConfig(null); setReportDocument(null); setActiveView('builder');
      setMessage(`${duplicate.message ?? 'Configuration copied.'} Review the settings and generate a new snapshot.`);
    } catch (reason) { setLibraryError(reason instanceof Error ? reason.message : 'Report configuration could not be duplicated.'); }
    finally { setBusyAction(''); }
  };
  const retryReport = async (item: ReportListItem) => {
    if (!item.capabilities.retry || busyAction) return;
    setBusyAction('retry'); setLibraryError('');
    try {
      const result = await adapter.retryReport(item.id);
      setMessage(result.message ?? `Retry request returned ${statusLabel[result.status]}.`);
      setLibraryReload((value) => value + 1);
    } catch (reason) { setLibraryError(reason instanceof Error ? reason.message : 'Retry request failed.'); }
    finally { setBusyAction(''); }
  };
  const deleteReport = async (item: ReportListItem) => {
    if (!item.capabilities.delete || !adapter.deleteReport || busyAction) return;
    if (!window.confirm(`Delete “${item.title}” from the report library? This action may not be reversible.`)) return;
    setBusyAction('delete'); setLibraryError('');
    try {
      const result = await adapter.deleteReport(item.id);
      if (!result.deleted) throw new Error(result.message ?? 'The report was not deleted.');
      setMessage(result.message ?? 'Report deleted.'); setLibraryReload((value) => value + 1);
    } catch (reason) { setLibraryError(reason instanceof Error ? reason.message : 'Delete failed.'); }
    finally { setBusyAction(''); }
  };

  const exportCsv = async () => {
    if (!reportDocument || !selectedCsvSection || busyAction) return;
    setBusyAction('csv'); setError(''); setMessage('');
    try {
      const result = await adapter.exportCsv(reportDocument.id, selectedCsvSection);
      if (result.status !== 'READY') throw new Error(result.message ?? `CSV export status: ${result.status}.`);
      if (result.csvText !== undefined) {
        const blob = new Blob([result.csvText], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob); const anchor = window.document.createElement('a');
        anchor.href = url; anchor.download = `${safeFileName(reportDocument.title)}-${selectedCsvSection.toLowerCase()}.csv`; anchor.rel = 'noopener';
        window.document.body.appendChild(anchor); anchor.click(); anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1500);
        setMessage(`CSV download started for ${reportDocument.sections.find((section) => section.key === selectedCsvSection)?.title ?? selectedCsvSection}. Provenance is included in the file.`);
      } else if (result.downloadUrl) {
        const anchor = window.document.createElement('a'); anchor.href = result.downloadUrl; anchor.target = '_blank'; anchor.rel = 'noopener noreferrer'; anchor.click();
        setMessage(result.message ?? 'Authorised CSV download opened.');
      } else throw new Error('CSV export returned no file content or download URL.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'CSV export failed.'); }
    finally { setBusyAction(''); }
  };
  const exportPdf = async () => {
    if (!reportDocument || busyAction) return;
    setError(''); setMessage('');
    if (options?.exportCapabilities.serverPdf && adapter.exportPdf) {
      setBusyAction('pdf');
      try {
        const result = await adapter.exportPdf(reportDocument.id);
        if (result.status !== 'READY' || !result.downloadUrl) throw new Error(result.message ?? 'The Reports service did not return a completed PDF download.');
        const anchor = window.document.createElement('a'); anchor.href = result.downloadUrl; anchor.target = '_blank'; anchor.rel = 'noopener noreferrer'; anchor.click();
        setMessage('The backend returned an authorised PDF download.');
      } catch (reason) { setError(reason instanceof Error ? reason.message : 'Server PDF export failed. No download was reported as complete.'); }
      finally { setBusyAction(''); }
    } else {
      setMessage('Browser print opened. Choose “Save as PDF” in the print dialog. No server-generated PDF was created.');
      window.print();
    }
  };

  const selectView = (view: ReportView) => { setActiveView(view); setError(''); setMessage(''); };
  const sectionExportable = (sectionKey: ReportSectionKey) => reportDocument?.sections.find((section) => section.key === sectionKey)?.blocks.some((block) => block.kind === 'table' || block.kind === 'metric_grid' || block.kind === 'chart') ?? false;
  const canExportCsv = !!reportDocument && options?.exportCapabilities.csv !== false && reportDocument.sections.some((section) => sectionExportable(section.key));
  const onSectionNav = (key: string) => {
    const target = key === 'top' ? 'report-top' : key === 'report-limitations' ? 'report-limitations' : `report-section-${key}`;
    const element = window.document.getElementById(target);
    element?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    if (element) { element.setAttribute('tabindex', '-1'); (element as HTMLElement).focus({ preventScroll: true }); }
  };

  if (optionsLoading && !options) return <div className={`reports-page ${className}`}><div className="reports-page-header"><div><p className="reports-breadcrumb">SHRAMIK / INTELLIGENCE</p><h1>REPORTS & INTELLIGENCE BRIEFS</h1><p>Configure, review and export evidence-oriented workforce reports.</p></div></div><div className="reports-load-state" role="status"><RefreshCw size={19} className="reports-spin"/> Loading supported report options…</div></div>;
  if (optionsError || !options || !config) return <div className={`reports-page ${className}`}><div className="reports-page-header"><div><p className="reports-breadcrumb">SHRAMIK / INTELLIGENCE</p><h1>REPORTS & INTELLIGENCE BRIEFS</h1><p>Configure, review and export evidence-oriented workforce reports.</p></div></div><div className="reports-error" role="alert"><AlertCircle size={20}/><div><strong>Reports configuration unavailable</strong><p>{optionsError || 'The Reports service returned no supported options.'}</p><p>Your page has not switched to demo data because the configured adapter failed.</p><button className="reports-button" type="button" onClick={() => void loadOptions()}><RefreshCw size={15}/> Retry loading options</button></div></div></div>;

  return <div className={`reports-page ${className}`}>
    <header className="reports-page-header"><div><p className="reports-breadcrumb">SHRAMIK / INTELLIGENCE / REPORTS</p><h1>REPORTS & INTELLIGENCE BRIEFS</h1><p>Assemble a versioned report, inspect its evidence and export only what the selected snapshot supports.</p></div><div className="reports-heading-meta"><ProvenanceChip provenance={options.provenance}/><span><Database size={14}/> {adapter.mode === 'demo' ? 'Demo adapter' : 'Connected adapter'}</span></div></header>
    <div className="reports-view-tabs" role="tablist" aria-label="Reports workspace views">
      {VIEW_TABS.map((tab) => <button type="button" role="tab" id={`reports-tab-${tab.key}`} aria-selected={activeView === tab.key} aria-controls={`reports-panel-${tab.key}`} tabIndex={activeView === tab.key ? 0 : -1} key={tab.key} className={activeView === tab.key ? 'is-active' : ''} onClick={() => selectView(tab.key)} onKeyDown={(event) => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); const index = VIEW_TABS.findIndex((item) => item.key === activeView); const next = VIEW_TABS[(index + (event.key === 'ArrowRight' ? 1 : VIEW_TABS.length - 1)) % VIEW_TABS.length]; selectView(next.key); (event.currentTarget.parentElement?.querySelector(`#reports-tab-${next.key}`) as HTMLButtonElement | null)?.focus(); } }}><span>{tab.label}</span><small>{tab.description}</small></button>)}
    </div>
    {(message || error) && <div className={error ? 'reports-alert reports-alert-error' : 'reports-alert reports-alert-info'} role={error ? 'alert' : 'status'}><span>{error ? <AlertCircle size={17}/> : <Info size={17}/>}</span><p>{error || message}</p><button type="button" className="reports-alert-dismiss" aria-label="Dismiss message" onClick={() => { setError(''); setMessage(''); }}><X size={16}/></button></div>}

    {activeView === 'builder' && <section id="reports-panel-builder" role="tabpanel" aria-labelledby="reports-tab-builder" className="reports-builder-grid">
      <form className="reports-config-panel" onSubmit={(event) => void generate(event)} noValidate>
        <div className="reports-panel-heading"><div><span className="reports-step">01 / CONFIGURE</span><h2>Build your report</h2><p>Only supported geographies, periods and sections are selectable.</p></div><span className="reports-heading-icon"><FileText size={21}/></span></div>
        <fieldset className="reports-type-fieldset"><legend>Report type</legend><div className="reports-type-grid">
          {options.reportTypes.map((type) => <button key={type} type="button" className={`reports-type-card ${config.reportType === type ? 'selected' : ''}`} aria-pressed={config.reportType === type} onClick={() => {
            const geography = options.geographies.find((item) => item.id === config.geographyIds[0]);
            const title = config.title.trim() ? config.title : `${TYPE_INFO[type].title} — ${geography?.label ?? 'India'}`;
            setField('reportType', type); setField('title', title);
          }}><span className="reports-type-mark">{TYPE_INFO[type].mark}</span><span className="reports-type-copy"><strong>{TYPE_INFO[type].title}</strong><small>{TYPE_INFO[type].desc}</small></span>{config.reportType === type && <Check size={17} className="reports-selected-check"/>}</button>)}
        </div></fieldset>
        <div className="reports-form-grid">
          <label className="reports-field reports-field-wide"><span>Report title <b>*</b></span><input value={config.title} maxLength={140} onChange={(event) => setField('title', event.target.value)} placeholder="Enter a descriptive report title" required/><small>Appears on the report cover and in the library.</small></label>
          <label className="reports-field"><span>Primary geography <b>*</b></span><select value={config.geographyIds[0] ?? ''} onChange={(event) => { const id = event.target.value; updateConfig((current) => ({ ...current, geographyIds: id ? [id] : [], options: { ...current.options, compareGeographyIds: current.options.compareGeographyIds?.filter((other) => other !== id) } })); }} required><option value="">Select supported geography</option>{options.geographies.map((geo) => <option value={geo.id} key={geo.id}>{geo.label} · {geo.level.replaceAll('_', ' ')}</option>)}</select><small>Districts appear only if the data service supports them.</small></label>
          <label className="reports-field"><span>Reporting period <b>*</b></span><select value={`${config.period.start}|${config.period.end}`} onChange={(event) => { const period = options.periods.find((item) => `${item.start}|${item.end}` === event.target.value); if (period) setField('period', clone(period)); }} required>{options.periods.map((period) => <option key={`${period.start}-${period.end}`} value={`${period.start}|${period.end}`}>{period.label || `${period.start} – ${period.end}`}</option>)}</select><small>Period options come from the active adapter.</small></label>
          <label className="reports-field"><span>Reference year</span><select value={config.referenceYear ?? ''} onChange={(event) => setField('referenceYear', event.target.value ? Number(event.target.value) : undefined)}><option value="">Not specified</option>{options.referenceYears.map((year) => <option key={year} value={year}>{year}</option>)}</select><small>Only supported reference years are shown.</small></label>
          <label className="reports-field"><span>Comparison geography <em>Optional</em></span><select value={config.options.compareGeographyIds?.[0] ?? ''} onChange={(event) => setField('options', { ...config.options, compareGeographyIds: event.target.value ? [event.target.value] : [] })}><option value="">No comparison</option>{options.geographies.filter((geo) => !config.geographyIds.includes(geo.id)).map((geo) => <option key={geo.id} value={geo.id}>{geo.label}</option>)}</select><small>Comparison scope is metadata unless returned by the report service.</small></label>
          <label className="reports-field"><span>Source policy</span><select value={config.sourcePolicy.mode} onChange={(event) => setField('sourcePolicy', event.target.value === 'FIXED_SNAPSHOT' ? { mode: 'FIXED_SNAPSHOT', snapshotIds: options.sourceSnapshots?.[0] ? [options.sourceSnapshots[0].id] : [] } : { mode: 'LATEST_VALIDATED' })}><option value="LATEST_VALIDATED">Latest validated data</option>{options.sourceSnapshots?.length ? <option value="FIXED_SNAPSHOT">Fixed snapshot / version</option> : null}</select><small>{config.sourcePolicy.mode === 'FIXED_SNAPSHOT' ? 'A fixed source snapshot will be recorded if the backend supports it.' : 'Uses the latest validated data available to the service.'}</small></label>
          {config.sourcePolicy.mode === 'FIXED_SNAPSHOT' && options.sourceSnapshots?.length ? <label className="reports-field reports-field-wide"><span>Source snapshot / version</span><select value={config.sourcePolicy.snapshotIds?.[0] ?? ''} onChange={(event) => setField('sourcePolicy', { mode: 'FIXED_SNAPSHOT', snapshotIds: event.target.value ? [event.target.value] : [] })}><option value="">Select snapshot</option>{options.sourceSnapshots.map((snapshot) => <option key={snapshot.id} value={snapshot.id}>{snapshot.label}{snapshot.asOfDate ? ` · ${dateLabel(snapshot.asOfDate)}` : ''}</option>)}</select></label> : null}
        </div>
        <div className="reports-coverage-line"><span className="reports-coverage-icon"><Database size={16}/></span><div><strong>{options.provenance === 'SYNTHETIC_DEMO' ? 'Illustrative demo mode' : 'Adapter provenance'} · {options.provenance.replaceAll('_', ' ')}</strong><p>{options.provenance === 'SYNTHETIC_DEMO' ? 'The fixture is synthetic. It is for UI review only and must not be cited as verified workforce evidence.' : 'Source availability, snapshot identifiers and coverage depend on the report service response.'}</p></div></div>
        <fieldset className="reports-sections-fieldset"><div className="reports-section-legend"><legend>Include report sections</legend><button type="button" className="reports-link-button" onClick={() => updateConfig((current) => ({ ...current, sectionKeys: options.sections.map((section) => section.key) }))}>Select all</button><span>·</span><button type="button" className="reports-link-button" onClick={() => updateConfig((current) => ({ ...current, sectionKeys: options.sections.filter((section) => section.required).map((section) => section.key) }))}>Deselect optional</button></div><p className="reports-section-help">Required sections are protected because scope and source limitations must travel with a report.</p>
          <div className="reports-section-grid">{options.sections.map((section) => {
            const selected = config.sectionKeys.includes(section.key);
            return <label key={section.key} className={`reports-section-option ${selected ? 'checked' : ''}`}><input type="checkbox" checked={selected} disabled={!!section.required} onChange={(event) => updateConfig((current) => ({ ...current, sectionKeys: event.target.checked ? [...current.sectionKeys, section.key] : current.sectionKeys.filter((key) => key !== section.key) }))}/><span className="reports-checkbox-ui" aria-hidden="true">{selected && <Check size={13}/>}</span><span className="reports-section-option-copy"><strong>{section.label}{section.required ? <i>Required</i> : null}</strong><small>{section.description}</small></span></label>;
          })}</div>
        </fieldset>
        <div className="reports-advanced"><span className="reports-advanced-title"><SlidersHorizontal size={16}/> Report options</span>
          <label className="reports-toggle-row"><input type="checkbox" checked={config.options.includeUncertainty} onChange={(event) => setField('options', { ...config.options, includeUncertainty: event.target.checked })}/><span><strong>Include uncertainty and caveats</strong><small>Carry uncertainty and quality limitations into the report where supplied.</small></span></label>
          <label className="reports-toggle-row"><input type="checkbox" checked={config.options.includeDataAppendix} onChange={(event) => setField('options', { ...config.options, includeDataAppendix: event.target.checked })}/><span><strong>Include data appendix</strong><small>Request an appendix of selected structured data; included only if the report service supports it.</small></span></label>
        </div>
        {validationErrors.length > 0 && <div className="reports-error-list" role="alert"><strong>Fix these items:</strong><ul>{validationErrors.map((item) => <li key={item}>{item}</li>)}</ul></div>}
        <div className="reports-builder-footer"><div><small>{config.sectionKeys.length} sections selected · template {config.templateVersion}</small><strong>{options.geographies.find((geo) => geo.id === config.geographyIds[0])?.label ?? 'Scope not selected'} <span>·</span> <PeriodLabel period={config.period}/></strong></div><button className="reports-button reports-button-primary" type="submit" disabled={!!busyAction || validations.length > 0} title={validations.length ? validations.join(' ') : undefined}>{busyAction === 'generate' ? <RefreshCw size={17} className="reports-spin"/> : <FileText size={17}/>} {busyAction === 'generate' ? 'Generating…' : 'Generate report'} <ArrowRight size={16}/></button></div>
        {validations.length > 0 && <p className="reports-disabled-reason">Generation is disabled until the required title, geography, period and section selection are valid.</p>}
      </form>
      <aside className="reports-builder-preview" aria-label="Live report configuration preview"><div className="reports-panel-heading"><div><span className="reports-step">02 / OUTLINE</span><h2>Live document outline</h2><p>This is a draft outline, not a generated report.</p></div><span className="reports-heading-icon"><Activity size={20}/></span></div>
        {isStale && <div className="reports-stale-banner"><AlertCircle size={15}/> Configuration changed since the last generated snapshot. Regenerate to refresh the preview.</div>}
        <div className="reports-mini-cover"><div className="reports-mini-brand"><span>SH</span>RAMIK <small>LABOUR MARKET INTELLIGENCE</small></div><div className="reports-mini-rule"/><p>{TYPE_INFO[config.reportType].title.toUpperCase()}</p><h3>{config.title || 'Untitled report'}</h3><dl><div><dt>Geography</dt><dd>{config.geographyIds.map((id) => options.geographies.find((geo) => geo.id === id)?.label ?? id).join(', ') || 'Not selected'}</dd></div><div><dt>Period</dt><dd><PeriodLabel period={config.period}/></dd></div><div><dt>Reference year</dt><dd>{config.referenceYear ?? 'Not specified'}</dd></div></dl><span className="reports-mini-demo">{options.provenance === 'SYNTHETIC_DEMO' ? 'ILLUSTRATIVE — SYNTHETIC DEMO DATA' : options.provenance.replaceAll('_', ' ')}</span></div>
        <div className="reports-outline-list"><div className="reports-outline-head"><strong>Included sections</strong><span>{selectedSections.length}</span></div>{selectedSections.length ? selectedSections.map((section, index) => <div className="reports-outline-row" key={section.key}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{section.label}</strong><small>{section.required ? 'Required context' : 'Selected analysis'}</small></div><Check size={15}/></div>) : <p className="reports-empty-inline">Select at least one section to outline the document.</p>}</div>
        <div className="reports-draft-note"><Info size={15}/><p>Source dates, model versions, metrics and findings are added only when supplied by the adapter. Unsupported sections remain unavailable rather than being filled with invented values.</p></div>
      </aside>
    </section>}

    {activeView === 'library' && <section id="reports-panel-library" role="tabpanel" aria-labelledby="reports-tab-library" className="reports-library-panel">
      <div className="reports-panel-heading reports-library-heading"><div><span className="reports-step">REPORT ARCHIVE</span><h2>Report library</h2><p>Open versioned snapshots or duplicate a configuration to create a new one.</p></div><button className="reports-button reports-button-primary" type="button" onClick={() => selectView('builder')}><FileText size={16}/> New report</button></div>
      <div className="reports-library-toolbar"><label className="reports-search"><Search size={16}/><input value={librarySearch} onChange={(event) => { setLibraryPage(1); setLibrarySearch(event.target.value); }} placeholder="Search title, report ID or geography…" aria-label="Search reports"/></label><label className="reports-filter"><span>Type</span><select value={libraryType} onChange={(event) => { setLibraryPage(1); setLibraryType(event.target.value); }}><option value="">All report types</option>{options.reportTypes.map((type) => <option key={type} value={type}>{TYPE_INFO[type]?.title ?? type}</option>)}</select></label><label className="reports-filter"><span>Geography</span><select value={libraryGeography} onChange={(event) => { setLibraryPage(1); setLibraryGeography(event.target.value); }}><option value="">All geographies</option>{options.geographies.map((geo) => <option key={geo.id} value={geo.id}>{geo.label}</option>)}</select></label><label className="reports-filter"><span>Status</span><select value={libraryStatus} onChange={(event) => { setLibraryPage(1); setLibraryStatus(event.target.value as ReportStatus | ''); }}><option value="">All statuses</option>{(['QUEUED','RUNNING','COMPLETED','FAILED','CANCELLED','NOT_CONFIGURED'] as ReportStatus[]).map((status) => <option key={status} value={status}>{statusLabel[status]}</option>)}</select></label><label className="reports-filter"><span>Period starts after</span><input type="date" value={libraryPeriodStart} onChange={(event) => { setLibraryPage(1); setLibraryPeriodStart(event.target.value); }} aria-label="Filter periods starting after date"/></label><label className="reports-filter"><span>Period ends before</span><input type="date" value={libraryPeriodEnd} onChange={(event) => { setLibraryPage(1); setLibraryPeriodEnd(event.target.value); }} aria-label="Filter periods ending before date"/></label><button className="reports-button reports-button-secondary" type="button" onClick={() => { setLibrarySearch(''); setLibraryType(''); setLibraryGeography(''); setLibraryStatus(''); setLibraryPeriodStart(''); setLibraryPeriodEnd(''); setLibraryPage(1); }}><X size={15}/> Clear filters</button></div>
      {libraryError && <div className="reports-error" role="alert"><AlertCircle size={18}/><div><strong>Library request failed</strong><p>{libraryError}</p><button className="reports-button" type="button" onClick={() => setLibraryReload((value) => value + 1)}><RefreshCw size={15}/> Retry</button></div></div>}
      {libraryLoading && <div className="reports-load-state" role="status"><RefreshCw className="reports-spin" size={18}/> Loading report records…</div>}
      {!libraryLoading && !libraryError && libraryResult && <>
        <div className="reports-library-summary"><span><strong>{libraryResult.total}</strong> report {libraryResult.total === 1 ? 'record' : 'records'} returned</span><ProvenanceChip provenance={libraryResult.provenance}/></div>
        {libraryResult.items.length ? <div className="reports-table-wrap"><table className="reports-library-table"><thead><tr><th>Report</th><th>Type</th><th>Geography</th><th>Period</th><th>Generated / updated</th><th>Status</th><th>Provenance</th><th>Actions</th></tr></thead><tbody>{libraryResult.items.map((item) => <tr key={item.id}>
          <td><strong>{item.title}</strong><small>{item.id}</small></td><td>{TYPE_INFO[item.reportType]?.title ?? item.reportType}</td><td>{item.geographyLabels.join(', ') || 'Not supplied'}</td><td><PeriodLabel period={item.period}/></td><td>{item.updatedAt || item.createdAt ? <>{dateLabel(item.updatedAt ?? item.createdAt)}<small>{item.createdAt ? `Created ${dateLabel(item.createdAt)}` : ''}</small></> : <span className="reports-muted">Timestamp not supplied</span>}</td><td><span className={`reports-status status-${item.status.toLowerCase()}`}>{statusLabel[item.status]}</span></td><td><ProvenanceChip provenance={item.provenance}/></td><td><div className="reports-row-actions">{item.capabilities.open && <button type="button" onClick={() => void openReport(item)} disabled={!!busyAction} title="Open this report snapshot">Open</button>}{item.capabilities.duplicate && <button type="button" onClick={() => void duplicateReport(item)} disabled={!!busyAction} title="Use this configuration as a template">Duplicate</button>}{item.capabilities.retry && <button type="button" onClick={() => void retryReport(item)} disabled={!!busyAction} title="Retry a failed report job">Retry</button>}{item.capabilities.delete && adapter.deleteReport && <button type="button" className="reports-danger-action" onClick={() => void deleteReport(item)} disabled={!!busyAction} title="Delete report">Delete</button>}</div></td>
        </tr>)}</tbody></table></div> : <div className="reports-empty-state"><FileText size={26}/><strong>{librarySearch || libraryType || libraryGeography || libraryStatus || libraryPeriodStart || libraryPeriodEnd ? 'No reports match these filters' : 'No saved reports yet'}</strong><p>{librarySearch || libraryType || libraryGeography || libraryStatus || libraryPeriodStart || libraryPeriodEnd ? 'Clear or adjust the filters to broaden your search.' : 'Generate a report to create the first report snapshot available to this library.'}</p>{(librarySearch || libraryType || libraryGeography || libraryStatus || libraryPeriodStart || libraryPeriodEnd) && <button className="reports-button" type="button" onClick={() => { setLibrarySearch(''); setLibraryType(''); setLibraryGeography(''); setLibraryStatus(''); setLibraryPeriodStart(''); setLibraryPeriodEnd(''); setLibraryPage(1); }}>Clear filters</button>}</div>}
        <div className="reports-pagination"><span>Showing {libraryResult.total ? (libraryResult.page - 1) * libraryResult.pageSize + 1 : 0}–{Math.min(libraryResult.page * libraryResult.pageSize, libraryResult.total)} of {libraryResult.total}</span><div><button type="button" className="reports-button reports-button-small" disabled={libraryPage <= 1 || !!busyAction} onClick={() => setLibraryPage((page) => page - 1)}><ChevronLeft size={15}/> Previous</button><span>Page {libraryResult.page} of {Math.max(1, Math.ceil(libraryResult.total / libraryResult.pageSize))}</span><button type="button" className="reports-button reports-button-small" disabled={libraryPage >= Math.ceil(libraryResult.total / libraryResult.pageSize) || !!busyAction} onClick={() => setLibraryPage((page) => page + 1)}>Next <ChevronRight size={15}/></button></div></div>
      </>}
    </section>}

    {activeView === 'preview' && <section id="reports-panel-preview" role="tabpanel" aria-labelledby="reports-tab-preview" className="reports-preview-view">
      {!reportDocument ? <div className="reports-empty-state"><FileText size={30}/><strong>No report preview is open</strong><p>Generate a report from the Builder or open an existing snapshot from the Library.</p><div><button className="reports-button reports-button-primary" type="button" onClick={() => selectView('builder')}>Open Builder <ArrowRight size={15}/></button><button className="reports-button reports-button-secondary" type="button" onClick={() => selectView('library')}>Open Library</button></div></div> : <>
        <div className="reports-preview-toolbar no-print"><div><span className="reports-step">DOCUMENT PREVIEW</span><h2>{reportDocument.title}</h2><p>{reportDocument.geographyLabels.join(', ') || 'Scope not supplied'} · <PeriodLabel period={reportDocument.period}/></p>{isStale && <span className="reports-stale-tag"><AlertCircle size={14}/> Draft changed — displayed document is the previous immutable snapshot.</span>}</div><div className="reports-preview-actions"><button className="reports-button reports-button-secondary" type="button" onClick={() => selectView('builder')}>Back to edit</button><label className="reports-export-select"><span>CSV section</span><select value={selectedCsvSection} onChange={(event) => setSelectedCsvSection(event.target.value as ReportSectionKey | '')}><option value="">Select section</option>{reportDocument.sections.map((section) => <option value={section.key} key={section.key}>{section.title}</option>)}</select></label><button className="reports-button reports-button-secondary" type="button" onClick={() => void exportCsv()} disabled={!canExportCsv || !selectedCsvSection || !!busyAction}>{busyAction === 'csv' ? <RefreshCw className="reports-spin" size={15}/> : <Database size={15}/>} Export CSV</button><button className="reports-button reports-button-primary" type="button" onClick={() => void exportPdf()} disabled={!!busyAction || (!options.exportCapabilities.serverPdf && !options.exportCapabilities.browserPrint)} title={!options.exportCapabilities.serverPdf && !options.exportCapabilities.browserPrint ? 'PDF export is not available for this adapter.' : undefined}>{busyAction === 'pdf' ? <RefreshCw size={15} className="reports-spin"/> : <FileText size={15}/>} {options.exportCapabilities.serverPdf ? 'Export PDF' : 'Print / Save as PDF'}</button></div></div>
        <div className={`reports-preview-layout ${outlineExpanded ? '' : 'outline-collapsed'}`}>
          <aside className="reports-outline no-print"><button type="button" className="reports-outline-toggle" onClick={() => setOutlineExpanded((value) => !value)} aria-expanded={outlineExpanded}><span>CONTENTS <small>{reportDocument.sections.length + 1} sections</small></span><ChevronDown size={16}/></button>{outlineExpanded && <><div className="reports-outline-links">{reportDocument.sections.map((section, index) => <button type="button" key={section.key} onClick={() => onSectionNav(section.key)}><span>{String(index + 1).padStart(2, '0')}</span>{section.title}<ChevronRight size={13}/></button>)}<button type="button" onClick={() => onSectionNav('report-limitations')}><span>{String(reportDocument.sections.length + 1).padStart(2, '0')}</span>Sources & limitations<ChevronRight size={13}/></button></div><div className="reports-outline-meta"><small>REPORT SNAPSHOT</small><strong>{reportDocument.id}</strong><span>Template: {reportDocument.templateVersion}</span><ProvenanceChip provenance={reportDocument.provenance}/></div></>}</aside>
          <div className="reports-document-wrap"><ReportDocument document={reportDocument} onSectionNav={onSectionNav}/></div>
        </div>
      </>}
    </section>}
    <footer className="reports-page-footer"><span><Info size={14}/> Report snapshots preserve their original configuration and provenance.</span><span>SHRAMIK · Reports & Intelligence Briefs</span></footer>
  </div>;
}

export default ReportsPage;
