import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
  Activity, AlertCircle, ArrowRight, Bell, BrainCircuit, Building2, CalendarDays,
  ChartColumn, Check, ChevronDown, ChevronRight, Database, Factory,
  FileText, HeartPulse, Info, Leaf, Lightbulb, MapPin, Menu, RefreshCw, Search,
  Settings, Star, TrendingUp, Truck, Users, Wrench, X, type LucideIcon,
} from 'lucide-react';
import { createLabourMarketDataAdapter } from './api/adapter';
import LoginPage from './auth/LoginPage';
import RequestAccessPage from './auth/RequestAccessPage';
import { restoreAuthSession, signOut as signOutAuth, type AuthSession } from './auth/session';
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
import { createEmergingSkillsDataAdapter } from './emerging-skills/adapter';
import { ScenarioSimulatorPage } from './scenario-simulator/ScenarioSimulatorPage.jsx';
import { MockScenarioSimulatorAdapter } from './scenario-simulator/adapters/MockScenarioSimulatorAdapter.js';
import { RestScenarioSimulatorAdapter } from './scenario-simulator/adapters/RestScenarioSimulatorAdapter.js';
import DemandInsightsPage from './demand/DemandInsightsPage.jsx';
import { DataSourcesPage } from './data-sources/DataSourcesPage.jsx';
import { mockDataSourcesAdapter } from './data-sources/mock-adapter.js';
import { createRestDataSourcesAdapter } from './data-sources/rest-adapter.js';
import { SupabaseDataSourcesAdapter } from './data-sources/supabase-adapter';
import LiveModuleNotice from './LiveModuleNotice';
import SupplyInsightsPage from './supply/SupplyInsightsPage';
import { createSupplyInsightsDataAdapter } from './supply/adapter';
import DataQualityPage from './data-quality/DataQualityPage';
import { createDataQualityDataAdapter } from './data-quality/adapter';
import AdministrationPage from './administration/AdministrationPage';
import { createAdministrationDataAdapter } from './administration/adapter';
import ModuleErrorBoundary from './ModuleErrorBoundary';
import SHRAMIKLandingPage from './landing/SHRAMIKLandingPage';
import DatabaseInsightsPage from './live-data/DatabaseInsightsPage';

type Tone = 'navy' | 'teal' | 'orange';
type SHRAMIKDashboardProps = { onNavigate?: (path: string, label: string) => void; dataAdapter?: LabourMarketDataAdapter };
type SHRAMIKWorkspaceProps = SHRAMIKDashboardProps & {
  authSession: AuthSession | null;
  onAuthSessionChange: (session: AuthSession | null) => void;
};

