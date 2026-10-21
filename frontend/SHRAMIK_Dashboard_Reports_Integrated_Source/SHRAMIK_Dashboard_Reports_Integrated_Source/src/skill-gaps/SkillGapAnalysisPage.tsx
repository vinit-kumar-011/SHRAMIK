import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity, AlertCircle, ArrowRight, ArrowUpRight, BarChart3, Check,
  ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Database, Factory, Info, MapPin,
  RefreshCw, SlidersHorizontal, Table2, Users,
} from 'lucide-react';
import { createSkillGapDataAdapter } from './adapter';
import type {
  GapClass, GapDataMeta, GapDetailPayload, GapEntityType, GapFilterOptions, GapFilters, GapInsight,
  GapLandscape, GapLandscapePoint, GapMetricKey, GapOverview, RankedSkillGap, RankedSkillsQuery,
  RankedSkillsResponse, RegionalGapResponse, RegionalGapValue, SectorFlowResponse, SkillGapDataAdapter,
} from './types';
import './skill-gap-analysis.css';

type ResourceState<T> = { data: T | null; loading: boolean; error: string; stale: boolean };
const blankResource = <T,>(): ResourceState<T> => ({ data: null, loading: true, error: '', stale: false });
const FILTER_LABELS: Record<keyof GapFilters, string> = {
  period: 'Time period', geographyLevel: 'Geography', regionCode: 'Region code', stateCode: 'State / UT',
  sectorCode: 'Sector', ncoCode: 'Occupation (NCO)', skillCode: 'Skill',
};
const CLASS_LABEL: Record<GapClass, string> = {
  high_shortage: 'High shortage', moderate_shortage: 'Moderate shortage', balanced: 'Balanced',
  moderate_surplus: 'Moderate surplus', high_surplus: 'High surplus', not_comparable: 'Not comparable',
  no_data: 'No data', suppressed: 'Suppressed',
};
const CLASS_SYMBOL: Record<GapClass, string> = {
  high_shortage: '▲', moderate_shortage: '▲', balanced: '●', moderate_surplus: '■', high_surplus: '■',
  not_comparable: '?', no_data: '—', suppressed: '—',
};
const STATE_SHORTCODES: Record<string, string> = {
  'IN-MH': 'MH', 'IN-UP': 'UP', 'IN-TN': 'TN', 'IN-GJ': 'GJ', 'IN-KA': 'KA', 'IN-WB': 'WB',
  'IN-RJ': 'RJ', 'IN-BR': 'BR', 'IN-KL': 'KL', 'IN-PB': 'PB', 'IN-OD': 'OD', 'IN-LA': 'LA',
};
const STATE_CANONICAL: Record<string, string> = Object.fromEntries(Object.entries(STATE_SHORTCODES).map(([canonical, short]) => [short, canonical]));

