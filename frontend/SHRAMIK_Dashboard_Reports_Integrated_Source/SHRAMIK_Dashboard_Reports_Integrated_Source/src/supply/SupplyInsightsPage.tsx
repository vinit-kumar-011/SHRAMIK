import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertCircle, ArrowDownRight, ArrowUpRight, Database, Filter, GraduationCap, MapPin, RefreshCw, Users } from 'lucide-react';
import { createSupplyInsightsDataAdapter } from './adapter';
import type { SupplyInsightsDataAdapter, SupplySector, SupplySnapshot } from './types';
import './supply-insights.css';

const GEOGRAPHIES: Record<string, string> = {
  IN: 'All India',
  'IN-OD': 'Odisha',
  'IN-MH': 'Maharashtra',
  'IN-TN': 'Tamil Nadu',
};

function compact(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return 'Not available';
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000) return `${(value / 1_000_000).toFixed(2).replace(/\.00$/, '')}M`;
  if (absolute >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(value);
}
function percent(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? 'Not available' : `${value.toFixed(1).replace(/\.0$/, '')}%`;
}
function signedPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return 'Not available';
  const sign = value < 0 ? '−' : value > 0 ? '+' : '';
  return `${sign}${Math.abs(value).toFixed(1)}%`;
}
function updatedLabel(value?: string | null): string {
  if (!value) return 'Update timestamp not supplied';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'An unexpected Supply data error occurred.';
}

function MetricCard({ title, value, note, tone }: { title: string; value: string; note: string; tone: string }) {
  return <article className={`supply-metric supply-metric-${tone}`}><span className="supply-metric-title">{title}</span><strong>{value}</strong><span>{note}</span></article>;
}

