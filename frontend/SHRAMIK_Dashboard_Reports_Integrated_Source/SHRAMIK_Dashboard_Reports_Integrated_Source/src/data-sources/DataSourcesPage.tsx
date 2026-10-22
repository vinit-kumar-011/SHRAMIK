import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { DataSourcesAdapterError, type DataSourcesDataAdapter } from './DataSourcesDataAdapter';
import type {
  CoverageSummary, DataSourceRecord, FieldMappingRecord,
  IngestionRunRecord, PagedResult,
  Provenance, SourceLifecycleStatus, SourceSummary, SourceType,
} from './data-sources.types';

const LIFECYCLE: SourceLifecycleStatus[] = ['ACTIVE','PENDING_VALIDATION','STALE','FAILED','NOT_CONFIGURED','DISABLED','UNKNOWN'];
const TYPES: SourceType[] = ['GOVERNMENT_DATASET','REFERENCE_DATA','INDUSTRY_FEED','TRAINING_DATASET','INTERNAL_DATASET','OTHER'];
const TYPE_LABEL: Record<SourceType,string> = {
  GOVERNMENT_DATASET:'Government dataset', REFERENCE_DATA:'Reference data', INDUSTRY_FEED:'Industry feed',
  TRAINING_DATASET:'Training dataset', INTERNAL_DATASET:'Internal dataset', OTHER:'Other',
};
const STATUS_LABEL: Record<string,string> = {
  ACTIVE:'Active', PENDING_VALIDATION:'Pending validation', STALE:'Stale', FAILED:'Failed',
  NOT_CONFIGURED:'Not configured', DISABLED:'Disabled', UNKNOWN:'Unknown',
  UP_TO_DATE:'Up to date', DUE_SOON:'Due soon', NOT_APPLICABLE:'Not applicable',
  QUEUED:'Queued', RUNNING:'Running', SUCCEEDED:'Succeeded', WARNING:'Warning', CANCELLED:'Cancelled',
  COMPLETE:'Complete', PARTIAL:'Partial', MAPPED:'Mapped', NEEDS_REVIEW:'Needs review', UNMAPPED:'Unmapped', REJECTED:'Rejected',
};
const iconFor = (type: string) => ({GOVERNMENT_DATASET:'▥',REFERENCE_DATA:'▤',INDUSTRY_FEED:'↗',TRAINING_DATASET:'⌂',INTERNAL_DATASET:'▣',OTHER:'◇'}[type] ?? '◇');
const human = (value?: string | null) => value ? STATUS_LABEL[value] ?? value.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase()) : 'Not reported';
const dateOnly = (value?: string | null) => {
  if (!value) return 'Not reported';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Not reported';
  const options: Intl.DateTimeFormatOptions = /^\d{4}-\d{2}-\d{2}$/.test(value) ? { dateStyle: 'medium', timeZone: 'UTC' } : { dateStyle: 'medium', timeStyle: 'short' };
  return new Intl.DateTimeFormat('en-IN', options).format(parsed);
};
const number = (value?: number | null) => value == null || !Number.isFinite(value) ? 'Not reported' : new Intl.NumberFormat('en-IN').format(value);
const duration = (value?: number | null) => value == null || !Number.isFinite(value) ? 'Not reported' : value < 1000 ? `${Math.round(value)} ms` : value < 60000 ? `${(value/1000).toFixed(1)} s` : `${Math.floor(value/60000)}m ${Math.round((value%60000)/1000)}s`;
const provenanceLabel: Record<Provenance,string> = {SOURCE_BACKED:'Source-backed',SYNTHETIC_DEMO:'Synthetic demo',DERIVED:'Derived',MIXED:'Mixed provenance',UNKNOWN:'Provenance unknown'};
const sourceTypeLabel = (value: SourceType) => TYPE_LABEL[value] ?? human(value);