function formatNumber(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? '—' : new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value);
}
function formatSigned(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatNumber(Math.abs(value))}`;
}
function formatPercent(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? 'n/a' : `${(value * 100).toFixed(1)}%`;
}
function compactValue(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 10_000) return `${(value / 1_000).toFixed(0)}k`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(Math.round(value));
}
function stateClass(value: GapClass): string { return `gap-class-${value.replace('_', '-')}`; }
function metaLabel(meta?: GapDataMeta | null): string {
  if (!meta) return 'Provenance unavailable';
  if (meta.provenance === 'source_backed') return 'Source-backed';
  if (meta.provenance === 'derived') return 'Derived';
  if (meta.provenance === 'mixed') return 'Mixed provenance';
  return 'Illustrative demo data';
}
function safeError(error: unknown): string {
  return error instanceof Error ? error.message : 'The request could not be completed.';
}
function dateLabel(value?: string | null): string {
  if (!value) return 'Update time not supplied';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed);
}
function getRegionLabel(options: GapFilterOptions | null, code: string): string {
  return options?.regions.find((option) => option.code === code)?.label ?? (code || 'All India');
}

function DataBadge({ meta, stale = false }: { meta?: GapDataMeta | null; stale?: boolean }) {
  const label = stale ? 'Stale · previous result' : metaLabel(meta);
  const cls = stale ? 'stale' : meta?.provenance ?? 'unavailable';
  return <span className={`gap-provenance-badge ${cls}`}><i aria-hidden="true"/>{label}</span>;
}

function PanelState({ loading, error, stale, onRetry, children }: { loading: boolean; error: string; stale: boolean; onRetry: () => void; children: React.ReactNode }) {
  if (loading && !stale) return <div className="gap-state" role="status"><RefreshCw size={16} className="spin-icon"/> Loading analysis…</div>;
  if (error && !stale) return <div className="gap-empty gap-empty-error" role="alert"><AlertCircle size={17}/><div><strong>Could not load this section.</strong><p>{error}</p><button className="gap-inline-button" type="button" onClick={onRetry}>Retry <ArrowRight size={13}/></button></div></div>;
  return <>{stale && <div className="gap-stale-banner" role="status">{error ? <>Showing the last successful result because refresh failed: {error}</> : 'Updating this section; the previous successful result remains visible.'} <button type="button" onClick={onRetry}>Retry</button></div>}{children}</>;
}

function MetricCard({ title, value, subtitle, meta, kind, onOpen, loading }: {
  title: string; value: string; subtitle: string;
  meta?: GapDataMeta; kind: 'demand' | 'supply' | 'gap' | 'significant'; onOpen: () => void; loading: boolean;
}) {
  const Icon = kind === 'demand' ? Users : kind === 'supply' ? Factory : kind === 'gap' ? Activity : BarChart3;
  return <button type="button" className={`gap-kpi-card gap-kpi-${kind}`} onClick={onOpen} aria-label={`Open ${title} details`}>
    <span className="gap-kpi-icon"><Icon size={22} strokeWidth={2.2}/></span>
    <span className="gap-kpi-main"><span className="gap-kpi-label">{title}</span><strong>{loading && value === '—' ? '…' : value}</strong><span className="gap-kpi-sub">{subtitle}</span></span>
    <span className="gap-kpi-open"><ArrowRight size={14}/></span>
    {meta?.provenance === 'mock' && <span className="gap-kpi-demo">DEMO</span>}
  </button>;
}

function FilterToolbar({ options, draft, onDraftChange, onApply, onReset, disabled }: {
  options: GapFilterOptions; draft: GapFilters; onDraftChange: (key: keyof GapFilters, value: string) => void;
  onApply: (event: React.FormEvent<HTMLFormElement>) => void; onReset: () => void; disabled: boolean;
}) {
  const select = (key: keyof GapFilters, optionsList: Array<{ value: string; label: string }>) => (
    <label className="gap-filter" key={key}><span>{FILTER_LABELS[key]}</span><select value={draft[key]} onChange={(event) => onDraftChange(key, event.target.value)} disabled={disabled}>
      {optionsList.map((option) => <option key={`${key}-${option.value}`} value={option.value}>{option.label}</option>)}
    </select></label>
  );
  const geography = options.geographyLevels.length ? options.geographyLevels : [{ value: 'national', label: 'All India' }, { value: 'state', label: 'State / UT' }];
  const states = [{ value: '', label: 'All states / UTs' }, ...options.regions.filter((item) => item.level === 'state').map((item) => ({ value: item.code, label: item.label }))];
  const period = options.periods.length ? options.periods : [{ value: '', label: 'Periods unavailable' }];
  return <form className="gap-filter-toolbar" onSubmit={onApply} aria-label="Skill gap analysis filters">
    {select('period', period)}{select('geographyLevel', geography)}{select('stateCode', states)}{select('sectorCode', options.sectors)}{select('ncoCode', options.occupations)}{select('skillCode', options.skills)}
    <div className="gap-filter-actions"><button type="submit" className="gap-btn gap-btn-primary" disabled={disabled}><SlidersHorizontal size={15}/> Apply filters</button><button type="button" className="gap-btn" onClick={onReset} disabled={disabled} aria-label="Reset filters"><RefreshCw size={15}/><span className="gap-reset-label">Reset</span></button></div>
  </form>;
}

function GapLandscapeChart({ data, loading, error, stale, onRetry, onOpenPoint }: {
  data: GapLandscape | null; loading: boolean; error: string; stale: boolean; onRetry: () => void; onOpenPoint: (point: GapLandscapePoint) => void;
}) {
  const points = data?.points ?? [];
  const usable = points.filter((point) => point.demand != null && point.supply != null && point.gap != null && point.classification !== 'not_comparable' && point.classification !== 'no_data' && point.classification !== 'suppressed');
  const xScale = data?.xAxis.scale ?? 'linear';
  const yScale = data?.yAxis.scale ?? 'linear';
  const xValues = usable.map((point) => point.supply as number);
  const yValues = usable.map((point) => point.demand as number);
  const maxXValue = Math.max(1, ...xValues);
  const maxYValue = Math.max(1, ...yValues);
  const minXPositive = Math.min(...xValues.filter((value) => value > 0), Infinity);
  const minYPositive = Math.min(...yValues.filter((value) => value > 0), Infinity);
  const logInvalid = !!data && ((xScale === 'log' && xValues.some((value) => value <= 0)) || (yScale === 'log' && yValues.some((value) => value <= 0)));
  const parityAllowed = !!data?.parityLineEligible && data.xAxis.unit === data.yAxis.unit && xScale === yScale;
  // When a parity line is valid, use a shared domain so its diagonal actually means x = y.
  const sharedMax = Math.max(maxXValue, maxYValue);
  const sharedMinPositive = Math.min(minXPositive, minYPositive);
  const xMin = parityAllowed ? (xScale === 'log' ? Math.log10(Math.max(1, sharedMinPositive)) : 0) : (xScale === 'log' ? Math.log10(Math.max(1, minXPositive)) : 0);
  const yMin = parityAllowed ? (yScale === 'log' ? Math.log10(Math.max(1, sharedMinPositive)) : 0) : (yScale === 'log' ? Math.log10(Math.max(1, minYPositive)) : 0);
  const xMax = parityAllowed ? (xScale === 'log' ? Math.log10(sharedMax) : sharedMax) : (xScale === 'log' ? Math.log10(maxXValue) : maxXValue);
  const yMax = parityAllowed ? (yScale === 'log' ? Math.log10(sharedMax) : sharedMax) : (yScale === 'log' ? Math.log10(maxYValue) : maxYValue);
  const transform = (value: number, scale: 'linear' | 'log') => scale === 'log' ? Math.log10(Math.max(1, value)) : value;
  const X = (value: number) => 52 + ((transform(value, xScale) - xMin) / Math.max(.0001, xMax - xMin)) * 390;
  const Y = (value: number) => 292 - ((transform(value, yScale) - yMin) / Math.max(.0001, yMax - yMin)) * 252;
  const makeTicks = (scale: 'linear' | 'log', values: number[], useShared: boolean) => {
    if (!values.length) return [] as number[];
    if (scale === 'log') {
      const minimum = useShared ? sharedMinPositive : Math.min(...values.filter((value) => value > 0), 1);
      const maximum = useShared ? sharedMax : Math.max(...values);
      const start = Math.ceil(Math.log10(Math.max(1, minimum)));
      const end = Math.floor(Math.log10(Math.max(1, maximum)));
      const result = Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => 10 ** (start + i));
      return result.length ? result.slice(0, 5) : [Math.max(1, minimum), Math.max(1, maximum)];
    }
    const maximum = useShared ? sharedMax : Math.max(1, ...values);
    return [0, .25, .5, .75, 1].map((step) => maximum * step);
  };
  const xTicks = makeTicks(xScale, xValues, parityAllowed);
  const yTicks = makeTicks(yScale, yValues, parityAllowed);
  const legend = data?.classifications.filter((item) => ['high_shortage', 'moderate_shortage', 'balanced', 'moderate_surplus', 'high_surplus', 'not_comparable', 'no_data', 'suppressed'].includes(item.key)) ?? [];
  return <section className="gap-card gap-landscape-card" aria-labelledby="gap-landscape-title" aria-busy={loading}>
    <div className="gap-panel-heading"><div><h2 id="gap-landscape-title">Skill Gap Landscape</h2><p>Demand (y) against supply (x) for compatible measures</p></div><span className="gap-chart-mark"><Activity size={19}/></span></div>
    <PanelState loading={loading} error={error} stale={stale} onRetry={onRetry}>
      {!data || !usable.length ? <div className="gap-empty"><BarChart3 size={22}/><div><strong>No comparable points for this filter.</strong><p>Choose another skill, occupation, or period to view the scatterplot.</p></div></div> : logInvalid ? <div className="gap-empty gap-empty-error"><AlertCircle size={18}/><div><strong>Invalid logarithmic scale payload.</strong><p>The API selected a log scale but returned zero or negative values. The chart is withheld instead of misrepresenting the data.</p></div></div> : <>
        <div className="gap-chart-scroll"><svg className="gap-scatter" viewBox="0 0 500 342" role="img" aria-label={`Skill gap scatter plot. Horizontal axis ${data.xAxis.label} in ${data.xAxis.unit}; vertical axis ${data.yAxis.label} in ${data.yAxis.unit}. Select a point for detail.`}>
          {yTicks.map((tick) => <g key={`y-grid-${tick}`}><line x1="52" x2="458" y1={Y(tick)} y2={Y(tick)} className="gap-grid-line"/><text x="44" y={Y(tick) + 4} textAnchor="end" className="gap-axis-text">{compactValue(tick)}</text></g>)}
          {xTicks.map((tick) => <g key={`x-grid-${tick}`}><line x1={X(tick)} x2={X(tick)} y1="40" y2="292" className="gap-grid-line gap-grid-vertical"/><text x={X(tick)} y="311" textAnchor="middle" className="gap-axis-text">{compactValue(tick)}</text></g>)}
          {parityAllowed && <g><line x1={X(xScale === 'log' ? sharedMinPositive : 0)} y1={Y(yScale === 'log' ? sharedMinPositive : 0)} x2={X(sharedMax)} y2={Y(sharedMax)} className="gap-parity-line"/><text x="450" y="48" className="gap-parity-label" textAnchor="end">Demand = supply</text></g>}
          {usable.map((point) => {
            const x = X(point.supply as number); const y = Y(point.demand as number); const cls = point.classification;
            return <g key={`${point.entityType}-${point.id}`} className="gap-point-group" role="button" tabIndex={0} aria-label={`${point.label}: demand ${formatNumber(point.demand)}, supply ${formatNumber(point.supply)}, gap ${formatSigned(point.gap)} ${point.unit}, ${CLASS_LABEL[cls]}`} onClick={() => onOpenPoint(point)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpenPoint(point); } }}>
              {cls === 'high_shortage' || cls === 'moderate_shortage' ? <path d={`M ${x} ${y - 7} L ${x + 7} ${y + 6} L ${x - 7} ${y + 6} Z`} className={`gap-point ${stateClass(cls)}`}/> : cls === 'high_surplus' || cls === 'moderate_surplus' ? <rect x={x - 6} y={y - 6} width="12" height="12" rx="1" className={`gap-point ${stateClass(cls)}`}/> : <circle cx={x} cy={y} r="6" className={`gap-point ${stateClass(cls)}`}/>}
              <title>{`${point.label} · Demand ${formatNumber(point.demand)} · Supply ${formatNumber(point.supply)} · Gap ${formatSigned(point.gap)} · ${point.unit} · ${metaLabel(point.meta)}`}</title>
            </g>;
          })}
          <text x="255" y="336" textAnchor="middle" className="gap-axis-title">{data.xAxis.label} ({data.xAxis.unit}){xScale === 'log' ? ' · log scale' : ''}</text>
          <text transform="rotate(-90)" x="-166" y="15" textAnchor="middle" className="gap-axis-title">{data.yAxis.label} ({data.yAxis.unit}){yScale === 'log' ? ' · log scale' : ''}</text>
        </svg></div>
        <div className="gap-legend" aria-label="Gap classification legend">{legend.map((item) => <span key={item.key}><i className={`gap-legend-dot ${stateClass(item.key)}`}/>{CLASS_SYMBOL[item.key]} {item.label}</span>)}</div>
        {!parityAllowed && <p className="gap-chart-note"><Info size={14}/> No parity line: the API has not confirmed that both axes share a compatible definition, scale and unit. {data.parityLineReason ?? ''}</p>}
        <p className="gap-chart-note">{parityAllowed ? 'Above the parity line, comparable demand exceeds supply; below it, supply exceeds demand.' : 'Axes are not confirmed comparable; use the returned gap and status fields rather than visual position to interpret shortage or surplus.'} Shape and label supplement colour. Select a point or open the table alternative below.</p>
        <details className="gap-chart-table-alt"><summary><Table2 size={14}/> View chart data as an accessible table</summary><div className="gap-table-wrap"><table><thead><tr><th>Entity</th><th>Demand</th><th>Supply</th><th>Gap</th><th>Status</th><th>Provenance</th></tr></thead><tbody>{usable.map((point) => <tr key={point.id}><td><button className="gap-text-link" type="button" onClick={() => onOpenPoint(point)}>{point.label}</button></td><td>{formatNumber(point.demand)}</td><td>{formatNumber(point.supply)}</td><td>{formatSigned(point.gap)}</td><td><span className={`gap-status ${stateClass(point.classification)}`}>{CLASS_LABEL[point.classification]}</span></td><td>{metaLabel(point.meta)}</td></tr>)}</tbody></table></div></details>
      </>}
    </PanelState>
    {data?.meta && <footer className="gap-panel-meta"><DataBadge meta={data.meta}/><span>{data.meta.period}</span><span>{data.meta.unit}</span></footer>}
  </section>;
}

type GeoPosition = [number, number];
type GeoFeature = { type?: string; properties?: Record<string, unknown>; geometry?: { type?: string; coordinates?: unknown } };
type GeoFeatureCollection = { type?: string; features?: GeoFeature[] };

function collectGeoRings(value: unknown, rings: GeoPosition[][] = []): GeoPosition[][] {
  if (!Array.isArray(value) || value.length === 0) return rings;
  const first = value[0];
  if (Array.isArray(first) && typeof first[0] === 'number' && typeof first[1] === 'number') {
    rings.push(value.filter((point): point is GeoPosition => Array.isArray(point) && typeof point[0] === 'number' && typeof point[1] === 'number') as GeoPosition[]);
    return rings;
  }
  for (const child of value) collectGeoRings(child, rings);
  return rings;
}

function VerifiedRegionalMap({ geometry, geometryUnavailableReason, rows, metric, onSelectRegion }: {
  geometry: RegionalGapResponse['geometry']; geometryUnavailableReason?: string; rows: RegionalGapValue[]; metric: GapMetricKey; onSelectRegion: (code: string) => void;
}) {
  const [collection, setCollection] = useState<GeoFeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const geometryReady = !!geometry && !!geometry.assetUrl && !!geometry.assetId && !!geometry.version && !!geometry.source && !!geometry.licence && !!geometry.codeProperty && !!geometry.codeCrosswalkVersion;

  useEffect(() => {
    setCollection(null); setError('');
    if (!geometryReady || !geometry?.assetUrl) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true);
    let assetUrl: URL;
    try { assetUrl = new URL(geometry.assetUrl, window.location.href); }
    catch { setLoading(false); setError('The configured geometry URL is invalid.'); return; }
    if (!['http:', 'https:'].includes(assetUrl.protocol)) { setLoading(false); setError('The geometry URL must use HTTP or HTTPS.'); return; }
    fetch(assetUrl.toString(), { signal: controller.signal, credentials: assetUrl.origin === window.location.origin ? 'same-origin' : 'omit', headers: { Accept: 'application/geo+json, application/json' } })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Geometry asset request failed (${response.status}).`);
        const json = await response.json() as GeoFeatureCollection;
        if (json.type !== 'FeatureCollection' || !Array.isArray(json.features)) throw new Error('The geometry asset is not a GeoJSON FeatureCollection.');
        const valid = json.features.filter((feature) => ['Polygon', 'MultiPolygon'].includes(feature.geometry?.type ?? '') && collectGeoRings(feature.geometry?.coordinates).some((ring) => ring.length >= 3));
        if (!valid.length) throw new Error('The GeoJSON asset contains no usable Polygon or MultiPolygon features.');
        if (!controller.signal.aborted) setCollection({ ...json, features: valid });
      })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(safeError(reason)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [geometryReady, geometry?.assetUrl, geometry?.assetId, geometry?.version, geometry?.source, geometry?.licence, geometry?.codeProperty, geometry?.codeCrosswalkVersion]);

  const mapModel = buildMapModel(collection, geometry?.codeProperty ?? '', rows);
  if (!geometryReady) return <div className="gap-map-unavailable"><MapPin size={23}/><div><strong>Verified map geometry unavailable</strong><p>{geometryUnavailableReason ?? 'No versioned GeoJSON asset with source, licence, canonical-code property and crosswalk version has been configured.'} The decorative PNG is deliberately not used as data geography.</p></div></div>;
  if (loading) return <div className="gap-map-unavailable" role="status"><RefreshCw size={20} className="spin-icon"/><div><strong>Loading licensed State / UT geometry</strong><p>Geometry {geometry?.assetId} · version {geometry?.version}</p></div></div>;
  if (error || !collection || !mapModel) return <div className="gap-map-unavailable" role={error ? 'alert' : 'status'}><MapPin size={23}/><div><strong>Regional map could not be rendered</strong><p>{error || 'No renderable feature geometry was returned.'}</p><p>Asset: {geometry?.source} · Licence: {geometry?.licence} · Crosswalk: {geometry?.codeCrosswalkVersion}</p></div></div>;
  const { features, bounds } = mapModel;
  const codeKey = geometry?.codeProperty ?? '';
  const metricValue = (row: RegionalGapValue) => metric === 'demand' ? row.demand : metric === 'supply' ? row.supply : metric === 'gap_percent' ? row.gapPercent ?? null : row.gap;
  const width = 320; const height = 330; const pad = 8;
  const lonScale = Math.cos(((bounds.minY + bounds.maxY) / 2) * Math.PI / 180);
  const spanX = Math.max(.0001, (bounds.maxX - bounds.minX) * Math.max(.2, lonScale));
  const spanY = Math.max(.0001, bounds.maxY - bounds.minY);
  const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);
  const drawWidth = spanX * scale; const drawHeight = spanY * scale;
  const offsetX = (width - drawWidth) / 2; const offsetY = (height - drawHeight) / 2;
  const project = ([lon, lat]: GeoPosition): [number, number] => [offsetX + ((lon - bounds.minX) * Math.max(.2, lonScale) * scale), offsetY + ((bounds.maxY - lat) * scale)];
  const valueLabel = (value: number | null) => value == null ? 'No value' : metric === 'gap_percent' ? formatPercent(value) : metric === 'gap_absolute' ? formatSigned(value) : formatNumber(value);
  return <div className="gap-verified-map-wrap">
    <div className="gap-verified-map-scroll"><svg className="gap-verified-map" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`State and Union Territory map colored by ${metric}; features joined to regional observations using canonical property ${codeKey}. Select a region to apply the filter.`}>
      <title>{`Verified regional geometry · ${geometry?.source} · ${geometry?.version}`}</title>
      {features.map(({ feature, code, row }) => {
        const rings = collectGeoRings(feature.geometry?.coordinates);
        const path = rings.map((ring) => ring.map((position, index) => { const [x, y] = project(position); return `${index ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`; }).join(' ') + ' Z').join(' ');
        const label = row ? `${row.regionName}: ${metric} ${valueLabel(metricValue(row))}; demand ${formatNumber(row.demand)}; supply ${formatNumber(row.supply)}; gap ${formatSigned(row.gap)}; ${CLASS_LABEL[row.classification]}; ${metaLabel(row.meta)}` : `${code}: no regional observation returned`;
        const missing = !row || metricValue(row) == null || row.classification === 'no_data' || row.classification === 'suppressed';
        return <path key={code || path.slice(0, 32)} d={path} className={`gap-map-feature ${missing ? 'gap-map-feature-missing' : stateClass(row!.classification)}`} fillRule="evenodd" tabIndex={0} role="button" aria-label={`${label}. Activate to select this State / UT.`} onClick={() => { if (code) onSelectRegion(code); }} onKeyDown={(event) => { if ((event.key === 'Enter' || event.key === ' ') && code) { event.preventDefault(); onSelectRegion(code); } }}><title>{label}</title></path>;
      })}
    </svg></div>
    <p className="gap-map-source">{geometry?.source} · {geometry?.licence} · Geometry {geometry?.assetId} v{geometry?.version} · code crosswalk {geometry?.codeCrosswalkVersion}</p>
    <p className="gap-panel-footnote">Regions with no returned value remain neutral. Select a polygon to apply its canonical State / UT filter.</p>
  </div>;
}

