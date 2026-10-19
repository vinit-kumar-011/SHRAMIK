import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import {
  AlertCircle, ArrowRight, BarChart3, Bell, CalendarDays, Check, ChevronDown, ChevronLeft,
  ChevronRight, CircleHelp, Database, FileText, Info, MapPin, RefreshCw, Search, SlidersHorizontal,
  Table2, TrendingUp, Users, X,
} from 'lucide-react';
import { createForecastsDataAdapter } from './legacyAdapter';
import type {
  AlertDetailResponse, AlertListResponse, AlertStatus, DataMeta, EarlyWarning, EntityType,
  ForecastFilterOptions, ForecastFilters, ForecastPoint, ForecastSeriesResponse, MetricValue,
  ModelPerformanceResponse, RiskCell, RiskClass, RiskDetailsResponse, RiskMatrixResponse,
  ScenarioComparisonResponse, ScenarioOptionsResponse, StateRiskMapResponse,
} from './types';
import './forecasts.css';

type ViewKey = 'overview' | 'risk-radar' | 'scenario-analysis' | 'model-performance' | 'alert-management';
const VIEWS: Array<{ key: ViewKey; label: string; short: string }> = [
  { key: 'overview', label: 'Forecast Overview', short: 'Overview' },
  { key: 'risk-radar', label: 'Risk Radar', short: 'Risk Radar' },
  { key: 'scenario-analysis', label: 'Scenario Analysis', short: 'Scenarios' },
  { key: 'model-performance', label: 'Model Performance', short: 'Performance' },
  { key: 'alert-management', label: 'Alert Management', short: 'Alerts' },
];
const defaultFilters: ForecastFilters = { horizonYears: 3, geographyCode: 'IN', period: '2026' };
const defaultView = (): ViewKey => {
  if (typeof window === 'undefined') return 'overview';
  const value = new URLSearchParams(window.location.search).get('view');
  return VIEWS.some((item) => item.key === value) ? value as ViewKey : 'overview';
};
const fmt = (value: number | null | undefined, unit?: string) => value == null || !Number.isFinite(value)
  ? 'Not available'
  : `${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(value)}${unit === '%' ? '%' : ''}`;
const signed = (value: number | null | undefined, unit?: string) => value == null || !Number.isFinite(value)
  ? 'Not available'
  : `${value > 0 ? '+' : value < 0 ? '−' : ''}${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(Math.abs(value))}${unit ? ` ${unit}` : ''}`;
const percent = (value: number | null | undefined) => value == null || !Number.isFinite(value) ? 'Not available' : `${value.toFixed(1)}%`;
const niceDate = (value?: string) => {
  if (!value) return 'Not supplied';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};