type ResourceState<T> = { status: 'idle' | 'loading' | 'ready' | 'error'; data?: T; message?: string; retryable?: boolean };
function errorMessage(error: unknown) {
  if (error instanceof DataSourcesAdapterError) return error.detail.message;
  if (error instanceof Error && error.message) return error.message;
  return 'The request could not be completed. Please try again.';
}
function errorRetryable(error: unknown) { return error instanceof DataSourcesAdapterError ? error.detail.retryable : true; }
function useResource<T>(load: () => Promise<T>, enabled: boolean, deps: unknown[]) {
  const [state,setState] = useState<ResourceState<T>>({status:'idle'});
  const [attempt,setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt(n=>n+1),[]);
  useEffect(() => {
    if (!enabled) return;
    let current = true;
    setState({status:'loading'});
    load().then(data => { if (current) setState({status:'ready',data}); }).catch(error => { if (current) setState({status:'error',message:errorMessage(error),retryable:errorRetryable(error)}); });
    return () => { current=false; };
    // deps are explicitly supplied by the caller to keep each resource independent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, attempt]);
  return { ...state, retry };
}
function StatusBadge({value,kind='lifecycle'}:{value:string;kind?:'lifecycle'|'freshness'|'run'|'mapping'|'coverage'}) {
  const cls = value.toLowerCase().replaceAll('_','-');
  const symbol = ['ACTIVE','UP_TO_DATE','SUCCEEDED','MAPPED','COMPLETE'].includes(value) ? '✓' : ['FAILED','REJECTED'].includes(value) ? '!' : ['RUNNING','QUEUED'].includes(value) ? '◷' : ['STALE','WARNING','PENDING_VALIDATION','DUE_SOON','NEEDS_REVIEW','PARTIAL'].includes(value) ? '!' : '•';
  return <span className={`status-badge status-${kind} ${cls}`}><span aria-hidden="true" className="status-mark">{symbol}</span>{human(value)}</span>;
}
function ProvenanceTag({value}:{value:Provenance}) { return <span className={`provenance provenance-${value.toLowerCase().replaceAll('_','-')}`}>{provenanceLabel[value] ?? 'Provenance unknown'}</span>; }
function DemoNotice({text='Illustrative fixture only — source metadata, dates, coverage and runs are not verified live integrations.'}:{text?:string}) {
  return <div className="demo-notice" role="note"><span className="notice-icon" aria-hidden="true">!</span><div><strong>SYNTHETIC_DEMO</strong><span>{text}</span></div></div>;
}
function SectionHeading({eyebrow,title,detail,action}:{eyebrow?:string;title:string;detail?:string;action?:ReactNode}) {
  return <div className="section-heading"> <div>{eyebrow&&<p className="section-eyebrow">{eyebrow}</p>}<h2>{title}</h2>{detail&&<p>{detail}</p>}</div>{action}</div>;
}

export interface DataSourcesPageProps { adapter: DataSourcesDataAdapter; }
export function DataSourcesPage({adapter}:DataSourcesPageProps) {
  const headingId = useId();
  const [query,setQuery] = useState('');
  const [debouncedQuery,setDebouncedQuery] = useState('');
  const [status,setStatus] = useState<SourceLifecycleStatus|'ALL'>('ALL');
  const [type,setType] = useState<SourceType|'ALL'>('ALL');
  const [agency,setAgency] = useState('ALL');
  const [page,setPage] = useState(1);
  const [reload,setReload] = useState(0);
  const [data,setData] = useState<PagedResult<DataSourceRecord>|null>(null);
  const [requestState,setRequestState] = useState<'loading'|'ready'|'error'>('loading');
  const [requestError,setRequestError] = useState('');
  const [selected,setSelected] = useState<string|null>(null);
  const [menuSource,setMenuSource] = useState<string|null>(null);
  const [toast,setToast] = useState<string|null>(null);
  const [showCreate,setShowCreate] = useState(false);
  const [createState,setCreateState] = useState<'idle'|'saving'|'error'>('idle');
  const [createError,setCreateError] = useState('');
  const [sourceName,setSourceName] = useState('');
  const [sourceType,setSourceType] = useState<SourceType>('GOVERNMENT_DATASET');
  const [sourceAgency,setSourceAgency] = useState('');
  const [sourcePurpose,setSourcePurpose] = useState('');
  const [sourceTags,setSourceTags] = useState('');
  const lastTrigger = useRef<HTMLElement|null>(null);
  const refresh = useCallback(()=>setReload(n=>n+1),[]);
  const closeDetails = useCallback(()=>{setSelected(null);setMenuSource(null);window.setTimeout(()=>lastTrigger.current?.focus(),0);},[]);

  useEffect(()=>{const timer=window.setTimeout(()=>setDebouncedQuery(query),220);return()=>window.clearTimeout(timer);},[query]);
  useEffect(()=>{setPage(1);},[debouncedQuery,status,type,agency]);
  useEffect(()=>{
    let current=true;
    setRequestState('loading');
    setRequestError('');
    adapter.listSources({query:debouncedQuery,status,type,agency,page,pageSize:8})
      .then(result=>{if(current){setData(result);setRequestState('ready');}})
      .catch(error=>{if(current){setRequestError(errorMessage(error));setRequestState('error');}});
    return()=>{current=false;};
  },[adapter,debouncedQuery,status,type,agency,page,reload]);
  useEffect(()=>{if(!toast)return;const timer=window.setTimeout(()=>setToast(null),4200);return()=>window.clearTimeout(timer);},[toast]);

  const reset = ()=>{setQuery('');setDebouncedQuery('');setStatus('ALL');setType('ALL');setAgency('ALL');setPage(1);setMenuSource(null);};
  const rows = data?.items ?? [];
  const agencies = data?.facets?.agencies ?? [...new Set(rows.map(x=>x.agencyOwner).filter((x):x is string=>Boolean(x)))].sort((a,b)=>a.localeCompare(b));
  const summary: Partial<SourceSummary> = data?.summary ?? {total:data?.total};
  const pageCount = Math.max(1,Math.ceil((data?.total ?? 0)/(data?.pageSize ?? 8)));
  const filtered = Boolean(debouncedQuery || status!=='ALL' || type!=='ALL' || agency!=='ALL');
  const openDetails=(sourceId:string,trigger:HTMLElement)=>{lastTrigger.current=trigger;setSelected(sourceId);setMenuSource(null);};
  const copyId=async (id:string)=>{
    try { await navigator.clipboard.writeText(id); setToast(`Copied source ID: ${id}`); }
    catch { setToast(`Source ID: ${id} (clipboard permission unavailable)`); }
    setMenuSource(null);
  };
  const retryIngestion=async(source:DataSourceRecord)=>{
    if(!source.capabilities.retryIngestion||!adapter.requestIngestion){setToast('Ingestion retry is not configured for this source.');setMenuSource(null);return;}
    try {const run=await adapter.requestIngestion(source.id);setToast(`Ingestion ${run.status.toLowerCase()}: ${run.runId}. A queued run is not a completed retrieval.`);refresh();}
    catch(e){setToast(errorMessage(e));}
    setMenuSource(null);
  };
  const submitCreate=async(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault();
    if(!adapter.createSource){setCreateError('Creating sources is not configured for this environment.');setCreateState('error');return;}
    setCreateState('saving');setCreateError('');
    try {
      const created=await adapter.createSource({name:sourceName.trim(),type:sourceType,agencyOwner:sourceAgency.trim()||undefined,purpose:sourcePurpose.trim()||undefined,tags:sourceTags.split(',').map(x=>x.trim()).filter(Boolean)});
      setShowCreate(false);setSourceName('');setSourceAgency('');setSourcePurpose('');setSourceTags('');setCreateState('idle');setQuery('');setDebouncedQuery('');setStatus('ALL');setType('ALL');setAgency('ALL');setPage(1);setSelected(created.id);refresh();
      setToast(adapter.capabilities?.createSource ? (created.provenance==='SYNTHETIC_DEMO' ? 'Local demo draft added to this session only; no connector was configured.' : 'Source record created.') : 'Source record submitted.');
    } catch(error) {setCreateError(errorMessage(error));setCreateState('error');}
  };

  return <section className="data-sources-page" aria-labelledby={headingId}>
    <div className="page-heading-row">
      <div className="page-title-block"><div className="breadcrumbs"><span>Home</span><span aria-hidden="true">›</span><span aria-current="page">Data Sources</span></div><p className="eyebrow">DATA OPERATIONS / SOURCE REGISTRY</p><h1 id={headingId}>Data Sources<span className="title-period">.</span></h1><p className="page-intro">Browse the registered sources behind SHRAMIK’s published indicators. Retrieval health, freshness and validation are shown only when an authorized backend reports them; unknown means not verified.</p></div>
      {adapter.capabilities?.createSource && <button className="button button-primary add-source" onClick={()=>{setShowCreate(true);setCreateState('idle');setCreateError('');}}><span aria-hidden="true">＋</span> Add New Source</button>}
    </div>

    {data?.provenance==='SYNTHETIC_DEMO' && <DemoNotice />}
    {data && data.provenance!=='SYNTHETIC_DEMO' && <div className="connection-note" role="note"><span className="connection-dot connection-dot-neutral" aria-hidden="true"/><div><strong>Live registry metadata received</strong><span>These records confirm that a source is registered—not that its upstream feed was retrieved or validated. Unknown lifecycle/freshness is not a healthy status; this public read path does not expose retrieval and validation history.</span></div><button className="button button-tertiary button-small" onClick={refresh}>Refresh <span aria-hidden="true">↻</span></button></div>}

    <section className="summary-grid" aria-label="Source summary">
      <MetricCard icon="▤" label="Total sources" value={summary.total} note="Registered in current filtered scope" variant="navy" />
      <MetricCard icon="✓" label="Verified active" value={summary.active} note="Explicit ACTIVE lifecycle only" variant="teal" />
      <MetricCard icon="!" label="Needs attention" value={summary.needsAttention} note="Known pending · stale · failed" variant="orange" />
      <MetricCard icon="?" label="Status unknown" value={summary.unknownStatus} note="Health evidence not available in this view" variant="navy" />
      <div className="summary-side-note"><span className="summary-side-label">Not configured</span><strong>{summary.notConfigured==null?'—':number(summary.notConfigured)}</strong><span>No source URL / connector configured</span></div>
    </section>

    <section className="registry-panel" aria-label="Source registry">
      <SectionHeading eyebrow="REGISTRY" title="Registered sources" detail={requestState==='ready'?`${number(data?.total)} matching source${data?.total===1?'':'s'} · source reporting periods are not retrieval timestamps.`:'Search, filter and inspect source metadata.'} action={<button className="button button-tertiary button-small" onClick={refresh} aria-label="Refresh source registry">↻ Refresh</button>} />
      <div className="filters" role="search">
        <label className="search-field"><span className="control-label">Search sources</span><span className="search-input-wrap"><span aria-hidden="true">⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Name, agency, type or tag…" aria-label="Search sources" /><kbd>⌕</kbd></span></label>
        <label><span className="control-label">Status</span><select value={status} onChange={e=>setStatus(e.target.value as typeof status)} aria-label="Filter by status"><option value="ALL">All statuses</option>{LIFECYCLE.map(x=><option value={x} key={x}>{human(x)}</option>)}</select></label>
        <label><span className="control-label">Source type</span><select value={type} onChange={e=>setType(e.target.value as typeof type)} aria-label="Filter by source type"><option value="ALL">All source types</option>{TYPES.map(x=><option value={x} key={x}>{sourceTypeLabel(x)}</option>)}</select></label>
        <label><span className="control-label">Agency / owner</span><select value={agency} onChange={e=>setAgency(e.target.value)} aria-label="Filter by agency"><option value="ALL">All agencies</option>{agencies.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
        <button className="button button-secondary reset-button" onClick={reset} disabled={!query && status==='ALL' && type==='ALL' && agency==='ALL'}>Reset</button>
      </div>
      <div className="active-filter-strip" aria-live="polite">
        <span>{filtered?'Filtered view':'All accessible sources'}</span>
        {filtered && <button className="text-button" onClick={reset}>Clear filters ×</button>}
        {data?.updatedAt && <span className="updated-at">Registry response: {dateOnly(data.updatedAt)}</span>}
      </div>
      {requestState==='loading' && <div className="loading-area" aria-live="polite" aria-busy="true"><div className="spinner"/><span>Loading source registry…</span><div className="skeleton-rows"><i/><i/><i/><i/></div></div>}
      {requestState==='error' && <div className="empty-state error-state" role="alert"><span className="empty-icon">!</span><h3>Source registry unavailable</h3><p>The list could not be loaded. Your current filters have been preserved.</p>{requestError && <p className="error-detail">{requestError}</p>}<button className="button button-primary" onClick={refresh}>Try again</button></div>}
      {requestState==='ready' && rows.length===0 && <div className="empty-state"><span className="empty-icon">⌕</span><h3>{filtered?'No matching sources':'No sources registered'}</h3><p>{filtered?'Try a different search or reset the filters.':'There are no accessible source records in this registry yet.'}</p>{filtered&&<button className="button button-secondary" onClick={reset}>Reset filters</button>}</div>}
      {requestState==='ready' && rows.length>0 && <>
        <div className="table-scroll"><table className="source-table"><thead><tr><th scope="col">Source</th><th scope="col">Type</th><th scope="col">Agency / owner</th><th scope="col">Coverage</th><th scope="col">Reporting period</th><th scope="col">Last successful retrieval</th><th scope="col">Lifecycle / freshness</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>{rows.map(source=><tr key={source.id}>
          <td data-label="Source"><div className="source-cell"><span className={`source-icon ${source.type.toLowerCase().replaceAll('_','-')}`} aria-hidden="true">{iconFor(source.type)}</span><div className="source-primary"><button className="source-link" onClick={e=>openDetails(source.id,e.currentTarget)}>{source.name}</button><p>{source.description||'Description not reported'}</p><div className="tag-list">{source.tags.slice(0,3).map(tag=><span className="tag" key={tag}>{tag}</span>)}{source.tags.length>3&&<span className="tag tag-more">+{source.tags.length-3}</span>}</div><div className="source-meta"><code>{source.id}</code><ProvenanceTag value={source.provenance}/></div></div></div></td>
          <td data-label="Type"><span className="type-label">{sourceTypeLabel(source.type)}</span></td>
          <td data-label="Agency / owner">{source.agencyOwner||'Not reported'}</td>
          <td data-label="Coverage">{source.geographicCoverage.length?source.geographicCoverage.map(x=>x.label).join(', '):'Not reported'}</td>
          <td data-label="Reporting period">{source.reportingPeriods.length?source.reportingPeriods.map(x=>x.label).join(', '):'Not reported'}</td>
          <td data-label="Last successful retrieval"><strong className="date-value">{dateOnly(source.lastSuccessfulRetrievalAt)}</strong><span className="cell-subtext">{source.lastValidatedAt?`Validated ${dateOnly(source.lastValidatedAt)}`:source.registryMetadataAccessedAt?`Registry metadata accessed ${dateOnly(source.registryMetadataAccessedAt)} · not a retrieval`:'Successful retrieval not reported'}</span></td>
          <td data-label="Lifecycle / freshness"><div className="status-stack"><StatusBadge value={source.lifecycleStatus}/><span className="freshness-label">Freshness <StatusBadge value={source.freshnessStatus} kind="freshness"/></span></div></td>
          <td data-label="Actions"><div className="row-actions"><button className="button button-secondary button-small" onClick={e=>openDetails(source.id,e.currentTarget)}>View<span className="sr-only"> {source.name}</span></button><div className="more-wrap"><button className="more-button" aria-label={`More actions for ${source.name}`} aria-haspopup="menu" aria-expanded={menuSource===source.id} onClick={()=>setMenuSource(current=>current===source.id?null:source.id)}>•••</button>{menuSource===source.id&&<div className="row-menu" role="menu"><button role="menuitem" onClick={e=>openDetails(source.id,e.currentTarget)}>View details</button><button role="menuitem" onClick={()=>copyId(source.id)}>Copy source ID</button>{source.capabilities.retryIngestion&&adapter.requestIngestion&&<button role="menuitem" onClick={()=>void retryIngestion(source)}>Request ingestion run</button>}</div>}</div></div></td>
        </tr>)}</tbody></table></div>
        <footer className="table-footer"><p>Showing <strong>{rows.length?((data!.page-1)*data!.pageSize+1):0}–{Math.min(data!.page*data!.pageSize,data!.total)}</strong> of <strong>{number(data!.total)}</strong> sources</p><div className="pagination-controls"><button className="button button-secondary button-small pagination-arrow" disabled={(data?.page??page)<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} aria-label="Previous page">←</button><span>Page <strong>{data?.page??page}</strong> of <strong>{pageCount}</strong></span><button className="button button-secondary button-small pagination-arrow" disabled={(data?.page??page)>=pageCount} onClick={()=>setPage(p=>Math.min(pageCount,p+1))} aria-label="Next page">→</button></div></footer>
      </>}
      <div className="registry-legend"><span><i className="legend-dot success"/> Lifecycle and freshness are separate signals</span><span><i className="legend-dot demo"/> Fixture metadata is labelled synthetic</span><span>Times are shown only when supplied</span></div>
    </section>
    {selected&&<SourceDrawer id={selected} adapter={adapter} onClose={closeDetails} onNotify={setToast}/>}
    {showCreate&&<CreateSourceDialog name={sourceName} setName={setSourceName} type={sourceType} setType={setSourceType} agency={sourceAgency} setAgency={setSourceAgency} purpose={sourcePurpose} setPurpose={setSourcePurpose} tags={sourceTags} setTags={setSourceTags} busy={createState==='saving'} error={createError} onClose={()=>setShowCreate(false)} onSubmit={submitCreate}/>}
    {toast&&<div className="toast" role="status" aria-live="polite"><span aria-hidden="true">✓</span>{toast}<button aria-label="Dismiss notification" onClick={()=>setToast(null)}>×</button></div>}
  </section>;
}
function MetricCard({icon,label,value,note,variant}:{icon:string;label:string;value?:number;note:string;variant:'navy'|'teal'|'orange'}) {
  return <article className={`metric-card metric-${variant}`}><span className="metric-icon" aria-hidden="true">{icon}</span><div className="metric-copy"><span className="metric-label">{label}</span><strong className="metric-value">{value==null?'—':number(value)}</strong><span className="metric-note">{note}</span></div></article>;
}

function SourceDrawer({id,adapter,onClose,onNotify}:{id:string;adapter:DataSourcesDataAdapter;onClose:()=>void;onNotify:(message:string)=>void}) {
  const [tab,setTab]=useState<'overview'|'runs'|'coverage'|'mapping'>('overview');
  const drawerRef=useRef<HTMLElement>(null);const closeRef=useRef<HTMLButtonElement>(null);
  const source=useResource(()=>adapter.getSource(id),true,[id,adapter]);
  const runs=useResource(()=>adapter.listIngestionRuns(id,{page:1,pageSize:10}),tab==='runs',[id,adapter,tab]);
  const coverage=useResource(()=>adapter.getCoverage(id),tab==='coverage',[id,adapter,tab]);
  const mappings=useResource(()=>adapter.getFieldMappings(id),tab==='mapping',[id,adapter,tab]);
  useEffect(()=>{closeRef.current?.focus();const key=(event:KeyboardEvent)=>{
    if(event.key==='Escape'){event.preventDefault();onClose();return;}
    if(event.key==='Tab'&&drawerRef.current){const focusable=[...drawerRef.current.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[href],[tabindex]:not([tabindex="-1"])')].filter(el=>el.offsetParent!==null);if(!focusable.length)return;const first=focusable[0],last=focusable[focusable.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
  };window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[onClose]);
  useEffect(()=>{setTab('overview');},[id]);
  const src=source.data;
  return <div className="drawer-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <aside ref={drawerRef} className="source-drawer" role="dialog" aria-modal="true" aria-labelledby="source-drawer-title">
      <div className="drawer-topline"><span>DATA SOURCE / DETAILS</span><button ref={closeRef} className="icon-button close-drawer" aria-label="Close details" onClick={onClose}>×</button></div>
      {(source.status==='idle'||source.status==='loading')&&<div className="drawer-loading"><div className="spinner"/><p>Loading source details…</p></div>}
      {source.status==='error'&&<div className="empty-state error-state"><span className="empty-icon">!</span><h3>Details unavailable</h3><p>{source.message}</p>{source.retryable&&<button className="button button-primary" onClick={source.retry}>Try again</button>}</div>}
      {source.status==='ready'&&src&&<>
        <div className="drawer-title-row"><span className={`source-icon drawer-source-icon ${src.type.toLowerCase().replaceAll('_','-')}`} aria-hidden="true">{iconFor(src.type)}</span><div className="drawer-title-copy"><p className="eyebrow">{sourceTypeLabel(src.type)}</p><h2 id="source-drawer-title">{src.name}</h2><p>{src.description||'Description not reported'}</p></div></div>
        <div className="drawer-badges"><StatusBadge value={src.lifecycleStatus}/><span className="freshness-label">Freshness <StatusBadge value={src.freshnessStatus} kind="freshness"/></span><ProvenanceTag value={src.provenance}/></div>
        {src.provenance==='SYNTHETIC_DEMO'&&<DemoNotice text="This record is an illustrative fixture. It does not prove a source is connected or that an ingestion occurred."/>}
        <div className="drawer-tabs" role="tablist" aria-label="Source detail sections">{([{id:'overview',label:'Overview'},{id:'runs',label:'Ingestion History'},{id:'coverage',label:'Data Coverage'},{id:'mapping',label:'Field Mapping'}] as const).map(item=><button key={item.id} role="tab" id={`tab-${item.id}`} aria-selected={tab===item.id} aria-controls="source-panel" onClick={()=>setTab(item.id)}>{item.label}</button>)}</div>
        <section className="drawer-panel" role="tabpanel" id="source-panel" aria-labelledby={`tab-${tab}`}>
          {tab==='overview'&&<SourceOverview source={src} onNotify={onNotify}/>}
          {tab==='runs'&&<RunsPanel state={runs} onRetry={runs.retry}/>}
          {tab==='coverage'&&<CoveragePanel state={coverage} onRetry={coverage.retry}/>}
          {tab==='mapping'&&<MappingPanel state={mappings} onRetry={mappings.retry}/>}
        </section>
        <div className="drawer-footer"><button className="button button-secondary" onClick={onClose}>Close details</button><span>Source ID <code>{src.id}</code></span></div>
      </>}
    </aside>
  </div>;
}
function SourceOverview({source:s,onNotify}:{source:DataSourceRecord;onNotify:(message:string)=>void}) {
  const fields:[string,ReactNode][]=[
    ['Agency / owner',s.agencyOwner||'Not reported'],['Purpose',s.purpose||'Not reported'],['Source type',sourceTypeLabel(s.type)],['Access method',s.accessMethod||'Not reported'],
    ['Reporting period',s.reportingPeriods.length?s.reportingPeriods.map(p=>p.label).join(', '):'Not reported'],['Source release / publication',dateOnly(s.sourceReleaseDate)],
    ['Last successful retrieval',dateOnly(s.lastSuccessfulRetrievalAt)],['Registry metadata accessed',dateOnly(s.registryMetadataAccessedAt)],['Last validated',dateOnly(s.lastValidatedAt)],
    ['Geographic scope',s.geographicCoverage.length?s.geographicCoverage.map(g=>`${g.label} (${human(g.level)})`).join('; '):'Not reported'],
  ];
  return <div className="overview-content"><SectionHeading title="Key information" detail="Publication, retrieval and validation are separate events."/><dl className="detail-grid">{fields.map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}<div><dt>Lifecycle status</dt><dd><StatusBadge value={s.lifecycleStatus}/></dd></div><div><dt>Freshness assessment</dt><dd><StatusBadge value={s.freshnessStatus} kind="freshness"/><span className="field-help">Based on the source's update policy, when supplied by the backend.</span></dd></div></dl>
    <div className="drawer-subsection"><h3>Tags</h3>{s.tags.length?<div className="tag-list">{s.tags.map(tag=><span className="tag" key={tag}>{tag}</span>)}</div>:<p className="muted-copy">No tags reported.</p>}</div>
    <div className="drawer-subsection"><h3>Operational notes</h3><p className="notes-box">{s.notes||'No operational notes reported.'}</p></div>
    <div className="capability-block"><h3>Available operations</h3><div className="capability-list">{([['View details',s.capabilities.view],['Edit source',s.capabilities.edit],['Request ingestion',s.capabilities.createIngestionRun&&Boolean(s.capabilities.retryIngestion)],['Delete source',s.capabilities.delete]] as const).map(([name,available])=><div key={name}><span>{name}</span><span className={available?'cap-yes':'cap-no'}>{available?'Available':'Not configured'}</span></div>)}</div><button className="text-button" onClick={()=>onNotify('Credentials and upstream connection strings are intentionally never shown in this screen.')}>Security & credentials note ↗</button></div>
  </div>;
}
function ResourceError({message,retryable,onRetry}:{message:string;retryable?:boolean;onRetry:()=>void}){return <div className="empty-state compact-empty error-state"><span className="empty-icon">!</span><h3>Could not load this section</h3><p>{message}</p>{retryable&&<button className="button button-secondary" onClick={onRetry}>Retry section</button>}</div>}
function ResourceLoading({label}:{label:string}) {return <div className="loading-area detail-loading" aria-live="polite" aria-busy="true"><div className="spinner"/><span>Loading {label}…</span></div>}
function RunsPanel({state,onRetry}:{state:ResourceState<PagedResult<IngestionRunRecord>>;onRetry:()=>void}) {
  if(state.status==='idle'||state.status==='loading')return <ResourceLoading label="ingestion history"/>;
  if(state.status==='error')return <ResourceError message={state.message??'Ingestion history is unavailable.'} retryable={state.retryable} onRetry={onRetry}/>;
  const runs=state.data?.items??[];
  if(!runs.length)return <div className="empty-state compact-empty"><span className="empty-icon">◷</span><h3>No runs recorded</h3><p>No ingestion runs are recorded for this source. This is not the same as a successful, empty retrieval.</p><StatusBadge value="NOT_CONFIGURED" kind="run"/></div>;
  return <div className="run-list">{state.data?.provenance==='SYNTHETIC_DEMO'&&<DemoNotice text="These run rows illustrate possible states. No live retrieval is asserted."/>}{runs.map(run=><article className="run-card" key={run.runId}><div className="run-card-top"><div><StatusBadge value={run.status} kind="run"/><span className="run-id">{run.runId}</span></div><ProvenanceTag value={run.provenance}/></div><p className="run-message">{run.safeMessage||'No safe run message reported.'}</p><div className="run-metrics"><MetricMini label="Retrieved" value={number(run.recordsRetrieved)}/><MetricMini label="Accepted" value={number(run.recordsAccepted)}/><MetricMini label="Rejected" value={number(run.recordsRejected)}/><MetricMini label="Warnings" value={number(run.warningCount)}/></div><div className="run-footer"><span>Started {dateOnly(run.startedAt)}</span><span>Completed {dateOnly(run.completedAt)}</span><span>Duration {duration(run.durationMs)}</span></div></article>)}</div>;
}
function MetricMini({label,value}:{label:string;value:string}){return <div><span>{label}</span><strong>{value}</strong></div>}
function CoveragePanel({state,onRetry}:{state:ResourceState<CoverageSummary>;onRetry:()=>void}) {
  if(state.status==='idle'||state.status==='loading')return <ResourceLoading label="coverage"/>;
  if(state.status==='error')return <ResourceError message={state.message??'Coverage is unavailable.'} retryable={state.retryable} onRetry={onRetry}/>;
  const c=state.data!;
  return <div className="coverage-content">{c.provenance==='SYNTHETIC_DEMO'&&<DemoNotice text="Coverage labels and periods are an unverified illustrative fixture."/>}<div className="coverage-state-card"><div><span className="metric-label">Coverage metadata state</span><h3>{human(c.state)}</h3></div><StatusBadge value={c.state} kind="coverage"/></div><div className="drawer-subsection"><h3>Geographic coverage</h3>{c.geography.length?<div className="coverage-list">{c.geography.map((g,i)=><div key={`${g.code??g.label}-${i}`}><span className="coverage-level">{human(g.level)}</span><strong>{g.label}</strong>{g.code&&<code>{g.code}</code>}</div>)}</div>:<p className="state-inline">Geographic coverage not reported.</p>}</div><div className="drawer-subsection"><h3>Available reporting periods</h3>{c.reportingPeriods.length?<div className="period-list">{c.reportingPeriods.map((p,i)=><div key={`${p.label}-${i}`}><strong>{p.label}</strong><span>{p.grain&&p.grain!=='UNKNOWN'?human(p.grain):'Reporting grain not reported'}</span></div>)}</div>:<p className="state-inline">No available reporting periods returned.</p>}</div><div className="drawer-subsection"><h3>Taxonomy versions</h3>{c.taxonomyVersions?.length?<div className="tag-list">{c.taxonomyVersions.map(v=><span className="tag" key={v}>{v}</span>)}</div>:<p className="state-inline">No taxonomy version reported.</p>}</div><div className="drawer-subsection"><h3>Known gaps & limitations</h3>{c.limitations.length?<ul className="limitations-list">{c.limitations.map((x,i)=><li key={`${x}-${i}`}>{x}</li>)}</ul>:<p className="state-inline">No limitations were supplied. This does not establish complete coverage.</p>}</div></div>;
}
function MappingPanel({state,onRetry}:{state:ResourceState<PagedResult<FieldMappingRecord>>;onRetry:()=>void}) {
  if(state.status==='idle'||state.status==='loading')return <ResourceLoading label="field mappings"/>;
  if(state.status==='error')return <ResourceError message={state.message??'Field mappings are unavailable.'} retryable={state.retryable} onRetry={onRetry}/>;
  const result=state.data!,rows=result.items;
  if(!rows.length)return <div className="empty-state compact-empty"><span className="empty-icon">⇄</span><h3>Mapping is not configured</h3><p>No source-to-canonical field mappings were returned. The mapping completion rate cannot be calculated from this response.</p></div>;
  return <div className="mapping-content">{result.provenance==='SYNTHETIC_DEMO'&&<DemoNotice text="Mapping rows are illustrative. Do not use them as a production data dictionary."/>}<div className="mapping-summary"><div><strong>{number(result.total)}</strong><span>Mapping records in response</span></div><div><strong>{number(rows.filter(r=>r.status==='NEEDS_REVIEW').length)}</strong><span>Visible rows needing review</span></div><p>Counts reflect this response page only where indicated; no mapping percentage is inferred.</p></div><div className="mapping-table-wrap"><table className="mapping-table"><thead><tr><th scope="col">Source field</th><th scope="col">Canonical field</th><th scope="col">Transformation</th><th scope="col">Status</th></tr></thead><tbody>{rows.map((m:FieldMappingRecord)=><tr key={m.id}><td data-label="Source field"><strong>{m.sourceField}</strong><small>{m.sourceType}</small>{m.schemaVersion&&<small>Schema {m.schemaVersion}</small>}</td><td data-label="Canonical field">{m.canonicalField||'Not mapped'}{m.canonicalType&&<small>{m.canonicalType}</small>}</td><td data-label="Transformation">{m.transformation||m.note||'Not reported'}</td><td data-label="Status"><StatusBadge value={m.status} kind="mapping"/>{m.note&&m.transformation&&<small className="mapping-note">{m.note}</small>}</td></tr>)}</tbody></table></div></div>;
}

function CreateSourceDialog({name,setName,type,setType,agency,setAgency,purpose,setPurpose,tags,setTags,busy,error,onClose,onSubmit}:{name:string;setName:(s:string)=>void;type:SourceType;setType:(s:SourceType)=>void;agency:string;setAgency:(s:string)=>void;purpose:string;setPurpose:(s:string)=>void;tags:string;setTags:(s:string)=>void;busy:boolean;error:string;onClose:()=>void;onSubmit:(e:FormEvent<HTMLFormElement>)=>void}) {
  const titleId=useId();const dialog=useRef<HTMLElement>(null);const close=useRef<HTMLButtonElement>(null);
  useEffect(()=>{close.current?.focus();const key=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!busy)onClose();if(event.key==='Tab'&&dialog.current){const els=[...dialog.current.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)')];const first=els[0],last=els[els.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[onClose,busy]);
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onClose();}}><section className="create-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={dialog}><div className="dialog-head"><div><p className="eyebrow">SOURCE REGISTRY</p><h2 id={titleId}>Add new source</h2><p>Register metadata first; a record does not configure an upstream connector.</p></div><button ref={close} className="icon-button" aria-label="Close add source dialog" disabled={busy} onClick={onClose}>×</button></div><DemoNotice text="In mock mode this creates a local demo draft for this session only. No source is connected and the draft is not persisted."/><form onSubmit={onSubmit} className="create-form"><label>Source name <span aria-hidden="true">*</span><input autoFocus required minLength={2} maxLength={120} value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Training Outcomes Dataset" /></label><label>Source type <select value={type} onChange={e=>setType(e.target.value as SourceType)}>{TYPES.map(t=><option key={t} value={t}>{sourceTypeLabel(t)}</option>)}</select></label><label>Agency / owner<input value={agency} onChange={e=>setAgency(e.target.value)} maxLength={160} placeholder="Not required yet" /></label><label>Purpose<textarea value={purpose} onChange={e=>setPurpose(e.target.value)} maxLength={500} rows={3} placeholder="What does this dataset contribute to SHRAMIK?"/></label><label>Tags <span className="label-sub">comma separated</span><input value={tags} onChange={e=>setTags(e.target.value)} placeholder="Employment, training, skills" /></label>{error&&<p className="form-error" role="alert">{error}</p>}<div className="dialog-actions"><button className="button button-secondary" type="button" disabled={busy} onClick={onClose}>Cancel</button><button className="button button-primary" type="submit" disabled={busy||name.trim().length<2}>{busy?<><span className="spinner spinner-small"/> Saving…</>: 'Create source draft'}</button></div></form></section></div>;
}