function buildMapModel(collection: GeoFeatureCollection | null, codeProperty: string, rows: RegionalGapValue[]) {
  if (!collection || !codeProperty) return null;
  const features = (collection.features ?? []).map((feature) => ({ feature, code: String(feature.properties?.[codeProperty] ?? ''), row: rows.find((item) => item.regionCode === String(feature.properties?.[codeProperty] ?? '')) ?? null }));
  const positions = features.flatMap(({ feature }) => collectGeoRings(feature.geometry?.coordinates).flat());
  if (!positions.length) return null;
  return { features, bounds: { minX: Math.min(...positions.map((position) => position[0])), maxX: Math.max(...positions.map((position) => position[0])), minY: Math.min(...positions.map((position) => position[1])), maxY: Math.max(...positions.map((position) => position[1])) } };
}

function RegionalGapPanel({ data, loading, error, stale, metric, onMetricChange, onRetry, onSelectRegion, onOpenRegion }: {
  data: RegionalGapResponse | null; loading: boolean; error: string; stale: boolean; metric: GapMetricKey;
  onMetricChange: (value: GapMetricKey) => void; onRetry: () => void; onSelectRegion: (regionCode: string) => void; onOpenRegion: (region: RegionalGapValue) => void;
}) {
  const rows = data?.regions ?? [];
  const valueOf = (region: RegionalGapValue) => metric === 'demand' ? region.demand : metric === 'supply' ? region.supply : metric === 'gap_percent' ? region.gapPercent ?? null : region.gap;
  const validValues = rows.map(valueOf).filter((value): value is number => value != null && Number.isFinite(value));
  const maximum = Math.max(1, ...validValues.map((value) => Math.abs(value)));
  const sorted = [...rows].sort((a, b) => (valueOf(b) ?? -Infinity) - (valueOf(a) ?? -Infinity));
  return <section className="gap-card gap-region-card" aria-labelledby="gap-regions-title" aria-busy={loading}>
    <div className="gap-panel-heading"><div><h2 id="gap-regions-title">Skill Gap by State / UT</h2><p>Regional rankings use canonical codes</p></div><label className="gap-metric-select"><span className="sr-only">Regional metric</span><select value={metric} onChange={(event) => onMetricChange(event.target.value as GapMetricKey)}><option value="gap_absolute">Gap (absolute)</option><option value="gap_percent">Gap % of demand</option><option value="demand">Demand</option><option value="supply">Supply</option></select><ChevronDown size={13}/></label></div>
    <PanelState loading={loading} error={error} stale={stale} onRetry={onRetry}>
      {data ? <VerifiedRegionalMap geometry={data.geometry} geometryUnavailableReason={data.geometryUnavailableReason} rows={rows} metric={metric} onSelectRegion={onSelectRegion}/> : <div className="gap-map-unavailable"><MapPin size={23}/><div><strong>Regional geometry unavailable</strong><p>Geometry metadata has not been returned by the data service.</p></div></div>}
      <div className="gap-map-legend">{(data?.scale ?? []).filter((item) => ['high_shortage', 'moderate_shortage', 'balanced', 'moderate_surplus', 'high_surplus', 'no_data', 'suppressed'].includes(item.key)).map((item) => <span key={item.key}><i className={`gap-legend-dot ${stateClass(item.key)}`}/>{item.label}</span>)}</div>
      <div className="gap-region-list" aria-label="Regional ranking list">{sorted.map((region) => {
        const val = valueOf(region); const isGapMetric = metric === 'gap_absolute' || metric === 'gap_percent'; const barWidth = val == null ? 0 : Math.max(1, Math.min(isGapMetric ? 50 : 100, Math.abs(val) / maximum * (isGapMetric ? 50 : 100))); const barStyle = val == null ? { left: '0%', width: '100%' } : isGapMetric ? val >= 0 ? { left: '50%', width: `${barWidth}%` } : { right: '50%', width: `${barWidth}%` } : { left: '0%', width: `${barWidth}%` };
        const gapVal = metric === 'gap_percent' ? formatPercent(val) : metric === 'gap_absolute' ? formatSigned(val) : formatNumber(val);
        return <div className={`gap-region-row ${region.classification === 'no_data' || region.classification === 'suppressed' ? 'no-region-data' : ''}`} key={region.regionCode}>
          <button type="button" className="gap-region-name" onClick={() => onSelectRegion(region.regionCode)} aria-label={`Apply State / UT filter: ${region.regionName}`}><span>{region.regionName}</span><small>{region.regionCode}</small></button>
          <button type="button" className="gap-region-bar-button" onClick={() => region.gap != null || region.demand != null ? onOpenRegion(region) : undefined} disabled={region.gap == null && region.demand == null} aria-label={`${region.regionName}, ${gapVal}; open details`}><span className="gap-region-track"><i className={`gap-region-fill ${stateClass(region.classification)}`} style={barStyle}/></span><strong>{gapVal}</strong></button>
        </div>;
      })}</div>
      {rows.length === 0 && <div className="gap-empty"><strong>No regional values returned for these filters.</strong></div>}
      <p className="gap-panel-footnote">Selecting a region applies the State / UT filter and reloads related panels. Missing or suppressed values remain neutral, not “low gap”.</p>
    </PanelState>
    {data?.meta && <footer className="gap-panel-meta"><DataBadge meta={data.meta}/><span>{data.meta.coverage?.summary ?? 'Coverage details unavailable'}</span></footer>}
  </section>;
}

