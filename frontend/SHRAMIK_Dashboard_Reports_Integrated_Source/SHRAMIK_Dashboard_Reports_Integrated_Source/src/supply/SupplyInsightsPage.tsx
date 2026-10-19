import { useMemo, useState } from 'react';
import { Activity, ArrowDownRight, ArrowUpRight, Database, Filter, GraduationCap, MapPin, Users } from 'lucide-react';
import './supply-insights.css';

type SupplySector = { name: string; available: string; change: string; coverage: string; level: 'High' | 'Moderate' | 'Limited' };
const sectors: SupplySector[] = [
  { name: 'Manufacturing', available: '18.6M', change: '+4.2%', coverage: '74%', level: 'High' },
  { name: 'Construction', available: '24.1M', change: '+2.1%', coverage: '61%', level: 'Moderate' },
  { name: 'Healthcare', available: '8.3M', change: '+6.8%', coverage: '58%', level: 'Limited' },
  { name: 'Transport & Logistics', available: '12.7M', change: '+3.4%', coverage: '66%', level: 'Moderate' },
  { name: 'Agriculture', available: '31.2M', change: '−1.3%', coverage: '42%', level: 'Limited' },
];
const pipeline = [
  { label: 'Enrolled in training', value: 76, note: 'Programme participation' },
  { label: 'Completed training', value: 61, note: 'Completion signal' },
  { label: 'Credential verified', value: 48, note: 'Credential coverage' },
  { label: 'Employment outcome linked', value: 33, note: 'Outcome linkage' },
];

function MetricCard({ title, value, note, tone }: { title: string; value: string; note: string; tone: string }) {
  return <article className={`supply-metric supply-metric-${tone}`}><span className="supply-metric-title">{title}</span><strong>{value}</strong><span>{note}</span></article>;
}

