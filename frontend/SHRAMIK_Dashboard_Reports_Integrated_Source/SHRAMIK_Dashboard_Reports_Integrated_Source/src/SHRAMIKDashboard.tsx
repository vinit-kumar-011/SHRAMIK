import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, AlertCircle, ArrowRight, Bell, BrainCircuit, Building2, CalendarDays,
  ChartColumn, Check, ChevronDown, ChevronRight, Database, Factory,
  FileText, HeartPulse, Info, Leaf, Lightbulb, MapPin, Menu, RefreshCw, Search,
  Settings, Star, TrendingUp, Truck, Users, Wrench, X, type LucideIcon,
} from 'lucide-react';
import { createLabourMarketDataAdapter } from './api/adapter';
import type {
  DashboardPeriod, DashboardRow, DashboardSummary, DetailPayload, LabourMarketDataAdapter,
  MetricCardData, NotificationItem, RankedRegionsResponse, RegionMetric, RegionOption,
  SearchResult, UserProfile,
} from './api/contracts';
import SkillGapAnalysisPage from './skill-gaps/SkillGapAnalysisPage';
import ForecastsPage from './forecasts/ForecastsPage';
import ReportsPage from './reports/ReportsPage';
import type { GapDetailPayload } from './skill-gaps/types';
import { getPathForRoute, getRouteFromLocation, getRouteLabel, type ShramikRouteId } from './routing';
import EmergingSkillsPage from './emerging-skills/EmergingSkillsPage.jsx';
import { ScenarioSimulatorPage } from './scenario-simulator/ScenarioSimulatorPage.jsx';
import { MockScenarioSimulatorAdapter } from './scenario-simulator/adapters/MockScenarioSimulatorAdapter.js';
import DemandInsightsPage from './demand/DemandInsightsPage.jsx';
import { DataSourcesPage } from './data-sources/DataSourcesPage.jsx';
import { mockDataSourcesAdapter } from './data-sources/mock-adapter.js';
import { createRestDataSourcesAdapter } from './data-sources/rest-adapter.js';
import SupplyInsightsPage from './supply/SupplyInsightsPage';
import DataQualityPage from './data-quality/DataQualityPage';
import AdministrationPage from './administration/AdministrationPage';

type Tone = 'navy' | 'teal' | 'orange';

const ICONS: Record<string, LucideIcon> = {
  activity: Activity, alert: AlertCircle, brain: BrainCircuit, 'brain-circuit': BrainCircuit,
  building: Building2, 'building-2': Building2, chart: ChartColumn, 'chart-column': ChartColumn,
  database: Database, factory: Factory, file: FileText, 'file-text': FileText,
  healthcare: HeartPulse, 'heart-pulse': HeartPulse, leaf: Leaf, lightbulb: Lightbulb,
  settings: Settings, star: Star, truck: Truck, users: Users, wrench: Wrench,
};
const KPI_ICONS: Record<string, LucideIcon> = {
  demand: Users, supply: Users, 'skill-gap': ChartColumn, 'emerging-skills': BrainCircuit,
};
const NAV_ITEMS = [
  { label: 'Dashboard', section: 'dashboard', icon: ChartColumn, group: 'primary' },
  { label: 'Demand', section: 'demand', icon: Activity, group: 'primary' },
  { label: 'Supply', section: 'supply', icon: Users, group: 'primary' },
  { label: 'Skill Gaps', section: 'skill-gaps', icon: BrainCircuit, group: 'primary' },
  { label: 'Forecasts', section: 'forecasts', icon: ChartColumn, group: 'primary' },
  { label: 'Emerging Skills', section: 'emerging-skills', icon: Leaf, group: 'primary' },
  { label: 'Scenario Simulator', section: 'scenario-simulator', icon: Wrench, group: 'primary' },
  { label: 'Reports', section: 'reports', icon: FileText, group: 'primary' },
  { label: 'Data Sources', section: 'data-sources', icon: Database, group: 'secondary' },
  { label: 'Data Quality', section: 'data-quality', icon: HeartPulse, group: 'secondary' },
  { label: 'Administration', section: 'administration', icon: Settings, group: 'secondary' },
] as const;

function toneForKpi(item: MetricCardData, index: number): Tone {
  if (item.key === 'supply') return 'teal';
  if (item.key === 'skill-gap') return 'orange';
  if (item.key === 'emerging-skills') return 'teal';
  return index === 1 ? 'teal' : 'navy';
}
function formatUpdated(value: string | null | undefined): string {
  if (!value) return 'Update time not supplied';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}
// src/routing.ts owns canonical and legacy direct links (including reports.html and #reports).
function getInitialPage(): ShramikRouteId {
  if (typeof window === 'undefined') return 'dashboard';
  return getRouteFromLocation(window.location, import.meta.env.BASE_URL);
}

function sectionForTarget(target: string): string {
  const accepted = new Set(NAV_ITEMS.map((item) => item.section));
  return accepted.has(target as typeof NAV_ITEMS[number]['section']) ? target : 'dashboard';
}