function InsightRail({ data, loading, error, stale, onRetry, onOpen }: {
  data: GapInsight[] | null; loading: boolean; error: string; stale: boolean; onRetry: () => void; onOpen: (insight: GapInsight) => void;
}) {
  return <aside className="gap-card gap-insights" aria-labelledby="gap-insights-title" aria-busy={loading}>
    <div className="gap-insights-heading"><span className="gap-insights-kicker">EVIDENCE FIRST</span><h2 id="gap-insights-title">Key Insights</h2><p>Up to four findings tied to the active filter snapshot.</p></div>
    <PanelState loading={loading} error={error} stale={stale} onRetry={onRetry}>
      {data?.length ? <div className="gap-insight-list">{data.slice(0, 4).map((insight, index) => <button type="button" className="gap-insight-item" key={insight.id} onClick={() => onOpen(insight)}>
        <span className="gap-insight-number">{String(index + 1).padStart(2, '0')}</span><span className={`gap-insight-icon importance-${insight.importance ?? 'info'}`}>{insight.importance === 'priority' ? <ArrowUpRight size={18}/> : insight.importance === 'watch' ? <Activity size={18}/> : <Info size={18}/>}</span>
        <span className="gap-insight-copy"><strong>{insight.title}</strong><span>{insight.summary}</span><small>{insight.generatedBy === 'mock' ? 'Illustrative rule · not AI generated' : insight.generatedBy === 'ai_grounded' ? 'AI grounded in returned evidence' : 'Rule engine finding'}</small>{insight.claims?.[0] && <small className="gap-insight-evidence">Evidence: {insight.claims[0].metricId}{insight.claims[0].value != null ? ` · ${formatNumber(insight.claims[0].value)}${insight.claims[0].unit ? ` ${insight.claims[0].unit}` : ''}` : ''}{insight.claims[0].sourceIds?.length ? ` · ${insight.claims[0].sourceIds.slice(0, 2).join(', ')}` : ''}</small>}</span>
        <ArrowRight size={14} className="gap-insight-arrow"/>
      </button>)}</div> : <div className="gap-empty"><CircleHelp size={20}/><div><strong>No insights returned</strong><p>The current filter snapshot does not include evidence-linked findings.</p></div></div>}
    </PanelState>
    {data?.length ? <p className="gap-insight-note">Every statement should be traceable to a returned metric or source. Mock findings are explicitly labelled.</p> : null}
  </aside>;
}

