import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, Database, Filter, RefreshCw, Search, ShieldCheck, X } from 'lucide-react';
import './data-quality.css';
import { createDataQualityDataAdapter } from './adapter';
import type { DataQualityDataAdapter, DataQualitySnapshot, QualityIssue, QualityIssueStatus } from './types';

const tabs = [{ id: 'overview', label: 'Overview' }, { id: 'issues', label: 'Issues' }, { id: 'runs', label: 'Validation runs' }, { id: 'rules', label: 'Rules catalogue' }] as const;
type TabId = typeof tabs[number]['id'];

export default function DataQualityPage({ adapter }: { adapter?: DataQualityDataAdapter } = {}) {
  const [defaultAdapter] = useState(() => createDataQualityDataAdapter());
  const activeAdapter = adapter ?? defaultAdapter;
  const readOnly = activeAdapter.mode === 'rest';
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [snapshot, setSnapshot] = useState<DataQualitySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [issues, setIssues] = useState<QualityIssue[]>([]);
  const [query, setQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIssue, setSelectedIssue] = useState<QualityIssue | null>(null);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setSnapshot(null);
    setIssues([]);
    setSelectedIssue(null);
    activeAdapter.getSnapshot(controller.signal)
      .then(value => { if (!controller.signal.aborted) { setSnapshot(value); setIssues(value.issues); } })
      .catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Data Quality data could not be loaded.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [activeAdapter, retryCount]);
  const validationRuns = snapshot?.validationRuns ?? [];
  const rules = snapshot?.rules ?? [];
  const synthetic = activeAdapter.mode === 'mock' || snapshot?.meta.provenance === 'SYNTHETIC_DEMO';
  const filteredIssues = useMemo(() => issues.filter(issue =>
    (!query || `${issue.title} ${issue.dataset} ${issue.field} ${issue.rule}`.toLowerCase().includes(query.toLowerCase())) &&
    (severityFilter === 'all' || issue.severity === severityFilter) &&
    (statusFilter === 'all' || issue.status === statusFilter)
  ), [issues, query, severityFilter, statusFilter]);
  const openCount = issues.filter(issue => issue.status === 'open').length;
  const criticalCount = issues.filter(issue => issue.severity === 'critical' && issue.status !== 'resolved' && issue.status !== 'suppressed').length;
  const updateStatus = (issue: QualityIssue, status: QualityIssueStatus) => {
    if (readOnly) return;
    setIssues(current => current.map(item => item.id === issue.id ? { ...item, status } : item));
    setSelectedIssue(current => current ? { ...current, status } : null);
    setNotice(`${issue.id}: updated in this demo session only.`);
  };

  return <div className="quality-page">
    <header className="quality-heading"><div><p className="quality-eyebrow">DATA OPERATIONS / QUALITY ASSURANCE</p><h1>Data Quality<span>.</span></h1><p>Inspect validation findings, review examples, and understand rule coverage before data enters analytical workflows.</p></div><div className="quality-heading-mark" aria-hidden="true"><ShieldCheck size={35}/><span>QUALITY<br/>GATE</span></div></header>
    {snapshot && synthetic && <div className="quality-demo-notice" role="note"><Database size={18}/><div><strong>Illustrative preview · SYNTHETIC_DEMO</strong><p>{snapshot.meta.note} Changes affect only this page session; no source records or backend validation state are changed.</p></div></div>}
    {snapshot && !synthetic && <div className="quality-live-notice" role="note"><Database size={18}/><div><strong>Data Quality API response · {snapshot.meta.provenance}</strong><p>{snapshot.meta.sourceLabel ?? 'Source label not supplied'} · {snapshot.meta.note} · {snapshot.meta.updatedAt ?? 'Update timestamp not supplied'}</p></div></div>}
    {error && <div className="quality-error" role="alert"><AlertCircle size={17}/><div><strong>Data Quality data unavailable.</strong><p>{error}</p><button type="button" onClick={() => setRetryCount(count => count + 1)}>Retry request</button></div></div>}
    {loading && !snapshot && <div className="quality-loading" role="status"><RefreshCw size={16}/> Loading validation data from the selected adapter…</div>}
    <nav className="quality-tabs" aria-label="Data quality views">{tabs.map(tab => <button type="button" key={tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)}>{tab.label}{tab.id === 'issues' && <span>{openCount}</span>}</button>)}</nav>

    {(activeTab === 'overview' || activeTab === 'issues') && <section className="quality-metrics" aria-label="Validation summary">
      <article><span>Records checked</span><strong>{snapshot ? snapshot.summary.recordsChecked.toLocaleString('en-IN') : '—'}</strong><small>{snapshot ? snapshot.meta.provenance : loading ? 'Loading…' : 'Unavailable'}</small></article>
      <article><span>Valid records</span><strong>{snapshot ? snapshot.summary.validRecords.toLocaleString('en-IN') : '—'}</strong><small>{snapshot && snapshot.summary.recordsChecked > 0 ? `${(snapshot.summary.validRecords / snapshot.summary.recordsChecked * 100).toFixed(1)}% valid` : 'Rate unavailable'}</small></article>
      <article><span>Open findings</span><strong>{openCount}</strong><small>{synthetic ? 'Sample issues' : 'Current API issue list'}</small></article>
      <article><span>Critical open</span><strong>{criticalCount}</strong><small>{synthetic ? 'Demo review queue' : 'Current API issue list'}</small></article>
    </section>}

    {activeTab === 'overview' && <div className="quality-overview-grid">
      <section className="quality-panel"><div className="quality-panel-heading"><div><p className="quality-eyebrow">ATTENTION QUEUE</p><h2>Issues requiring attention</h2><p>Open findings ordered by severity.</p></div><AlertCircle size={23}/></div>
        <div className="quality-priority-list">{[...issues].filter(i => i.status === 'open' || i.status === 'in_review').sort((a,b) => ['critical','high','medium','low'].indexOf(a.severity)-['critical','high','medium','low'].indexOf(b.severity)).slice(0,4).map(issue => <button key={issue.id} type="button" onClick={() => setSelectedIssue(issue)} className="quality-priority-row"><i className={`quality-severity-dot ${issue.severity}`}/><span><strong>{issue.title}</strong><small>{issue.dataset} · {issue.records} records</small></span><b>{issue.severity}</b></button>)}</div>
        <button type="button" className="quality-link-button" onClick={() => setActiveTab('issues')}>Open issue register →</button>
      </section>
      <section className="quality-panel"><div className="quality-panel-heading"><div><p className="quality-eyebrow">RECENT RUNS</p><h2>Validation activity</h2><p>Example runs; no live validation was executed.</p></div><RefreshCw size={22}/></div>
        <div className="quality-run-list">{validationRuns.map(run => <div className="quality-run-row" key={run.id}><div><strong>{run.dataset}</strong><small>{run.id} · {run.date}</small></div><span className={`quality-run-status ${run.status.startsWith('Failed') ? 'failed' : run.status.startsWith('Succeeded with') ? 'warning' : 'success'}`}>{run.status}</span></div>)}</div>
        <button type="button" className="quality-link-button" onClick={() => setActiveTab('runs')}>View validation runs →</button>
      </section>
    </div>}

    {activeTab === 'issues' && <section className="quality-panel quality-issue-panel">
      <div className="quality-panel-heading"><div><p className="quality-eyebrow">ISSUE REGISTER</p><h2>Validation findings</h2><p>{filteredIssues.length} matching finding{filteredIssues.length === 1 ? '' : 's'}.</p></div><span className="quality-count">{readOnly ? 'READ-ONLY API VIEW' : 'LOCAL DEMO STATE'}</span></div>
      <div className="quality-filters"><label className="quality-search"><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search issue, dataset, field or rule" aria-label="Search data quality issues"/></label><label><span>Severity</span><select value={severityFilter} onChange={event => setSeverityFilter(event.target.value)}><option value="all">All severity</option>{['critical','high','medium','low'].map(value => <option value={value} key={value}>{value[0].toUpperCase()+value.slice(1)}</option>)}</select></label><label><span>Status</span><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="all">All statuses</option>{['open','in_review','resolved','suppressed'].map(value => <option key={value} value={value}>{value.replace('_',' ')}</option>)}</select></label><button type="button" className="quality-secondary-button" onClick={() => { setQuery(''); setSeverityFilter('all'); setStatusFilter('all'); }}><Filter size={14}/> Reset</button></div>
      <div className="quality-table-wrap"><table className="quality-table"><thead><tr><th>Finding</th><th>Dataset / field</th><th>Severity</th><th>Status</th><th>Records</th><th/></tr></thead><tbody>{filteredIssues.map(issue => <tr key={issue.id}><td><button className="quality-issue-title" type="button" onClick={() => setSelectedIssue(issue)}>{issue.title}<small>{issue.id} · rule {issue.rule}</small></button></td><td>{issue.dataset}<small>{issue.field}</small></td><td><span className={`quality-severity ${issue.severity}`}>{issue.severity}</span></td><td><span className={`quality-status ${issue.status}`}>{issue.status.replace('_',' ')}</span></td><td>{issue.records.toLocaleString('en-IN')}</td><td><button type="button" className="quality-detail-button" onClick={() => setSelectedIssue(issue)}>Review</button></td></tr>)}</tbody></table>{filteredIssues.length === 0 && <p className="quality-empty">No demo issues match these filters.</p>}</div>
    </section>}

    {activeTab === 'runs' && <section className="quality-panel"><div className="quality-panel-heading"><div><p className="quality-eyebrow">RUN HISTORY</p><h2>Validation runs</h2><p>Validation-run history as returned by the selected adapter. Starting a new run is not enabled from this page.</p></div><span className="quality-count">{synthetic ? 'DEMO FIXTURES' : 'API RESPONSE'}</span></div><div className="quality-table-wrap"><table className="quality-table"><thead><tr><th>Run ID</th><th>Dataset</th><th>Started at</th><th>Status</th><th>Checked</th><th>Findings</th></tr></thead><tbody>{validationRuns.map(run => <tr key={run.id}><td><code>{run.id}</code></td><td>{run.dataset}</td><td>{run.date}</td><td><span className={`quality-run-status ${run.status.startsWith('Failed') ? 'failed' : run.status.startsWith('Succeeded with') ? 'warning' : 'success'}`}>{run.status}</span></td><td>{run.checked}</td><td>{run.findings}</td></tr>)}</tbody></table></div></section>}

    {activeTab === 'rules' && <section className="quality-panel"><div className="quality-panel-heading"><div><p className="quality-eyebrow">RULE CATALOGUE</p><h2>Validation rules</h2><p>{synthetic ? 'Example rule names and severity classes, not approved live configuration.' : 'Rule catalogue as returned by the selected adapter.'}</p></div><span className="quality-count">{rules.length} demo rules</span></div><div className="quality-rule-list">{rules.map(rule => <article key={rule.id}><span className="quality-rule-mark"><ShieldCheck size={17}/></span><div><strong>{rule.name}</strong><small>{rule.id} · {rule.family}</small></div><span className={`quality-severity ${rule.severity.toLowerCase()}`}>{rule.severity}</span></article>)}</div></section>}

    {notice && <div className="quality-toast" role="status">{notice}<button type="button" aria-label="Dismiss notice" onClick={() => setNotice('')}><X size={14}/></button></div>}
    {selectedIssue && <div className="quality-drawer-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setSelectedIssue(null); }}><aside className="quality-drawer" role="dialog" aria-modal="true" aria-labelledby="quality-drawer-title"><div className="quality-drawer-head"><div><p className="quality-eyebrow">ISSUE REVIEW / {readOnly ? 'READ ONLY' : 'SYNTHETIC DEMO'}</p><h2 id="quality-drawer-title">{selectedIssue.title}</h2><small>{selectedIssue.id}</small></div><button type="button" aria-label="Close issue details" onClick={() => setSelectedIssue(null)}><X size={18}/></button></div><p className="quality-description">{selectedIssue.description}</p><dl className="quality-detail-list"><div><dt>Dataset</dt><dd>{selectedIssue.dataset}</dd></div><div><dt>Field</dt><dd><code>{selectedIssue.field}</code></dd></div><div><dt>Rule</dt><dd><code>{selectedIssue.rule}</code></dd></div><div><dt>Detected</dt><dd>{selectedIssue.detected}</dd></div><div><dt>Affected records</dt><dd>{selectedIssue.records.toLocaleString('en-IN')} · demo fixture</dd></div><div><dt>Provenance</dt><dd>SYNTHETIC_DEMO</dd></div></dl><div className="quality-drawer-actions"><label><span>Local demo status</span><select value={selectedIssue.status} disabled={readOnly} onChange={event => updateStatus(selectedIssue,event.target.value as QualityIssueStatus)}>{['open','in_review','resolved','suppressed'].map(value => <option key={value} value={value}>{value.replace('_',' ')}</option>)}</select></label><button type="button" className="quality-primary-button" disabled={readOnly} onClick={() => updateStatus(selectedIssue,'resolved')}><Check size={15}/> Mark resolved locally</button></div><p className="quality-drawer-footnote">{readOnly ? 'This connected view is read-only until issue-mutation endpoints are approved and implemented.' : 'This control changes only the React demo state in this page. It does not update a backend issue or source record.'}</p></aside></div>}
  </div>;
}