const titleCase = (value: string) => value.replace(/-/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
const alertSeverityLabel = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
const riskClassLabel: Record<RiskClass, string> = {
  'high-shortage': 'High shortage', 'moderate-shortage': 'Moderate shortage', balanced: 'Approx. balance',
  'moderate-surplus': 'Moderate surplus', 'high-surplus': 'High surplus', 'no-data': 'No data',
};
const metaSource = (meta?: DataMeta) => !meta ? 'Provenance not supplied' : `${titleCase(meta.provenance)} · ${(meta.sourceLabels ?? []).join(', ') || 'Source label not supplied'}`;

function ProvenanceBadge({ meta }: { meta?: DataMeta }) {
  const value = meta?.provenance ?? 'mock';
  return <span className={`fw-provenance fw-prov-${value}`}><i/> {titleCase(value)}</span>;
}
function DataFootnote({ meta, compact = false }: { meta?: DataMeta; compact?: boolean }) {
  return <div className="fw-data-footnote"><Info size={14}/><div><strong>{metaSource(meta)}</strong>{!compact && <p>{meta?.notes?.join(' ') || 'Units, coverage and update timing should be checked against the source response.'} {meta?.updatedAt ? `Updated ${niceDate(meta.updatedAt)}.` : 'Update time not supplied.'}</p>}</div><ProvenanceBadge meta={meta}/></div>;
}
function Panel({ title, subtitle, children, action, className = '' }: { title: string; subtitle?: string; children: ReactNode; action?: ReactNode; className?: string }) {
  return <section className={`fw-panel ${className}`}><header className="fw-panel-header"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</header>{children}</section>;
}
function ErrorPanel({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="fw-error-panel" role="alert"><AlertCircle size={18}/><div><strong>Service response unavailable</strong><p>{message}</p></div>{onRetry && <button type="button" className="fw-button" onClick={onRetry}>Retry</button>}</div>;
}
function EmptyPanel({ title, message, icon = 'info' }: { title: string; message: string; icon?: 'info' | 'chart' }) {
  return <div className="fw-empty-panel">{icon === 'chart' ? <BarChart3 size={23}/> : <CircleHelp size={23}/>}<strong>{title}</strong><p>{message}</p></div>;
}
function ForecastFilterBar({ draft, options, onChange, onApply, onReset, loading }: {
  draft: ForecastFilters; options: ForecastFilterOptions | null; onChange: (key: keyof ForecastFilters, value: string | number) => void;
  onApply: () => void; onReset: () => void; loading: boolean;
}) {
  const fields: Array<{ key: keyof ForecastFilters; label: string; options: Array<{ code: string; label: string }> | undefined }> = [
    { key: 'stateCode', label: 'State / UT', options: [{ code: '', label: 'All India' }, ...(options?.states ?? [])] },
    { key: 'sectorCode', label: 'Sector', options: [{ code: '', label: 'All sectors' }, ...(options?.sectors ?? [])] },
    { key: 'occupationCode', label: 'Occupation', options: [{ code: '', label: 'All occupations' }, ...(options?.occupations ?? [])] },
    { key: 'skillCode', label: 'Skill', options: [{ code: '', label: 'All skills' }, ...(options?.skills ?? [])] },
  ];
  return <form className="fw-filter-bar" onSubmit={(event) => { event.preventDefault(); onApply(); }} aria-label="Forecast filters">
    <label className="fw-filter"><span>Forecast horizon</span><select value={draft.horizonYears} onChange={(event) => onChange('horizonYears', Number(event.target.value))}>{(options?.horizons ?? [1, 3, 5]).map((years) => <option key={years} value={years}>{years} {years === 1 ? 'year' : 'years'}</option>)}</select></label>
    {fields.map((field) => <label className="fw-filter" key={field.key}><span>{field.label}</span><select value={String(draft[field.key] ?? '')} onChange={(event) => onChange(field.key, event.target.value)}>{(field.options ?? []).map((option) => <option key={option.code || 'all'} value={option.code}>{option.label}</option>)}</select></label>)}
    <div className="fw-filter-actions"><button className="fw-button fw-button-primary" type="submit" disabled={loading}><SlidersHorizontal size={15}/> Apply filters</button><button className="fw-button" type="button" onClick={onReset} disabled={loading}>Reset</button></div>
  </form>;
}
function Tabs({ active, onChange }: { active: ViewKey; onChange: (view: ViewKey) => void }) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? VIEWS.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : VIEWS.length - 1)) % VIEWS.length;
    onChange(VIEWS[next].key); tabRefs.current[next]?.focus();
  };
  return <div className="fw-tabs" role="tablist" aria-label="Forecast workspace views">{VIEWS.map((item, index) => <button key={item.key} ref={(node) => { tabRefs.current[index] = node; }} id={`forecast-tab-${item.key}`} type="button" role="tab" aria-selected={active === item.key} aria-controls="forecast-view-panel" tabIndex={active === item.key ? 0 : -1} className={active === item.key ? 'is-active' : ''} onClick={() => onChange(item.key)} onKeyDown={(event) => onKeyDown(event, index)}>{item.label}</button>)}</div>;
}
function KpiCards({ kpis, onOpen }: { kpis: MetricValue[]; onOpen: (metric: MetricValue) => void }) {
  const labels: Record<string, string> = { projectedDemand: 'Demand', projectedSupply: 'Supply', projectedGap: 'Gap', highRiskOccupations: 'Risk' };
  return <div className="fw-kpi-grid">{kpis.map((metric, index) => {
    const gap = metric.key === 'projectedGap' && metric.value != null;
    return <button type="button" className={`fw-kpi fw-kpi-${labels[metric.key] ?? 'Other'}`} key={metric.key} onClick={() => onOpen(metric)}>
      <span className="fw-kpi-mark">{index === 0 ? <TrendingUp size={20}/> : index === 1 ? <Users size={20}/> : index === 2 ? <BarChart3 size={20}/> : <Bell size={20}/>}</span>
      <span className="fw-kpi-label">{metric.label}</span><strong>{metric.formattedValue ?? fmt(metric.value)}</strong>
      <span className="fw-kpi-sub">{gap ? metric.value! > 0 ? 'Potential shortage' : metric.value! < 0 ? 'Potential surplus' : 'Approx. balance' : `${metric.unit}${metric.period ? ` · ${metric.period}` : ''}`}</span>
      {metric.notes?.length ? <span className="fw-kpi-meta">{metric.notes[0]}</span> : null}
    </button>;
  })}</div>;
}
function ForecastChart({ series }: { series: ForecastSeriesResponse | null }) {
  if (!series || series.points.length < 2) return <EmptyPanel title="Forecast series unavailable" message="The service has not returned enough compatible history and forecast points to draw a meaningful series." icon="chart"/>;
  const points = series.points;
  const values = points.flatMap((point) => [point.actualDemand, point.actualSupply, point.forecastDemand, point.forecastSupply, point.demandInterval?.upper, point.supplyInterval?.upper].filter((v): v is number => typeof v === 'number' && Number.isFinite(v)));
  if (!values.length) return <EmptyPanel title="No plottable values" message="This response contains no numeric demand or supply values for the selected filters." icon="chart"/>;
  const max = Math.max(1, ...values) * 1.12;
  const min = Math.min(0, ...values);
  const width = 760; const height = 290; const left = 58; const right = 18; const top = 18; const bottom = 42;
  const x = (index: number) => left + index * ((width - left - right) / (points.length - 1));
  const y = (value: number) => top + (height - top - bottom) * (1 - (value - min) / (max - min || 1));
  const ticks = Array.from({ length: 5 }, (_, index) => min + (max - min) * index / 4);
  const historicalDemand = points.map((point, index) => point.actualDemand != null ? `${x(index)},${y(point.actualDemand)}` : null).filter(Boolean).join(' ');
  const historicalSupply = points.map((point, index) => point.actualSupply != null ? `${x(index)},${y(point.actualSupply)}` : null).filter(Boolean).join(' ');
  const forecastStartIndex = Math.max(0, points.findIndex((point) => point.forecastDemand != null || point.forecastSupply != null));
  const forecastSegment = (key: 'forecastDemand' | 'forecastSupply', previousKey: 'actualDemand' | 'actualSupply') => {
    const start = Math.max(0, forecastStartIndex - 1);
    return points.map((point, index) => index < start ? null : (point[key] ?? (index === start ? point[previousKey] : null)) != null ? `${x(index)},${y((point[key] ?? (index === start ? point[previousKey] : null)) as number)}` : null).filter(Boolean).join(' ');
  };
  const drawIntervals = (field: 'demandInterval' | 'supplyInterval') => points.map((point, index) => {
    const interval = point[field]; const level = interval?.level ?? series.intervalLevel;
    if (!interval || level == null || !Number.isFinite(interval.lower) || !Number.isFinite(interval.upper) || interval.lower > interval.upper) return null;
    const barY = y(interval.upper); const h = Math.max(1, y(interval.lower) - barY);
    return <rect key={`${field}-${point.year}`} x={x(index) - 7} y={barY} width="14" height={h} className={field === 'demandInterval' ? 'fw-band-demand' : 'fw-band-supply'}><title>{`${point.year}: ${field === 'demandInterval' ? 'Demand' : 'Supply'} interval ${level}% (${fmt(interval.lower)}–${fmt(interval.upper)} ${series.unit})`}</title></rect>;
  });
  return <div className="fw-chart-wrap"><div className="fw-chart-legend"><span><i className="fw-legend-solid demand"/> Historical demand</span><span><i className="fw-legend-dashed demand"/> Forecast demand</span><span><i className="fw-legend-solid supply"/> Historical supply</span><span><i className="fw-legend-dashed supply"/> Forecast supply</span>{series.intervalLevel != null && <span><i className="fw-legend-band"/> Uncertainty interval ({series.intervalLevel}%)</span>}</div>
    <div className="fw-chart-scroll"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Historical and forecast demand and supply; unit ${series.unit}; history through ${series.historicalThrough ?? 'not supplied'}. Forecast intervals drawn only when bounds and interval level are present.`}>
      {ticks.map((tick) => <g key={tick}><line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} className="fw-chart-grid"/><text x={left - 9} y={y(tick) + 4} className="fw-chart-axis" textAnchor="end">{new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(tick)}</text></g>)}
      {series.historicalThrough != null && points.some((point) => point.year > series.historicalThrough!) && <><line x1={x(Math.max(0, points.findIndex((point) => point.year > series.historicalThrough!) - 1))} x2={x(Math.max(0, points.findIndex((point) => point.year > series.historicalThrough!) - 1))} y1={top} y2={height - bottom} className="fw-chart-divider"/><text x={x(Math.max(0, points.findIndex((point) => point.year > series.historicalThrough!) - 1)) + 6} y={top + 11} className="fw-chart-annotation">Forecast →</text></>}
      {drawIntervals('demandInterval')}{drawIntervals('supplyInterval')}
      {historicalDemand && <polyline points={historicalDemand} className="fw-line-demand"/>}{historicalSupply && <polyline points={historicalSupply} className="fw-line-supply"/>}
      <polyline points={forecastSegment('forecastDemand', 'actualDemand')} className="fw-line-demand fw-forecast-line"/><polyline points={forecastSegment('forecastSupply', 'actualSupply')} className="fw-line-supply fw-forecast-line"/>
      {points.map((point, index) => <g key={point.period}><text x={x(index)} y={height - 18} className="fw-chart-axis" textAnchor="middle">{point.period}</text>{point.actualDemand != null && <circle cx={x(index)} cy={y(point.actualDemand)} r="3.5" className="fw-point-demand"><title>{point.period}: observed demand {fmt(point.actualDemand)} {series.unit}</title></circle>}{point.actualSupply != null && <circle cx={x(index)} cy={y(point.actualSupply)} r="3.5" className="fw-point-supply"><title>{point.period}: observed supply {fmt(point.actualSupply)} {series.unit}</title></circle>}{point.forecastDemand != null && <circle cx={x(index)} cy={y(point.forecastDemand)} r="3.5" className="fw-point-demand"><title>{point.period}: forecast demand {fmt(point.forecastDemand)} {series.unit}</title></circle>}{point.forecastSupply != null && <circle cx={x(index)} cy={y(point.forecastSupply)} r="3.5" className="fw-point-supply"><title>{point.period}: forecast supply {fmt(point.forecastSupply)} {series.unit}</title></circle>}</g>)}
      <text x={left} y={height - 2} className="fw-chart-axis">Unit: {series.unit}</text>
    </svg></div>
    <details className="fw-chart-table"><summary><Table2 size={14}/> View chart data as table</summary><div className="fw-table-scroll"><table><thead><tr><th>Period</th><th>Type</th><th>Demand</th><th>Supply</th><th>Demand interval</th><th>Supply interval</th></tr></thead><tbody>{points.map((point) => <tr key={point.period}><td>{point.period}</td><td>{point.year <= (series.historicalThrough ?? -Infinity) ? 'Observed' : 'Forecast'}</td><td>{fmt(point.actualDemand ?? point.forecastDemand)} {series.unit}</td><td>{fmt(point.actualSupply ?? point.forecastSupply)} {series.unit}</td><td>{point.demandInterval && (point.demandInterval.level ?? series.intervalLevel) != null ? `${fmt(point.demandInterval.lower)}–${fmt(point.demandInterval.upper)} (${point.demandInterval.level ?? series.intervalLevel}%)` : 'Not supplied'}</td><td>{point.supplyInterval && (point.supplyInterval.level ?? series.intervalLevel) != null ? `${fmt(point.supplyInterval.lower)}–${fmt(point.supplyInterval.upper)} (${point.supplyInterval.level ?? series.intervalLevel}%)` : 'Not supplied'}</td></tr>)}</tbody></table></div></details>
  </div>;
}
function SeverityBadge({ value }: { value: string }) { return <span className={`fw-severity fw-severity-${value}`}>{alertSeverityLabel(value)}</span>; }
function StatusBadge({ value }: { value: string }) { return <span className={`fw-status fw-status-${value}`}>{titleCase(value)}</span>; }
function WarningCard({ warning, onClick }: { warning: EarlyWarning; onClick: () => void }) {
  return <button type="button" className="fw-warning-card" onClick={onClick}><span className="fw-warning-accent"/><div className="fw-warning-main"><span className="fw-warning-top"><SeverityBadge value={warning.severity}/><span>{warning.category.replace(/-/g, ' ')}</span></span><strong>{warning.title}</strong><span className="fw-warning-entity">{warning.entityLabel}{warning.regionLabel ? ` · ${warning.regionLabel}` : ''}</span><span className="fw-warning-horizon">Expected horizon {warning.expectedHorizon.startYear}–{warning.expectedHorizon.endYear}</span></div><span className="fw-warning-end"><StatusBadge value={warning.status}/><ChevronRight size={16}/></span></button>;
}
function TopOccupations({ matrix, filters, onSelect }: { matrix: RiskMatrixResponse | null; filters: ForecastFilters; onSelect: (cell: RiskCell) => void }) {
  const regionCode = filters.stateCode || 'IN';
  const ranked = (matrix?.cells ?? []).filter((cell) => cell.entityType === 'occupation' && cell.regionCode === regionCode && cell.gap != null && cell.gap > 0).sort((a, b) => (b.gap ?? -Infinity) - (a.gap ?? -Infinity)).slice(0, 5);
  if (!matrix) return <EmptyPanel title="Occupation ranking unavailable" message="The risk service did not return occupation-level shortage values."/>;
  if (!ranked.length) return <EmptyPanel title="No comparable occupation gaps" message="No occupation shortage values were returned for this geography and filter set."/>;
  return <div className="fw-ranked-list">{ranked.map((cell, index) => { const entity = matrix.entities.find((item) => item.code === cell.entityCode); return <button type="button" className="fw-ranked-row" key={`${cell.regionCode}-${cell.entityCode}`} onClick={() => onSelect(cell)}><span className="fw-rank-index">{String(index + 1).padStart(2, '0')}</span><span className="fw-rank-copy"><strong>{entity?.label ?? cell.entityCode}</strong><small>{cell.regionCode} · horizon {cell.forecastYear} · {cell.unit}</small></span><span className={`fw-gap-value ${cell.gap! > 0 ? 'is-shortage' : cell.gap! < 0 ? 'is-surplus' : ''}`}>{signed(cell.gap, cell.unit)}</span><ChevronRight size={14}/></button>; })}</div>;
}
function ReliabilitySummary({ performance, onViewDetails }: { performance: ModelPerformanceResponse | null; onViewDetails: () => void }) {
  if (!performance) return <EmptyPanel title="Reliability summary unavailable" message="The model-performance service has not supplied evaluation or history-coverage data."/>;
  const coverage = performance.coverage;
  return <div className="fw-reliability"><div className="fw-reliability-top"><span className="fw-history-mark"><BarChart3 size={19}/></span><div><strong>History coverage</strong><small>{coverage.usablePeriods} usable periods{coverage.expectedPeriods != null ? ` / ${coverage.expectedPeriods} expected` : ''}</small></div>{coverage.percent != null ? <b>{Math.round(coverage.percent)}%</b> : <b>—</b>}</div>{coverage.percent != null && <div className="fw-progress"><span style={{ width: `${Math.max(0, Math.min(100, coverage.percent))}%` }}/></div>}<p>Backtest window: {performance.evaluation.startPeriod}–{performance.evaluation.endPeriod} · horizon {performance.evaluation.horizon} period(s).</p>{performance.coverage.gaps.length > 0 && <p className="fw-reliability-warning">Coverage gaps: {performance.coverage.gaps.join(', ')}</p>}<button type="button" className="fw-link-button" onClick={onViewDetails}>View model details <ArrowRight size={14}/></button></div>;
}
function OverviewView({ overview, series, warnings, matrix, performance, filters, onOpenWarning, onViewAllAlerts, onViewPerformance, onSelectCell }: {
  filters: ForecastFilters; overview: { kpis: MetricValue[]; meta: DataMeta } | null; series: ForecastSeriesResponse | null;
  warnings: { items: EarlyWarning[]; counts: Record<string, number>; meta: DataMeta } | null;
  matrix: RiskMatrixResponse | null; performance: ModelPerformanceResponse | null;
  onOpenWarning: (id: string) => void; onViewAllAlerts: () => void; onViewPerformance: () => void; onSelectCell: (cell: RiskCell) => void;
}) {
  return <div className="fw-view-stack">
    {!overview && <EmptyPanel title="Overview KPI response unavailable" message="The service did not return projected demand, supply, gap and high-risk occupation counts."/>}
    {overview && <KpiCards kpis={overview.kpis} onOpen={(metric) => { if (metric.key === 'highRiskOccupations') onViewAllAlerts(); else if (metric.key === 'projectedGap') onSelectCell(matrix?.cells.find((cell) => cell.gap != null && cell.gap > 0) ?? { regionCode: filters.stateCode || 'IN', entityCode: '', entityType: 'occupation', riskClass: 'no-data', demand: null, supply: null, gap: null, unit: overview?.meta.units ?? 'persons', forecastYear: series?.horizon.endYear ?? 0, provenance: 'mock', sourceLabels: [] }); else onViewPerformance(); }}/>} 
    <div className="fw-overview-main-grid"><Panel title="Demand & supply forecast" subtitle={`History and projected values · ${series?.unit ?? overview?.meta.units ?? 'unit not supplied'}`} action={<span className="fw-small-meta">Horizon {series ? `${series.horizon.startYear}–${series.horizon.endYear}` : 'not supplied'}</span>}><ForecastChart series={series}/>{series && <DataFootnote meta={series.meta} compact/>}</Panel>
      <Panel title="Early warning alerts" subtitle={`${warnings?.counts.total ?? warnings?.items.length ?? '—'} alert record(s) returned`} action={<button type="button" className="fw-link-button" onClick={onViewAllAlerts}>View all <ArrowRight size={14}/></button>} className="fw-warning-rail">{warnings?.items.length ? <div className="fw-warning-list">{warnings.items.slice(0, 5).map((warning) => <WarningCard key={warning.id} warning={warning} onClick={() => onOpenWarning(warning.id)}/>)}</div> : <EmptyPanel title="No alerts returned" message="No warning records match these filters, or the service response is empty."/>}{warnings && <DataFootnote meta={warnings.meta} compact/>}</Panel></div>
    <div className="fw-overview-lower-grid"><Panel title="Top occupations by projected shortage" subtitle="Signed gap only where returned demand and supply are comparable"><TopOccupations matrix={matrix} filters={filters} onSelect={onSelectCell}/>{matrix && <DataFootnote meta={matrix.meta} compact/>}</Panel><Panel title="Forecast reliability summary" subtitle="History coverage and model evaluation evidence" action={<button type="button" className="fw-link-button" onClick={onViewPerformance}>View details <ArrowRight size={14}/></button>}><ReliabilitySummary performance={performance} onViewDetails={onViewPerformance}/>{performance && <DataFootnote meta={performance.meta} compact/>}</Panel></div>
  </div>;
}
function RiskMatrixTable({ matrix, selected, onSelect }: { matrix: RiskMatrixResponse | null; selected: RiskCell | null; onSelect: (cell: RiskCell) => void }) {
  if (!matrix) return <EmptyPanel title="Risk matrix unavailable" message="No matrix cells were returned for this filter selection."/>;
  if (!matrix.cells.length || !matrix.entities.length || !matrix.regions.length) return <EmptyPanel title="No risk cells" message="No comparable risk values were returned. No-data cells are distinct from low risk."/>;
  return <div className="fw-table-scroll fw-matrix-scroll"><table className="fw-matrix-table"><thead><tr><th scope="col">Region</th>{matrix.entities.map((entity) => <th scope="col" key={entity.code}>{entity.label}</th>)}</tr></thead><tbody>{matrix.regions.map((region) => <tr key={region.code}><th scope="row">{region.label}<small>{region.code}</small></th>{matrix.entities.map((entity) => {
    const cell = matrix.cells.find((item) => item.regionCode === region.code && item.entityCode === entity.code);
    if (!cell) return <td key={entity.code}><span className="fw-matrix-missing">No record</span></td>;
    const isSelected = selected?.regionCode === cell.regionCode && selected.entityCode === cell.entityCode;
    return <td key={entity.code}><button type="button" className={`fw-matrix-cell risk-${cell.riskClass} ${isSelected ? 'is-selected' : ''}`} onClick={() => onSelect(cell)} aria-label={`${region.label}, ${entity.label}: ${cell.gap == null ? 'gap unavailable' : `gap ${signed(cell.gap, cell.unit)}`}, ${riskClassLabel[cell.riskClass]}`}><strong>{cell.gap == null ? '—' : signed(cell.gap)}</strong><small>{riskClassLabel[cell.riskClass]}</small></button></td>;
  })}</tr>)}</tbody></table></div>;
}
function GeoJSONRiskMap({ mapData, selectedRegion, onSelectRegion }: { mapData: StateRiskMapResponse | null; selectedRegion: string; onSelectRegion: (regionCode: string) => void }) {
  const features = mapData?.geometry?.features ?? [];
  const codeKey = mapData?.canonicalCodeProperty;
  const verified = Boolean(features.length && mapData?.geometryVersion && mapData?.sourceLicense && codeKey);
  if (!mapData || !verified) return <div className="fw-map-unavailable"><div className="fw-map-icon"><MapPin size={23}/></div><strong>Regional map unavailable</strong><p>{mapData?.geometryUnavailableReason ?? 'The service has not supplied verified, versioned and licensed state/UT GeoJSON joined by canonical region codes.'}</p><span>Showing the regional risk matrix and ranked values instead. Decorative image assets are not used as data layers.</span></div>;
  const coords: number[][] = [];
  const featureRings = (feature: typeof features[number]): number[][][] => {
    if (!feature.geometry) return [];
    if (feature.geometry.type === 'Polygon') return feature.geometry.coordinates as number[][][];
    return (feature.geometry.coordinates as number[][][][]).flatMap((polygon) => polygon);
  };
  features.forEach((feature) => featureRings(feature).forEach((ring) => ring.forEach((point) => { if (point.length >= 2) coords.push(point); })));
  if (!coords.length) return <div className="fw-map-unavailable"><strong>Geometry could not be projected</strong><p>GeoJSON was supplied but no valid coordinate ring was found. Use the accessible regional table.</p></div>;
  const xs = coords.map((point) => point[0]); const ys = coords.map((point) => point[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const width = 380, height = 440, pad = 8;
  const project = (point: number[]) => `${pad + ((point[0] - minX) / Math.max(1e-9, maxX - minX)) * (width - pad * 2)},${height - pad - ((point[1] - minY) / Math.max(1e-9, maxY - minY)) * (height - pad * 2)}`;
  const shapeFor = (feature: typeof features[number]) => featureRings(feature).map((ring) => ring.map(project).join(' ')).join(' ');
  const getCode = (feature: typeof features[number]) => String(feature.properties?.[codeKey!] ?? feature.id ?? '');
  return <div className="fw-map-real-wrap"><svg viewBox={`0 0 ${width} ${height}`} className="fw-map-real" role="img" aria-label={`Forecast risk map generated from GeoJSON version ${mapData.geometryVersion}; join property ${codeKey}; licensed under ${mapData.sourceLicense}. Select a region to inspect.`}><defs><pattern id="fw-map-no-data" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 6L6 0" stroke="#B9B6AA" strokeWidth="1"/></pattern></defs>{features.map((feature, index) => {
    const code = getCode(feature); const risk = mapData.valuesByStateCode[code]; const label = String(feature.properties?.name ?? feature.properties?.NAME_1 ?? code);
    return <path key={`${code}-${index}`} d={shapeFor(feature)} className={`fw-map-feature ${risk ? `risk-${risk.riskClass}` : 'risk-no-data'} ${selectedRegion === code ? 'is-selected' : ''}`} fill={risk ? undefined : 'url(#fw-map-no-data)'} role="button" tabIndex={0} aria-label={`${label}: ${risk ? `${riskClassLabel[risk.riskClass]}, ${fmt(risk.value)} ${mapData.unit}` : 'no joined risk data'}`} onClick={() => onSelectRegion(code)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelectRegion(code); } }}><title>{`${label} (${code}) · ${risk ? `${riskClassLabel[risk.riskClass]} · ${fmt(risk.value)} ${mapData.unit}` : 'No data'}`}</title></path>;
  })}</svg><p className="fw-map-attribution">Geometry {mapData.geometryVersion} · {mapData.sourceLicense} · keyed by {codeKey}</p></div>;
}
function RiskView({ matrix, mapData, grouping, onGroupingChange, selectedCell, onSelectCell, onSelectRegion, riskDetail, detailLoading }: {
  matrix: RiskMatrixResponse | null; mapData: StateRiskMapResponse | null; grouping: EntityType; onGroupingChange: (value: EntityType) => void;
  selectedCell: RiskCell | null; onSelectCell: (cell: RiskCell) => void; onSelectRegion: (regionCode: string) => void;
  riskDetail: RiskDetailsResponse | null; detailLoading: boolean;
}) {
  const selectedEntity = matrix?.entities.find((item) => item.code === selectedCell?.entityCode);
  return <div className="fw-view-stack"><div className="fw-view-title-row"><div><p className="fw-eyebrow">Detect · Prioritise</p><h2>Risk Radar</h2><p>Inspect forecast risk clusters by geography and the entity grouping returned by the service.</p></div><label className="fw-inline-filter"><span>Group matrix by</span><select value={grouping} onChange={(event) => onGroupingChange(event.target.value as EntityType)}><option value="occupation">Occupation</option><option value="sector">Sector</option><option value="skill">Skill</option></select></label></div>
    <div className="fw-risk-layout"><Panel title="Regional risk matrix" subtitle="Keyboard-accessible data table · select a cell to inspect its evidence"><RiskMatrixTable matrix={matrix} selected={selectedCell} onSelect={onSelectCell}/><div className="fw-risk-legend">{(matrix?.legend ?? []).map((item) => <span key={item.riskClass}><i className={`risk-swatch risk-${item.riskClass}`}/>{item.label}{item.min != null || item.max != null ? <small>{item.min != null ? `≥ ${item.min}` : ''}{item.min != null && item.max != null ? ' · ' : ''}{item.max != null ? `≤ ${item.max}` : ''}</small> : null}</span>)}</div><DataFootnote meta={matrix?.meta} compact/></Panel>
      <div className="fw-risk-side"><Panel title="State / UT map" subtitle="Only verified, versioned geometry can be shaded"><GeoJSONRiskMap mapData={mapData} selectedRegion={selectedCell?.regionCode ?? ''} onSelectRegion={onSelectRegion}/></Panel><Panel title="Selected risk detail" subtitle={selectedCell ? `${selectedCell.regionCode} · ${selectedEntity?.label ?? selectedCell.entityCode}` : 'Select a matrix cell'}>{detailLoading && <div className="fw-inline-state"><RefreshCw size={15} className="fw-spin"/> Loading detail evidence…</div>}{!detailLoading && !riskDetail && <EmptyPanel title="No cell selected" message="Choose a matrix cell to request details, evidence, assumptions and source coverage."/>}{riskDetail && <><div className="fw-detail-stat-grid"><div><small>Demand</small><strong>{fmt(riskDetail.cell.demand)} {riskDetail.cell.unit}</strong></div><div><small>Supply</small><strong>{fmt(riskDetail.cell.supply)} {riskDetail.cell.unit}</strong></div><div><small>Signed gap</small><strong>{signed(riskDetail.cell.gap, riskDetail.cell.unit)}</strong></div><div><small>Forecast year</small><strong>{riskDetail.cell.forecastYear}</strong></div></div><p className="fw-detail-classification"><span className={`risk-swatch risk-${riskDetail.cell.riskClass}`}/>{riskClassLabel[riskDetail.cell.riskClass]} · {riskDetail.cell.ruleLabel ?? riskDetail.cell.ruleId ?? 'Rule not supplied'}</p><h3>Evidence</h3><ul className="fw-bullet-list">{riskDetail.evidence.map((item) => <li key={item}>{item}</li>)}</ul><h3>Assumptions & limitations</h3><ul className="fw-bullet-list">{riskDetail.assumptions.map((item) => <li key={item}>{item}</li>)}</ul><p className="fw-small-meta">{metaSource(riskDetail.meta)} · {riskDetail.cell.sourceLabels.join(', ') || 'Source labels not supplied'}</p></>}</Panel></div></div>
    <Panel title="Regional ranking fallback" subtitle="Use this list when licensed geometry is unavailable"><div className="fw-regional-ranking">{(matrix?.regions ?? []).map((region) => { const cell = matrix?.cells.find((item) => item.regionCode === region.code && item.entityCode === selectedCell?.entityCode) ?? matrix?.cells.find((item) => item.regionCode === region.code); return <button key={region.code} type="button" onClick={() => cell && onSelectCell(cell)} className={selectedCell?.regionCode === region.code ? 'is-selected' : ''}><span>{region.label}<small>{region.code}</small></span><strong>{cell ? signed(cell.gap, cell.unit) : 'No record'}</strong><span className={`fw-status risk-label-${cell?.riskClass ?? 'no-data'}`}>{cell ? riskClassLabel[cell.riskClass] : 'No data'}</span></button>; })}</div></Panel>
  </div>;
}
function ScenarioView({ options, comparison, comparing, error, selectedScenarios, onToggleScenario, assumptionValues, onAssumptionChange, onCompare, onReset }: {
  options: ScenarioOptionsResponse | null; comparison: ScenarioComparisonResponse | null; comparing: boolean; error: string;
  selectedScenarios: string[]; onToggleScenario: (id: string) => void; assumptionValues: Record<string, number>; onAssumptionChange: (key: string, value: number) => void; onCompare: () => void; onReset: () => void;
}) {
  const chartWidth = 720, chartHeight = 285, pad = { left: 54, right: 20, top: 20, bottom: 40 };
  const values = (comparison?.scenarios ?? []).flatMap((scenario) => scenario.points.map((point) => point.forecastDemand != null && point.forecastSupply != null ? point.forecastDemand - point.forecastSupply : null).filter((value): value is number => value != null && Number.isFinite(value)));
  const min = Math.min(0, ...values), max = Math.max(1, ...values);
  const allPoints = comparison?.scenarios.flatMap((scenario) => scenario.points) ?? [];
  const years = [...new Set(allPoints.map((point) => point.year))].sort((a, b) => a - b);
  const x = (year: number) => pad.left + years.indexOf(year) * ((chartWidth - pad.left - pad.right) / Math.max(1, years.length - 1));
  const y = (value: number) => pad.top + (chartHeight - pad.top - pad.bottom) * (1 - (value - min) / (max - min || 1));
  const colors: Record<string, string> = { baseline: 'var(--navy)', 'higher-growth': 'var(--orange)', 'lower-growth': 'var(--teal)' };
  return <div className="fw-view-stack"><div className="fw-view-title-row"><div><p className="fw-eyebrow">Compare · Investigate</p><h2>Scenario Analysis</h2><p>Compare service-defined assumptions. Conditional scenarios are not guaranteed predictions.</p></div><div className="fw-scenario-actions"><button className="fw-button" type="button" onClick={onReset} disabled={comparing}><RefreshCw size={14}/> Reset to baseline</button><button className="fw-button fw-button-primary" type="button" onClick={onCompare} disabled={comparing || selectedScenarios.length === 0}>{comparing ? <RefreshCw size={14} className="fw-spin"/> : <BarChart3 size={14}/>} Compare scenarios</button></div></div>
    {error && <ErrorPanel message={error}/>}<Panel title="Scenario selector" subtitle="Choose one or more scenarios supplied by the configured service"><div className="fw-scenario-choice-list">{(options?.scenarios ?? []).map((scenario) => <label className={`fw-scenario-choice ${selectedScenarios.includes(scenario.id) ? 'is-selected' : ''}`} key={scenario.id}><input type="checkbox" checked={selectedScenarios.includes(scenario.id)} onChange={() => onToggleScenario(scenario.id)}/><span><strong>{scenario.label}</strong><small>{scenario.description ?? 'Service-defined conditional path.'}</small></span>{scenario.isDefault && <em>Default</em>}</label>)}{!options?.scenarios.length && <EmptyPanel title="Scenario options unavailable" message="The service did not return any supported scenario definitions."/>}</div></Panel>
    <Panel title="Projected gap by scenario" subtitle="Gap = projected demand − projected supply, only when both returned values share compatible scope and units">{comparing && <div className="fw-inline-state"><RefreshCw size={15} className="fw-spin"/> Calculating scenario comparison…</div>}{!comparison && !comparing && <EmptyPanel title="Run a comparison" message="Select the scenario paths above and choose Compare. No scenario curve is generated in the UI before the adapter returns results." icon="chart"/>}{comparison && values.length > 0 && <div className="fw-chart-scroll"><svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Conditional scenario comparison of projected demand minus supply by year. Values are from the selected adapter.">{Array.from({ length: 5 }, (_, index) => min + (max - min) * index / 4).map((value) => <g key={value}><line x1={pad.left} x2={chartWidth - pad.right} y1={y(value)} y2={y(value)} className="fw-chart-grid"/><text x={pad.left - 8} y={y(value) + 4} className="fw-chart-axis" textAnchor="end">{new Intl.NumberFormat('en-IN', { notation: 'compact' }).format(value)}</text></g>)}{years.map((year) => <text key={year} x={x(year)} y={chartHeight - 15} className="fw-chart-axis" textAnchor="middle">{year}</text>)}{comparison.scenarios.map((scenario) => { const points = scenario.points.filter((point) => point.forecastDemand != null && point.forecastSupply != null).map((point) => `${x(point.year)},${y(point.forecastDemand! - point.forecastSupply!)}`).join(' '); if (!points) return null; return <polyline key={scenario.id} points={points} fill="none" stroke={colors[scenario.id] ?? 'var(--navy)'} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"><title>{scenario.label}: conditional projected gap</title></polyline>; })}</svg></div>}{comparison && values.length === 0 && <EmptyPanel title="Comparable scenario gaps unavailable" message="Scenario results did not contain compatible demand and supply values for the selected year points." icon="chart"/>}{comparison && <div className="fw-scenario-legend">{comparison.scenarios.map((scenario) => <span key={scenario.id}><i style={{ background: colors[scenario.id] ?? 'var(--navy)' }}/>{scenario.label}</span>)}</div>}{comparison && <div className="fw-table-scroll"><table><thead><tr><th>Scenario</th><th>Year</th><th>Projected demand</th><th>Projected supply</th><th>Conditional gap</th></tr></thead><tbody>{comparison.scenarios.flatMap((scenario) => scenario.points.map((point) => <tr key={`${scenario.id}-${point.year}`}><td>{scenario.label}</td><td>{point.year}</td><td>{fmt(point.forecastDemand)}</td><td>{fmt(point.forecastSupply)}</td><td>{point.forecastDemand != null && point.forecastSupply != null ? signed(point.forecastDemand - point.forecastSupply, comparison.meta.units ?? 'persons') : 'Not comparable'}</td></tr>))}</tbody></table></div>}</Panel>
    <Panel title="Returned assumptions" subtitle="Only assumptions explicitly returned by the service are shown"><div className="fw-assumptions-table"><table><thead><tr><th>Parameter</th><th>Value</th><th>Unit</th><th>Source / owner</th></tr></thead><tbody>{(comparison?.assumptions ?? options?.assumptions ?? []).map((assumption) => <tr key={assumption.key}><td>{assumption.label}</td><td>{assumption.editable && typeof assumption.value === 'number' ? <input className="fw-assumption-input" type="number" aria-label={assumption.label} value={assumptionValues[assumption.key] ?? assumption.value} min={assumption.min} max={assumption.max} step={assumption.step ?? 'any'} onChange={(event) => { const next = event.currentTarget.valueAsNumber; if (Number.isFinite(next)) onAssumptionChange(assumption.key, next); }} /> : String(assumption.value)}</td><td>{assumption.unit}</td><td>{assumption.source ?? 'Not supplied'}{assumption.owner ? ` · ${assumption.owner}` : ''}{assumption.editable && <small>Editable according to service metadata. Bounds are enforced before comparison.</small>}</td></tr>)}</tbody></table></div><DataFootnote meta={comparison?.meta ?? options?.meta} compact/></Panel>
  </div>;
}
function PerformanceChart({ performance }: { performance: ModelPerformanceResponse }) {
  const points = performance.series; if (!points.length) return <EmptyPanel title="Backtest series unavailable" message="No actual-versus-predicted points were returned by the evaluation service." icon="chart"/>;
  const values = points.flatMap((point) => [point.actual, point.predicted, point.lower, point.upper].filter((v): v is number => typeof v === 'number' && Number.isFinite(v)));
  const min = Math.min(...values) * 0.96, max = Math.max(...values) * 1.04;
  const w = 640, h = 250, l = 58, r = 18, t = 16, b = 38;
  const x = (index: number) => l + index * ((w - l - r) / Math.max(1, points.length - 1));
  const y = (value: number) => t + (h - t - b) * (1 - (value - min) / (max - min || 1));
  const line = (key: 'actual' | 'predicted') => points.map((point, index) => `${x(index)},${y(point[key])}`).join(' ');
  return <div className="fw-chart-scroll"><svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Backtest actual and predicted values from ${performance.evaluation.startPeriod} through ${performance.evaluation.endPeriod}; horizon ${performance.evaluation.horizon}.`}>
    {Array.from({ length: 5 }, (_, index) => min + (max - min) * index / 4).map((value) => <g key={value}><line x1={l} x2={w-r} y1={y(value)} y2={y(value)} className="fw-chart-grid"/><text x={l-8} y={y(value)+4} className="fw-chart-axis" textAnchor="end">{new Intl.NumberFormat('en-IN',{notation:'compact'}).format(value)}</text></g>)}
    {points.some((p) => p.lower != null && p.upper != null) && points.map((point,index) => point.lower != null && point.upper != null ? <rect key={`i-${point.period}`} className="fw-band-demand" x={x(index)-9} y={y(point.upper)} width="18" height={Math.max(1,y(point.lower)-y(point.upper))}><title>{point.period} interval {fmt(point.lower)}–{fmt(point.upper)}</title></rect> : null)}
    <polyline points={line('actual')} className="fw-line-demand"/><polyline points={line('predicted')} className="fw-line-supply"/>{points.map((point,index)=><g key={point.period}><circle cx={x(index)} cy={y(point.actual)} r="4" className="fw-point-demand"><title>{point.period}: actual {fmt(point.actual)}</title></circle><circle cx={x(index)} cy={y(point.predicted)} r="4" className="fw-point-supply"><title>{point.period}: predicted {fmt(point.predicted)}</title></circle><text x={x(index)} y={h-14} className="fw-chart-axis" textAnchor="middle">{point.period}</text></g>)}
  </svg></div>;
}
function PerformanceView({ performance }: { performance: ModelPerformanceResponse | null }) {
  if (!performance) return <EmptyPanel title="Model evaluation unavailable" message="The model-performance service has not returned backtest metrics and history coverage."/>;
  return <div className="fw-view-stack"><div className="fw-view-title-row"><div><p className="fw-eyebrow">Verify · Calibrate</p><h2>Model Performance</h2><p>Historical evaluation evidence, data coverage and known limitations.</p></div><span className="fw-small-meta">Evaluated through {performance.evaluation.evaluatedThrough ?? performance.evaluation.endPeriod ?? 'not supplied'}</span></div>
    {performance.forecastUnavailableReason && <div className="fw-info-callout"><Info size={17}/><div><strong>Eligibility note</strong><p>{performance.forecastUnavailableReason}</p></div></div>}
    <div className="fw-performance-grid"><Panel title="Actual vs predicted" subtitle={`${performance.evaluation.startPeriod}–${performance.evaluation.endPeriod} · horizon ${performance.evaluation.horizon}`}>{performance.series.length ? <PerformanceChart performance={performance}/> : <EmptyPanel title="Backtest not available" message="No evaluation points were returned." icon="chart"/>}<div className="fw-chart-legend"><span><i className="fw-legend-solid demand"/> Actual</span><span><i className="fw-legend-solid supply"/> Predicted</span></div></Panel><Panel title="Evaluation coverage" subtitle="History counts returned by the evaluation service"><div className="fw-coverage-display"><strong>{performance.coverage.usablePeriods}</strong><span>usable periods</span><div className="fw-progress"><span style={{ width: `${Math.max(0, Math.min(100, performance.coverage.percent ?? 0))}%` }}/></div><p>{performance.coverage.expectedPeriods != null ? `${performance.coverage.usablePeriods} of ${performance.coverage.expectedPeriods} expected periods` : 'Expected period count not supplied'}{performance.coverage.percent != null ? ` · ${Math.round(performance.coverage.percent)}%` : ''}</p></div>{performance.coverage.gaps.length > 0 && <div className="fw-gap-periods"><strong>Missing periods</strong><span>{performance.coverage.gaps.join(', ')}</span></div>}<dl className="fw-model-meta"><dt>Model / version</dt><dd>{performance.evaluation.modelVersion ?? 'Not supplied'}</dd><dt>Baseline</dt><dd>{performance.evaluation.baseline ?? 'Not supplied'}</dd><dt>Evaluation scope</dt><dd>{performance.evaluation.scope ?? 'Not supplied'}</dd><dt>Evaluated through</dt><dd>{performance.evaluation.evaluatedThrough ?? performance.evaluation.endPeriod}</dd></dl></Panel></div>
    <Panel title="Returned model metrics" subtitle="Only metrics supplied by the service are displayed; no confidence score is inferred"><div className="fw-metric-grid">{performance.metrics.map((metric) => <article className="fw-metric-card" key={metric.key}><span>{metric.label}</span><strong>{metric.value == null ? 'Not available' : `${fmt(metric.value)} ${metric.unit}`}</strong><p>{metric.definition}</p>{metric.suitabilityNote && <small>{metric.suitabilityNote}</small>}</article>)}{!performance.metrics.length && <EmptyPanel title="No eligible metrics" message="The service returned no model metrics for this series or the history eligibility rule was not met."/>}</div></Panel>
    <Panel title="Methodology and limitations" subtitle="Backtest scores describe historical error; they do not guarantee future accuracy"><ul className="fw-bullet-list">{performance.limitations.map((item) => <li key={item}>{item}</li>)}</ul>{performance.meta.coverage?.notes?.length ? <ul className="fw-bullet-list">{performance.meta.coverage.notes.map((item) => <li key={item}>{item}</li>)}</ul> : null}<DataFootnote meta={performance.meta}/></Panel>
  </div>;
}
function AlertManagementView({ response, queryDraft, onQueryDraftChange, onSearch, status, onStatusChange, severity, onSeverityChange, page, pageSize, onPage, onOpenAlert, onRetry, loading, error }: {
  response: AlertListResponse | null; queryDraft: string; onQueryDraftChange: (value: string) => void; onSearch: (event: FormEvent) => void;
  status: string; onStatusChange: (value: string) => void; severity: string; onSeverityChange: (value: string) => void;
  page: number; pageSize: number; onPage: (page: number) => void; onOpenAlert: (id: string) => void; onRetry: () => void; loading: boolean; error: string;
}) {
  const pages = Math.max(1, Math.ceil((response?.total ?? 0) / pageSize));
  return <div className="fw-view-stack"><div className="fw-view-title-row"><div><p className="fw-eyebrow">Act · Track</p><h2>Alert Management</h2><p>Search warning records, inspect the evidence, and update workflow state when the service permits it.</p></div><div className="fw-alert-total"><strong>{response?.total ?? '—'}</strong><span>matching alerts</span></div></div>
    <div className="fw-alert-count-grid">{[{ key: 'critical', label: 'Critical' }, { key: 'high', label: 'High' }, { key: 'new', label: 'New' }, { key: 'under-review', label: 'Under review' }, { key: 'acknowledged', label: 'Acknowledged' }, { key: 'resolved', label: 'Resolved' }].map((item) => <div className="fw-alert-count" key={item.key}><span>{item.label}</span><strong>{response?.counts[item.key] ?? '—'}</strong></div>)}</div>
    <Panel title="Warning register" subtitle="Expected risk horizon and workflow status are separate fields"><form className="fw-alert-filters" onSubmit={onSearch}><label className="fw-search-field"><Search size={16}/><input value={queryDraft} onChange={(event) => onQueryDraftChange(event.target.value)} placeholder="Search ID, occupation, region or summary" aria-label="Search alerts"/></label><label><span>Status</span><select value={status} onChange={(event) => onStatusChange(event.target.value)}><option value="all">All statuses</option><option value="new">New</option><option value="under-review">Under review</option><option value="acknowledged">Acknowledged</option><option value="resolved">Resolved</option></select></label><label><span>Severity</span><select value={severity} onChange={(event) => onSeverityChange(event.target.value)}><option value="all">All severities</option><option value="critical">Critical</option><option value="high">High</option><option value="moderate">Moderate</option><option value="low">Low</option><option value="information">Information</option></select></label><button className="fw-button fw-button-primary" type="submit"><Search size={14}/> Search</button></form>
      {error && <ErrorPanel message={error} onRetry={onRetry}/>}<div className="fw-table-scroll"><table className="fw-alert-table"><thead><tr><th scope="col">Alert / entity</th><th scope="col">Severity</th><th scope="col">Region</th><th scope="col">Expected horizon</th><th scope="col">Rule / trigger</th><th scope="col">Status</th><th scope="col">Owner</th><th scope="col">Updated</th><th scope="col">Action</th></tr></thead><tbody>{response?.items.map((alert) => <tr key={alert.id}><td><strong>{alert.title}</strong><small>{alert.id} · {alert.entityLabel}</small></td><td><SeverityBadge value={alert.severity}/></td><td>{alert.regionLabel ?? alert.regionCode ?? 'Not supplied'}</td><td>{alert.expectedHorizon.startYear}–{alert.expectedHorizon.endYear}</td><td><strong>{alert.rule.label}</strong><small>{alert.rule.thresholdDescription}</small></td><td><StatusBadge value={alert.status}/></td><td>{alert.assigneeId ?? 'Unassigned'}</td><td>{niceDate(alert.updatedAt)}</td><td><button className="fw-button fw-button-small" type="button" onClick={() => onOpenAlert(alert.id)}>Review <ChevronRight size={13}/></button></td></tr>)}</tbody></table></div>
      {loading && <div className="fw-inline-state"><RefreshCw size={15} className="fw-spin"/> Loading alert register…</div>}{!loading && !response?.items.length && <EmptyPanel title="No alerts match this view" message="No matching warnings were returned. Clear the search or broaden the filters; this is not the same as a failed service request."/>}
      <div className="fw-pagination"><span>{response?.total ? `Showing ${page * pageSize + 1}–${Math.min(page * pageSize + pageSize, response.total)} of ${response.total}` : 'No rows to show'} · Page {Math.min(page + 1, pages)} of {pages}</span><div><button className="fw-button" type="button" disabled={page <= 0 || loading} onClick={() => onPage(page - 1)}><ChevronLeft size={14}/> Previous</button><button className="fw-button" type="button" disabled={page >= pages - 1 || loading} onClick={() => onPage(page + 1)}>Next <ChevronRight size={14}/></button></div></div>
      {response && <DataFootnote meta={response.meta} compact/>}
    </Panel>
  </div>;
}
function AlertDrawer({ response, loading, error, busyAction, actionError, note, onNoteChange, assignee, onAssigneeChange, onClose, onAcknowledge, onStatusChange, onAssign, onAddNote }: {
  response: AlertDetailResponse | null; loading: boolean; error: string; busyAction: string; actionError: string;
  note: string; onNoteChange: (value: string) => void; assignee: string; onAssigneeChange: (value: string) => void;
  onClose: () => void; onAcknowledge: () => void; onStatusChange: (status: AlertStatus) => void; onAssign: () => void; onAddNote: () => void;
}) {
  if (!response && !loading && !error) return null;
  const warning = response?.alert;
  return <div className="fw-drawer-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><aside className="fw-drawer" role="dialog" aria-modal="true" aria-labelledby="fw-drawer-title"><div className="fw-drawer-heading"><div><span className="fw-eyebrow">Warning detail</span><h2 id="fw-drawer-title">{warning?.title ?? 'Warning details'}</h2>{warning && <small>{warning.id} · {warning.entityLabel}</small>}</div><button type="button" className="fw-icon-button" onClick={onClose} aria-label="Close warning detail"><X size={18}/></button></div>
    {loading && <div className="fw-inline-state"><RefreshCw size={16} className="fw-spin"/> Loading warning evidence…</div>}{error && <ErrorPanel message={error} />}{actionError && <div className="fw-error-panel" role="alert"><AlertCircle size={17}/><p>{actionError}</p></div>}
    {response && warning && <><div className="fw-drawer-badges"><SeverityBadge value={warning.severity}/><StatusBadge value={warning.status}/><ProvenanceBadge meta={response.meta}/></div><p className="fw-alert-summary">{warning.summary}</p><dl className="fw-alert-facts"><dt>Entity</dt><dd>{warning.entityLabel} ({warning.entityCode})</dd><dt>Region</dt><dd>{warning.regionLabel ?? warning.regionCode ?? 'Not supplied'}</dd><dt>Expected risk horizon</dt><dd>{warning.expectedHorizon.startYear}–{warning.expectedHorizon.endYear}</dd><dt>Rule</dt><dd>{warning.rule.id} · {warning.rule.label}<small>{warning.rule.thresholdDescription}</small></dd><dt>Created</dt><dd>{niceDate(warning.createdAt)}</dd><dt>Workflow updated</dt><dd>{niceDate(warning.updatedAt)}</dd><dt>Sources</dt><dd>{warning.sourceLabels.join(', ') || 'Not supplied'}</dd></dl>
      <section className="fw-drawer-section"><h3>Key factors</h3>{response.factors.length ? <ul className="fw-bullet-list">{response.factors.map((item) => <li key={item.label}><strong>{item.label}:</strong> {item.explanation}{item.value != null ? ` (${fmt(item.value)} ${item.unit ?? ''})` : ''}</li>)}</ul> : <p>No factors were supplied.</p>}</section>
      <section className="fw-drawer-section"><h3>Data evidence</h3><ul className="fw-bullet-list">{response.evidence.map((item) => <li key={item}>{item}</li>)}</ul></section>
      <section className="fw-drawer-section"><h3>Assumptions & limits</h3><ul className="fw-bullet-list">{response.assumptions.map((item) => <li key={item}>{item}</li>)}</ul></section>
      <section className="fw-drawer-section"><h3>Timeline</h3><div className="fw-timeline">{response.timeline.map((item, index) => <div key={`${item.at}-${index}`} className={`fw-timeline-item timeline-${item.kind ?? 'workflow'}`}><span className="fw-timeline-dot"/><div><strong>{item.event}</strong><small>{niceDate(item.at)}{item.actor ? ` · ${item.actor}` : ''}</small></div></div>)}</div><p className="fw-small-meta">The expected risk horizon above is the forecast's time horizon. This timeline records workflow/review events separately.</p></section>
      <section className="fw-drawer-section"><h3>Recommended review actions</h3><ul className="fw-bullet-list">{(response.recommendations ?? []).map((item) => <li key={item}>{item}</li>)}</ul></section>
      <section className="fw-drawer-actions"><h3>Workflow actions</h3><p>Actions are applied only after the configured adapter confirms a response. A live service may enforce role permissions.</p><button className="fw-button fw-button-primary" type="button" disabled={Boolean(busyAction) || warning.status === 'acknowledged' || warning.status === 'resolved'} onClick={onAcknowledge}>{busyAction === 'acknowledge' ? <RefreshCw size={14} className="fw-spin"/> : <Check size={14}/>} Acknowledge warning</button><label><span>Assign owner</span><div className="fw-inline-action"><input value={assignee} onChange={(event) => onAssigneeChange(event.target.value)} placeholder="Owner ID / team"/><button className="fw-button" type="button" disabled={Boolean(busyAction)} onClick={onAssign}>{busyAction === 'assign' ? 'Saving…' : 'Assign'}</button></div></label><label><span>Update workflow status</span><div className="fw-inline-action"><select defaultValue={warning.status} key={warning.status} id="fw-status-select"><option value="new">New</option><option value="under-review">Under review</option><option value="acknowledged">Acknowledged</option><option value="resolved">Resolved</option></select><button className="fw-button" type="button" disabled={Boolean(busyAction)} onClick={() => { const select = document.getElementById('fw-status-select') as HTMLSelectElement | null; if (select) onStatusChange(select.value as AlertStatus); }}>{busyAction === 'status' ? 'Saving…' : 'Save status'}</button></div></label><label><span>Add note to workflow timeline</span><textarea value={note} onChange={(event) => onNoteChange(event.target.value)} rows={3} placeholder="Record the review decision or follow-up needed…"/><button type="button" className="fw-button fw-button-primary" disabled={Boolean(busyAction) || note.trim().length < 3} onClick={onAddNote}>{busyAction === 'note' ? 'Adding…' : 'Add note'}</button></label></section><DataFootnote meta={response.meta}/></>}
  </aside></div>;
}