function MiniTrend({ item }: { item: RankedSkillGap }) {
  const values = item.trend?.map((point) => point.gap).filter((value): value is number => value != null) ?? [];
  if (values.length < 2) return <span className="gap-trend-na">n/a</span>;
  const min = Math.min(...values); const max = Math.max(...values); const span = max - min || 1;
  const points = values.map((value, index) => `${index * 28},${17 - ((value - min) / span) * 13}`).join(' ');
  return <svg className="gap-mini-trend" viewBox="0 0 84 20" role="img" aria-label={`Trend across ${values.length} returned points; latest gap ${formatSigned(values[values.length - 1])} ${item.unit}`}><polyline points={points} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function RankedSkillsTable({ data, loading, error, stale, sort, direction, page, pageSize, onSort, onPage, onRetry, onOpenRow, onViewAll }: {
  data: RankedSkillsResponse | null; loading: boolean; error: string; stale: boolean; sort: RankedSkillsQuery['sort']; direction: RankedSkillsQuery['direction'];
  page: number; pageSize: number; onSort: (key: RankedSkillsQuery['sort']) => void; onPage: (step: number) => void; onRetry: () => void;
  onOpenRow: (row: RankedSkillGap) => void; onViewAll: () => void;
}) {
  const total = data?.total ?? 0; const pages = Math.max(1, Math.ceil(total / pageSize));
  const headings: Array<{ key: RankedSkillsQuery['sort']; label: string }> = [{ key: 'rank', label: '#' }, { key: 'skillLabel', label: 'Skill' }, { key: 'demand', label: 'Demand' }, { key: 'supply', label: 'Supply' }, { key: 'gap', label: 'Gap' }, { key: 'gapPercent', label: 'Gap %' }];
  return <section className="gap-card gap-skills-table" aria-labelledby="gap-top-skills-title" aria-busy={loading}>
    <div className="gap-panel-heading"><div><h2 id="gap-top-skills-title">{page === 0 && pageSize === 5 ? 'Top Skills by Gap' : 'Skills by Gap'}</h2><p>Compatible demand and supply values only · select a row for evidence</p></div><button className="gap-btn gap-btn-small" type="button" onClick={onViewAll}>View all skills <ArrowRight size={13}/></button></div>
    <PanelState loading={loading} error={error} stale={stale} onRetry={onRetry}>
      {data?.items.length ? <>
        <div className="gap-table-wrap"><table className="gap-data-table"><thead><tr>{headings.map((heading) => <th key={heading.key} aria-sort={sort === heading.key ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}><button type="button" onClick={() => onSort(heading.key)}>{heading.label}{sort === heading.key ? (direction === 'asc' ? ' ▲' : ' ▼') : ''}</button></th>)}<th>Trend</th><th>Status</th></tr></thead><tbody>{data.items.map((item) => <tr key={item.skillId} tabIndex={0} onClick={() => onOpenRow(item)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpenRow(item); } }} aria-label={`Open ${item.skillLabel} detail`}>
          <td>{item.rank}</td><td className="gap-table-skill"><button type="button" className="gap-text-link" onClick={(event) => { event.stopPropagation(); onOpenRow(item); }}>{item.skillLabel}</button><small>{item.skillCode}</small></td><td>{formatNumber(item.demand)}</td><td>{formatNumber(item.supply)}</td><td className={item.gap == null ? '' : item.gap > 0 ? 'gap-positive' : item.gap < 0 ? 'gap-negative' : ''}>{formatSigned(item.gap)}</td><td>{formatPercent(item.gapPercent)}</td><td><MiniTrend item={item}/></td><td><span className={`gap-status ${stateClass(item.gapClass)}`}>{CLASS_SYMBOL[item.gapClass]} {CLASS_LABEL[item.gapClass]}</span></td>
        </tr>)}</tbody></table></div>
        <div className="gap-table-pagination"><span>Showing {Math.min(total, page * pageSize + 1)}–{Math.min(total, page * pageSize + data.items.length)} of {total} skills · Taxonomy {data.skillTaxonomyVersion}</span><div><button type="button" className="gap-btn gap-btn-small" onClick={() => onPage(-1)} disabled={page <= 0} aria-label="Previous table page"><ChevronLeft size={15}/> Previous</button><span>Page {page + 1} / {pages}</span><button type="button" className="gap-btn gap-btn-small" onClick={() => onPage(1)} disabled={page >= pages - 1} aria-label="Next table page">Next <ChevronRight size={15}/></button></div></div>
      </> : <div className="gap-empty"><Table2 size={20}/><div><strong>No skills match these filters.</strong><p>Reset or widen the filters to see more records.</p></div></div>}
    </PanelState>
    {data?.meta && <footer className="gap-panel-meta"><DataBadge meta={data.meta}/><span>{data.meta.period}</span><span>{data.meta.unit}</span></footer>}
  </section>;
}

function SectorPanel({ filters, data, loading, error, stale, onRetry, onViewSectors, viewingSectors = false }: {
  filters: GapFilters | null; data: SectorFlowResponse | null; loading: boolean; error: string; stale: boolean;
  onRetry: () => void; onViewSectors: () => void; viewingSectors?: boolean;
}) {
  const nodes = data?.nodes ?? [];
  const links = data?.links ?? [];
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const units = [...nodes.map((node) => node.unit), ...links.map((link) => link.unit)];
  const compatible = new Set(units).size <= 1 && links.every((link) => nodesById.has(link.source) && nodesById.has(link.target) && nodesById.get(link.source)?.unit === link.unit && nodesById.get(link.target)?.unit === link.unit);
  const valid = !!data?.available && nodes.length > 0 && links.length > 0 && nodes.every((node) => Number.isFinite(node.total) && node.total >= 0 && !!node.unit) && links.every((link) => Number.isFinite(link.value) && link.value >= 0 && !!link.unit && link.source !== link.target);
  const hasIncoming = (id: string) => links.some((link) => link.target === id);
  const hasOutgoing = (id: string) => links.some((link) => link.source === id);
  const sourceNodes = nodes.filter((node) => !hasIncoming(node.id) && hasOutgoing(node.id));
  const targetNodes = nodes.filter((node) => hasIncoming(node.id) && !hasOutgoing(node.id));
  const middleNodes = nodes.filter((node) => hasIncoming(node.id) && hasOutgoing(node.id));
  const columns = [sourceNodes, middleNodes, targetNodes];
  const maxNodes = Math.max(1, ...columns.map((group) => group.length));
  const svgHeight = Math.max(150, maxNodes * 58 + 20);
  const nodeWidth = 154; const nodeHeight = 40; const xs = [8, 222, 436];
  const positions = new Map<string, { x: number; y: number; w: number; h: number }>();
  columns.forEach((group, column) => group.forEach((node, index) => positions.set(node.id, { x: xs[column], y: 10 + index * (svgHeight - 20 - nodeHeight) / Math.max(1, group.length - 1), w: nodeWidth, h: nodeHeight })));
  const maxLink = Math.max(1, ...links.map((link) => link.value));
  const invalidNodes = nodes.filter((node) => !positions.has(node.id));
  return <section className="gap-card gap-flow-card" aria-labelledby="gap-flow-title" aria-busy={loading}>
    <div className="gap-panel-heading"><div><h2 id="gap-flow-title">Supply–Demand Flow</h2><p>{filters?.sectorCode ? 'Selected sector' : 'Selected sector · choose a sector to scope the analysis'}</p></div><button type="button" className="gap-btn gap-btn-small" onClick={onViewSectors}>{viewingSectors ? 'Back to overview' : 'View sectors'} <ArrowRight size={13}/></button></div>
    {loading && !data ? <div className="gap-state" role="status"><RefreshCw size={16} className="spin-icon"/> Checking for measured flow data…</div> : error && !stale ? <div className="gap-empty gap-empty-error" role="alert"><AlertCircle size={17}/><div><strong>Flow data could not be loaded.</strong><p>{error}</p><button className="gap-inline-button" type="button" onClick={onRetry}>Retry <ArrowRight size={13}/></button></div></div> : valid && compatible && !invalidNodes.length ? <div className="gap-flow-visual" aria-label={data?.flowDefinition ?? 'Measured sector flow'}>
      <p className="gap-flow-definition">{data?.flowDefinition}</p>
      <div className="gap-flow-svg-scroll"><svg className="gap-flow-svg" viewBox={`0 0 600 ${svgHeight}`} role="img" aria-label={`Measured flow diagram with ${links.length} links. Link width is proportional to its reported value. Unit: ${units[0] ?? 'not supplied'}.`}>
        <defs><marker id="gap-flow-arrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 z" fill="#20A89C"/></marker></defs>
        {links.map((link, index) => { const from = positions.get(link.source); const to = positions.get(link.target); if (!from || !to) return null; const x1 = from.x + from.w; const y1 = from.y + from.h / 2; const x2 = to.x; const y2 = to.y + to.h / 2; const bend = Math.max(18, (x2 - x1) * .45); return <path key={`${link.source}-${link.target}-${index}`} d={`M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2 - 3} ${y2}`} className="gap-flow-link" strokeWidth={Math.max(1.8, Math.sqrt(link.value / maxLink) * 12)} markerEnd="url(#gap-flow-arrow)"><title>{`${nodesById.get(link.source)?.label ?? link.source} to ${nodesById.get(link.target)?.label ?? link.target}: ${formatNumber(link.value)} ${link.unit}; sources ${link.sourceIds.join(', ')}`}</title></path>; })}
        {columns.flatMap((group) => group.map((node) => { const pos = positions.get(node.id)!; const groupClass = `group-${node.group.replace(/[^a-z0-9-]/gi, '-')}`; const shortLabel = node.label.length > 23 ? `${node.label.slice(0, 21)}…` : node.label; return <g key={node.id}><title>{`${node.label}: ${formatNumber(node.total)} ${node.unit}; group ${node.group}`}</title><rect className={`gap-flow-node-box ${groupClass}`} x={pos.x} y={pos.y} width={pos.w} height={pos.h} rx="3"/><text x={pos.x + 7} y={pos.y + 16}>{shortLabel}</text><text x={pos.x + 7} y={pos.y + 30} className="flow-total">{formatNumber(node.total)} {node.unit}</text></g>; }))}
      </svg></div>
      {data?.conservationRule && <p className="gap-flow-definition"><strong>Conservation rule:</strong> {data.conservationRule}</p>}
      <div className="gap-flow-link-list" role="list" aria-label="Flow link values">{links.map((link, index) => <div key={`${link.source}-${link.target}-${index}`} role="listitem"><span>{nodesById.get(link.source)?.label ?? link.source} → {nodesById.get(link.target)?.label ?? link.target}</span><strong>{formatNumber(link.value)} {link.unit}</strong></div>)}</div>
    </div> : <div className="gap-flow-unavailable"><div className="gap-flow-icon"><Factory size={23}/></div><div><strong>{data?.unavailableReason ? 'Flow not available for this data snapshot' : 'Measured flow evidence not supplied'}</strong><p>{!compatible ? 'The returned flow links and node quantities have incompatible units or reference missing nodes, so the diagram is withheld.' : data?.unavailableReason ?? 'A Sankey/flow diagram is shown only when the API supplies defined nodes and links with compatible units. No relationship is inferred from gap totals.'}</p><span className="gap-flow-tag"><Info size={12}/> No synthetic flow drawn</span></div></div>}
    {data?.meta && <footer className="gap-panel-meta"><DataBadge meta={data.meta} stale={stale}/><span>{data.meta.period}</span><span>{data.meta.unit}</span></footer>}
  </section>;
}