export default function SupplyInsightsPage() {
  const [geography, setGeography] = useState('IN');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [detailSector, setDetailSector] = useState<SupplySector | null>(null);
  const rows = useMemo(() => sectorFilter === 'all' ? sectors : sectors.filter(row => row.name === sectorFilter), [sectorFilter]);

  return <div className="supply-page">
    <header className="supply-page-heading">
      <div>
        <p className="supply-eyebrow">LABOUR MARKET INTELLIGENCE / SUPPLY</p>
        <h1>Workforce Supply<span>.</span></h1>
        <p className="supply-intro">Explore reported workforce availability, training participation and credential coverage in one place.</p>
      </div>
      <div className="supply-heading-mark" aria-hidden="true"><Users size={34}/><span>SUPPLY<br/>SIGNALS</span></div>
    </header>

    <div className="supply-demo-notice" role="note">
      <Database size={18}/><div><strong>Illustrative preview · SYNTHETIC_DEMO</strong><p>Values on this page are demo fixtures for UI integration. They are not verified workforce estimates, and no live Supply API is connected in this build.</p></div>
    </div>

    <section className="supply-filters" aria-label="Supply filters">
      <label><span><MapPin size={14}/> Geography</span><select value={geography} onChange={event => setGeography(event.target.value)}><option value="IN">All India</option><option value="IN-OD">Odisha (demo)</option><option value="IN-MH">Maharashtra (demo)</option><option value="IN-TN">Tamil Nadu (demo)</option></select></label>
      <label><span><Filter size={14}/> Sector</span><select value={sectorFilter} onChange={event => setSectorFilter(event.target.value)}><option value="all">All sectors</option>{sectors.map(row => <option value={row.name} key={row.name}>{row.name}</option>)}</select></label>
      <span className="supply-filter-state">Applied scope: <strong>{geography === 'IN' ? 'All India' : geography.replace('IN-', '') + ' · illustrative'}</strong></span>
    </section>

    <section className="supply-metric-grid" aria-label="Supply summary">
      <MetricCard title="Workforce supply estimate" value="94.8M" note="Illustrative fixture" tone="navy"/>
      <MetricCard title="Training pipeline" value="2.16M" note="Illustrative fixture" tone="teal"/>
      <MetricCard title="Credential coverage" value="48%" note="Demo completion chain" tone="orange"/>
      <MetricCard title="Sector records" value={String(rows.length)} note="Displayed demo sectors" tone="yellow"/>
    </section>

    <section className="supply-grid">
      <article className="supply-panel">
        <div className="supply-panel-heading"><div><p className="supply-eyebrow">TRAINING PIPELINE</p><h2>From training to outcome</h2><p>Illustrative process coverage, not cohort conversion rates.</p></div><GraduationCap size={24}/></div>
        <div className="supply-pipeline">{pipeline.map((item, index) => <div className="supply-pipeline-row" key={item.label}><div className="supply-pipeline-copy"><span className="supply-pipeline-index">{String(index + 1).padStart(2, '0')}</span><div><strong>{item.label}</strong><small>{item.note}</small></div><b>{item.value}%</b></div><div className="supply-track"><i style={{ width: `${item.value}%` }}/></div></div>)}</div>
        <p className="supply-footnote">These percentages are separate illustrative stage indicators. They must not be interpreted as a matched learner cohort.</p>
      </article>

      <article className="supply-panel">
        <div className="supply-panel-heading"><div><p className="supply-eyebrow">COVERAGE SNAPSHOT</p><h2>Supply data readiness</h2><p>Example completeness signals for the UI.</p></div><Activity size={24}/></div>
        <div className="supply-readiness-list">
          <div><span>Canonical geography mapping</span><strong>In review</strong><i className="supply-status-dot moderate"/></div>
          <div><span>Training-provider records</span><strong>Demo available</strong><i className="supply-status-dot ready"/></div>
          <div><span>Credential linkage</span><strong>Partial</strong><i className="supply-status-dot limited"/></div>
          <div><span>Employment outcome linkage</span><strong>Not verified</strong><i className="supply-status-dot limited"/></div>
        </div>
        <div className="supply-readiness-footer"><Database size={15}/> Data readiness states are illustrative until returned by a connected service.</div>
      </article>
    </section>

    <section className="supply-panel supply-sector-panel">
      <div className="supply-panel-heading"><div><p className="supply-eyebrow">SECTOR BREAKDOWN</p><h2>Supply signal by sector</h2><p>Choose a row to inspect the illustrative record.</p></div><span className="supply-count">{rows.length} demo sectors</span></div>
      <div className="supply-table-wrap"><table className="supply-table"><thead><tr><th>Sector</th><th>Available supply</th><th>Change</th><th>Coverage</th><th>Readiness</th><th/></tr></thead><tbody>{rows.map(row => <tr key={row.name}><td><strong>{row.name}</strong><small>Sector crosswalk: illustrative</small></td><td>{row.available}</td><td className={row.change.startsWith('−') ? 'supply-negative' : 'supply-positive'}>{row.change.startsWith('−') ? <ArrowDownRight size={14}/> : <ArrowUpRight size={14}/>} {row.change}</td><td>{row.coverage}</td><td><span className={`supply-readiness supply-readiness-${row.level.toLowerCase()}`}>{row.level}</span></td><td><button type="button" className="supply-detail-button" onClick={() => setDetailSector(row)}>Inspect</button></td></tr>)}</tbody></table></div>
      <div className="supply-panel-footer"><span>Synthetic fixture data · Not source-backed</span><span>Updated timestamp: not supplied</span></div>
    </section>

    {detailSector && <div className="supply-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setDetailSector(null); }}><section className="supply-dialog" role="dialog" aria-modal="true" aria-labelledby="supply-dialog-title"><div className="supply-panel-heading"><div><p className="supply-eyebrow">SYNTHETIC DEMO RECORD</p><h2 id="supply-dialog-title">{detailSector.name}</h2></div><button type="button" onClick={() => setDetailSector(null)} aria-label="Close sector details">×</button></div><dl><div><dt>Available supply</dt><dd>{detailSector.available}</dd></div><div><dt>Change indicator</dt><dd>{detailSector.change}</dd></div><div><dt>Coverage</dt><dd>{detailSector.coverage}</dd></div><div><dt>Readiness</dt><dd>{detailSector.level}</dd></div><div><dt>Data provenance</dt><dd>SYNTHETIC_DEMO</dd></div><div><dt>API source</dt><dd>Not connected</dd></div></dl><button className="supply-primary-button" type="button" onClick={() => setDetailSector(null)}>Close details</button></section></div>}
  </div>;
}