const ICONS: Record<string, LucideIcon> = {
  activity: Activity, alert: AlertCircle, brain: BrainCircuit, 'brain-circuit': BrainCircuit,
  building: Building2, 'building-2': Building2, chart: ChartColumn, 'chart-column': ChartColumn,
  database: Database, factory: Factory, file: FileText, 'file-text': FileText,
  healthcare: HeartPulse, 'heart-pulse': HeartPulse, leaf: Leaf, lightbulb: Lightbulb,
  settings: Settings, star: Star, truck: Truck, users: Users, wrench: Wrench,
};
const KPI_ICONS: Record<string, LucideIcon> = {
  demand: Users,
  supply: Users,
  'skill-gap': ChartColumn,
  'emerging-skills': BrainCircuit,
  ESHRAM_REGISTRATION_COUNT: Users,
  CTS_PROVISIONAL_SEAT_CAPACITY_BY_TRADE_STATE: Factory,
  CTS_ITI_COUNT: Building2,
  'unemployment-rate': Activity,
  'labour-force-participation': Users,
  'worker-population-ratio': ChartColumn,
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

function profileForSession(session: AuthSession | null, fallback: UserProfile | null): UserProfile | null {
  if (!session) return fallback;
  const metadata = session.user.user_metadata ?? {};
  const metadataName = metadata.full_name;
  const displayName = typeof metadataName === 'string' && metadataName.trim()
    ? metadataName.trim()
    : (session.user.email?.split('@')[0] || 'Authenticated user');
  const parts = displayName.split(/\s+/).filter(Boolean);
  return {
    id: session.user.id,
    displayName,
    role: 'Authenticated user',
    initials: parts.slice(0, 2).map(part => part[0]?.toUpperCase() || '').join('') || 'U',
    organisation: typeof metadata.organization === 'string' ? metadata.organization : 'SHRAMIK workspace',
  };
}

function toneForKpi(item: MetricCardData, _index: number): Tone {
  const tones: Record<string, Tone> = {
    demand: 'navy',
    supply: 'teal',
    'skill-gap': 'orange',
    'emerging-skills': 'teal',
    ESHRAM_REGISTRATION_COUNT: 'navy',
    CTS_PROVISIONAL_SEAT_CAPACITY_BY_TRADE_STATE: 'teal',
    CTS_ITI_COUNT: 'orange',
    'unemployment-rate': 'navy',
    'labour-force-participation': 'teal',
    'worker-population-ratio': 'orange',
  };
  return tones[item.key] ?? 'navy';
}
function formatUpdated(value: string | null | undefined): string {
  if (!value) return 'Update time not supplied';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}
function appAsset(path: string): string {
  const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
  return `${base}${path.replace(/^\/+/, '')}`;
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
      {item.deltaPct === null ? <div className="kpi-change source-context"><span>{item.context}</span></div> : <div className={`kpi-change ${item.deltaPct < 0 ? 'change-negative' : ''}`}><TrendingUp size={18} strokeWidth={2.8}/><strong>{item.deltaPct > 0 ? '+' : ''}{item.deltaPct}%</strong><span>{item.context}</span></div>}
    </div>
    <div className="kpi-spark">{item.trend.length >= 2
      ? <Sparkline values={item.trend} tone={tone} id={item.id} />
      : <span className="kpi-spark-empty" aria-label="Historical trend unavailable">History unavailable</span>}</div>
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
  const programmeMode = data?.trendKind === 'training-programmes';
  const maxValue = Math.max(programmeMode ? 1 : 300, ...points.map((point) => Math.max(point.demand, point.supply)));
  const interval = programmeMode ? (maxValue >= 100000 ? 10000 : maxValue >= 10000 ? 1000 : maxValue >= 1000 ? 100 : 10) : 10;
  const step = Math.ceil(maxValue / 6 / interval) * interval;
  const yMax = step * 6;
  const xFor = (i: number, count: number) => 42 + i * (560 / Math.max(1, count - 1));
  const yFor = (value: number) => 163 - (value / yMax) * 158;
  const demandPts = points.map((point, i) => `${xFor(i, points.length)},${yFor(point.demand)}`).join(' ');
  const supplyPts = points.map((point, i) => `${xFor(i, points.length)},${yFor(point.supply)}`).join(' ');
  const axisLabel = (value: number) => programmeMode
    ? new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
    : String(value);
  const firstTitle = programmeMode ? 'NAPS apprentices engaged' : 'Demand';
  const secondTitle = programmeMode ? 'PMKVY trained / oriented' : 'Supply';
  return <section className="panel trend-panel" aria-labelledby="trend-title" aria-busy={!data}>
    <div className="panel-header"><div>
      <h2 id="trend-title">{programmeMode ? 'Training Programme Trends' : 'Demand vs Supply Trends'}</h2>
      <p>{programmeMode
        ? 'Reported programme counts by fiscal year, not total labour demand or available worker supply. PMKVY reporting coverage varies by year.'
        : 'Estimated labour demand and supply (in millions)'}</p>
    </div>
      <SelectControl label="Trend period" value={periodYears} onChange={onPeriodChange} options={[{ value: 5, label: programmeMode ? 'Available history' : 'Last 5 years' }, { value: 3, label: 'Last 3 years' }]} />
    </div>
    <div className="chart-legend"><span><i className="legend-line demand"/>{firstTitle}</span><span><i className="legend-line supply"/>{secondTitle}</span></div>
    <div className="trend-chart">
      {points.length ? <svg viewBox="0 0 650 210" preserveAspectRatio="none" role="img" aria-label={programmeMode
        ? 'Source-backed NAPS apprentice engagement and PMKVY training counts by fiscal year.'
        : 'Demand and supply trend chart. Values are from the selected data adapter.'}>
        {Array.from({ length: 7 }, (_, i) => i * step).map((value) => <g key={value}><line x1="42" x2="605" y1={yFor(value)} y2={yFor(value)} className="chart-grid"/><text x="30" y={yFor(value) + 4} className="chart-axis" textAnchor="end">{axisLabel(value)}</text></g>)}
        {points.map((point, i) => <g key={point.label ?? point.year}><line x1={xFor(i, points.length)} x2={xFor(i, points.length)} y1="5" y2="163" className="chart-vgrid"/><text x={xFor(i, points.length)} y="190" className="chart-axis" textAnchor="middle">{point.label ?? point.year}</text></g>)}
        <polyline points={demandPts} className="chart-demand"/><polyline points={supplyPts} className="chart-supply"/>
        {points.map((point, i) => <circle key={`d-${point.label ?? point.year}`} cx={xFor(i, points.length)} cy={yFor(point.demand)} r="4.2" className="point-demand"/>)}
        {points.map((point, i) => <circle key={`s-${point.label ?? point.year}`} cx={xFor(i, points.length)} cy={yFor(point.supply)} r="4.2" className="point-supply"/>)}
      </svg> : <div className="panel-empty" role="status">{data?.meta.provenance === 'source-backed'
        ? 'No comparable time-series is available for this geography yet. The source-backed indicator cards above remain available; demand/supply charts appear only after compatible observations have been validated.'
        : 'No historical trend is available for this selection yet. A chart will appear once the active data source provides enough comparable observations.'}</div>}
      <button className="chart-next" type="button" aria-label={programmeMode ? 'Open training programme context' : 'Open detailed demand and supply trends'} onClick={() => onOpenDetail(programmeMode ? 'supply' : 'demand')}><ChevronRight size={18}/></button>
    </div>
  </section>;
}

function RegionalPanel({ rankings, metric, onMetricChange, onOpenDetail, busy }: {
  rankings: RankedRegionsResponse | null; metric: RegionMetric; onMetricChange: (metric: RegionMetric) => void; onOpenDetail: (section: string) => void; busy: boolean;
}) {
  const sourceBacked = Boolean(rankings?.meta.sourceLabel.startsWith('SHRAMIK Supabase source observations'));
  const metricLabels: Record<RegionMetric, string> = sourceBacked
    ? { demand: 'e-Shram registrations', supply: 'Provisional CTS seats', 'skill-gap': 'ITI count' }
    : { demand: 'Demand', supply: 'Supply', 'skill-gap': 'Skill gap' };
  return <section className="panel regional-panel" aria-labelledby="regional-title" aria-busy={busy}>
    <div className="panel-header"><div><h2 id="regional-title">Regional Intelligence</h2><p>{sourceBacked ? 'Published state / UT indicators · source coverage applies' : 'Labour market ranking by state'}</p></div>
      <SelectControl label="Regional metric" value={metric} onChange={onMetricChange} compact options={[{ value: 'demand', label: metricLabels.demand }, { value: 'supply', label: metricLabels.supply }, { value: 'skill-gap', label: metricLabels['skill-gap'] }]} />
    </div>
    <div className="regional-content">
      <div className="map-block"><img src={appAsset("assets/india-map-illustrative.png")} alt="Decorative illustration of India; state shading does not represent the selected metric"/>
        <div className="map-legend map-legend-note"><span><i className="map-dot high"/>Regional</span><span><i className="map-dot medium"/>ranking</span><span><i className="map-dot low"/>data below</span></div>
      </div>
      <div className="state-list"><h3>Top States by {metricLabels[metric]}</h3>
        {busy && !rankings ? <div className="panel-empty" role="status">Loading regional ranking…</div> : rankings?.items?.length ? rankings.items.slice(0, 5).map((state, index) => <div className="state-row" key={state.code || state.name}><span className="rank">{state.rank ?? index + 1}</span><span>{state.name}</span><strong>{state.formattedValue}</strong></div>) : <div className="panel-empty">No regional ranking is available for this metric and geography.</div>}
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
        {row.displayScore !== undefined ? <span className="bar-track" aria-hidden="true"><span className={`bar-fill tone-${row.tone}`} style={{ width: `${Math.max(0, Math.min(100, row.displayScore))}%` }}/></span> : null}
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
  const asideRef = useRef<HTMLElement>(null);
  const wasMobileOpen = useRef(false);
  const [mobileLayout, setMobileLayout] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 980px)').matches);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 980px)');
    const update = () => setMobileLayout(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const aside = asideRef.current;
    aside?.toggleAttribute('inert', mobileLayout && !mobileOpen);
    if (mobileLayout && mobileOpen) {
      aside?.querySelector<HTMLButtonElement>('.nav-item')?.focus();
    } else if (mobileLayout && wasMobileOpen.current && !mobileOpen) {
      document.querySelector<HTMLButtonElement>('.mobile-menu')?.focus();
    }
    wasMobileOpen.current = mobileOpen;
  }, [mobileLayout, mobileOpen]);

  const handleSidebarKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (!mobileLayout || !mobileOpen || event.key !== 'Tab') return;
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('.nav-item'));
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return <>
    {mobileOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={onClose}/>}
    <aside id="shramik-sidebar" ref={asideRef} className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`} aria-label="Main navigation" onKeyDown={handleSidebarKeyDown}>
      <div className="sidebar-brand mobile-brand"><div className="brand-mark">S</div><div className="brand-copy"><strong>SHRAMIK</strong><span>Labour Market Intelligence</span></div></div>
      <nav className="nav-list">
        {NAV_ITEMS.map((item, index) => {
          const Icon = item.icon;
          return <span className="nav-wrapper" key={item.label}>
            {index === 8 && <span className="nav-divider"/>}
            <button className={`nav-item ${active === item.label ? 'active' : ''}`} aria-current={active === item.label ? 'page' : undefined} type="button" onClick={() => { onNavigate(item); onClose(); }}><Icon size={19}/><span>{item.label}</span></button>
          </span>;
        })}
      </nav>
      <div className="sidebar-art" aria-hidden="true"><img src={appAsset("assets/sidebar-workers.png")} alt=""/></div>
      <div className="mission-note"><span className="mission-icon"><Lightbulb size={19}/></span><p>Data for people.<br/>Opportunities for a stronger India.</p></div>
    </aside>
  </>;
}

function SearchResults({ results, busy, activeIndex, onSelect }: { results: SearchResult[]; busy: boolean; activeIndex: number; onSelect: (result: SearchResult) => void }) {
  if (busy) return <div className="search-hint" role="status" aria-live="polite">Searching connected labour-market data…</div>;
  if (!results.length) return <div className="search-hint" role="status" aria-live="polite">No matching results. Try a skill, occupation, sector or state.</div>;
  return <div className="search-hint search-results" role="listbox" aria-label="Search results">{results.map((result, index) => <button id={'shramik-search-option-' + index} key={result.kind + '-' + result.id} type="button" role="option" aria-selected={index === activeIndex} onClick={() => onSelect(result)}><strong>{result.label}</strong><small>{result.description}</small></button>)}</div>;
}

function Header({
  regions, region, onRegionChange, onMenu, mobileOpen, mobileSearchOpen, onMobileSearchToggle, profile, query, onQueryChange, searchResults, searchBusy, searchOpen, onSearchOpenChange, onSearchSelect,
  notifications, notificationsOpen, onNotificationsToggle, onNotificationRead, profileOpen, onProfileToggle, onOpenSection, adapterMode,
  authSession, onNavigateRoute, onSignOut,
}: {
  regions: RegionOption[]; region: string; onRegionChange: (v: string) => void; onMenu: () => void; mobileOpen: boolean; mobileSearchOpen: boolean; onMobileSearchToggle: () => void; profile: UserProfile | null;
  query: string; onQueryChange: (v: string) => void; searchResults: SearchResult[]; searchBusy: boolean; searchOpen: boolean;
  onSearchOpenChange: (v: boolean) => void; onSearchSelect: (result: SearchResult) => void;
  notifications: NotificationItem[]; notificationsOpen: boolean; onNotificationsToggle: () => void; onNotificationRead: (id: string) => void;
  profileOpen: boolean; onProfileToggle: () => void; onOpenSection: (section: string) => void; adapterMode: 'mock' | 'rest' | 'supabase';
  authSession: AuthSession | null; onNavigateRoute: (route: 'dashboard' | 'login' | 'request-access') => void; onSignOut: () => void;
}) {
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const [activeSearchIndex, setActiveSearchIndex] = useState(-1);
  useEffect(() => {
    if (mobileSearchOpen) mobileSearchInputRef.current?.focus();
  }, [mobileSearchOpen]);
  useEffect(() => {
    setActiveSearchIndex(-1);
  }, [searchResults]);

  const unreadCount = notifications.filter((item) => !item.read).length;
  const visibleRegionOptions = regions.length ? regions : [{ code: region, label: region, level: 'national' as const }];
  return <header className="topbar">
    <button className="mobile-menu icon-button" onClick={onMenu} type="button" aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileOpen} aria-controls="shramik-sidebar"><Menu size={22}/></button>
    <div className="brand-lockup"><div className="brand-mark">S</div><div className="brand-word"><strong>SHRAMIK</strong><span>Labour Market<br/>Intelligence System</span></div></div>
    <button className="mobile-search-toggle icon-button" onClick={onMobileSearchToggle} type="button" aria-label={mobileSearchOpen ? 'Close search' : 'Open search'} aria-expanded={mobileSearchOpen} aria-controls="shramik-mobile-search"><Search size={19}/></button>
    <div id="shramik-mobile-search" className={`global-search ${mobileSearchOpen ? 'mobile-search-open' : ''}`}><Search size={18}/><input ref={mobileSearchInputRef} value={query} onFocus={() => onSearchOpenChange(true)} onChange={(event) => { onQueryChange(event.target.value); onSearchOpenChange(true); }} onKeyDown={(event) => {
      if (event.key === 'Escape') { onSearchOpenChange(false); return; }
      if (event.key === 'ArrowDown' && query.trim().length >= 2 && searchResults.length) {
        event.preventDefault();
        onSearchOpenChange(true);
        setActiveSearchIndex((index) => index < 0 ? 0 : (index + 1) % searchResults.length);
      } else if (event.key === 'ArrowUp' && query.trim().length >= 2 && searchResults.length) {
        event.preventDefault();
        onSearchOpenChange(true);
        setActiveSearchIndex((index) => index <= 0 ? searchResults.length - 1 : index - 1);
      } else if (event.key === 'Enter' && searchOpen && activeSearchIndex >= 0 && searchResults[activeSearchIndex]) {
        event.preventDefault();
        onSearchSelect(searchResults[activeSearchIndex]);
      }
    }} aria-label="Search labour market data" role="combobox" aria-autocomplete="list" aria-expanded={searchOpen} aria-controls="shramik-search-results" aria-activedescendant={searchOpen && activeSearchIndex >= 0 && query.trim().length >= 2 ? 'shramik-search-option-' + activeSearchIndex : undefined} placeholder="Search for skills, occupations, sectors or regions…"/><kbd>Ctrl</kbd><kbd>K</kbd>
      {searchOpen && query.trim().length >= 2 && <div id="shramik-search-results"><SearchResults results={searchResults} busy={searchBusy} activeIndex={activeSearchIndex} onSelect={onSearchSelect}/></div>}
      {searchOpen && query.trim().length > 0 && query.trim().length < 2 && <div className="search-hint">Enter at least 2 characters to search.</div>}
    </div>
    <label className="region-select"><MapPin size={18}/><span className="sr-only">Choose region</span><select value={region} onChange={(event) => onRegionChange(event.target.value)} aria-label="Region">{visibleRegionOptions.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}</select><ChevronDown size={14}/></label>
    <div className="header-popover-anchor"><button className="icon-button notification-button" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`} aria-expanded={notificationsOpen} type="button" onClick={onNotificationsToggle}><Bell size={21}/>{unreadCount > 0 && <span className="notification-dot"/>}</button>
      {notificationsOpen && <div className="header-popover notifications-popover"><div className="popover-title"><strong>Notifications</strong><span>{unreadCount} unread</span></div>{notifications.length ? notifications.map((item) => <div key={item.id} className={`notification-item ${item.read ? 'is-read' : ''}`}><span className={`notification-mark severity-${item.severity}`}/><div><strong>{item.title}</strong><p>{item.body}</p><small>{formatUpdated(item.createdAt)}</small></div>{!item.read && <button type="button" aria-label={`Mark ${item.title} read`} onClick={() => onNotificationRead(item.id)}><Check size={15}/></button>}</div>) : <p className="popover-empty">No notifications.</p>}</div>}
    </div>
    <div className="header-popover-anchor"><button className="profile-button" type="button" onClick={onProfileToggle} aria-expanded={profileOpen}><span className="avatar">{profile?.initials ?? 'A'}</span><span className="profile-name"><strong>{profile?.displayName ?? 'Research Analyst'}</strong><small>{profile?.role ?? 'Workspace user'}</small></span><ChevronDown size={14}/></button>
      {profileOpen && <div className="header-popover profile-popover"><div className="profile-card-top"><span className="avatar">{profile?.initials ?? 'A'}</span><div><strong>{profile?.displayName ?? 'Research Analyst'}</strong><small>{profile?.role ?? 'Workspace user'}</small></div></div>{profile?.organisation && <p>{profile.organisation}</p>}<div className="adapter-mode-label">Data adapter: <strong>{adapterMode === 'rest' ? 'Connected source API' : adapterMode === 'supabase' ? 'Supabase live data' : 'Interactive mock data'}</strong></div>{authSession ? <button className="popover-action" type="button" onClick={onSignOut}>Sign out <ArrowRight size={14}/></button> : <><button className="popover-action" type="button" onClick={() => onNavigateRoute('login')}>Sign in <ArrowRight size={14}/></button><button className="popover-action" type="button" onClick={() => onNavigateRoute('request-access')}>Request workspace access <ArrowRight size={14}/></button></>}<button className="popover-action" type="button" onClick={() => { onOpenSection('profile'); onProfileToggle(); }}>Open profile details <ArrowRight size={14}/></button></div>}
    </div>
  </header>;
}