export default function ForecastsEarlyWarningsPage({ globalRegionCode = 'IN', onGlobalRegionChange }: { globalRegionCode?: string; onGlobalRegionChange?: (code: string) => void }) {
  const [adapter] = useState(() => createForecastsDataAdapter());
  const [activeView, setActiveView] = useState<ViewKey>(defaultView);
  const [filterOptions, setFilterOptions] = useState<ForecastFilterOptions | null>(null);
  const [optionsError, setOptionsError] = useState('');
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [draftFilters, setDraftFilters] = useState<ForecastFilters>({ ...defaultFilters, ...(globalRegionCode && globalRegionCode !== 'IN' ? { stateCode: globalRegionCode } : {}) });
  const [filters, setFilters] = useState<ForecastFilters>({ ...defaultFilters, ...(globalRegionCode && globalRegionCode !== 'IN' ? { stateCode: globalRegionCode } : {}) });
  const [resourceState, setResourceState] = useState({ loading: false, errors: [] as string[] });
  const [overview, setOverview] = useState<{ kpis: MetricValue[]; meta: DataMeta } | null>(null);
  const [series, setSeries] = useState<ForecastSeriesResponse | null>(null);
  const [warnings, setWarnings] = useState<{ items: EarlyWarning[]; counts: Record<string, number>; meta: DataMeta } | null>(null);
  const [overviewMatrix, setOverviewMatrix] = useState<RiskMatrixResponse | null>(null);
  const [performance, setPerformance] = useState<ModelPerformanceResponse | null>(null);
  const [riskGrouping, setRiskGrouping] = useState<EntityType>('occupation');
  const [riskMatrix, setRiskMatrix] = useState<RiskMatrixResponse | null>(null);
  const [riskMap, setRiskMap] = useState<StateRiskMapResponse | null>(null);
  const [selectedCell, setSelectedCell] = useState<RiskCell | null>(null);
  const [riskDetail, setRiskDetail] = useState<RiskDetailsResponse | null>(null);
  const [riskDetailLoading, setRiskDetailLoading] = useState(false);
  const [scenarioOptions, setScenarioOptions] = useState<ScenarioOptionsResponse | null>(null);
  const [scenarioSelection, setScenarioSelection] = useState<string[]>(['baseline', 'higher-growth', 'lower-growth']);
  const [scenarioAssumptionValues, setScenarioAssumptionValues] = useState<Record<string, number>>({});
  const [scenarioComparison, setScenarioComparison] = useState<ScenarioComparisonResponse | null>(null);
  const [scenarioComparing, setScenarioComparing] = useState(false);
  const [scenarioError, setScenarioError] = useState('');
  const [alertResponse, setAlertResponse] = useState<AlertListResponse | null>(null);
  const [alertQueryDraft, setAlertQueryDraft] = useState('');
  const [alertQuery, setAlertQuery] = useState('');
  const [alertStatus, setAlertStatus] = useState('all');
  const [alertSeverity, setAlertSeverity] = useState('all');
  const [alertPage, setAlertPage] = useState(0);
  const alertPageSize = 8;
  const [alertQueryError, setAlertQueryError] = useState('');
  const [drawer, setDrawer] = useState<{ kind: 'alert'; id: string } | { kind: 'risk'; cell: RiskCell } | null>(null);
  const [alertDetail, setAlertDetail] = useState<AlertDetailResponse | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState('');
  const [mutationError, setMutationError] = useState('');
  const [pendingAction, setPendingAction] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [assigneeDraft, setAssigneeDraft] = useState('');
  const optionsInitialized = useRef(false);
  const priorGlobalRegion = useRef(globalRegionCode);
  const currentLoad = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setOptionsLoading(true); setOptionsError('');
    adapter.getFilterOptions(controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      setFilterOptions(result);
      if (!optionsInitialized.current) {
        optionsInitialized.current = true;
        const selectedState = globalRegionCode && globalRegionCode !== 'IN' ? globalRegionCode : '';
        const initial = { ...result.defaults, geographyCode: result.defaults.geographyCode ?? 'IN', ...(selectedState ? { stateCode: selectedState } : {}) };
        setDraftFilters(initial); setFilters(initial);
      }
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setOptionsError(reason instanceof Error ? reason.message : 'Forecast filter options could not be loaded.');
    }).finally(() => { if (!controller.signal.aborted) setOptionsLoading(false); });
    return () => controller.abort();
  }, [adapter]);

  useEffect(() => {
    if (priorGlobalRegion.current === globalRegionCode) return;
    priorGlobalRegion.current = globalRegionCode;
    const stateCode = globalRegionCode === 'IN' ? '' : globalRegionCode;
    setDraftFilters((current) => ({ ...current, geographyCode: 'IN', stateCode }));
    setFilters((current) => ({ ...current, geographyCode: 'IN', stateCode }));
  }, [globalRegionCode]);

  const changeView = useCallback((view: ViewKey) => {
    setActiveView(view);
    if (typeof window !== 'undefined') { const url = new URL(window.location.href); if (view === 'overview') url.searchParams.delete('view'); else url.searchParams.set('view', view); window.history.replaceState({}, '', url); }
  }, []);
  const changeDraft = (key: keyof ForecastFilters, value: string | number) => setDraftFilters((current) => ({ ...current, [key]: key === 'horizonYears' ? Number(value) as 1 | 3 | 5 : value === '' ? undefined : String(value) }));
  const applyFilters = () => { const next = { ...draftFilters, geographyCode: 'IN' }; setFilters(next); setScenarioComparison(null); setAlertPage(0); onGlobalRegionChange?.(next.stateCode || 'IN'); };
  const resetFilters = () => { const next = { ...(filterOptions?.defaults ?? defaultFilters), geographyCode: 'IN', ...(globalRegionCode && globalRegionCode !== 'IN' ? { stateCode: globalRegionCode } : {}) }; setDraftFilters(next); setFilters(next); setScenarioComparison(null); setAlertPage(0); onGlobalRegionChange?.(next.stateCode || 'IN'); };

  const loadView = useCallback(async () => {
    currentLoad.current?.abort(); const controller = new AbortController(); currentLoad.current = controller;
    setResourceState({ loading: true, errors: [] });
    const errors: string[] = [];
    const reportFailure = (label: string, result: PromiseSettledResult<unknown>) => { if (result.status === 'rejected' && !controller.signal.aborted) errors.push(`${label}: ${result.reason instanceof Error ? result.reason.message : 'Service request failed.'}`); };
    try {
      if (activeView === 'overview') {
        const results = await Promise.allSettled([
          adapter.getOverview(filters, controller.signal), adapter.getSeries(filters, 'total', controller.signal),
          adapter.getWarnings(filters, { limit: 6 }, controller.signal), adapter.getRiskMatrix(filters, 'occupation', controller.signal),
          adapter.getModelPerformance(filters, controller.signal),
        ]);
        if (controller.signal.aborted) return;
        if (results[0].status === 'fulfilled') setOverview(results[0].value); else { setOverview(null); reportFailure('Overview KPIs', results[0]); }
        if (results[1].status === 'fulfilled') setSeries(results[1].value); else { setSeries(null); reportFailure('Forecast series', results[1]); }
        if (results[2].status === 'fulfilled') setWarnings(results[2].value); else { setWarnings(null); reportFailure('Early warnings', results[2]); }
        if (results[3].status === 'fulfilled') setOverviewMatrix(results[3].value); else { setOverviewMatrix(null); reportFailure('Occupation ranking', results[3]); }
        if (results[4].status === 'fulfilled') setPerformance(results[4].value); else { setPerformance(null); reportFailure('Reliability summary', results[4]); }
      } else if (activeView === 'risk-radar') {
        const results = await Promise.allSettled([adapter.getRiskMatrix(filters, riskGrouping, controller.signal), adapter.getStateRiskMap(filters, riskGrouping, controller.signal)]);
        if (controller.signal.aborted) return;
        if (results[0].status === 'fulfilled') {
          setRiskMatrix(results[0].value);
          const previous = selectedCell && results[0].value.cells.find((cell) => cell.regionCode === selectedCell.regionCode && cell.entityCode === selectedCell.entityCode);
          setSelectedCell(previous || results[0].value.cells[0] || null);
        } else { setRiskMatrix(null); reportFailure('Risk matrix', results[0]); }
        if (results[1].status === 'fulfilled') setRiskMap(results[1].value); else { setRiskMap(null); reportFailure('Regional map metadata', results[1]); }
      } else if (activeView === 'scenario-analysis') {
        const result = await adapter.getScenarioOptions(filters, controller.signal);
        if (controller.signal.aborted) return;
        setScenarioOptions(result);
        setScenarioAssumptionValues((current) => { const next = { ...current }; for (const assumption of result.assumptions) if (assumption.editable && typeof assumption.value === 'number' && next[assumption.key] === undefined) next[assumption.key] = assumption.value; return next; });
        setScenarioSelection((current) => current.filter((id) => result.scenarios.some((scenario) => scenario.id === id)).length ? current.filter((id) => result.scenarios.some((scenario) => scenario.id === id)) : result.scenarios.filter((scenario) => scenario.isDefault).map((scenario) => scenario.id));
      } else if (activeView === 'model-performance') {
        const result = await adapter.getModelPerformance(filters, controller.signal);
        if (controller.signal.aborted) return;
        setPerformance(result);
      } else {
        const result = await adapter.getAlerts(filters, { status: alertStatus, severity: alertSeverity, query: alertQuery, page: alertPage, pageSize: alertPageSize }, controller.signal);
        if (controller.signal.aborted) return;
        setAlertResponse(result); setAlertQueryError('');
      }
      if (controller.signal.aborted) return;
      setResourceState({ loading: false, errors });
      if (activeView === 'alert-management' && errors.length) setAlertQueryError(errors.join(' '));
    } catch (reason) {
      if (controller.signal.aborted) return;
      const message = reason instanceof Error ? reason.message : 'Forecast service request failed.';
      setResourceState({ loading: false, errors: [message] });
      if (activeView === 'alert-management') setAlertQueryError(message);
    }
  }, [adapter, activeView, filters, riskGrouping, alertStatus, alertSeverity, alertQuery, alertPage]);

  useEffect(() => { void loadView(); return () => currentLoad.current?.abort(); }, [loadView]);
  const retry = () => void loadView();

  const loadRiskDetail = useCallback(async (cell: RiskCell) => {
    setSelectedCell(cell); setRiskDetailLoading(true); setRiskDetail(null); setDrawerError('');
    if (activeView !== 'risk-radar') changeView('risk-radar');
    const controller = new AbortController();
    try { const response = await adapter.getRiskDetails(filters, cell.regionCode, cell.entityCode, cell.entityType, controller.signal); setRiskDetail(response); }
    catch (reason) { setDrawerError(reason instanceof Error ? reason.message : 'Risk detail could not be loaded.'); }
    finally { setRiskDetailLoading(false); }
  }, [adapter, filters, activeView, changeView]);
  const loadAlertDetail = useCallback(async (id: string) => {
    setDrawer({ kind: 'alert', id }); setAlertDetail(null); setDrawerLoading(true); setDrawerError(''); setMutationError(''); setNoteDraft(''); setAssigneeDraft('');
    try { const response = await adapter.getAlertDetail(id); setAlertDetail(response); setAssigneeDraft(response.alert.assigneeId ?? ''); }
    catch (reason) { setDrawerError(reason instanceof Error ? reason.message : 'Warning details could not be loaded.'); }
    finally { setDrawerLoading(false); }
  }, [adapter]);
  const closeDrawer = () => { setDrawer(null); setAlertDetail(null); setRiskDetail(null); setDrawerError(''); setMutationError(''); setPendingAction(''); };
  useEffect(() => { if (!drawer) return; const onKey = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') closeDrawer(); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [drawer]);

  const refreshAlertList = useCallback(async () => {
    const controller = new AbortController();
    const response = await adapter.getAlerts(filters, { status: alertStatus, severity: alertSeverity, query: alertQuery, page: alertPage, pageSize: alertPageSize }, controller.signal);
    setAlertResponse(response);
  }, [adapter, filters, alertStatus, alertSeverity, alertQuery, alertPage]);
  const mutateAlert = useCallback(async (action: string, patch?: { status?: AlertStatus; assigneeId?: string | null; note?: string }) => {
    if (!drawer || drawer.kind !== 'alert') return;
    setPendingAction(action); setMutationError('');
    try {
      if (action === 'acknowledge') await adapter.acknowledgeAlert(drawer.id);
      else if (action === 'status') await adapter.updateAlert(drawer.id, { status: patch?.status });
      else if (action === 'assign') await adapter.updateAlert(drawer.id, { assigneeId: patch?.assigneeId ?? null, assigneeLabel: patch?.assigneeId ?? null });
      else if (action === 'note') { await adapter.addAlertNote(drawer.id, patch?.note ?? ''); setNoteDraft(''); }
      const refreshed = await adapter.getAlertDetail(drawer.id);
      setAlertDetail(refreshed); setAssigneeDraft(refreshed.alert.assigneeId ?? ''); await refreshAlertList();
    } catch (reason) {
      setMutationError(reason instanceof Error ? reason.message : 'The service did not confirm this workflow action. No local success state was applied.');
    } finally { setPendingAction(''); }
  }, [adapter, drawer, refreshAlertList]);

  const viewError = resourceState.errors.length ? resourceState.errors.join(' ') : '';

  return <section className="fw-page" aria-busy={resourceState.loading || optionsLoading}>
    <section className="fw-hero" aria-labelledby="fw-page-title"><div className="fw-hero-copy"><div className="fw-breadcrumb">LABOUR MARKET INTELLIGENCE <span>/</span> FORECASTS</div><p className="fw-eyebrow">Detect → Explain → Investigate → Compare → Act</p><h1 id="fw-page-title">FORECASTS & EARLY WARNINGS</h1><div className="fw-title-rule"/><p>Inspect demand and supply projections, investigate evidence-backed risk signals, compare conditional scenarios and manage review actions.</p><div className="fw-hero-meta"><span><CalendarDays size={14}/> Horizon {filters.horizonYears} year(s)</span><span><MapPin size={14}/>{filters.stateCode ? filterOptions?.states.find((item) => item.code === filters.stateCode)?.label ?? filters.stateCode : 'India'}</span><span><Database size={14}/>{adapter.mode === 'mock' ? 'Illustrative adapter' : 'Configured REST service'}</span></div></div><div className="fw-hero-art" aria-hidden="true"><img src="./assets/industrial-skyline.png" alt=""/><span className="fw-hero-art-label">FORECAST / RISK / EVIDENCE</span></div></section>
    {adapter.mode === 'mock' && <div className="fw-demo-banner" role="status"><Info size={16}/><div><strong>Illustrative demo mode</strong><span>All numeric forecast, warning, risk, scenario and performance values are mock fixtures—not source-backed labour-market findings.</span></div><ProvenanceBadge meta={overview?.meta}/></div>}
    {optionsError && <ErrorPanel message={`Filter options could not be loaded. ${optionsError}`} onRetry={() => { setOptionsError(''); setOptionsLoading(true); void adapter.getFilterOptions().then(setFilterOptions).catch((reason: unknown) => setOptionsError(reason instanceof Error ? reason.message : 'Retry failed.')).finally(() => setOptionsLoading(false)); }}/>}
    <ForecastFilterBar draft={draftFilters} options={filterOptions} onChange={changeDraft} onApply={applyFilters} onReset={resetFilters} loading={resourceState.loading || optionsLoading}/>
    <div className="fw-active-filter-summary"><span><strong>Applied:</strong> {filters.stateCode ? filterOptions?.states.find((item) => item.code === filters.stateCode)?.label ?? filters.stateCode : 'India'} · {filterOptions?.sectors.find((item) => item.code === filters.sectorCode)?.label ?? (filters.sectorCode ? filters.sectorCode : 'All sectors')} · {filters.horizonYears}-year horizon</span><span><ProvenanceBadge meta={activeView === 'overview' ? overview?.meta ?? series?.meta : activeView === 'risk-radar' ? riskMatrix?.meta : activeView === 'model-performance' ? performance?.meta : activeView === 'scenario-analysis' ? scenarioComparison?.meta ?? scenarioOptions?.meta : alertResponse?.meta}/></span></div>
    <Tabs active={activeView} onChange={changeView}/>
    {viewError && <ErrorPanel message={viewError} onRetry={retry}/>}
    {resourceState.loading && <div className="fw-load-strip" role="status"><RefreshCw size={15} className="fw-spin"/> Loading {VIEWS.find((view) => view.key === activeView)?.label.toLowerCase()} from the configured adapter…</div>}
    <div id="forecast-view-panel" role="tabpanel" aria-labelledby={`forecast-tab-${activeView}`} className="fw-view-panel">
      {activeView === 'overview' && <OverviewView filters={filters} overview={overview} series={series} warnings={warnings} matrix={overviewMatrix} performance={performance} onOpenWarning={(id) => void loadAlertDetail(id)} onViewAllAlerts={() => changeView('alert-management')} onViewPerformance={() => changeView('model-performance')} onSelectCell={(cell) => { setRiskGrouping(cell.entityType); void loadRiskDetail(cell); }}/>}
      {activeView === 'risk-radar' && <RiskView matrix={riskMatrix} mapData={riskMap} grouping={riskGrouping} onGroupingChange={setRiskGrouping} selectedCell={selectedCell} onSelectCell={(cell) => void loadRiskDetail(cell)} onSelectRegion={(regionCode) => { const cell = riskMatrix?.cells.find((item) => item.regionCode === regionCode); if (cell) void loadRiskDetail(cell); }} riskDetail={riskDetail} detailLoading={riskDetailLoading}/>}
      {activeView === 'scenario-analysis' && <ScenarioView options={scenarioOptions} comparison={scenarioComparison} comparing={scenarioComparing} error={scenarioError} selectedScenarios={scenarioSelection} onToggleScenario={(id) => setScenarioSelection((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id])} assumptionValues={scenarioAssumptionValues} onAssumptionChange={(key, value) => setScenarioAssumptionValues((current) => ({ ...current, [key]: value }))} onCompare={() => { setScenarioError(''); const invalid = (scenarioOptions?.assumptions ?? []).find((item) => item.editable && scenarioAssumptionValues[item.key] !== undefined && ((item.min !== undefined && scenarioAssumptionValues[item.key] < item.min) || (item.max !== undefined && scenarioAssumptionValues[item.key] > item.max))); if (invalid) { setScenarioError(`${invalid.label} must be between ${invalid.min ?? 'the minimum'} and ${invalid.max ?? 'the maximum'} ${invalid.unit}.`); return; } setScenarioComparing(true); const controller = new AbortController(); adapter.compareScenarios(filters, scenarioSelection, scenarioAssumptionValues, controller.signal).then(setScenarioComparison).catch((reason: unknown) => setScenarioError(reason instanceof Error ? reason.message : 'Scenario comparison failed. No mock fallback was used.')).finally(() => setScenarioComparing(false)); }} onReset={() => { const base = scenarioOptions?.scenarios.find((scenario) => scenario.isDefault) ?? scenarioOptions?.scenarios.find((scenario) => scenario.id === 'baseline'); setScenarioSelection(base ? [base.id] : []); setScenarioAssumptionValues(Object.fromEntries((scenarioOptions?.assumptions ?? []).filter((item) => item.editable && typeof item.value === 'number').map((item) => [item.key, item.value as number]))); setScenarioComparison(null); setScenarioError(''); }}/>}
      {activeView === 'model-performance' && <PerformanceView performance={performance} />}
      {activeView === 'alert-management' && <AlertManagementView response={alertResponse} queryDraft={alertQueryDraft} onQueryDraftChange={setAlertQueryDraft} onSearch={(event) => { event.preventDefault(); setAlertPage(0); setAlertQuery(alertQueryDraft); }} status={alertStatus} onStatusChange={(value) => { setAlertStatus(value); setAlertPage(0); }} severity={alertSeverity} onSeverityChange={(value) => { setAlertSeverity(value); setAlertPage(0); }} page={alertPage} pageSize={alertPageSize} onPage={setAlertPage} onOpenAlert={(id) => void loadAlertDetail(id)} onRetry={retry} loading={resourceState.loading} error={alertQueryError}/>}
    </div>
    <footer className="fw-method-footer"><span className="fw-method-icon">i</span><div><strong>Interpretation & trust</strong><p>Gap = demand − supply only when target population, geography, period and units are comparable. Positive values indicate potential shortage; negative values indicate potential surplus. Historical observations are solid, forecasts are dashed, and intervals are drawn only when bounds and interval semantics are returned. Risk classes and alert severity come from the adapter's rules, not a UI threshold.</p></div><div className="fw-method-status"><span><Database size={13}/>{adapter.mode === 'rest' ? 'REST adapter' : 'Mock adapter'}</span><span><CalendarDays size={13}/> Updated {niceDate((activeView === 'overview' ? series?.meta : activeView === 'risk-radar' ? riskMatrix?.meta : activeView === 'scenario-analysis' ? scenarioComparison?.meta : activeView === 'model-performance' ? performance?.meta : alertResponse?.meta)?.updatedAt)}</span><button type="button" className="fw-button fw-button-small" onClick={retry} disabled={resourceState.loading}><RefreshCw size={13}/> Refresh view</button></div></footer>
    {drawer && <AlertDrawer response={drawer.kind === 'alert' ? alertDetail : null} loading={drawer.kind === 'alert' ? drawerLoading : riskDetailLoading} error={drawerError} busyAction={pendingAction} actionError={mutationError} note={noteDraft} onNoteChange={setNoteDraft} assignee={assigneeDraft} onAssigneeChange={setAssigneeDraft} onClose={closeDrawer} onAcknowledge={() => void mutateAlert('acknowledge')} onStatusChange={(status) => void mutateAlert('status', { status })} onAssign={() => void mutateAlert('assign', { assigneeId: assigneeDraft.trim() || null })} onAddNote={() => void mutateAlert('note', { note: noteDraft.trim() })}/>}
  </section>;
}