function Sparkline({ values, tone, id }: { values: number[]; tone: Tone; id: string }) {
  const safeValues = values.length ? values : [0, 0];
  const min = Math.min(...safeValues);
  const max = Math.max(...safeValues);
  const range = Math.max(1, max - min);
  const points = safeValues.map((value, i) => {
    const x = safeValues.length <= 1 ? 4 : 4 + i * (92 / (safeValues.length - 1));
    const y = 29 - ((value - min) / range) * 22;
    return `${x},${y}`;
  }).join(' ');
  const firstX = 4;
  const lastX = safeValues.length <= 1 ? 4 : 96;
  return <svg className={`sparkline tone-${tone}`} viewBox="0 0 100 36" role="img" aria-label="Recent trend">
    <defs><linearGradient id={`spark-fill-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity=".2"/><stop offset="100%" stopColor="currentColor" stopOpacity="0"/></linearGradient></defs>
    <polygon points={`${firstX},35 ${points} ${lastX},35`} fill={`url(#spark-fill-${id})`} />
    <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

function KpiCard({ item, index, onOpen }: { item: MetricCardData; index: number; onOpen: (item: MetricCardData) => void }) {
  const Icon = KPI_ICONS[item.key] ?? Activity;
  const tone = toneForKpi(item, index);
  return <button type="button" className={`kpi-card tone-${tone}`} onClick={() => onOpen(item)} aria-label={`Open ${item.title} details`}>
    <div className="kpi-icon"><Icon size={25} strokeWidth={2.1} /></div>
    <div className="kpi-main">
      <div className="eyebrow">{item.title}</div>
      <div className="kpi-subtitle">{item.subtitle}</div>
      <div className="kpi-value">{item.formattedValue}</div>
      <div className={`kpi-change ${item.deltaPct < 0 ? 'change-negative' : ''}`}><TrendingUp size={18} strokeWidth={2.8}/><strong>{item.deltaPct > 0 ? '+' : ''}{item.deltaPct}%</strong><span>{item.context}</span></div>
    </div>
    <div className="kpi-spark"><Sparkline values={item.trend} tone={tone} id={item.id} /></div>
    <span className="card-open"><ChevronRight size={15}/></span>
  </button>;
}

function SelectControl<T extends string | number>({ label, value, onChange, options, compact = false }: {
  label: string; value: T; onChange: (value: T) => void; options: Array<{ value: T; label: string }>; compact?: boolean;
}) {
  return <label className={`select-wrap ${compact ? 'compact-select' : ''}`}><span className="sr-only">{label}</span>
    <select value={value} onChange={(event) => onChange(event.target.value as T)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronDown size={14} aria-hidden="true"/>
  </label>;
}

function ChartPanel({ data, periodYears, onPeriodChange, onOpenDetail }: {
  data: DashboardSummary | null; periodYears: DashboardPeriod; onPeriodChange: (period: DashboardPeriod) => void; onOpenDetail: (section: string) => void;
}) {
  const points = data?.trend ?? [];
  const maxValue = Math.max(300, ...points.map((point) => Math.max(point.demand, point.supply)));
  const step = Math.ceil(maxValue / 6 / 10) * 10;
  const yMax = step * 6;
  const xFor = (i: number, count: number) => 42 + i * (560 / Math.max(1, count - 1));
  const yFor = (value: number) => 163 - (value / yMax) * 158;
  const demandPts = points.map((point, i) => `${xFor(i, points.length)},${yFor(point.demand)}`).join(' ');
  const supplyPts = points.map((point, i) => `${xFor(i, points.length)},${yFor(point.supply)}`).join(' ');
  return <section className="panel trend-panel" aria-labelledby="trend-title" aria-busy={!data}>
    <div className="panel-header"><div><h2 id="trend-title">Demand vs Supply Trends</h2><p>Estimated labour demand and supply (in millions)</p></div>
      <SelectControl label="Trend period" value={periodYears} onChange={onPeriodChange} options={[{ value: 5, label: 'Last 5 years' }, { value: 3, label: 'Last 3 years' }]} />
    </div>
    <div className="chart-legend"><span><i className="legend-line demand"/>Demand</span><span><i className="legend-line supply"/>Supply</span></div>
    <div className="trend-chart">
      {points.length ? <svg viewBox="0 0 650 210" preserveAspectRatio="none" role="img" aria-label="Demand and supply trend chart. Values are from the selected data adapter.">
        {Array.from({ length: 7 }, (_, i) => i * step).map((value) => <g key={value}><line x1="42" x2="605" y1={yFor(value)} y2={yFor(value)} className="chart-grid"/><text x="30" y={yFor(value) + 4} className="chart-axis" textAnchor="end">{value}</text></g>)}
        {points.map((point, i) => <g key={point.year}><line x1={xFor(i, points.length)} x2={xFor(i, points.length)} y1="5" y2="163" className="chart-vgrid"/><text x={xFor(i, points.length)} y="190" className="chart-axis" textAnchor="middle">{point.year}</text></g>)}
        <polyline points={demandPts} className="chart-demand"/><polyline points={supplyPts} className="chart-supply"/>
        {points.map((point, i) => <circle key={`d-${point.year}`} cx={xFor(i, points.length)} cy={yFor(point.demand)} r="4.2" className="point-demand"/>)}
        {points.map((point, i) => <circle key={`s-${point.year}`} cx={xFor(i, points.length)} cy={yFor(point.supply)} r="4.2" className="point-supply"/>)}
      </svg> : <div className="panel-empty">Trend data is not available for this filter.</div>}
      <button className="chart-next" type="button" aria-label="Open detailed demand and supply trends" onClick={() => onOpenDetail('demand')}><ChevronRight size={18}/></button>
    </div>
  </section>;
}

function RegionalPanel({ rankings, metric, onMetricChange, onOpenDetail, busy }: {
  rankings: RankedRegionsResponse | null; metric: RegionMetric; onMetricChange: (metric: RegionMetric) => void; onOpenDetail: (section: string) => void; busy: boolean;
}) {
  const metricLabels: Record<RegionMetric, string> = { demand: 'Demand', supply: 'Supply', 'skill-gap': 'Skill gap' };
  return <section className="panel regional-panel" aria-labelledby="regional-title" aria-busy={busy}>
    <div className="panel-header"><div><h2 id="regional-title">Regional Intelligence</h2><p>Labour market ranking by state</p></div>
      <SelectControl label="Regional metric" value={metric} onChange={onMetricChange} compact options={[{ value: 'demand', label: 'Demand' }, { value: 'supply', label: 'Supply' }, { value: 'skill-gap', label: 'Skill gap' }]} />
    </div>
    <div className="regional-content">
      <div className="map-block"><img src="./assets/india-map-illustrative.png" alt="Decorative illustration of India; state shading does not represent the selected metric"/>
        <div className="map-legend map-legend-note"><span><i className="map-dot high"/>Regional</span><span><i className="map-dot medium"/>ranking</span><span><i className="map-dot low"/>data below</span></div>
      </div>
      <div className="state-list"><h3>Top States by {metricLabels[metric]}</h3>
        {rankings?.items?.length ? rankings.items.slice(0, 5).map((state, index) => <div className="state-row" key={state.code || state.name}><span className="rank">{state.rank ?? index + 1}</span><span>{state.name}</span><strong>{state.formattedValue}</strong></div>) : <div className="panel-empty">No regional ranking is available.</div>}
        <button className="button-primary state-cta" onClick={() => onOpenDetail('regional-intelligence')} type="button">View all states <ArrowRight size={15}/></button>
      </div>
    </div>
  </section>;
}

function DataRows({ rows, kind, onOpenRow }: { rows: DashboardRow[]; kind: 'skills' | 'gaps' | 'forecasts'; onOpenRow: (row: DashboardRow, section: string) => void }) {
  const section = kind === 'skills' ? 'emerging-skills' : kind === 'gaps' ? 'skill-gaps' : 'forecasts';
  return <div className={`data-rows data-rows-${kind}`}>
    {rows.map((row) => {
      const Icon = ICONS[row.iconKey] ?? Activity;
      const trailing = row.formattedDelta ?? row.formattedValue;
      const hasValue = trailing !== undefined;
      return <button className="data-row" key={row.id} type="button" onClick={() => onOpenRow(row, section)} aria-label={`Open details for ${row.name}`}>
        <span className={`row-icon tone-${row.tone}`}><Icon size={18}/></span><span className="row-name">{row.name}</span>
        {hasValue ? <strong className={row.formattedDelta ? 'row-delta' : 'row-value'}>{trailing}</strong> : null}
        <span className="bar-track" aria-hidden="true"><span className={`bar-fill tone-${row.tone}`} style={{ width: `${Math.max(0, Math.min(100, row.displayScore ?? 0))}%` }}/></span>
      </button>;
    })}
    {!rows.length && <div className="panel-empty">No rows returned for this section.</div>}
  </div>;
}

function SummaryPanel({ title, subtitle, kind, rows, onOpenSection, onOpenRow }: {
  title: string; subtitle: string; kind: 'skills' | 'gaps' | 'forecasts'; rows: DashboardRow[]; onOpenSection: (section: string) => void; onOpenRow: (row: DashboardRow, section: string) => void;
}) {
  const section = kind === 'skills' ? 'emerging-skills' : kind === 'gaps' ? 'skill-gaps' : 'forecasts';
  return <section className={`panel summary-panel summary-${kind}`}>
    <div className="panel-header"><div><h2>{title}</h2><p>{subtitle}</p></div><button className="button-outline" onClick={() => onOpenSection(section)} type="button">View all <ArrowRight size={14}/></button></div>
    <DataRows rows={rows} kind={kind} onOpenRow={onOpenRow}/>
  </section>;
}

function Sidebar({ active, onNavigate, mobileOpen, onClose }: { active: string; onNavigate: (item: typeof NAV_ITEMS[number] | { label: string; section: string }) => void; mobileOpen: boolean; onClose: () => void }) {
  return <>
    {mobileOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={onClose}/>}
    <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`} aria-label="Main navigation">
      <div className="sidebar-brand mobile-brand"><div className="brand-mark">S</div><div className="brand-copy"><strong>SHRAMIK</strong><span>Labour Market Intelligence</span></div></div>
      <nav className="nav-list">
        {NAV_ITEMS.map((item, index) => {
          const Icon = item.icon;
          return <span className="nav-wrapper" key={item.label}>
            {index === 8 && <span className="nav-divider"/>}
            <button className={`nav-item ${active === item.label ? 'active' : ''}`} type="button" onClick={() => { onNavigate(item); onClose(); }}><Icon size={19}/><span>{item.label}</span></button>
          </span>;
        })}
      </nav>
      <div className="sidebar-art" aria-hidden="true"><img src="./assets/sidebar-workers.png" alt=""/></div>
      <div className="mission-note"><span className="mission-icon"><Lightbulb size={19}/></span><p>Data for people.<br/>Opportunities for a stronger India.</p></div>
    </aside>
  </>;
}

function SearchResults({ results, busy, onSelect }: { results: SearchResult[]; busy: boolean; onSelect: (result: SearchResult) => void }) {
  if (busy) return <div className="search-hint" role="status">Searching connected labour-market data…</div>;
  if (!results.length) return <div className="search-hint">No matching results. Try a skill, occupation, sector or state.</div>;
  return <div className="search-hint search-results" role="listbox" aria-label="Search results">{results.map((result) => <button key={`${result.kind}-${result.id}`} type="button" role="option" onClick={() => onSelect(result)}><strong>{result.label}</strong><small>{result.description}</small></button>)}</div>;
}

function Header({
  regions, region, onRegionChange, onMenu, profile, query, onQueryChange, searchResults, searchBusy, searchOpen, onSearchOpenChange, onSearchSelect,
  notifications, notificationsOpen, onNotificationsToggle, onNotificationRead, profileOpen, onProfileToggle, onOpenSection, adapterMode,
}: {
  regions: RegionOption[]; region: string; onRegionChange: (v: string) => void; onMenu: () => void; profile: UserProfile | null;
  query: string; onQueryChange: (v: string) => void; searchResults: SearchResult[]; searchBusy: boolean; searchOpen: boolean;
  onSearchOpenChange: (v: boolean) => void; onSearchSelect: (result: SearchResult) => void;
  notifications: NotificationItem[]; notificationsOpen: boolean; onNotificationsToggle: () => void; onNotificationRead: (id: string) => void;
  profileOpen: boolean; onProfileToggle: () => void; onOpenSection: (section: string) => void; adapterMode: 'mock' | 'rest';
}) {
  const unreadCount = notifications.filter((item) => !item.read).length;
  const visibleRegionOptions = regions.length ? regions : [{ code: region, label: region, level: 'national' as const }];
  return <header className="topbar">
    <button className="mobile-menu icon-button" onClick={onMenu} type="button" aria-label="Open navigation"><Menu size={22}/></button>
    <div className="brand-lockup"><div className="brand-mark">S</div><div className="brand-word"><strong>SHRAMIK</strong><span>Labour Market<br/>Intelligence System</span></div></div>
    <div className="global-search"><Search size={18}/><input value={query} onFocus={() => onSearchOpenChange(true)} onChange={(event) => { onQueryChange(event.target.value); onSearchOpenChange(true); }} onKeyDown={(event) => { if (event.key === 'Escape') onSearchOpenChange(false); }} placeholder="Search for skills, occupations, sectors or regions…" aria-label="Search labour market data" aria-expanded={searchOpen} aria-controls="shramik-search-results"/><kbd>Ctrl</kbd><kbd>K</kbd>
      {searchOpen && query.trim().length >= 2 && <div id="shramik-search-results"><SearchResults results={searchResults} busy={searchBusy} onSelect={onSearchSelect}/></div>}
      {searchOpen && query.trim().length > 0 && query.trim().length < 2 && <div className="search-hint">Enter at least 2 characters to search.</div>}
    </div>
    <label className="region-select"><MapPin size={18}/><span className="sr-only">Choose region</span><select value={region} onChange={(event) => onRegionChange(event.target.value)} aria-label="Region">{visibleRegionOptions.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}</select><ChevronDown size={14}/></label>
    <div className="header-popover-anchor"><button className="icon-button notification-button" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`} aria-expanded={notificationsOpen} type="button" onClick={onNotificationsToggle}><Bell size={21}/>{unreadCount > 0 && <span className="notification-dot"/>}</button>
      {notificationsOpen && <div className="header-popover notifications-popover"><div className="popover-title"><strong>Notifications</strong><span>{unreadCount} unread</span></div>{notifications.length ? notifications.map((item) => <div key={item.id} className={`notification-item ${item.read ? 'is-read' : ''}`}><span className={`notification-mark severity-${item.severity}`}/><div><strong>{item.title}</strong><p>{item.body}</p><small>{formatUpdated(item.createdAt)}</small></div>{!item.read && <button type="button" aria-label={`Mark ${item.title} read`} onClick={() => onNotificationRead(item.id)}><Check size={15}/></button>}</div>) : <p className="popover-empty">No notifications.</p>}</div>}
    </div>
    <div className="header-popover-anchor"><button className="profile-button" type="button" onClick={onProfileToggle} aria-expanded={profileOpen}><span className="avatar">{profile?.initials ?? 'A'}</span><span className="profile-name"><strong>{profile?.displayName ?? 'Research Analyst'}</strong><small>{profile?.role ?? 'Workspace user'}</small></span><ChevronDown size={14}/></button>
      {profileOpen && <div className="header-popover profile-popover"><div className="profile-card-top"><span className="avatar">{profile?.initials ?? 'A'}</span><div><strong>{profile?.displayName ?? 'Research Analyst'}</strong><small>{profile?.role ?? 'Workspace user'}</small></div></div>{profile?.organisation && <p>{profile.organisation}</p>}<div className="adapter-mode-label">Data adapter: <strong>{adapterMode === 'rest' ? 'Connected REST API' : 'Interactive mock data'}</strong></div><button className="popover-action" type="button" onClick={() => { onOpenSection('profile'); onProfileToggle(); }}>Open profile details <ArrowRight size={14}/></button></div>}
    </div>
  </header>;
}

function DetailDrawer({ detail, loading, error, onClose }: { detail: DetailPayload | null; loading: boolean; error: string; onClose: () => void }) {
  if (!detail && !loading && !error) return null;
  return <div className="detail-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className="detail-drawer" role="dialog" aria-modal="true" aria-labelledby="detail-title">
      <div className="detail-heading"><div><span className="breadcrumb">SHRAMIK / DETAILS</span><h2 id="detail-title">{detail?.title ?? (loading ? 'Loading details' : 'Details unavailable')}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close details"><X/></button></div>
      {loading && <div className="detail-state"><RefreshCw className="spin-icon" size={20}/> Loading connected detail data…</div>}
      {!loading && error && <div className="inline-error"><AlertCircle size={17}/><span>{error}</span></div>}
      {!loading && detail && <>
        <p className="detail-description">{detail.description}</p>
        <div className="detail-facts">{detail.facts.map((fact) => <div key={fact.label}><small>{fact.label}</small><strong>{fact.value}</strong></div>)}</div>
        {detail.table && <div className="detail-table-wrap"><table className="detail-table"><thead><tr>{detail.table.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{detail.table.rows.map((row, index) => <tr key={index}>{detail.table!.columns.map((column) => <td key={column}>{row[column] ?? '—'}</td>)}</tr>)}</tbody></table></div>}
        <div className="detail-provenance"><Info size={16}/><div><strong>{detail.meta.sourceLabel}</strong><p>{detail.meta.provenance === 'source-backed' ? 'Source-backed response' : detail.meta.provenance === 'derived' ? 'Derived analytical value' : detail.meta.provenance === 'mixed' ? 'Mixed source provenance' : 'Mock / illustrative response'} · Updated {formatUpdated(detail.meta.updatedAt)}</p>{detail.meta.notes?.map((note) => <p key={note}>{note}</p>)}</div></div>
      </>}
    </aside>
  </div>;
}


function ModuleRouteFallback({ route }: { route: ShramikRouteId }) {
  return <section className="module-route-placeholder" aria-labelledby="module-route-title">
    <div className="module-route-eyebrow">SHRAMIK / NAVIGATION</div>
    <h1 id="module-route-title">{getRouteLabel(route)}</h1>
    <p>This URL does not match a registered SHRAMIK application route.</p>
    <div className="module-route-status"><span className="module-route-dot"/> Page unavailable</div>
    <p className="module-route-next">Use the shared sidebar to open a known application module.</p>
  </section>;
}

export default function SHRAMIKDashboard({ onNavigate, dataAdapter }: { onNavigate?: (path: string, label: string) => void; dataAdapter?: LabourMarketDataAdapter } = {}) {
  const [defaultAdapter] = useState<LabourMarketDataAdapter>(() => createLabourMarketDataAdapter());
  const adapter = dataAdapter ?? defaultAdapter;
  const [activePage, setActivePage] = useState<ShramikRouteId>(getInitialPage);
  const [active, setActive] = useState(() => getRouteLabel(getInitialPage()));
  const [scenarioMockAdapter] = useState(() => new MockScenarioSimulatorAdapter());
  const scenarioApiConfigured = Boolean((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_SHRAMIK_API_BASE_URL?.trim());
  const scenarioDataAdapter = scenarioApiConfigured ? undefined : scenarioMockAdapter;
  const [dataSourcesAdapter] = useState(() => {
    const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
    const apiBase = env?.VITE_DATA_SOURCES_API_BASE_URL?.trim();
    return apiBase
      ? createRestDataSourcesAdapter(apiBase, {
          createSource: env?.VITE_DATA_SOURCES_ENABLE_CREATE === 'true',
          ingestion: env?.VITE_DATA_SOURCES_ENABLE_INGESTION === 'true',
        })
      : mockDataSourcesAdapter;
  });
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [region, setRegion] = useState('IN');
  const [periodYears, setPeriodYears] = useState<DashboardPeriod>(5);
  const [rankingMetric, setRankingMetric] = useState<RegionMetric>('demand');
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [rankings, setRankings] = useState<RankedRegionsResponse | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [rankingsError, setRankingsError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [detail, setDetail] = useState<DetailPayload | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [parallax, setParallax] = useState(0);
  const hasDashboard = useRef(false);
  const searchQueryController = useRef<AbortController | null>(null);

  const notify = useCallback((message: string) => setToast(message), []);
  const regionLabel = useMemo(() => regions.find((item) => item.code === region)?.label ?? dashboard?.regionName ?? region, [regions, region, dashboard?.regionName]);

  useEffect(() => {
    const syncRoute = () => {
      const page = getInitialPage();
      setActivePage(page);
      setActive(getRouteLabel(page));
    };
    window.addEventListener('hashchange', syncRoute);
    window.addEventListener('popstate', syncRoute);
    return () => { window.removeEventListener('hashchange', syncRoute); window.removeEventListener('popstate', syncRoute); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    Promise.allSettled([adapter.getRegions(controller.signal), adapter.getProfile(controller.signal), adapter.getNotifications(controller.signal)]).then((results) => {
      if (controller.signal.aborted) return;
      if (results[0].status === 'fulfilled') setRegions(results[0].value);
      else notify(`Region list could not load: ${results[0].reason instanceof Error ? results[0].reason.message : 'Unknown error'}`);
      if (results[1].status === 'fulfilled') setProfile(results[1].value);
      if (results[2].status === 'fulfilled') setNotifications(results[2].value);
    });
    return () => controller.abort();
  }, [adapter, notify]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(!hasDashboard.current);
    setRefreshing(hasDashboard.current);
    setError('');
    adapter.getDashboard({ regionCode: region, periodYears, signal: controller.signal }).then((response) => {
      if (controller.signal.aborted) return;
      setDashboard(response);
      hasDashboard.current = true;
      setError('');
    }).catch((reason: unknown) => {
      if (controller.signal.aborted) return;
      setError(reason instanceof Error ? reason.message : 'Dashboard data could not be loaded.');
    }).finally(() => {
      if (!controller.signal.aborted) { setLoading(false); setRefreshing(false); }
    });
    return () => controller.abort();
  }, [adapter, region, periodYears, refreshCounter]);

  useEffect(() => {
    const controller = new AbortController();
    setRankings(null);
    setRankingsError('');
    adapter.getRegionRankings({ regionCode: region, metric: rankingMetric, signal: controller.signal }).then((response) => {
      if (!controller.signal.aborted) setRankings(response);
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setRankingsError(reason instanceof Error ? reason.message : 'Regional ranking data could not be loaded.');
    });
    return () => controller.abort();
  }, [adapter, region, rankingMetric, refreshCounter]);

  useEffect(() => {
    searchQueryController.current?.abort();
    if (query.trim().length < 2) { setSearchResults([]); setSearchBusy(false); return; }
    const controller = new AbortController();
    searchQueryController.current = controller;
    setSearchBusy(true);
    const timer = window.setTimeout(() => {
      adapter.search({ query: query.trim(), regionCode: region, signal: controller.signal }).then((results) => {
        if (!controller.signal.aborted) setSearchResults(results);
      }).catch((reason: unknown) => {
        if (!controller.signal.aborted) { setSearchResults([]); notify(reason instanceof Error ? reason.message : 'Search failed.'); }
      }).finally(() => { if (!controller.signal.aborted) setSearchBusy(false); });
    }, 220);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [adapter, query, region, notify]);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const compact = window.matchMedia('(max-width: 620px)');
    let ticking = false;
    const update = () => {
      if (reduce.matches || compact.matches) { setParallax(0); ticking = false; return; }
      setParallax(Math.max(-18, Math.min(18, window.scrollY * 0.035)));
      ticking = false;
    };
    const onScroll = () => { if (!ticking) { window.requestAnimationFrame(update); ticking = true; } };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 3600); return () => window.clearTimeout(timer); }, [toast]);
  useEffect(() => {
    const closeOverlays = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setSearchOpen(false); setNotificationsOpen(false); setProfileOpen(false); setMobileOpen(false); if (detail || detailLoading || detailError) { setDetail(null); setDetailLoading(false); setDetailError(''); } }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); document.querySelector<HTMLInputElement>('.global-search input')?.focus(); setSearchOpen(true); }
    };
    window.addEventListener('keydown', closeOverlays);
    window.addEventListener('keydown', onKeyDown);
    return () => { window.removeEventListener('keydown', closeOverlays); window.removeEventListener('keydown', onKeyDown); };
  }, [detail, detailLoading, detailError]);

  const closeDetail = useCallback(() => { setDetail(null); setDetailLoading(false); setDetailError(''); }, []);
  const openIndicator = useCallback(async (item: MetricCardData) => {
    setDetail(null); setDetailError(''); setDetailLoading(true);
    try { setDetail(await adapter.getIndicatorDetail(item.id, { regionCode: region })); }
    catch (reason) { setDetailError(reason instanceof Error ? reason.message : 'Indicator detail could not be loaded.'); }
    finally { setDetailLoading(false); }
  }, [adapter, region]);
  const openSection = useCallback(async (section: string) => {
    setDetail(null); setDetailError(''); setDetailLoading(true);
    try { setDetail(await adapter.getSectionDetail(section, { regionCode: region })); }
    catch (reason) { setDetailError(reason instanceof Error ? reason.message : `The ${section} detail could not be loaded.`); }
    finally { setDetailLoading(false); }
  }, [adapter, region]);
  const openRow = useCallback(async (row: DashboardRow, section: string) => {
    setDetail(null); setDetailError(''); setDetailLoading(true);
    try {
      const rowDetail = await adapter.getIndicatorDetail(row.id, { regionCode: region });
      setDetail(rowDetail);
    } catch {
      // Some APIs expose row details via a section payload rather than the indicator endpoint.
      try { setDetail(await adapter.getSectionDetail(section, { regionCode: region })); }
      catch (reason) { setDetailError(reason instanceof Error ? reason.message : `${row.name} details could not be loaded.`); }
    } finally { setDetailLoading(false); }
  }, [adapter, region]);

  const handleNavigate = useCallback((item: typeof NAV_ITEMS[number] | { label: string; section: string }) => {
    const route = item.section as Exclude<ShramikRouteId, 'not-found'>;
    const label = getRouteLabel(route);
    const path = getPathForRoute(route);
    setActive(label);
    setActivePage(route);
    setMobileOpen(false);
    closeDetail();
    setSearchOpen(false);
    setNotificationsOpen(false);
    setProfileOpen(false);
    if (onNavigate) onNavigate(path, label);
    else window.history.pushState(null, '', path);
    window.dispatchEvent(new CustomEvent('shramik:navigate', { detail: { path, label } }));
  }, [closeDetail, onNavigate]);

  const handleSearchSelect = useCallback(async (result: SearchResult) => {
    setQuery(result.label);
    setSearchOpen(false);
    if (result.kind === 'region') {
      setRegion(result.id);
      return;
    }
    setDetail(null); setDetailError(''); setDetailLoading(true);
    try {
      setDetail(await adapter.getIndicatorDetail(result.id, { regionCode: region }));
    } catch {
      const section = sectionForTarget(result.target);
      try { setDetail(await adapter.getSectionDetail(section, { regionCode: region })); }
      catch (reason) { setDetailError(reason instanceof Error ? reason.message : `Search result “${result.label}” could not be loaded.`); }
    } finally { setDetailLoading(false); }
    window.dispatchEvent(new CustomEvent('shramik:search-select', { detail: result }));
  }, [adapter, region]);

  const markRead = useCallback(async (id: string) => {
    try {
      await adapter.markNotificationRead(id);
      setNotifications((items) => items.map((item) => item.id === id ? { ...item, read: true } : item));
    } catch (reason) { notify(reason instanceof Error ? reason.message : 'Could not mark notification as read.'); }
  }, [adapter, notify]);
  const refresh = () => setRefreshCounter((value) => value + 1);
  const handleRegionChange = (value: string) => { setRegion(value); closeDetail(); };
  const handleGapRegionChange = useCallback((value: string) => { setRegion(value); closeDetail(); }, [closeDetail]);
  const handleGapDetail = useCallback((gapDetail: GapDetailPayload) => {
    const provenance = gapDetail.meta.provenance === 'source_backed' ? 'source-backed' : gapDetail.meta.provenance;
    const common: DetailPayload = {
      id: gapDetail.id, title: gapDetail.title, description: gapDetail.description, facts: gapDetail.facts,
      meta: { provenance, sourceLabel: gapDetail.meta.sourceLabel, updatedAt: gapDetail.meta.updatedAt ?? null,
        coverage: gapDetail.meta.coverage?.summary ?? 'Coverage not supplied', notes: gapDetail.meta.notes },
    };
    setDetail(common); setDetailError(''); setDetailLoading(false);
  }, []);
  const handleGapDetailError = useCallback((message: string) => { setDetail(null); setDetailLoading(false); setDetailError(message); }, []);
  const handleRankingMetricChange = (value: RegionMetric) => setRankingMetric(value);

  return <div className={`app-root data-mode-${adapter.mode}`}>
    <Header regions={regions} region={region} onRegionChange={handleRegionChange} onMenu={() => setMobileOpen(true)} profile={profile} query={query} onQueryChange={setQuery} searchResults={searchResults} searchBusy={searchBusy} searchOpen={searchOpen} onSearchOpenChange={setSearchOpen} onSearchSelect={handleSearchSelect} notifications={notifications} notificationsOpen={notificationsOpen} onNotificationsToggle={() => { setNotificationsOpen((value) => !value); setProfileOpen(false); }} onNotificationRead={(id) => void markRead(id)} profileOpen={profileOpen} onProfileToggle={() => { setProfileOpen((value) => !value); setNotificationsOpen(false); }} onOpenSection={(section) => void openSection(section)} adapterMode={adapter.mode}/>
    <div className="app-layout">
      <Sidebar active={active} onNavigate={handleNavigate} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)}/>
      <main className={activePage === 'dashboard' ? 'dashboard-main' : 'dashboard-main module-main'} aria-busy={activePage === 'dashboard' ? loading || refreshing : undefined}>
        {activePage === 'skill-gaps' ? <SkillGapAnalysisPage globalRegionCode={region} onGlobalRegionChange={handleGapRegionChange} onOpenDetail={handleGapDetail} onDetailError={handleGapDetailError}/>
          : activePage === 'forecasts' ? <ForecastsPage globalRegionCode={region} onGlobalRegionChange={handleGapRegionChange}/>
          : activePage === 'reports' ? <ReportsPage />
          : activePage === 'demand' ? <DemandInsightsPage dataAdapter={undefined} embedded onNavigate={(path: string, label?: string) => {
              const target = getRouteFromLocation({ pathname: path, search: '', hash: '' });
              if (target !== 'not-found') handleNavigate({ section: target, label: label || getRouteLabel(target) });
            }}/>
          : activePage === 'emerging-skills' ? <EmergingSkillsPage />
          : activePage === 'scenario-simulator' ? <ScenarioSimulatorPage dataAdapter={scenarioDataAdapter} initialScope={undefined} onNavigate={(path: string) => {
              const target = getRouteFromLocation({ pathname: path, search: '', hash: '' });
              if (target !== 'not-found') handleNavigate({ section: target, label: getRouteLabel(target) });
            }}/>
          : activePage === 'data-sources' ? <DataSourcesPage adapter={dataSourcesAdapter}/>
          : activePage === 'supply' ? <SupplyInsightsPage />
          : activePage === 'data-quality' ? <DataQualityPage />
          : activePage === 'administration' ? <AdministrationPage />
          : activePage === 'dashboard' ? <>
        <section className="hero-band" aria-labelledby="page-title">
          <div className="hero-copy"><div className="breadcrumb">DASHBOARD <span>/</span> {regionLabel.toUpperCase()}</div><h1 id="page-title">India’s Labour Market<br className="desktop-break"/> at a Glance</h1><div className="title-underline"/><p>Key insights on demand, supply, skill gaps and emerging opportunities across sectors and regions.</p></div>
          <div className="hero-art-wrap" style={{ transform: `translate3d(0, ${parallax}px, 0)` }} aria-hidden="true"><img className="hero-art" src="./assets/hero-worker-industrial.png" alt=""/><img className="sticky-note-art" src="./assets/sticky-note-decorative.png" alt=""/><span className="hero-accent-dot"/></div>
        </section>
        {error && <div role="alert" className="data-error"><AlertCircle size={17}/><span><strong>Dashboard data unavailable.</strong> {error}</span><button type="button" onClick={refresh}>Retry</button></div>}
        {rankingsError && <div role="status" className="data-error subtle-error"><AlertCircle size={16}/><span>Regional rankings: {rankingsError}</span><button type="button" onClick={refresh}>Retry</button></div>}
        {loading && !dashboard && <div className="load-strip" role="status"><RefreshCw size={16} className="spin-icon"/> Loading dashboard data from the active adapter…</div>}
        <section className="kpi-grid" aria-label="Key labour market indicators">
          {(dashboard?.kpis ?? []).map((item, index) => <KpiCard key={item.id} item={item} index={index} onOpen={(selected) => void openIndicator(selected)}/>)}
          {loading && !dashboard && Array.from({ length: 4 }, (_, index) => <div className="kpi-skeleton" key={index} aria-hidden="true"/>)}
        </section>
        <section className="middle-grid" aria-label="Market trends and regional intelligence">
          <ChartPanel data={dashboard} periodYears={periodYears} onPeriodChange={setPeriodYears} onOpenDetail={(section) => void openSection(section)}/>
          <RegionalPanel rankings={rankings} metric={rankingMetric} onMetricChange={handleRankingMetricChange} onOpenDetail={(section) => void openSection(section)} busy={!rankings && !rankingsError}/>
        </section>
        <section className="summary-grid" aria-label="Skills, sectors and occupation summaries">
          <SummaryPanel title="Emerging Skills" subtitle="Skills with rising demand signals" kind="skills" rows={dashboard?.emergingSkills ?? []} onOpenSection={(section) => void openSection(section)} onOpenRow={(row, section) => void openRow(row, section)}/>
          <SummaryPanel title="Skill Gaps by Sector" subtitle="Estimated gap (in millions)" kind="gaps" rows={dashboard?.sectorGaps ?? []} onOpenSection={(section) => void openSection(section)} onOpenRow={(row, section) => void openRow(row, section)}/>
          <SummaryPanel title="Occupation Forecasts" subtitle="Projected demand change (2024–2029)" kind="forecasts" rows={dashboard?.occupationForecasts ?? []} onOpenSection={(section) => void openSection(section)} onOpenRow={(row, section) => void openRow(row, section)}/>
        </section>
        <footer className="method-note"><span className="note-marker">i</span><p><strong>{dashboard?.meta.provenance === 'source-backed' ? 'Data notes:' : 'Prototype preview:'}</strong> {dashboard?.meta.provenance === 'source-backed' ? `${dashboard.meta.sourceLabel}. Check the detail panels for source notes, units and coverage.` : 'All numbers currently visible come from an illustrative adapter unless a source-backed API is configured; do not treat them as verified labour-market statistics.'}</p><span className={`data-status-footer ${dashboard?.meta.provenance ?? 'mock'}`}><span className="status-dot"/>{dashboard?.meta.provenance === 'source-backed' ? 'Source-backed' : dashboard?.meta.provenance === 'mixed' ? 'Mixed provenance' : dashboard?.meta.provenance === 'derived' ? 'Derived values' : 'Illustrative data'}</span><span className="updated"><CalendarDays size={14}/>{dashboard?.meta.updatedAt ? formatUpdated(dashboard.meta.updatedAt) : 'Update unavailable'}</span><span className="updated"><Database size={14}/>{adapter.mode === 'rest' ? 'REST API' : 'Mock adapter'}</span><button className="refresh-button" type="button" onClick={refresh} disabled={loading || refreshing} aria-label="Refresh dashboard data"><RefreshCw size={13} className={refreshing ? 'spin-icon' : ''}/> Refresh</button></footer>
        </> : <ModuleRouteFallback route={activePage} />}
      </main>
    </div>
    {toast && <div role="status" className="toast-message"><span>{toast}</span><button type="button" aria-label="Dismiss notification" onClick={() => setToast('')}><X size={15}/></button></div>}
    <DetailDrawer detail={detail} loading={detailLoading} error={detailError} onClose={closeDetail}/>
  </div>;
}