function DetailDrawer({ detail, loading, error, onClose }: { detail: DetailPayload | null; loading: boolean; error: string; onClose: () => void }) {
  const isOpen = Boolean(detail || loading || error);
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      const active = document.activeElement;
      returnFocusRef.current = active instanceof HTMLElement ? active : null;
      wasOpenRef.current = true;
      closeButtonRef.current?.focus();
    } else if (!isOpen && wasOpenRef.current) {
      const target = returnFocusRef.current;
      if (target?.isConnected) target.focus();
      returnFocusRef.current = null;
      wasOpenRef.current = false;
    }
  }, [isOpen]);

  if (!isOpen) return null;
  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Tab') return;
    const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )).filter((element) => element.tabIndex >= 0);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return <div className="detail-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <aside ref={dialogRef} className="detail-drawer" role="dialog" aria-modal="true" aria-labelledby="detail-title" onKeyDown={handleDialogKeyDown}>
      <div className="detail-heading"><div><span className="breadcrumb">SHRAMIK / DETAILS</span><h2 id="detail-title">{detail?.title ?? (loading ? 'Loading details' : 'Details unavailable')}</h2></div><button ref={closeButtonRef} className="icon-button" type="button" onClick={onClose} aria-label="Close details"><X/></button></div>
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

function SHRAMIKWorkspace({ onNavigate, dataAdapter, authSession, onAuthSessionChange }: SHRAMIKWorkspaceProps) {
  const runtimeEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const demoMode = runtimeEnv?.VITE_SHRAMIK_USE_DEMO_DATA === 'true';
  const [defaultAdapter] = useState<LabourMarketDataAdapter>(() => createLabourMarketDataAdapter());
  const adapter = dataAdapter ?? defaultAdapter;
  const [activePage, setActivePage] = useState<ShramikRouteId>(getInitialPage);
  const [active, setActive] = useState(() => getRouteLabel(getInitialPage()));
  const [scenarioMockAdapter] = useState(() => new MockScenarioSimulatorAdapter());
  const [scenarioDataAdapter] = useState(() => {
    const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
    const apiBase = env?.VITE_SCENARIO_SIMULATOR_API_BASE_URL?.trim();
    return apiBase ? new RestScenarioSimulatorAdapter(apiBase) : scenarioMockAdapter;
  });
  const [emergingSkillsAdapter] = useState(() => createEmergingSkillsDataAdapter());
  const [supplyAdapter] = useState(() => createSupplyInsightsDataAdapter());
  const [dataQualityAdapter] = useState(() => createDataQualityDataAdapter());
  const [administrationAdapter] = useState(() => createAdministrationDataAdapter());
  const [dataSourcesAdapter] = useState(() => {
    const apiBase = runtimeEnv?.VITE_DATA_SOURCES_API_BASE_URL?.trim();
    if (apiBase) {
      return createRestDataSourcesAdapter(apiBase, {
        createSource: runtimeEnv?.VITE_DATA_SOURCES_ENABLE_CREATE === 'true',
        ingestion: runtimeEnv?.VITE_DATA_SOURCES_ENABLE_INGESTION === 'true',
      });
    }
    return demoMode ? mockDataSourcesAdapter : new SupabaseDataSourcesAdapter();
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
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
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
  const isLiveSupabase = adapter.mode === 'supabase';
  const headerProfile = useMemo(() => profileForSession(authSession, profile), [authSession, profile]);
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
      if (event.key === 'Escape') {
        const mobileSearchWasOpen = Boolean(document.querySelector('.global-search.mobile-search-open'));
        const notificationsWereOpen = Boolean(document.querySelector('.notifications-popover'));
        const profileWasOpen = Boolean(document.querySelector('.profile-popover'));
        setSearchOpen(false);
        setMobileSearchOpen(false);
        setNotificationsOpen(false);
        setProfileOpen(false);
        setMobileOpen(false);
        if (mobileSearchWasOpen) document.querySelector<HTMLButtonElement>('.mobile-search-toggle')?.focus();
        else if (profileWasOpen) document.querySelector<HTMLButtonElement>('.profile-button')?.focus();
        else if (notificationsWereOpen) document.querySelector<HTMLButtonElement>('.notification-button')?.focus();
        if (detail || detailLoading || detailError) { setDetail(null); setDetailLoading(false); setDetailError(''); }
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        const searchInput = document.querySelector<HTMLInputElement>('.global-search input');
        // The desktop search is hidden on narrow screens; never send keyboard focus into an invisible control.
        if (searchInput && searchInput.getClientRects().length > 0) {
          event.preventDefault();
          searchInput.focus();
          setSearchOpen(true);
        }
      }
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

  const handleMobileSearchToggle = useCallback(() => {
    const next = !mobileSearchOpen;
    setMobileSearchOpen(next);
    setSearchOpen(next);
    if (next) setMobileOpen(false);
    setNotificationsOpen(false);
    setProfileOpen(false);
  }, [mobileSearchOpen]);

  const handleMobileMenuToggle = useCallback(() => {
    const next = !mobileOpen;
    setMobileOpen(next);
    if (next) {
      setMobileSearchOpen(false);
      setSearchOpen(false);
      setNotificationsOpen(false);
      setProfileOpen(false);
    }
  }, [mobileOpen]);

  const handleNavigate = useCallback((item: typeof NAV_ITEMS[number] | { label: string; section: string }) => {
    const route = item.section as Exclude<ShramikRouteId, 'not-found'>;
    const label = getRouteLabel(route);
    const path = getPathForRoute(route, import.meta.env.BASE_URL);
    setActive(label);
    setActivePage(route);
    setMobileOpen(false);
    setMobileSearchOpen(false);
    closeDetail();
    setSearchOpen(false);
    setNotificationsOpen(false);
    setProfileOpen(false);
    if (onNavigate) onNavigate(path, label);
    else window.history.pushState(null, '', path);
    window.dispatchEvent(new CustomEvent('shramik:navigate', { detail: { path, label } }));
  }, [closeDetail, onNavigate]);

  const navigateAuthRoute = useCallback((route: 'dashboard' | 'login' | 'request-access') => {
    handleNavigate({ section: route, label: getRouteLabel(route) });
  }, [handleNavigate]);
  const handleSignOut = useCallback(() => {
    const finishSignOut = (message: string) => {
      onAuthSessionChange(null);
      setProfile(null);
      notify(message);
      const path = getPathForRoute('login', import.meta.env.BASE_URL);
      window.history.replaceState(null, '', path);
      window.dispatchEvent(new CustomEvent('shramik:navigate', { detail: { path, label: getRouteLabel('login') } }));
    };
    void signOutAuth(authSession)
      .then(() => finishSignOut('Signed out of SHRAMIK.'))
      .catch(() => finishSignOut('Local sign-in session cleared. The authentication service could not be reached to close the remote session.'));
  }, [authSession, onAuthSessionChange, notify]);

  const handleSearchSelect = useCallback(async (result: SearchResult) => {
    setQuery(result.label);
    setMobileSearchOpen(false);
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

  // Public routes are rendered by the parent. Never mount auth pages inside the workspace shell.
  if (activePage === 'login' || activePage === 'request-access') return null;

  return <div className={`app-root data-mode-${adapter.mode}`}>
    <Header regions={regions} region={region} onRegionChange={handleRegionChange} onMenu={handleMobileMenuToggle} mobileOpen={mobileOpen} mobileSearchOpen={mobileSearchOpen} onMobileSearchToggle={handleMobileSearchToggle} profile={headerProfile} query={query} onQueryChange={setQuery} searchResults={searchResults} searchBusy={searchBusy} searchOpen={searchOpen} onSearchOpenChange={setSearchOpen} onSearchSelect={handleSearchSelect} notifications={notifications} notificationsOpen={notificationsOpen} onNotificationsToggle={() => { setNotificationsOpen((value) => !value); setProfileOpen(false); }} onNotificationRead={(id) => void markRead(id)} profileOpen={profileOpen} onProfileToggle={() => { setProfileOpen((value) => !value); setNotificationsOpen(false); }} onOpenSection={(section) => void openSection(section)} adapterMode={adapter.mode} authSession={authSession} onNavigateRoute={navigateAuthRoute} onSignOut={handleSignOut}/>
    <div className="app-layout">
      <Sidebar active={active} onNavigate={handleNavigate} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)}/>
      <main className={activePage === 'dashboard' ? 'dashboard-main' : 'dashboard-main module-main'} aria-busy={activePage === 'dashboard' ? loading || refreshing : undefined}>
        <ModuleErrorBoundary key={activePage} moduleName={getRouteLabel(activePage)} onReturnDashboard={() => handleNavigate({ label: 'Dashboard', section: 'dashboard' })}>
        {activePage === 'skill-gaps' ? (demoMode
              ? <SkillGapAnalysisPage globalRegionCode={region} onGlobalRegionChange={handleGapRegionChange} onOpenDetail={handleGapDetail} onDetailError={handleGapDetailError}/>
              : <DatabaseInsightsPage module="skill-gaps" regionCode={region} onNavigate={(route: string) => { const target = getRouteFromLocation({ pathname: '/' + route.replace(/^\//, ''), search: '', hash: '' }); if (target !== 'not-found') handleNavigate({ section: target, label: getRouteLabel(target) }); }}/>)
          : activePage === 'forecasts' ? (demoMode
              ? <ForecastsPage globalRegionCode={region} onGlobalRegionChange={handleGapRegionChange}/>
              : <DatabaseInsightsPage module="forecasts" regionCode={region} onNavigate={(route: string) => { const target = getRouteFromLocation({ pathname: '/' + route.replace(/^\//, ''), search: '', hash: '' }); if (target !== 'not-found') handleNavigate({ section: target, label: getRouteLabel(target) }); }}/>)
          : activePage === 'reports' ? (demoMode
              ? <ReportsPage />
              : <DatabaseInsightsPage module="reports" regionCode={region} onNavigate={(route: string) => { const target = getRouteFromLocation({ pathname: '/' + route.replace(/^\//, ''), search: '', hash: '' }); if (target !== 'not-found') handleNavigate({ section: target, label: getRouteLabel(target) }); }}/>)
          : activePage === 'demand' ? (demoMode
              ? <DemandInsightsPage dataAdapter={undefined} embedded onNavigate={(path: string, label?: string) => {
                  const target = getRouteFromLocation({ pathname: path, search: '', hash: '' });
                  if (target !== 'not-found') handleNavigate({ section: target, label: label || getRouteLabel(target) });
                }}/>
              : <DatabaseInsightsPage module="demand" regionCode={region} onNavigate={(route: string) => { const target = getRouteFromLocation({ pathname: '/' + route.replace(/^\//, ''), search: '', hash: '' }); if (target !== 'not-found') handleNavigate({ section: target, label: getRouteLabel(target) }); }}/>)
          : activePage === 'emerging-skills' ? (demoMode
              ? <EmergingSkillsPage dataAdapter={emergingSkillsAdapter} />
              : <DatabaseInsightsPage module="emerging-skills" regionCode={region} onNavigate={(route: string) => { const target = getRouteFromLocation({ pathname: '/' + route.replace(/^\//, ''), search: '', hash: '' }); if (target !== 'not-found') handleNavigate({ section: target, label: getRouteLabel(target) }); }}/>)
          : activePage === 'scenario-simulator' ? (demoMode
              ? <ScenarioSimulatorPage dataAdapter={scenarioDataAdapter} initialScope={undefined} onNavigate={(path: string) => {
                  const target = getRouteFromLocation({ pathname: path, search: '', hash: '' });
                  if (target !== 'not-found') handleNavigate({ section: target, label: getRouteLabel(target) });
                }}/>
              : <DatabaseInsightsPage module="scenario-simulator" regionCode={region} onNavigate={(route: string) => { const target = getRouteFromLocation({ pathname: '/' + route.replace(/^\//, ''), search: '', hash: '' }); if (target !== 'not-found') handleNavigate({ section: target, label: getRouteLabel(target) }); }}/>)
          : activePage === 'data-sources' ? <DataSourcesPage adapter={dataSourcesAdapter}/>
          : activePage === 'supply' ? (demoMode
              ? <SupplyInsightsPage adapter={supplyAdapter} />
              : <DatabaseInsightsPage module="supply" regionCode={region} onNavigate={(route: string) => { const target = getRouteFromLocation({ pathname: '/' + route.replace(/^\//, ''), search: '', hash: '' }); if (target !== 'not-found') handleNavigate({ section: target, label: getRouteLabel(target) }); }}/>)
          : activePage === 'data-quality' ? (demoMode
              ? <DataQualityPage adapter={dataQualityAdapter} />
              : <DatabaseInsightsPage module="data-quality" regionCode={region} onNavigate={(route: string) => { const target = getRouteFromLocation({ pathname: '/' + route.replace(/^\//, ''), search: '', hash: '' }); if (target !== 'not-found') handleNavigate({ section: target, label: getRouteLabel(target) }); }}/>)
          : activePage === 'administration' ? (!demoMode && !runtimeEnv?.VITE_ADMINISTRATION_API_BASE_URL?.trim()
              ? <LiveModuleNotice title="Administration" eyebrow="SHRAMIK / GOVERNANCE & ACCESS" explanation="Access-request submissions are stored as pending, but this public client cannot read the queue, approve requests or grant roles. A server-authorized review/provisioning API is not configured." requiredSetting="VITE_ADMINISTRATION_API_BASE_URL" neededOutput="Deploy an authenticated admin API that checks server-side administrator authorization, records review decisions, provisions accounts through Supabase Auth and writes audit events."/>
              : <AdministrationPage adapter={administrationAdapter} />)
          : activePage === 'dashboard' ? <>
        <section className="hero-band" aria-labelledby="page-title">
          <div className="hero-copy"><div className="breadcrumb">DASHBOARD <span>/</span> {regionLabel.toUpperCase()}</div><h1 id="page-title">India’s Labour Market<br className="desktop-break"/> at a Glance</h1><div className="title-underline"/><p>{isLiveSupabase ? 'Published workforce indicators, official registration snapshots and training-capacity context, with source dates and limitations.' : 'Key insights on demand, supply, skill gaps and emerging opportunities across sectors and regions.'}</p></div>
          <div className="hero-art-wrap" style={{ transform: `translate3d(0, ${parallax}px, 0)` }} aria-hidden="true"><img className="hero-art" src={appAsset("assets/hero-worker-industrial.png")} alt=""/><img className="sticky-note-art" src={appAsset("assets/sticky-note-decorative.png")} alt=""/><span className="hero-accent-dot"/></div>
        </section>
        {error && <div role="alert" className="data-error"><AlertCircle size={17}/><span><strong>Dashboard data unavailable.</strong> {error}</span><button type="button" onClick={refresh}>Retry</button></div>}
        {rankingsError && <div role="status" className="data-error subtle-error"><AlertCircle size={16}/><span>Regional rankings: {rankingsError}</span><button type="button" onClick={refresh}>Retry</button></div>}
        {loading && !dashboard && <div className="load-strip" role="status"><RefreshCw size={16} className="spin-icon"/> Loading dashboard data from the active adapter…</div>}
        <section className="kpi-grid" aria-label="Key labour market indicators">
          {(dashboard?.kpis ?? []).map((item, index) => <KpiCard key={item.id} item={item} index={index} onOpen={(selected) => void openIndicator(selected)}/>)}
          {loading && !dashboard && Array.from({ length: 4 }, (_, index) => <div className="kpi-skeleton" key={index} aria-hidden="true"/>)}
          {dashboard && dashboard.kpis.length === 0 ? <div className="kpi-empty-state" role="status"><span>No source-backed KPI cards are available for this selection yet. The published view and source-backed observations returned no displayable indicators.</span><button type="button" onClick={refresh} disabled={loading || refreshing}>Retry</button></div> : null}
        </section>
        <section className="middle-grid" aria-label="Market trends and regional intelligence">
          <ChartPanel data={dashboard} periodYears={periodYears} onPeriodChange={setPeriodYears} onOpenDetail={(section) => void openSection(section)}/>
          <RegionalPanel rankings={rankings} metric={rankingMetric} onMetricChange={handleRankingMetricChange} onOpenDetail={(section) => void openSection(section)} busy={!rankings && !rankingsError}/>
        </section>
        <section className="summary-grid" aria-label="Skills, sectors and occupation summaries">
          <SummaryPanel
            title={isLiveSupabase ? 'Skill catalogue' : 'Emerging Skills'}
            subtitle={isLiveSupabase ? 'Canonical skill references from Supabase. No validated emerging-skill signals are published yet.' : 'Skills with rising demand signals'}
            kind="skills" rows={dashboard?.emergingSkills ?? []}
            onOpenSection={(section) => void openSection(section)}
            onOpenRow={(row, section) => void openRow(row, section)}/>
          <SummaryPanel
            title={isLiveSupabase ? 'Sector coverage' : 'Skill Gaps by Sector'}
            subtitle={isLiveSupabase ? 'Mapped sector references from Supabase. Comparable demand/supply observations are needed to calculate a gap.' : 'Estimated gap (in millions)'}
            kind="gaps" rows={dashboard?.sectorGaps ?? []}
            onOpenSection={(section) => void openSection(section)}
            onOpenRow={(row, section) => void openRow(row, section)}/>
          <SummaryPanel
            title={isLiveSupabase ? 'Training programme context' : 'Occupation Forecasts'}
            subtitle={isLiveSupabase ? 'Source-backed NAPS and PMKVY counts; these are contextual inputs, not occupation forecasts.' : 'Projected demand change (2024–2029)'}
            kind="forecasts" rows={dashboard?.occupationForecasts ?? []}
            onOpenSection={(section) => void openSection(section)}
            onOpenRow={(row, section) => void openRow(row, section)}/>
        </section>
        <footer className="method-note"><span className="note-marker">i</span><p><strong>{dashboard?.meta.provenance === 'source-backed' ? 'Data notes:' : 'Prototype preview:'}</strong> {dashboard?.meta.provenance === 'source-backed' ? `${dashboard.meta.sourceLabel}. Check the detail panels for source notes, units and coverage.` : 'All numbers currently visible come from an illustrative adapter unless a source-backed API is configured; do not treat them as verified labour-market statistics.'}</p><span className={`data-status-footer ${dashboard?.meta.provenance ?? 'mock'}`}><span className="status-dot"/>{dashboard?.meta.provenance === 'source-backed' ? 'Source-backed' : dashboard?.meta.provenance === 'mixed' ? 'Mixed provenance' : dashboard?.meta.provenance === 'derived' ? 'Derived values' : 'Illustrative data'}</span><span className="updated"><CalendarDays size={14}/>{dashboard?.meta.updatedAt ? formatUpdated(dashboard.meta.updatedAt) : 'Update unavailable'}</span><span className="updated"><Database size={14}/>{adapter.mode === 'rest' ? 'REST API' : adapter.mode === 'supabase' ? 'Supabase live data' : 'Mock adapter'}</span><button className="refresh-button" type="button" onClick={refresh} disabled={loading || refreshing} aria-label="Refresh dashboard data"><RefreshCw size={13} className={refreshing ? 'spin-icon' : ''}/> Refresh</button></footer>
        </> : <ModuleRouteFallback route={activePage} />}
        </ModuleErrorBoundary>
      </main>
    </div>
    {toast && <div role="status" className="toast-message"><span>{toast}</span><button type="button" aria-label="Dismiss notification" onClick={() => setToast('')}><X size={15}/></button></div>}
    <DetailDrawer detail={detail} loading={detailLoading} error={detailError} onClose={closeDetail}/>
  </div>;
}

function PublicAuthRoute({ route, onAuthenticated }: {
  route: 'login' | 'request-access';
  onAuthenticated: (session: AuthSession) => void;
}) {
  const navigate = useCallback((target: 'landing' | 'dashboard' | 'login' | 'request-access') => {
    const path = getPathForRoute(target, import.meta.env.BASE_URL);
    window.history.pushState(null, '', path);
    window.dispatchEvent(new CustomEvent('shramik:navigate', { detail: { path, label: getRouteLabel(target) } }));
  }, []);

  if (route === 'login') {
    return <LoginPage onAuthenticated={onAuthenticated} onNavigate={(target) => navigate(target)} />;
  }
  return <RequestAccessPage onNavigate={(target) => navigate(target)} />;
}

/** Public entry routes stay outside the workspace shell; every analytical module requires a valid session. */
export default function SHRAMIKDashboard(props: SHRAMIKDashboardProps = {}) {
  const [route, setRoute] = useState<ShramikRouteId>(getInitialPage);
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    let active = true;
    void restoreAuthSession().then((session) => {
      if (!active) return;
      setAuthSession(session);
      setSessionChecked(true);
    }).catch(() => {
      if (active) setSessionChecked(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const syncRoute = () => setRoute(getInitialPage());
    window.addEventListener('popstate', syncRoute);
    window.addEventListener('hashchange', syncRoute);
    window.addEventListener('shramik:navigate', syncRoute);
    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('hashchange', syncRoute);
      window.removeEventListener('shramik:navigate', syncRoute);
    };
  }, []);

  useEffect(() => {
    const isPublicRoute = route === 'landing' || route === 'login' || route === 'request-access';
    if (!sessionChecked || isPublicRoute || authSession) return;
    const path = getPathForRoute('login', import.meta.env.BASE_URL);
    window.history.replaceState(null, '', path);
    setRoute('login');
  }, [route, authSession, sessionChecked]);

  if (route === 'landing') return <SHRAMIKLandingPage />;
  if (route === 'login' || route === 'request-access') {
    return <PublicAuthRoute route={route} onAuthenticated={(session) => {
      setAuthSession(session);
      const path = getPathForRoute('dashboard', import.meta.env.BASE_URL);
      window.history.pushState(null, '', path);
      window.dispatchEvent(new CustomEvent('shramik:navigate', { detail: { path, label: getRouteLabel('dashboard') } }));
    }} />;
  }
  if (!sessionChecked) return <div className="sh-auth-loading" role="status">Checking your SHRAMIK session…</div>;
  if (!authSession) return <div className="sh-auth-loading" role="status">Redirecting to sign in…</div>;
  return <SHRAMIKWorkspace {...props} authSession={authSession} onAuthSessionChange={setAuthSession} />;
}
