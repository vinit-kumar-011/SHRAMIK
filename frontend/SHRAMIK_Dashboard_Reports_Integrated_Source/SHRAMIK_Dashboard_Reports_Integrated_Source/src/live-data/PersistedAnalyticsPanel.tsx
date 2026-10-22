import { useEffect, useState } from 'react';
import { AlertTriangle, Database, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { restoreAuthSession } from '../auth/session';
import './PersistedAnalyticsPanel.css';

type AnalyticsMode = 'OFFICIAL' | 'DEMO';
type AnalyticsModule = 'forecasts' | 'emerging-skills';

type ApiMeta = {
  analysis_mode?: AnalyticsMode;
  provenance_filter?: string;
  result_state?: string;
  returned?: number;
  total?: number;
  request_id?: string;
  note?: string;
};

type ItemsEnvelope<T> = {
  data: { items?: T[] };
  meta: ApiMeta;
};

type SkillsEnvelope = {
  data: Array<{ skill_id: string; name: string; sector_name?: string }>;
  meta: ApiMeta;
};

type StatusEnvelope = {
  data: {
    source_inputs?: {
      demand_observations?: number;
      supply_observations?: number;
    };
    published_outputs?: Record<string, number>;
  };
  meta: ApiMeta;
};

type ForecastRow = {
  id: string;
  district_id: string;
  skill_id: string;
  period_year: number;
  provenance_state: string;
  data_status: string;
  forecast_demand: number | null;
  forecast_supply: number | null;
  gap: number | null;
  status: string | null;
  confidence_level: string | null;
  confidence_inputs?: {
    history_periods?: number;
    is_contiguous?: boolean;
    baseline?: string;
  } | null;
};

type WarningRow = {
  id: string;
  district_id: string;
  skill_id: string;
  warning_type: string;
  severity: string;
  detected_period: number;
  explanation_code: string;
  provenance_state?: string;
};

type EmergingSkillRow = {
  id: string;
  district_id: string;
  skill_id: string;
  period_year: number;
  provenance_state: string;
  data_status: string;
  emerging_skill_status: string;
  recent_growth_rate: number | null;
  historical_growth_rate: number | null;
  signal_strength: number | null;
  history_periods: number;
  is_contiguous: boolean;
};

type PanelData = {
  status: StatusEnvelope;
  forecasts: ItemsEnvelope<ForecastRow>;
  warnings: ItemsEnvelope<WarningRow>;
  emergingSkills: ItemsEnvelope<EmergingSkillRow>;
  skills: SkillsEnvelope;
  loadedAt: string;
};

const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
const configuredBase = (env?.VITE_SHRAMIK_API_BASE_URL ?? '').trim().replace(/\/+$/, '');
const API_BASE = configuredBase.replace(/\/api\/v1(?:\/forecasts)?$/i, '');

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(Number(value));
}

function formatGrowth(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
  return (Number(value) * 100).toFixed(1) + '%';
}

async function getJson<T>(path: string, token: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(API_BASE + path, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: 'Bearer ' + token,
    },
    credentials: 'same-origin',
    signal,
  });
  const body = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok) {
    const detail = body?.detail ?? body?.message;
    throw new Error(
      typeof detail === 'string'
        ? detail
        : 'Analytics API returned HTTP ' + response.status + '.',
    );
  }
  return body as unknown as T;
}