export default function SupplyInsightsPage({ adapter }: { adapter?: SupplyInsightsDataAdapter }) {
  const [defaultAdapter] = useState(() => createSupplyInsightsDataAdapter());
  const activeAdapter = adapter ?? defaultAdapter;
  const [geography, setGeography] = useState('IN');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [detailSector, setDetailSector] = useState<SupplySector | null>(null);
  const [snapshot, setSnapshot] = useState<SupplySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setSnapshot(null);
    setDetailSector(null);
    activeAdapter.getSnapshot(geography, controller.signal)
      .then(value => { if (!controller.signal.aborted) setSnapshot(value); })
      .catch(reason => { if (!controller.signal.aborted) setError(errorMessage(reason)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [activeAdapter, geography, retryCount]);

  const rows = useMemo(() => {
    const sectors = snapshot?.sectors ?? [];
    return sectorFilter === 'all' ? sectors : sectors.filter(row => row.id === sectorFilter);
  }, [snapshot, sectorFilter]);
  const synthetic = activeAdapter.mode === 'mock' || snapshot?.meta.provenance === 'SYNTHETIC_DEMO';
  const geographyLabel = GEOGRAPHIES[geography] ?? geography;
  const scopeLabel = synthetic && geography !== 'IN' ? `${geographyLabel} · illustrative filter only` : geographyLabel;
  const metricNote = snapshot ? (synthetic ? 'SYNTHETIC_DEMO fixture' : snapshot.meta.sourceLabel ?? 'API response') : loading ? 'Loading data…' : 'Data unavailable';

  return <div className="supply-page">
    <header className="supply-page-heading">
      <div>
        <p className="supply-eyebrow">LABOUR MARKET INTELLIGENCE / SUPPLY</p>
        <h1>Workforce Supply<span>.</span></h1>
        <p className="supply-intro">Explore workforce availability, training participation and credential coverage in one place, with each figure tied to its declared source.</p>
      </div>
      <div className="supply-heading-mark" aria-hidden="true"><Users size={34}/><span>SUPPLY<br/>SIGNALS</span></div>
    </header>

    {snapshot && synthetic && <div className="supply-demo-notice" role="note">
      <Database size={18}/><div><strong>Illustrative preview · SYNTHETIC_DEMO</strong><p>{snapshot.meta.note} These values are not verified workforce estimates.</p></div>
    </div>}
    {snapshot && !synthetic && <div className="supply-live-notice" role="note">
      <Database size={18}/><div><strong>Supply API response · {snapshot.meta.provenance}</strong><p>{snapshot.meta.sourceLabel ?? 'Source label not supplied'} · {snapshot.meta.note} · {updatedLabel(snapshot.meta.updatedAt)}</p></div>
    </div>}
    {error && <div className="supply-error" role="alert"><AlertCircle size={17}/><div><strong>Supply data unavailable.</strong><p>{error}</p><button type="button" onClick={() => setRetryCount(count => count + 1)}>Retry request</button></div></div>}
    {loading && !snapshot && <div className="supply-loading" role="status"><RefreshCw size={16} className="supply-spin"/> Loading Supply data from the selected adapter…</div>}

    <section className="supply-filters" aria-label="Supply filters">
      <label><span><MapPin size={14}/> Geography</span><select value={geography} onChange={event => { setGeography(event.target.value); setSectorFilter('all'); }}><option value="IN">All India</option><option value="IN-OD">Odisha</option><option value="IN-MH">Maharashtra</option><option value="IN-TN">Tamil Nadu</option></select></label>
      <label><span><Filter size={14}/> Sector</span><select value={sectorFilter} onChange={event => setSectorFilter(event.target.value)} disabled={!snapshot}><option value="all">All sectors</option>{(snapshot?.sectors ?? []).map(row => <option value={row.id} key={row.id}>{row.name}</option>)}</select></label>
      <span className="supply-filter-state">Applied scope: <strong>{scopeLabel}</strong></span>
    </section>

    <section className="supply-metric-grid" aria-label="Supply summary">
      <MetricCard title="Workforce supply estimate" value={snapshot ? compact(snapshot.summary.workforceSupplyEstimate) : '—'} note={snapshot ? snapshot.summary.workforceSupplyUnit : metricNote} tone="navy"/>
      <MetricCard title="Training pipeline" value={snapshot ? compact(snapshot.summary.trainingPipeline) : '—'} note={snapshot ? snapshot.summary.trainingPipelineUnit : metricNote} tone="teal"/>
      <MetricCard title="Credential coverage" value={snapshot ? percent(snapshot.summary.credentialCoveragePct) : '—'} note={metricNote} tone="orange"/>
      <MetricCard title="Sector records" value={snapshot ? String(rows.length) : '—'} note={snapshot ? (synthetic ? 'Displayed demo sectors' : 'Returned records') : metricNote} tone="yellow"/>
    </section>

    <section className="supply-grid">
      <article className="supply-panel">
        <div className="supply-panel-heading"><div><p className="supply-eyebrow">TRAINING PIPELINE</p><h2>From training to outcome</h2><p>Stage signals as returned by the active adapter.</p></div><GraduationCap size={24}/></div>
        <div className="supply-pipeline">{(snapshot?.pipeline ?? []).map((item, index) => <div className="supply-pipeline-row" key={item.id}><div className="supply-pipeline-copy"><span className="supply-pipeline-index">{String(index + 1).padStart(2, '0')}</span><div><strong>{item.label}</strong><small>{item.note}</small></div><b>{percent(item.valuePct)}</b></div><div className="supply-track"><i style={{ width: `${Math.max(0, Math.min(100, item.valuePct))}%` }}/></div></div>)}
          {!loading && snapshot?.pipeline.length === 0 && <p className="supply-empty">No training pipeline signals were returned.</p>}
        </div>
        <p className="supply-footnote">{snapshot?.meta.note ?? 'Pipeline methodology is not available until a valid response is returned.'}</p>
      </article>

      <article className="supply-panel">
        <div className="supply-panel-heading"><div><p className="supply-eyebrow">COVERAGE SNAPSHOT</p><h2>Supply data readiness</h2><p>Completeness signals from the active adapter.</p></div><Activity size={24}/></div>
        <div className="supply-readiness-list">
          {(snapshot?.readiness ?? []).map(signal => <div key={signal.id}><span>{signal.label}</span><strong>{signal.value}</strong><i className={`supply-status-dot ${signal.status}`}/></div>)}
          {!loading && snapshot?.readiness.length === 0 && <p className="supply-empty">No readiness signals were returned.</p>}
        </div>
        <div className="supply-readiness-footer"><Database size={15}/>Readiness is shown only as reported by the active adapter; absence of a warning does not establish complete coverage.</div>
      </article>
    </section>

    <section className="supply-panel supply-sector-panel">
      <div className="supply-panel-heading"><div><p className="supply-eyebrow">SECTOR BREAKDOWN</p><h2>Supply signal by sector</h2><p>Select a row to inspect the returned record and provenance.</p></div><span className="supply-count">{snapshot ? `${rows.length} sectors` : 'No snapshot'}</span></div>
      <div className="supply-table-wrap"><table className="supply-table"><thead><tr><th>Sector</th><th>Available supply</th><th>Change</th><th>Coverage</th><th>Readiness</th><th/></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td><strong>{row.name}</strong><small>{row.note ?? 'Sector methodology note not supplied'}</small></td><td>{compact(row.availableSupply)}<small>{row.unitCode}</small></td><td className={row.changePct < 0 ? 'supply-negative' : 'supply-positive'}>{row.changePct < 0 ? <ArrowDownRight size={14}/> : <ArrowUpRight size={14}/>} {signedPercent(row.changePct)}</td><td>{percent(row.coveragePct)}</td><td><span className={`supply-readiness supply-readiness-${row.level.toLowerCase()}`}>{row.level}</span></td><td><button type="button" className="supply-detail-button" onClick={() => setDetailSector(row)}>Inspect</button></td></tr>)}</tbody></table>{!loading && snapshot && rows.length === 0 && <p className="supply-empty">No sectors match the selected filter.</p>}</div>
      <div className="supply-panel-footer"><span>Provenance: {snapshot?.meta.provenance ?? 'Unavailable'}</span><span>{updatedLabel(snapshot?.meta.updatedAt)}</span></div>
    </section>

    {detailSector && <div className="supply-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setDetailSector(null); }}><section className="supply-dialog" role="dialog" aria-modal="true" aria-labelledby="supply-dialog-title"><div className="supply-panel-heading"><div><p className="supply-eyebrow">SUPPLY RECORD / {snapshot?.meta.provenance ?? 'UNKNOWN'}</p><h2 id="supply-dialog-title">{detailSector.name}</h2></div><button type="button" onClick={() => setDetailSector(null)} aria-label="Close sector details">×</button></div><dl><div><dt>Available supply</dt><dd>{compact(detailSector.availableSupply)} {detailSector.unitCode}</dd></div><div><dt>Change indicator</dt><dd>{signedPercent(detailSector.changePct)}</dd></div><div><dt>Coverage</dt><dd>{percent(detailSector.coveragePct)}</dd></div><div><dt>Readiness</dt><dd>{detailSector.level}</dd></div><div><dt>Data provenance</dt><dd>{snapshot?.meta.provenance ?? 'Not reported'}</dd></div><div><dt>Source</dt><dd>{snapshot?.meta.sourceLabel ?? 'Not supplied'}</dd></div><div><dt>Updated</dt><dd>{updatedLabel(snapshot?.meta.updatedAt)}</dd></div></dl><button className="supply-primary-button" type="button" onClick={() => setDetailSector(null)}>Close details</button></section></div>}
  </div>;
}