function DataProvenanceStrip({ meta, loading, errors, onRefresh, refreshing }: { meta: GapDataMeta | null; loading: boolean; errors: number; onRefresh: () => void; refreshing: boolean }) {
  return <footer className="gap-method-note"><span className="gap-method-icon"><Info size={15}/></span><div className="gap-method-copy"><strong>{meta?.provenance === 'source_backed' ? 'Data and method notes' : 'Prototype preview / method notes'}</strong><p>Gap = demand − supply only where period, geography, unit and entity definition are compatible. Positive means potential shortage; negative means potential surplus. Gap percentage uses the backend-provided denominator/formula and is shown as n/a when unavailable. A period estimate is not a forecast.</p><p>{meta?.notes?.join(' ') ?? 'Metadata and coverage notes have not been returned.'}</p></div><div className="gap-method-status"><DataBadge meta={meta}/><span><Database size={13}/>{meta?.sourceLabel ?? 'Source label unavailable'}</span><span><Activity size={13}/>{meta?.coverage?.summary ?? 'Coverage not supplied'}</span><span><RefreshCw size={13}/>{loading ? 'Updating' : meta?.updatedAt ? `Updated ${dateLabel(meta.updatedAt)}` : 'Update time not supplied'}</span>{errors > 0 && <span className="gap-method-error"><AlertCircle size={13}/>{errors} section(s) need attention</span>}<button type="button" className="gap-btn gap-btn-small" onClick={onRefresh} disabled={refreshing}><RefreshCw size={13} className={refreshing ? 'spin-icon' : ''}/> Refresh data</button></div></footer>;
}