export default function PersistedAnalyticsPanel({ module }: { module: AnalyticsModule }) {
  const [mode, setMode] = useState<AnalyticsMode>('OFFICIAL');
  const [data, setData] = useState<PanelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const session = await restoreAuthSession();
        if (!session?.access_token) {
          throw new Error('Your SHRAMIK session is missing or expired. Sign in again to read protected analytics.');
        }
        const query = '?analysis_mode=' + mode + '&limit=100&offset=0';
        const [status, forecasts, warnings, emergingSkills, skills] = await Promise.all([
          getJson<StatusEnvelope>('/api/v1/analytics/status', session.access_token, controller.signal),
          getJson<ItemsEnvelope<ForecastRow>>('/api/v1/analytics/forecasts' + query, session.access_token, controller.signal),
          getJson<ItemsEnvelope<WarningRow>>('/api/v1/analytics/early-warnings' + query, session.access_token, controller.signal),
          getJson<ItemsEnvelope<EmergingSkillRow>>('/api/v1/analytics/emerging-skills' + query, session.access_token, controller.signal),
          getJson<SkillsEnvelope>('/api/v1/skills?page_size=100&active_only=false', session.access_token, controller.signal),
        ]);
        if (active) {
          setData({
            status,
            forecasts,
            warnings,
            emergingSkills,
            skills,
            loadedAt: new Date().toISOString(),
          });
        }
      } catch (reason) {
        if (active && !controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : 'Could not load persisted analytics results.');
        }
      } finally {
        if (active && !controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [mode, refreshKey]);

  const forecastRows = data?.forecasts.data.items ?? [];
  const warningRows = data?.warnings.data.items ?? [];
  const emergingRows = data?.emergingSkills.data.items ?? [];
  const inputCounts = data?.status.data.source_inputs;
  const skillName = (skillId: string) => data?.skills.data.find(skill => skill.skill_id === skillId)?.name ?? skillId;

  return <section className="pai-panel" aria-label="Authenticated persisted analytics">
    <header className="pai-header">
      <div className="pai-heading">
        <div className="pai-eyebrow"><ShieldCheck size={14} /> AUTHENTICATED BACKEND RESULTS</div>
        <h2>{module === 'forecasts' ? 'Persisted forecasts & early warnings' : 'Persisted emerging-skill signals'}</h2>
        <p>Results are read from the protected SHRAMIK API and persisted database tables, not calculated in the browser.</p>
      </div>
      <div className="pai-controls">
        <label className="pai-mode-label">Analysis mode
          <select value={mode} onChange={event => setMode(event.target.value as AnalyticsMode)} aria-label="Analysis mode">
            <option value="OFFICIAL">Official · source-backed</option>
            <option value="DEMO">Demo · synthetic</option>
          </select>
        </label>
        <button type="button" className="pai-refresh" onClick={() => setRefreshKey(value => value + 1)} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'pai-spin' : ''} /> Refresh
        </button>
      </div>
    </header>

    {mode === 'DEMO'
      ? <div className="pai-notice pai-notice-demo"><Sparkles size={16} /><div><strong>Synthetic demo mode</strong><p>Every result shown in this mode is synthetic demo output. Do not cite it as government data or policy evidence.</p></div></div>
      : <div className="pai-notice"><ShieldCheck size={16} /><div><strong>Official mode</strong><p>Only validated, source-backed results are returned. Missing data is shown as unavailable rather than inferred.</p></div></div>}

    {inputCounts ? <div className="pai-input-counts">
      <div><span>Demand observations</span><strong>{formatNumber(inputCounts.demand_observations)}</strong></div>
      <div><span>Supply observations</span><strong>{formatNumber(inputCounts.supply_observations)}</strong></div>
      <small>Source-input counts from the status endpoint; they are separate from the selected output mode.</small>
    </div> : null}

    {error ? <div className="pai-error" role="alert"><AlertTriangle size={17} /><div><strong>Could not load analytics</strong><p>{error}</p><small>Check that the backend is running, the browser session is valid, and the local /api/v1 proxy targets port 8000.</small></div></div> : null}
    {loading ? <div className="pai-loading" role="status"><RefreshCw size={17} className="pai-spin" /> Loading persisted analytics…</div> : null}

    {!loading && !error && data ? <>
      <div className="pai-stat-grid">
        <div className="pai-stat"><span>Forecasts</span><strong>{formatNumber(data.forecasts.meta.total ?? forecastRows.length)}</strong><small>{data.forecasts.meta.result_state || 'State unavailable'}</small></div>
        <div className="pai-stat"><span>Early warnings</span><strong>{formatNumber(data.warnings.meta.total ?? warningRows.length)}</strong><small>{data.warnings.meta.result_state || 'State unavailable'}</small></div>
        <div className="pai-stat"><span>Emerging-skill signals</span><strong>{formatNumber(data.emergingSkills.meta.total ?? emergingRows.length)}</strong><small>{data.emergingSkills.meta.result_state || 'State unavailable'}</small></div>
      </div>

      {module === 'forecasts' ? <>
        <section className="pai-results">
          <div className="pai-section-heading"><div><h3>One-step baseline forecasts</h3><p>Forecast values are the naive-last-value baseline. Confidence is limited until a historical backtest is available.</p></div><span>{data.forecasts.meta.analysis_mode || mode}</span></div>
          {forecastRows.length ? <div className="pai-table-wrap"><table className="pai-table">
            <thead><tr><th>Target year</th><th>District</th><th>Skill ID</th><th>Demand</th><th>Supply</th><th>Gap</th><th>Status</th><th>Confidence</th><th>Provenance</th></tr></thead>
            <tbody>{forecastRows.map(row => <tr key={row.id}>
              <td>{row.period_year}</td><td>{row.district_id}</td><td><strong>{skillName(row.skill_id)}</strong><small><code>{row.skill_id}</code></small></td>
              <td>{formatNumber(row.forecast_demand)}</td><td>{formatNumber(row.forecast_supply)}</td><td>{formatNumber(row.gap)}</td>
              <td><span className="pai-status">{row.status || row.data_status}</span></td><td>{row.confidence_level || '—'}</td><td>{row.provenance_state}</td>
            </tr>)}</tbody>
          </table></div> : <div className="pai-empty"><Database size={18} /><div><strong>No validated forecasts in {mode} mode</strong><p>{mode === 'OFFICIAL'
            ? 'No compatible source-backed district-skill demand and supply history has been published yet.'
            : 'No persisted demo forecasts were found. Generate the labelled demo history and run the demo batch pipeline, then refresh.'}</p></div></div>}
        </section>
        <section className="pai-results">
          <div className="pai-section-heading"><div><h3>Early warnings</h3><p>Warnings are persisted only when the configured baseline rule is crossed.</p></div></div>
          {warningRows.length ? <div className="pai-table-wrap"><table className="pai-table">
            <thead><tr><th>Period</th><th>District</th><th>Skill ID</th><th>Warning</th><th>Severity</th><th>Provenance</th></tr></thead>
            <tbody>{warningRows.map(row => <tr key={row.id}><td>{row.detected_period}</td><td>{row.district_id}</td><td><strong>{skillName(row.skill_id)}</strong><small><code>{row.skill_id}</code></small></td><td>{row.warning_type}</td><td><span className={'pai-severity pai-severity-' + row.severity.toLowerCase()}>{row.severity}</span></td><td>{row.provenance_state || mode}</td></tr>)}</tbody>
          </table></div> : <div className="pai-empty"><AlertTriangle size={18} /><div><strong>No warnings in {mode} mode</strong><p>Warnings are not invented when no validated forecast crosses the configured risk threshold.</p></div></div>}
        </section>
      </> : <section className="pai-results">
        <div className="pai-section-heading"><div><h3>Emerging-skill signals</h3><p>Signals are sourced from stored analytical results and preserve their history/provenance metadata.</p></div><span>{data.emergingSkills.meta.analysis_mode || mode}</span></div>
        {emergingRows.length ? <div className="pai-table-wrap"><table className="pai-table">
          <thead><tr><th>Period</th><th>District</th><th>Skill ID</th><th>Classification</th><th>Recent growth</th><th>Historical growth</th><th>History</th><th>Provenance</th></tr></thead>
          <tbody>{emergingRows.map(row => <tr key={row.id}><td>{row.period_year}</td><td>{row.district_id}</td><td><code>{row.skill_id}</code></td><td><span className="pai-status">{row.emerging_skill_status}</span></td><td>{formatGrowth(row.recent_growth_rate)}</td><td>{formatGrowth(row.historical_growth_rate)}</td><td>{row.history_periods} {row.is_contiguous ? 'contiguous years' : 'years with gaps'}</td><td>{row.provenance_state}</td></tr>)}</tbody>
        </table></div> : <div className="pai-empty"><Sparkles size={18} /><div><strong>No emerging-skill signals in {mode} mode</strong><p>{mode === 'OFFICIAL'
          ? 'Validated source-backed yearly histories are not yet available for eligible district-skill series.'
          : 'Run the labelled demo batch pipeline and refresh to view its explicitly synthetic signals.'}</p></div></div>}
      </section>}
      <footer className="pai-footer"><span>Last refreshed {new Date(data.loadedAt).toLocaleString('en-IN')}</span><span>Request IDs are available in the browser network panel for diagnostics.</span></footer>
    </> : null}
  </section>;
}