export default function SkillGapAnalysisPage({
  globalRegionCode,
  onGlobalRegionChange,
  onOpenDetail,
  onDetailError,
  adapter: injectedAdapter,
}: {
  globalRegionCode: string;
  onGlobalRegionChange: (code: string) => void;
  onOpenDetail: (detail: GapDetailPayload) => void;
  onDetailError: (message: string) => void;
  adapter?: SkillGapDataAdapter;
}) {
  const [defaultAdapter] = useState<SkillGapDataAdapter>(() => createSkillGapDataAdapter());
  const adapter = injectedAdapter ?? defaultAdapter;
  const [filterOptions, setFilterOptions] = useState<GapFilterOptions | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState('');
  const [draft, setDraft] = useState<GapFilters | null>(null);
  const [applied, setApplied] = useState<GapFilters | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'occupations' | 'skills' | 'sectors' | 'regions'>('overview');
  const [regionalMetric, setRegionalMetric] = useState<GapMetricKey>('gap_absolute');
  const [sort, setSort] = useState<RankedSkillsQuery['sort']>('gap');
  const [direction, setDirection] = useState<RankedSkillsQuery['direction']>('desc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [refreshCount, setRefreshCount] = useState(0);
  const [optionsRefresh, setOptionsRefresh] = useState(0);
  const [overviewState, setOverviewState] = useState<ResourceState<GapOverview>>(blankResource);
  const [landscapeState, setLandscapeState] = useState<ResourceState<GapLandscape>>(blankResource);
  const [regionsState, setRegionsState] = useState<ResourceState<RegionalGapResponse>>(blankResource);
  const [skillsState, setSkillsState] = useState<ResourceState<RankedSkillsResponse>>(blankResource);
  const [insightsState, setInsightsState] = useState<ResourceState<GapInsight[]>>(blankResource);
  const [flowState, setFlowState] = useState<ResourceState<SectorFlowResponse>>(blankResource);
  const lastGlobalRegion = useRef<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setOptionsLoading(true); setOptionsError('');
    adapter.getFilterOptions(controller.signal).then((options) => {
      if (controller.signal.aborted) return;
      setFilterOptions(options);
      setDraft((current) => current ?? { ...options.defaults });
      setApplied((current) => current ?? { ...options.defaults });
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setOptionsError(safeError(error));
    }).finally(() => { if (!controller.signal.aborted) setOptionsLoading(false); });
    return () => controller.abort();
  }, [adapter, optionsRefresh]);

  useEffect(() => {
    if (!filterOptions || !applied || lastGlobalRegion.current === globalRegionCode) return;
    lastGlobalRegion.current = globalRegionCode;
    const canonical = STATE_CANONICAL[globalRegionCode];
    const next = canonical
      ? { ...applied, geographyLevel: 'state', stateCode: canonical, regionCode: canonical }
      : globalRegionCode === 'IN'
        ? { ...applied, geographyLevel: 'national', stateCode: '', regionCode: 'IN' }
        : { ...applied, regionCode: globalRegionCode };
    setDraft(next); setApplied(next); setPage(0);
  }, [filterOptions, globalRegionCode, applied]);

  const startPanel = useCallback(<T,>(setter: React.Dispatch<React.SetStateAction<ResourceState<T>>>) => {
    setter((previous) => ({ ...previous, loading: true, error: '', stale: Boolean(previous.data) }));
  }, []);
  const settlePanel = useCallback(async <T,>(setter: React.Dispatch<React.SetStateAction<ResourceState<T>>>, request: Promise<T>, signal: AbortSignal) => {
    try {
      const result = await request;
      if (!signal.aborted) setter({ data: result, loading: false, error: '', stale: false });
    } catch (reason) {
      if (!signal.aborted) setter((previous) => ({ ...previous, loading: false, error: safeError(reason), stale: Boolean(previous.data) }));
    }
  }, []);

  useEffect(() => {
    if (!applied) return;
    const controller = new AbortController();
    startPanel(setOverviewState); startPanel(setLandscapeState); startPanel(setRegionsState); startPanel(setInsightsState); startPanel(setFlowState);
    const requests = [
      settlePanel(setOverviewState, adapter.getOverview(applied, controller.signal), controller.signal),
      settlePanel(setLandscapeState, adapter.getGapLandscape(applied, controller.signal), controller.signal),
      settlePanel(setRegionsState, adapter.getRegionalGaps(applied, regionalMetric, controller.signal), controller.signal),
      settlePanel(setInsightsState, adapter.getSkillGapInsights(applied, controller.signal), controller.signal),
      settlePanel(setFlowState, adapter.getSectorFlow(applied, applied.sectorCode, controller.signal), controller.signal),
    ];
    void Promise.all(requests);
    return () => controller.abort();
  }, [adapter, applied, regionalMetric, refreshCount, settlePanel, startPanel]);

  useEffect(() => {
    if (!applied) return;
    const controller = new AbortController();
    startPanel(setSkillsState);
    const query: RankedSkillsQuery = { sort, direction, page, pageSize };
    void settlePanel(setSkillsState, adapter.getRankedSkills(applied, query, controller.signal), controller.signal);
    return () => controller.abort();
  }, [adapter, applied, sort, direction, page, pageSize, refreshCount, settlePanel, startPanel]);

  const updateDraft = useCallback((key: keyof GapFilters, value: string) => {
    setDraft((previous) => {
      if (!previous) return previous;
      if (key === 'geographyLevel') return value === 'national'
        ? { ...previous, geographyLevel: value, stateCode: '', regionCode: 'IN' }
        : { ...previous, geographyLevel: value, regionCode: previous.stateCode || 'IN' };
      if (key === 'stateCode') return value
        ? { ...previous, stateCode: value, geographyLevel: 'state', regionCode: value }
        : { ...previous, stateCode: '', geographyLevel: 'national', regionCode: 'IN' };
      return { ...previous, [key]: value };
    });
  }, []);

  const applyFilters = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft) return;
    const next = { ...draft, regionCode: draft.stateCode || draft.regionCode || 'IN' };
    setApplied(next); setPage(0);
    const topbarCode = next.stateCode ? (STATE_SHORTCODES[next.stateCode] ?? next.stateCode) : 'IN';
    lastGlobalRegion.current = topbarCode;
    onGlobalRegionChange(topbarCode);
  }, [draft, onGlobalRegionChange]);

  const resetFilters = useCallback(() => {
    if (!filterOptions) return;
    const next = { ...filterOptions.defaults };
    setDraft(next); setApplied(next); setPage(0); setSort('gap'); setDirection('desc'); setPageSize(5); setRegionalMetric('gap_absolute'); lastGlobalRegion.current = 'IN'; onGlobalRegionChange('IN');
  }, [filterOptions, onGlobalRegionChange]);

  const chooseRegion = useCallback((code: string) => {
    if (!draft) return;
    const next = { ...draft, geographyLevel: 'state', stateCode: code, regionCode: code };
    setDraft(next); setApplied(next); setPage(0); const topbarCode = STATE_SHORTCODES[code] ?? code; lastGlobalRegion.current = topbarCode; onGlobalRegionChange(topbarCode);
  }, [draft, onGlobalRegionChange]);

  const requestDetail = useCallback(async (type: GapEntityType, id: string) => {
    if (!applied) return;
    try {
      const result = await adapter.getDetail(type, id, applied);
      onOpenDetail(result);
    } catch (error) {
      onDetailError(safeError(error));
    }
  }, [adapter, applied, onDetailError, onOpenDetail]);

  const retry = useCallback(() => setRefreshCount((value) => value + 1), []);
  const retryOptions = useCallback(() => setOptionsRefresh((value) => value + 1), []);
  const onSort = useCallback((key: RankedSkillsQuery['sort']) => {
    if (sort === key) setDirection((value) => value === 'asc' ? 'desc' : 'asc');
    else { setSort(key); setDirection(key === 'skillLabel' ? 'asc' : 'desc'); }
    setPage(0);
  }, [sort]);
  const onPage = useCallback((step: number) => setPage((value) => Math.max(0, value + step)), []);
  const viewAllSkills = useCallback(() => { setActiveTab('skills'); setPageSize(10); setPage(0); }, []);

  const currentMeta = overviewState.data?.meta ?? landscapeState.data?.meta ?? regionsState.data?.meta ?? skillsState.data?.meta ?? insightsState.data?.[0]?.meta ?? null;
  const errors = [overviewState, landscapeState, regionsState, skillsState, insightsState, flowState].filter((state) => Boolean(state.error)).length;
  const isLoading = optionsLoading || [overviewState, landscapeState, regionsState, skillsState, insightsState, flowState].some((state) => state.loading);
  const anyStale = [overviewState, landscapeState, regionsState, skillsState, insightsState, flowState].some((state) => state.stale);
  const regionLabel = getRegionLabel(filterOptions, applied?.stateCode || applied?.regionCode || 'IN');
  const tabDefinitions = [
    { key: 'overview' as const, label: 'Overview' }, { key: 'occupations' as const, label: 'Occupations' },
    { key: 'skills' as const, label: 'Skills' }, { key: 'sectors' as const, label: 'Sectors' }, { key: 'regions' as const, label: 'Regions' },
  ];
  const onTabKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault(); const current = tabDefinitions.findIndex((tab) => tab.key === activeTab);
    const next = tabDefinitions[(current + (event.key === 'ArrowRight' ? 1 : tabDefinitions.length - 1)) % tabDefinitions.length];
    setActiveTab(next.key); document.getElementById(`gap-tab-${next.key}`)?.focus();
  };
  const overview = overviewState.data;
  const mapRows = regionsState.data?.regions ?? [];
  const landscapePoints = landscapeState.data?.points ?? [];
  const selectedPointType = activeTab === 'occupations' ? 'occupation' : 'skill';
  const visibleLandscape: GapLandscape | null = landscapeState.data ? {
    ...landscapeState.data,
    points: activeTab === 'occupations' ? landscapeState.data.points.filter((point) => point.entityType === 'occupation') : activeTab === 'skills' ? landscapeState.data.points.filter((point) => point.entityType === 'skill') : landscapeState.data.points,
  } : null;

  return <div className="skill-gap-page" aria-label="Skill Gap Analysis page">
    <section className="gap-hero" aria-labelledby="gap-page-title">
      <div className="gap-hero-copy"><p className="gap-eyebrow">ANALYSIS <span>/</span> {regionLabel.toUpperCase()}</p><h1 id="gap-page-title">SKILL GAP <span>ANALYSIS</span></h1><div className="gap-title-rule"/><p>Compare compatible labour demand and workforce supply to identify potential shortages, relative balance, and surpluses by skill, occupation, sector and State / UT.</p><div className="gap-hero-foot"><span><Check size={13}/> Traceable definitions</span><span><Check size={13}/> Source and period aware</span></div></div>
      <div className="gap-hero-art" aria-hidden="true"><div className="gap-hero-sun"/><img src="./assets/hero-worker-industrial.png" alt=""/><div className="gap-hero-note">SKILLS<br/>JOBS<br/>GROWTH</div><span className="gap-art-block block-one"/><span className="gap-art-block block-two"/></div>
    </section>

    {optionsError && <div className="gap-global-error" role="alert"><AlertCircle size={17}/><span><strong>Filter options unavailable.</strong> {optionsError}</span><button type="button" className="gap-btn" onClick={retryOptions}>Retry</button></div>}
    {filterOptions && draft && <FilterToolbar options={filterOptions} draft={draft} onDraftChange={updateDraft} onApply={applyFilters} onReset={resetFilters} disabled={optionsLoading}/ >}
    {!filterOptions && optionsLoading && <div className="gap-loading-strip" role="status"><RefreshCw size={15} className="spin-icon"/> Loading supported filters…</div>}

    {(isLoading || errors > 0 || anyStale) && <div className={`gap-global-status ${errors ? 'has-errors' : ''}`} role="status"><span>{errors ? <AlertCircle size={15}/> : <RefreshCw size={15} className={isLoading ? 'spin-icon' : ''}/>}</span><strong>{errors ? `${errors} section(s) need attention` : anyStale ? 'Refreshing applied filters' : 'Loading current analysis'}</strong><span>{anyStale ? 'Previous successful results are retained and marked stale where a request failed.' : 'Every panel reads the same applied filter snapshot.'}</span><button type="button" className="gap-btn gap-btn-small" onClick={retry} disabled={isLoading}>Retry / refresh</button></div>}

    <section className="gap-kpi-grid" aria-label="Key skill gap indicators" aria-busy={overviewState.loading}>
      <MetricCard kind="demand" title={overview?.demand.label ?? 'Estimated Demand'} value={overview?.demand.formattedValue ?? formatNumber(overview?.demand.value)} subtitle={overview?.demand.unit ?? 'Unit unavailable'} meta={overview?.demand.meta} loading={overviewState.loading} onOpen={() => void requestDetail('kpi', 'demand')}/>
      <MetricCard kind="supply" title={overview?.supply.label ?? 'Estimated Supply'} value={overview?.supply.formattedValue ?? formatNumber(overview?.supply.value)} subtitle={overview?.supply.unit ?? 'Unit unavailable'} meta={overview?.supply.meta} loading={overviewState.loading} onOpen={() => void requestDetail('kpi', 'supply')}/>
      <MetricCard kind="gap" title={overview?.gap.kind === 'forecast' ? 'Projected Gap / Shortage' : 'Estimated Gap / Shortage'} value={overview?.gap.formattedValue ?? formatNumber(overview?.gap.value)} subtitle={overview?.gap.kind === 'forecast' ? 'Forecast · horizon as returned' : 'Observed-period estimate · not a forecast'} meta={overview?.gap.meta} loading={overviewState.loading} onOpen={() => void requestDetail('kpi', 'gap')}/>
      <MetricCard kind="significant" title="Skills with Significant Gaps" value={overview?.significantGaps.formattedValue ?? formatNumber(overview?.significantGaps.value)} subtitle={overview?.significantGaps.unit ?? 'Threshold not supplied'} meta={overview?.significantGaps.meta} loading={overviewState.loading} onOpen={() => void requestDetail('kpi', 'significantGaps')}/>
    </section>

    <div className="gap-view-tabs" role="tablist" aria-label="Skill gap views" onKeyDown={onTabKeyDown}>{tabDefinitions.map((tab) => <button type="button" role="tab" id={`gap-tab-${tab.key}`} key={tab.key} data-tab={tab.key} aria-selected={activeTab === tab.key} tabIndex={activeTab === tab.key ? 0 : -1} onClick={() => setActiveTab(tab.key)}>{tab.label}</button>)}</div>

    {activeTab === 'overview' && <div className="gap-main-analytics">
      <GapLandscapeChart data={visibleLandscape} loading={landscapeState.loading} error={landscapeState.error} stale={landscapeState.stale} onRetry={retry} onOpenPoint={(point) => void requestDetail(point.entityType, point.id)}/>
      <RegionalGapPanel data={regionsState.data} loading={regionsState.loading} error={regionsState.error} stale={regionsState.stale} metric={regionalMetric} onMetricChange={setRegionalMetric} onRetry={retry} onSelectRegion={chooseRegion} onOpenRegion={(region) => void requestDetail('region', region.regionCode)}/>
      <InsightRail data={insightsState.data} loading={insightsState.loading} error={insightsState.error} stale={insightsState.stale} onRetry={retry} onOpen={(insight) => void requestDetail('insight', insight.id)}/>
    </div>}

    {activeTab === 'occupations' && <div className="gap-view-stack"><GapLandscapeChart data={visibleLandscape} loading={landscapeState.loading} error={landscapeState.error} stale={landscapeState.stale} onRetry={retry} onOpenPoint={(point) => void requestDetail(point.entityType, point.id)}/><section className="gap-card"><div className="gap-panel-heading"><div><h2>Occupation results</h2><p>Click any occupation point or select a row in the chart data table.</p></div></div><div className="gap-table-wrap"><table className="gap-data-table"><thead><tr><th>Occupation</th><th>Demand</th><th>Supply</th><th>Gap</th><th>Gap %</th><th>Status</th></tr></thead><tbody>{landscapePoints.filter((point) => point.entityType === selectedPointType).map((point) => <tr key={point.id} onClick={() => void requestDetail(point.entityType, point.id)} tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter') void requestDetail(point.entityType, point.id); }}><td>{point.label}</td><td>{formatNumber(point.demand)}</td><td>{formatNumber(point.supply)}</td><td>{formatSigned(point.gap)}</td><td>{formatPercent(point.gapPercent)}</td><td><span className={`gap-status ${stateClass(point.classification)}`}>{CLASS_LABEL[point.classification]}</span></td></tr>)}</tbody></table></div></section></div>}

    {activeTab === 'skills' && <div className="gap-view-stack"><GapLandscapeChart data={visibleLandscape} loading={landscapeState.loading} error={landscapeState.error} stale={landscapeState.stale} onRetry={retry} onOpenPoint={(point) => void requestDetail(point.entityType, point.id)}/><RankedSkillsTable data={skillsState.data} loading={skillsState.loading} error={skillsState.error} stale={skillsState.stale} sort={sort} direction={direction} page={page} pageSize={pageSize} onSort={onSort} onPage={onPage} onRetry={retry} onOpenRow={(row) => void requestDetail('skill', row.skillId)} onViewAll={viewAllSkills}/></div>}

    {activeTab === 'sectors' && <div className="gap-view-stack"><section className="gap-card gap-sector-table"><div className="gap-panel-heading"><div><h2>Sector Comparison</h2><p>Connect this view to the backend's established sector analytics response.</p></div><Factory size={22}/></div><div className="gap-empty"><Database size={21}/><div><strong>Sector gap summary endpoint not specified</strong><p>The supplied API handoff defines sector flow only when measured, unit-compatible links exist; it does not define a sector-gap totals endpoint. No sector totals are fabricated. Agree the existing endpoint/response with the backend team before enabling this table.</p><button className="gap-inline-button" type="button" onClick={() => setActiveTab('overview')}>Return to overview <ArrowRight size={13}/></button></div></div></section><SectorPanel filters={applied} data={flowState.data} loading={flowState.loading} error={flowState.error} stale={flowState.stale} onRetry={retry} onViewSectors={() => setActiveTab('overview')} viewingSectors/></div>}

    {activeTab === 'regions' && <div className="gap-view-stack"><RegionalGapPanel data={regionsState.data} loading={regionsState.loading} error={regionsState.error} stale={regionsState.stale} metric={regionalMetric} onMetricChange={setRegionalMetric} onRetry={retry} onSelectRegion={chooseRegion} onOpenRegion={(region) => void requestDetail('region', region.regionCode)}/><section className="gap-card"><div className="gap-panel-heading"><div><h2>Regional Detail Table</h2><p>Canonical State / UT codes, explicit missing values and returned coverage.</p></div></div><div className="gap-table-wrap"><table className="gap-data-table"><thead><tr><th>State / UT</th><th>Code</th><th>Demand</th><th>Supply</th><th>Gap</th><th>Gap %</th><th>Status</th></tr></thead><tbody>{mapRows.map((item) => <tr key={item.regionCode} tabIndex={0} onClick={() => void requestDetail('region', item.regionCode)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); void requestDetail('region', item.regionCode); } }}><td>{item.regionName}</td><td>{item.regionCode}</td><td>{formatNumber(item.demand)}</td><td>{formatNumber(item.supply)}</td><td>{formatSigned(item.gap)}</td><td>{formatPercent(item.gapPercent)}</td><td>{CLASS_LABEL[item.classification]}</td></tr>)}</tbody></table></div></section></div>}

    {activeTab === 'overview' && <div className="gap-lower-grid"><RankedSkillsTable data={skillsState.data} loading={skillsState.loading} error={skillsState.error} stale={skillsState.stale} sort={sort} direction={direction} page={page} pageSize={pageSize} onSort={onSort} onPage={onPage} onRetry={retry} onOpenRow={(row) => void requestDetail('skill', row.skillId)} onViewAll={viewAllSkills}/><SectorPanel filters={applied} data={flowState.data} loading={flowState.loading} error={flowState.error} stale={flowState.stale} onRetry={retry} onViewSectors={() => setActiveTab('sectors')}/></div>}

    {activeTab !== 'overview' && <div className="gap-tab-bottom"><DataBadge meta={currentMeta}/><span>{activeTab === 'occupations' ? 'Occupations view' : activeTab === 'skills' ? 'Skills view' : activeTab === 'sectors' ? 'Sectors view' : 'Regions view'} · same applied filter snapshot</span></div>}
    <DataProvenanceStrip meta={currentMeta} loading={isLoading} errors={errors} onRefresh={retry} refreshing={isLoading}/>
  </div>;
}

