import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { DataSourcesAdapterError } from './DataSourcesDataAdapter';
const LIFECYCLE = ['ACTIVE', 'PENDING_VALIDATION', 'STALE', 'FAILED', 'NOT_CONFIGURED', 'DISABLED', 'UNKNOWN'];
const TYPES = ['GOVERNMENT_DATASET', 'REFERENCE_DATA', 'INDUSTRY_FEED', 'TRAINING_DATASET', 'INTERNAL_DATASET', 'OTHER'];
const TYPE_LABEL = {
    GOVERNMENT_DATASET: 'Government dataset', REFERENCE_DATA: 'Reference data', INDUSTRY_FEED: 'Industry feed',
    TRAINING_DATASET: 'Training dataset', INTERNAL_DATASET: 'Internal dataset', OTHER: 'Other',
};
const STATUS_LABEL = {
    ACTIVE: 'Active', PENDING_VALIDATION: 'Pending validation', STALE: 'Stale', FAILED: 'Failed',
    NOT_CONFIGURED: 'Not configured', DISABLED: 'Disabled', UNKNOWN: 'Unknown',
    UP_TO_DATE: 'Up to date', DUE_SOON: 'Due soon', NOT_APPLICABLE: 'Not applicable',
    QUEUED: 'Queued', RUNNING: 'Running', SUCCEEDED: 'Succeeded', WARNING: 'Warning', CANCELLED: 'Cancelled',
    COMPLETE: 'Complete', PARTIAL: 'Partial', MAPPED: 'Mapped', NEEDS_REVIEW: 'Needs review', UNMAPPED: 'Unmapped', REJECTED: 'Rejected',
};
const iconFor = (type) => ({ GOVERNMENT_DATASET: '▥', REFERENCE_DATA: '▤', INDUSTRY_FEED: '↗', TRAINING_DATASET: '⌂', INTERNAL_DATASET: '▣', OTHER: '◇' }[type] ?? '◇');
const human = (value) => value ? STATUS_LABEL[value] ?? value.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Not reported';
const dateOnly = (value) => {
    if (!value)
        return 'Not reported';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime()))
        return 'Not reported';
    const options = /^\d{4}-\d{2}-\d{2}$/.test(value) ? { dateStyle: 'medium', timeZone: 'UTC' } : { dateStyle: 'medium', timeStyle: 'short' };
    return new Intl.DateTimeFormat('en-IN', options).format(parsed);
};
const number = (value) => value == null || !Number.isFinite(value) ? 'Not reported' : new Intl.NumberFormat('en-IN').format(value);
const duration = (value) => value == null || !Number.isFinite(value) ? 'Not reported' : value < 1000 ? `${Math.round(value)} ms` : value < 60000 ? `${(value / 1000).toFixed(1)} s` : `${Math.floor(value / 60000)}m ${Math.round((value % 60000) / 1000)}s`;
const provenanceLabel = { SOURCE_BACKED: 'Source-backed', SYNTHETIC_DEMO: 'Synthetic demo', DERIVED: 'Derived', MIXED: 'Mixed provenance', UNKNOWN: 'Provenance unknown' };
const sourceTypeLabel = (value) => TYPE_LABEL[value] ?? human(value);
function errorMessage(error) {
    if (error instanceof DataSourcesAdapterError)
        return error.detail.message;
    if (error instanceof Error && error.message)
        return error.message;
    return 'The request could not be completed. Please try again.';
}
function errorRetryable(error) { return error instanceof DataSourcesAdapterError ? error.detail.retryable : true; }
function useResource(load, enabled, deps) {
    const [state, setState] = useState({ status: 'idle' });
    const [attempt, setAttempt] = useState(0);
    const retry = useCallback(() => setAttempt(n => n + 1), []);
    useEffect(() => {
        if (!enabled)
            return;
        let current = true;
        setState({ status: 'loading' });
        load().then(data => { if (current)
            setState({ status: 'ready', data }); }).catch(error => { if (current)
            setState({ status: 'error', message: errorMessage(error), retryable: errorRetryable(error) }); });
        return () => { current = false; };
        // deps are explicitly supplied by the caller to keep each resource independent.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...deps, enabled, attempt]);
    return { ...state, retry };
}
function StatusBadge({ value, kind = 'lifecycle' }) {
    const cls = value.toLowerCase().replaceAll('_', '-');
    const symbol = ['ACTIVE', 'UP_TO_DATE', 'SUCCEEDED', 'MAPPED', 'COMPLETE'].includes(value) ? '✓' : ['FAILED', 'REJECTED'].includes(value) ? '!' : ['RUNNING', 'QUEUED'].includes(value) ? '◷' : ['STALE', 'WARNING', 'PENDING_VALIDATION', 'DUE_SOON', 'NEEDS_REVIEW', 'PARTIAL'].includes(value) ? '!' : '•';
    return _jsxs("span", { className: `status-badge status-${kind} ${cls}`, children: [_jsx("span", { "aria-hidden": "true", className: "status-mark", children: symbol }), human(value)] });
}
function ProvenanceTag({ value }) { return _jsx("span", { className: `provenance provenance-${value.toLowerCase().replaceAll('_', '-')}`, children: provenanceLabel[value] ?? 'Provenance unknown' }); }
function DemoNotice({ text = 'Illustrative fixture only — source metadata, dates, coverage and runs are not verified live integrations.' }) {
    return _jsxs("div", { className: "demo-notice", role: "note", children: [_jsx("span", { className: "notice-icon", "aria-hidden": "true", children: "!" }), _jsxs("div", { children: [_jsx("strong", { children: "SYNTHETIC_DEMO" }), _jsx("span", { children: text })] })] });
}
function SectionHeading({ eyebrow, title, detail, action }) {
    return _jsxs("div", { className: "section-heading", children: [" ", _jsxs("div", { children: [eyebrow && _jsx("p", { className: "section-eyebrow", children: eyebrow }), _jsx("h2", { children: title }), detail && _jsx("p", { children: detail })] }), action] });
}
export function DataSourcesPage({ adapter }) {
    const headingId = useId();
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [status, setStatus] = useState('ALL');
    const [type, setType] = useState('ALL');
    const [agency, setAgency] = useState('ALL');
    const [page, setPage] = useState(1);
    const [reload, setReload] = useState(0);
    const [data, setData] = useState(null);
    const [requestState, setRequestState] = useState('loading');
    const [selected, setSelected] = useState(null);
    const [menuSource, setMenuSource] = useState(null);
    const [toast, setToast] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [createState, setCreateState] = useState('idle');
    const [createError, setCreateError] = useState('');
    const [sourceName, setSourceName] = useState('');
    const [sourceType, setSourceType] = useState('GOVERNMENT_DATASET');
    const [sourceAgency, setSourceAgency] = useState('');
    const [sourcePurpose, setSourcePurpose] = useState('');
    const [sourceTags, setSourceTags] = useState('');
    const lastTrigger = useRef(null);
    const refresh = useCallback(() => setReload(n => n + 1), []);
    const closeDetails = useCallback(() => { setSelected(null); setMenuSource(null); window.setTimeout(() => lastTrigger.current?.focus(), 0); }, []);
    useEffect(() => { const timer = window.setTimeout(() => setDebouncedQuery(query), 220); return () => window.clearTimeout(timer); }, [query]);
    useEffect(() => { setPage(1); }, [debouncedQuery, status, type, agency]);
    useEffect(() => {
        let current = true;
        setRequestState('loading');
        adapter.listSources({ query: debouncedQuery, status, type, agency, page, pageSize: 8 })
            .then(result => { if (current) {
            setData(result);
            setRequestState('ready');
        } })
            .catch(() => { if (current)
            setRequestState('error'); });
        return () => { current = false; };
    }, [adapter, debouncedQuery, status, type, agency, page, reload]);
    useEffect(() => { if (!toast)
        return; const timer = window.setTimeout(() => setToast(null), 4200); return () => window.clearTimeout(timer); }, [toast]);
    const reset = () => { setQuery(''); setDebouncedQuery(''); setStatus('ALL'); setType('ALL'); setAgency('ALL'); setPage(1); setMenuSource(null); };
    const rows = data?.items ?? [];
    const agencies = data?.facets?.agencies ?? [...new Set(rows.map(x => x.agencyOwner).filter((x) => Boolean(x)))].sort((a, b) => a.localeCompare(b));
    const summary = data?.summary ?? { total: data?.total };
    const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / (data?.pageSize ?? 8)));
    const filtered = Boolean(debouncedQuery || status !== 'ALL' || type !== 'ALL' || agency !== 'ALL');
    const openDetails = (sourceId, trigger) => { lastTrigger.current = trigger; setSelected(sourceId); setMenuSource(null); };
    const copyId = async (id) => {
        try {
            await navigator.clipboard.writeText(id);
            setToast(`Copied source ID: ${id}`);
        }
        catch {
            setToast(`Source ID: ${id} (clipboard permission unavailable)`);
        }
        setMenuSource(null);
    };
    const retryIngestion = async (source) => {
        if (!source.capabilities.retryIngestion || !adapter.requestIngestion) {
            setToast('Ingestion retry is not configured for this source.');
            setMenuSource(null);
            return;
        }
        try {
            const run = await adapter.requestIngestion(source.id);
            setToast(`Ingestion ${run.status.toLowerCase()}: ${run.runId}. A queued run is not a completed retrieval.`);
            refresh();
        }
        catch (e) {
            setToast(errorMessage(e));
        }
        setMenuSource(null);
    };
    const submitCreate = async (e) => {
        e.preventDefault();
        if (!adapter.createSource) {
            setCreateError('Creating sources is not configured for this environment.');
            setCreateState('error');
            return;
        }
        setCreateState('saving');
        setCreateError('');
        try {
            const created = await adapter.createSource({ name: sourceName.trim(), type: sourceType, agencyOwner: sourceAgency.trim() || undefined, purpose: sourcePurpose.trim() || undefined, tags: sourceTags.split(',').map(x => x.trim()).filter(Boolean) });
            setShowCreate(false);
            setSourceName('');
            setSourceAgency('');
            setSourcePurpose('');
            setSourceTags('');
            setCreateState('idle');
            setQuery('');
            setDebouncedQuery('');
            setStatus('ALL');
            setType('ALL');
            setAgency('ALL');
            setPage(1);
            setSelected(created.id);
            refresh();
            setToast(adapter.capabilities?.createSource ? (created.provenance === 'SYNTHETIC_DEMO' ? 'Local demo draft added to this session only; no connector was configured.' : 'Source record created.') : 'Source record submitted.');
        }
        catch (error) {
            setCreateError(errorMessage(error));
            setCreateState('error');
        }
    };
    return _jsxs("section", { className: "data-sources-page", "aria-labelledby": headingId, children: [_jsxs("div", { className: "page-heading-row", children: [_jsxs("div", { className: "page-title-block", children: [_jsxs("div", { className: "breadcrumbs", children: [_jsx("span", { children: "Home" }), _jsx("span", { "aria-hidden": "true", children: "\u203A" }), _jsx("span", { "aria-current": "page", children: "Data Sources" })] }), _jsx("p", { className: "eyebrow", children: "DATA OPERATIONS / SOURCE REGISTRY" }), _jsxs("h1", { id: headingId, children: ["Data Sources", _jsx("span", { className: "title-period", children: "." })] }), _jsx("p", { className: "page-intro", children: "Manage and monitor the datasets used in SHRAMIK. Track integration status, freshness, coverage and field-mapping quality." })] }), adapter.capabilities?.createSource && _jsxs("button", { className: "button button-primary add-source", onClick: () => { setShowCreate(true); setCreateState('idle'); setCreateError(''); }, children: [_jsx("span", { "aria-hidden": "true", children: "\uFF0B" }), " Add New Source"] })] }), data?.provenance === 'SYNTHETIC_DEMO' && _jsx(DemoNotice, {}), data && data.provenance !== 'SYNTHETIC_DEMO' && _jsxs("div", { className: "connection-note", role: "note", children: [_jsx("span", { className: "connection-dot", "aria-hidden": "true" }), _jsxs("div", { children: [_jsx("strong", { children: "Registry response received" }), _jsx("span", { children: "Source status, freshness and provenance are shown as returned by the SHRAMIK API. No upstream connector is called directly from this browser." })] }), _jsxs("button", { className: "button button-tertiary button-small", onClick: refresh, children: ["Refresh ", _jsx("span", { "aria-hidden": "true", children: "\u21BB" })] })] }), _jsxs("section", { className: "summary-grid", "aria-label": "Source summary", children: [_jsx(MetricCard, { icon: "\u25A4", label: "Total sources", value: summary.total, note: "In current filtered scope", variant: "navy" }), _jsx(MetricCard, { icon: "\u2713", label: "Active", value: summary.active, note: "Lifecycle status: Active", variant: "teal" }), _jsx(MetricCard, { icon: "!", label: "Needs attention", value: summary.needsAttention, note: "Pending validation \u00B7 stale \u00B7 failed", variant: "orange" }), _jsxs("div", { className: "summary-side-note", children: [_jsx("span", { className: "summary-side-label", children: "Not configured" }), _jsx("strong", { children: summary.notConfigured == null ? '—' : number(summary.notConfigured) }), _jsx("span", { children: "Tracked separately from attention count" })] })] }), _jsxs("section", { className: "registry-panel", "aria-label": "Source registry", children: [_jsx(SectionHeading, { eyebrow: "REGISTRY", title: "Registered sources", detail: requestState === 'ready' ? `${number(data?.total)} matching source${data?.total === 1 ? '' : 's'} · source reporting periods are not retrieval timestamps.` : 'Search, filter and inspect source metadata.', action: _jsx("button", { className: "button button-tertiary button-small", onClick: refresh, "aria-label": "Refresh source registry", children: "\u21BB Refresh" }) }), _jsxs("div", { className: "filters", role: "search", children: [_jsxs("label", { className: "search-field", children: [_jsx("span", { className: "control-label", children: "Search sources" }), _jsxs("span", { className: "search-input-wrap", children: [_jsx("span", { "aria-hidden": "true", children: "\u2315" }), _jsx("input", { value: query, onChange: e => setQuery(e.target.value), placeholder: "Name, agency, type or tag\u2026", "aria-label": "Search sources" }), _jsx("kbd", { children: "\u2315" })] })] }), _jsxs("label", { children: [_jsx("span", { className: "control-label", children: "Status" }), _jsxs("select", { value: status, onChange: e => setStatus(e.target.value), "aria-label": "Filter by status", children: [_jsx("option", { value: "ALL", children: "All statuses" }), LIFECYCLE.map(x => _jsx("option", { value: x, children: human(x) }, x))] })] }), _jsxs("label", { children: [_jsx("span", { className: "control-label", children: "Source type" }), _jsxs("select", { value: type, onChange: e => setType(e.target.value), "aria-label": "Filter by source type", children: [_jsx("option", { value: "ALL", children: "All source types" }), TYPES.map(x => _jsx("option", { value: x, children: sourceTypeLabel(x) }, x))] })] }), _jsxs("label", { children: [_jsx("span", { className: "control-label", children: "Agency / owner" }), _jsxs("select", { value: agency, onChange: e => setAgency(e.target.value), "aria-label": "Filter by agency", children: [_jsx("option", { value: "ALL", children: "All agencies" }), agencies.map(x => _jsx("option", { value: x, children: x }, x))] })] }), _jsx("button", { className: "button button-secondary reset-button", onClick: reset, disabled: !query && status === 'ALL' && type === 'ALL' && agency === 'ALL', children: "Reset" })] }), _jsxs("div", { className: "active-filter-strip", "aria-live": "polite", children: [_jsx("span", { children: filtered ? 'Filtered view' : 'All accessible sources' }), filtered && _jsx("button", { className: "text-button", onClick: reset, children: "Clear filters \u00D7" }), data?.updatedAt && _jsxs("span", { className: "updated-at", children: ["Registry response: ", dateOnly(data.updatedAt)] })] }), requestState === 'loading' && _jsxs("div", { className: "loading-area", "aria-live": "polite", "aria-busy": "true", children: [_jsx("div", { className: "spinner" }), _jsx("span", { children: "Loading source registry\u2026" }), _jsxs("div", { className: "skeleton-rows", children: [_jsx("i", {}), _jsx("i", {}), _jsx("i", {}), _jsx("i", {})] })] }), requestState === 'error' && _jsxs("div", { className: "empty-state error-state", role: "alert", children: [_jsx("span", { className: "empty-icon", children: "!" }), _jsx("h3", { children: "Source registry unavailable" }), _jsx("p", { children: "The list could not be loaded. Your current filters have been preserved." }), _jsx("button", { className: "button button-primary", onClick: refresh, children: "Try again" })] }), requestState === 'ready' && rows.length === 0 && _jsxs("div", { className: "empty-state", children: [_jsx("span", { className: "empty-icon", children: "\u2315" }), _jsx("h3", { children: filtered ? 'No matching sources' : 'No sources registered' }), _jsx("p", { children: filtered ? 'Try a different search or reset the filters.' : 'There are no accessible source records in this registry yet.' }), filtered && _jsx("button", { className: "button button-secondary", onClick: reset, children: "Reset filters" })] }), requestState === 'ready' && rows.length > 0 && _jsxs(_Fragment, { children: [_jsx("div", { className: "table-scroll", children: _jsxs("table", { className: "source-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { scope: "col", children: "Source" }), _jsx("th", { scope: "col", children: "Type" }), _jsx("th", { scope: "col", children: "Agency / owner" }), _jsx("th", { scope: "col", children: "Coverage" }), _jsx("th", { scope: "col", children: "Reporting period" }), _jsx("th", { scope: "col", children: "Last successful retrieval" }), _jsx("th", { scope: "col", children: "Lifecycle / freshness" }), _jsx("th", { scope: "col", children: _jsx("span", { className: "sr-only", children: "Actions" }) })] }) }), _jsx("tbody", { children: rows.map(source => _jsxs("tr", { children: [_jsx("td", { "data-label": "Source", children: _jsxs("div", { className: "source-cell", children: [_jsx("span", { className: `source-icon ${source.type.toLowerCase().replaceAll('_', '-')}`, "aria-hidden": "true", children: iconFor(source.type) }), _jsxs("div", { className: "source-primary", children: [_jsx("button", { className: "source-link", onClick: e => openDetails(source.id, e.currentTarget), children: source.name }), _jsx("p", { children: source.description || 'Description not reported' }), _jsxs("div", { className: "tag-list", children: [source.tags.slice(0, 3).map(tag => _jsx("span", { className: "tag", children: tag }, tag)), source.tags.length > 3 && _jsxs("span", { className: "tag tag-more", children: ["+", source.tags.length - 3] })] }), _jsxs("div", { className: "source-meta", children: [_jsx("code", { children: source.id }), _jsx(ProvenanceTag, { value: source.provenance })] })] })] }) }), _jsx("td", { "data-label": "Type", children: _jsx("span", { className: "type-label", children: sourceTypeLabel(source.type) }) }), _jsx("td", { "data-label": "Agency / owner", children: source.agencyOwner || 'Not reported' }), _jsx("td", { "data-label": "Coverage", children: source.geographicCoverage.length ? source.geographicCoverage.map(x => x.label).join(', ') : 'Not reported' }), _jsx("td", { "data-label": "Reporting period", children: source.reportingPeriods.length ? source.reportingPeriods.map(x => x.label).join(', ') : 'Not reported' }), _jsxs("td", { "data-label": "Last successful retrieval", children: [_jsx("strong", { className: "date-value", children: dateOnly(source.lastSuccessfulRetrievalAt) }), _jsx("span", { className: "cell-subtext", children: source.lastValidatedAt ? `Validated ${dateOnly(source.lastValidatedAt)}` : 'Validation time not reported' })] }), _jsx("td", { "data-label": "Lifecycle / freshness", children: _jsxs("div", { className: "status-stack", children: [_jsx(StatusBadge, { value: source.lifecycleStatus }), _jsxs("span", { className: "freshness-label", children: ["Freshness ", _jsx(StatusBadge, { value: source.freshnessStatus, kind: "freshness" })] })] }) }), _jsx("td", { "data-label": "Actions", children: _jsxs("div", { className: "row-actions", children: [_jsxs("button", { className: "button button-secondary button-small", onClick: e => openDetails(source.id, e.currentTarget), children: ["View", _jsxs("span", { className: "sr-only", children: [" ", source.name] })] }), _jsxs("div", { className: "more-wrap", children: [_jsx("button", { className: "more-button", "aria-label": `More actions for ${source.name}`, "aria-haspopup": "menu", "aria-expanded": menuSource === source.id, onClick: () => setMenuSource(current => current === source.id ? null : source.id), children: "\u2022\u2022\u2022" }), menuSource === source.id && _jsxs("div", { className: "row-menu", role: "menu", children: [_jsx("button", { role: "menuitem", onClick: e => openDetails(source.id, e.currentTarget), children: "View details" }), _jsx("button", { role: "menuitem", onClick: () => copyId(source.id), children: "Copy source ID" }), source.capabilities.retryIngestion && adapter.requestIngestion && _jsx("button", { role: "menuitem", onClick: () => void retryIngestion(source), children: "Request ingestion run" })] })] })] }) })] }, source.id)) })] }) }), _jsxs("footer", { className: "table-footer", children: [_jsxs("p", { children: ["Showing ", _jsxs("strong", { children: [rows.length ? ((data.page - 1) * data.pageSize + 1) : 0, "\u2013", Math.min(data.page * data.pageSize, data.total)] }), " of ", _jsx("strong", { children: number(data.total) }), " sources"] }), _jsxs("div", { className: "pagination-controls", children: [_jsx("button", { className: "button button-secondary button-small pagination-arrow", disabled: (data?.page ?? page) <= 1, onClick: () => setPage(p => Math.max(1, p - 1)), "aria-label": "Previous page", children: "\u2190" }), _jsxs("span", { children: ["Page ", _jsx("strong", { children: data?.page ?? page }), " of ", _jsx("strong", { children: pageCount })] }), _jsx("button", { className: "button button-secondary button-small pagination-arrow", disabled: (data?.page ?? page) >= pageCount, onClick: () => setPage(p => Math.min(pageCount, p + 1)), "aria-label": "Next page", children: "\u2192" })] })] })] }), _jsxs("div", { className: "registry-legend", children: [_jsxs("span", { children: [_jsx("i", { className: "legend-dot success" }), " Lifecycle and freshness are separate signals"] }), _jsxs("span", { children: [_jsx("i", { className: "legend-dot demo" }), " Fixture metadata is labelled synthetic"] }), _jsx("span", { children: "Times are shown only when supplied" })] })] }), selected && _jsx(SourceDrawer, { id: selected, adapter: adapter, onClose: closeDetails, onNotify: setToast }), showCreate && _jsx(CreateSourceDialog, { name: sourceName, setName: setSourceName, type: sourceType, setType: setSourceType, agency: sourceAgency, setAgency: setSourceAgency, purpose: sourcePurpose, setPurpose: setSourcePurpose, tags: sourceTags, setTags: setSourceTags, busy: createState === 'saving', error: createError, onClose: () => setShowCreate(false), onSubmit: submitCreate }), toast && _jsxs("div", { className: "toast", role: "status", "aria-live": "polite", children: [_jsx("span", { "aria-hidden": "true", children: "\u2713" }), toast, _jsx("button", { "aria-label": "Dismiss notification", onClick: () => setToast(null), children: "\u00D7" })] })] });
}
function MetricCard({ icon, label, value, note, variant }) {
    return _jsxs("article", { className: `metric-card metric-${variant}`, children: [_jsx("span", { className: "metric-icon", "aria-hidden": "true", children: icon }), _jsxs("div", { className: "metric-copy", children: [_jsx("span", { className: "metric-label", children: label }), _jsx("strong", { className: "metric-value", children: value == null ? '—' : number(value) }), _jsx("span", { className: "metric-note", children: note })] })] });
}
function SourceDrawer({ id, adapter, onClose, onNotify }) {
    const [tab, setTab] = useState('overview');
    const drawerRef = useRef(null);
    const closeRef = useRef(null);
    const source = useResource(() => adapter.getSource(id), true, [id, adapter]);
    const runs = useResource(() => adapter.listIngestionRuns(id, { page: 1, pageSize: 10 }), tab === 'runs', [id, adapter, tab]);
    const coverage = useResource(() => adapter.getCoverage(id), tab === 'coverage', [id, adapter, tab]);
    const mappings = useResource(() => adapter.getFieldMappings(id), tab === 'mapping', [id, adapter, tab]);
    useEffect(() => {
        closeRef.current?.focus();
        const key = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
                return;
            }
            if (event.key === 'Tab' && drawerRef.current) {
                const focusable = [...drawerRef.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[href],[tabindex]:not([tabindex="-1"])')].filter(el => el.offsetParent !== null);
                if (!focusable.length)
                    return;
                const first = focusable[0], last = focusable[focusable.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                }
                else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }
        };
        window.addEventListener('keydown', key);
        return () => window.removeEventListener('keydown', key);
    }, [onClose]);
    useEffect(() => { setTab('overview'); }, [id]);
    const src = source.data;
    return _jsx("div", { className: "drawer-backdrop", onMouseDown: e => { if (e.target === e.currentTarget)
            onClose(); }, children: _jsxs("aside", { ref: drawerRef, className: "source-drawer", role: "dialog", "aria-modal": "true", "aria-labelledby": "source-drawer-title", children: [_jsxs("div", { className: "drawer-topline", children: [_jsx("span", { children: "DATA SOURCE / DETAILS" }), _jsx("button", { ref: closeRef, className: "icon-button close-drawer", "aria-label": "Close details", onClick: onClose, children: "\u00D7" })] }), (source.status === 'idle' || source.status === 'loading') && _jsxs("div", { className: "drawer-loading", children: [_jsx("div", { className: "spinner" }), _jsx("p", { children: "Loading source details\u2026" })] }), source.status === 'error' && _jsxs("div", { className: "empty-state error-state", children: [_jsx("span", { className: "empty-icon", children: "!" }), _jsx("h3", { children: "Details unavailable" }), _jsx("p", { children: source.message }), source.retryable && _jsx("button", { className: "button button-primary", onClick: source.retry, children: "Try again" })] }), source.status === 'ready' && src && _jsxs(_Fragment, { children: [_jsxs("div", { className: "drawer-title-row", children: [_jsx("span", { className: `source-icon drawer-source-icon ${src.type.toLowerCase().replaceAll('_', '-')}`, "aria-hidden": "true", children: iconFor(src.type) }), _jsxs("div", { className: "drawer-title-copy", children: [_jsx("p", { className: "eyebrow", children: sourceTypeLabel(src.type) }), _jsx("h2", { id: "source-drawer-title", children: src.name }), _jsx("p", { children: src.description || 'Description not reported' })] })] }), _jsxs("div", { className: "drawer-badges", children: [_jsx(StatusBadge, { value: src.lifecycleStatus }), _jsxs("span", { className: "freshness-label", children: ["Freshness ", _jsx(StatusBadge, { value: src.freshnessStatus, kind: "freshness" })] }), _jsx(ProvenanceTag, { value: src.provenance })] }), src.provenance === 'SYNTHETIC_DEMO' && _jsx(DemoNotice, { text: "This record is an illustrative fixture. It does not prove a source is connected or that an ingestion occurred." }), _jsx("div", { className: "drawer-tabs", role: "tablist", "aria-label": "Source detail sections", children: [{ id: 'overview', label: 'Overview' }, { id: 'runs', label: 'Ingestion History' }, { id: 'coverage', label: 'Data Coverage' }, { id: 'mapping', label: 'Field Mapping' }].map(item => _jsx("button", { role: "tab", id: `tab-${item.id}`, "aria-selected": tab === item.id, "aria-controls": "source-panel", onClick: () => setTab(item.id), children: item.label }, item.id)) }), _jsxs("section", { className: "drawer-panel", role: "tabpanel", id: "source-panel", "aria-labelledby": `tab-${tab}`, children: [tab === 'overview' && _jsx(SourceOverview, { source: src, onNotify: onNotify }), tab === 'runs' && _jsx(RunsPanel, { state: runs, onRetry: runs.retry }), tab === 'coverage' && _jsx(CoveragePanel, { state: coverage, onRetry: coverage.retry }), tab === 'mapping' && _jsx(MappingPanel, { state: mappings, onRetry: mappings.retry })] }), _jsxs("div", { className: "drawer-footer", children: [_jsx("button", { className: "button button-secondary", onClick: onClose, children: "Close details" }), _jsxs("span", { children: ["Source ID ", _jsx("code", { children: src.id })] })] })] })] }) });
}
function SourceOverview({ source: s, onNotify }) {
    const fields = [
        ['Agency / owner', s.agencyOwner || 'Not reported'], ['Purpose', s.purpose || 'Not reported'], ['Source type', sourceTypeLabel(s.type)], ['Access method', s.accessMethod || 'Not reported'],
        ['Reporting period', s.reportingPeriods.length ? s.reportingPeriods.map(p => p.label).join(', ') : 'Not reported'], ['Source release / publication', dateOnly(s.sourceReleaseDate)],
        ['Last successful retrieval', dateOnly(s.lastSuccessfulRetrievalAt)], ['Last validated', dateOnly(s.lastValidatedAt)],
        ['Geographic scope', s.geographicCoverage.length ? s.geographicCoverage.map(g => `${g.label} (${human(g.level)})`).join('; ') : 'Not reported'],
    ];
    return _jsxs("div", { className: "overview-content", children: [_jsx(SectionHeading, { title: "Key information", detail: "Publication, retrieval and validation are separate events." }), _jsxs("dl", { className: "detail-grid", children: [fields.map(([k, v]) => _jsxs("div", { children: [_jsx("dt", { children: k }), _jsx("dd", { children: v })] }, k)), _jsxs("div", { children: [_jsx("dt", { children: "Lifecycle status" }), _jsx("dd", { children: _jsx(StatusBadge, { value: s.lifecycleStatus }) })] }), _jsxs("div", { children: [_jsx("dt", { children: "Freshness assessment" }), _jsxs("dd", { children: [_jsx(StatusBadge, { value: s.freshnessStatus, kind: "freshness" }), _jsx("span", { className: "field-help", children: "Based on the source's update policy, when supplied by the backend." })] })] })] }), _jsxs("div", { className: "drawer-subsection", children: [_jsx("h3", { children: "Tags" }), s.tags.length ? _jsx("div", { className: "tag-list", children: s.tags.map(tag => _jsx("span", { className: "tag", children: tag }, tag)) }) : _jsx("p", { className: "muted-copy", children: "No tags reported." })] }), _jsxs("div", { className: "drawer-subsection", children: [_jsx("h3", { children: "Operational notes" }), _jsx("p", { className: "notes-box", children: s.notes || 'No operational notes reported.' })] }), _jsxs("div", { className: "capability-block", children: [_jsx("h3", { children: "Available operations" }), _jsx("div", { className: "capability-list", children: [['View details', s.capabilities.view], ['Edit source', s.capabilities.edit], ['Request ingestion', s.capabilities.createIngestionRun && Boolean(s.capabilities.retryIngestion)], ['Delete source', s.capabilities.delete]].map(([name, available]) => _jsxs("div", { children: [_jsx("span", { children: name }), _jsx("span", { className: available ? 'cap-yes' : 'cap-no', children: available ? 'Available' : 'Not configured' })] }, name)) }), _jsx("button", { className: "text-button", onClick: () => onNotify('Credentials and upstream connection strings are intentionally never shown in this screen.'), children: "Security & credentials note \u2197" })] })] });
}
function ResourceError({ message, retryable, onRetry }) { return _jsxs("div", { className: "empty-state compact-empty error-state", children: [_jsx("span", { className: "empty-icon", children: "!" }), _jsx("h3", { children: "Could not load this section" }), _jsx("p", { children: message }), retryable && _jsx("button", { className: "button button-secondary", onClick: onRetry, children: "Retry section" })] }); }
function ResourceLoading({ label }) { return _jsxs("div", { className: "loading-area detail-loading", "aria-live": "polite", "aria-busy": "true", children: [_jsx("div", { className: "spinner" }), _jsxs("span", { children: ["Loading ", label, "\u2026"] })] }); }
function RunsPanel({ state, onRetry }) {
    if (state.status === 'idle' || state.status === 'loading')
        return _jsx(ResourceLoading, { label: "ingestion history" });
    if (state.status === 'error')
        return _jsx(ResourceError, { message: state.message ?? 'Ingestion history is unavailable.', retryable: state.retryable, onRetry: onRetry });
    const runs = state.data?.items ?? [];
    if (!runs.length)
        return _jsxs("div", { className: "empty-state compact-empty", children: [_jsx("span", { className: "empty-icon", children: "\u25F7" }), _jsx("h3", { children: "No runs recorded" }), _jsx("p", { children: "No ingestion runs are recorded for this source. This is not the same as a successful, empty retrieval." }), _jsx(StatusBadge, { value: "NOT_CONFIGURED", kind: "run" })] });
    return _jsxs("div", { className: "run-list", children: [state.data?.provenance === 'SYNTHETIC_DEMO' && _jsx(DemoNotice, { text: "These run rows illustrate possible states. No live retrieval is asserted." }), runs.map(run => _jsxs("article", { className: "run-card", children: [_jsxs("div", { className: "run-card-top", children: [_jsxs("div", { children: [_jsx(StatusBadge, { value: run.status, kind: "run" }), _jsx("span", { className: "run-id", children: run.runId })] }), _jsx(ProvenanceTag, { value: run.provenance })] }), _jsx("p", { className: "run-message", children: run.safeMessage || 'No safe run message reported.' }), _jsxs("div", { className: "run-metrics", children: [_jsx(MetricMini, { label: "Retrieved", value: number(run.recordsRetrieved) }), _jsx(MetricMini, { label: "Accepted", value: number(run.recordsAccepted) }), _jsx(MetricMini, { label: "Rejected", value: number(run.recordsRejected) }), _jsx(MetricMini, { label: "Warnings", value: number(run.warningCount) })] }), _jsxs("div", { className: "run-footer", children: [_jsxs("span", { children: ["Started ", dateOnly(run.startedAt)] }), _jsxs("span", { children: ["Completed ", dateOnly(run.completedAt)] }), _jsxs("span", { children: ["Duration ", duration(run.durationMs)] })] })] }, run.runId))] });
}
function MetricMini({ label, value }) { return _jsxs("div", { children: [_jsx("span", { children: label }), _jsx("strong", { children: value })] }); }
function CoveragePanel({ state, onRetry }) {
    if (state.status === 'idle' || state.status === 'loading')
        return _jsx(ResourceLoading, { label: "coverage" });
    if (state.status === 'error')
        return _jsx(ResourceError, { message: state.message ?? 'Coverage is unavailable.', retryable: state.retryable, onRetry: onRetry });
    const c = state.data;
    return _jsxs("div", { className: "coverage-content", children: [c.provenance === 'SYNTHETIC_DEMO' && _jsx(DemoNotice, { text: "Coverage labels and periods are an unverified illustrative fixture." }), _jsxs("div", { className: "coverage-state-card", children: [_jsxs("div", { children: [_jsx("span", { className: "metric-label", children: "Coverage metadata state" }), _jsx("h3", { children: human(c.state) })] }), _jsx(StatusBadge, { value: c.state, kind: "coverage" })] }), _jsxs("div", { className: "drawer-subsection", children: [_jsx("h3", { children: "Geographic coverage" }), c.geography.length ? _jsx("div", { className: "coverage-list", children: c.geography.map((g, i) => _jsxs("div", { children: [_jsx("span", { className: "coverage-level", children: human(g.level) }), _jsx("strong", { children: g.label }), g.code && _jsx("code", { children: g.code })] }, `${g.code ?? g.label}-${i}`)) }) : _jsx("p", { className: "state-inline", children: "Geographic coverage not reported." })] }), _jsxs("div", { className: "drawer-subsection", children: [_jsx("h3", { children: "Available reporting periods" }), c.reportingPeriods.length ? _jsx("div", { className: "period-list", children: c.reportingPeriods.map((p, i) => _jsxs("div", { children: [_jsx("strong", { children: p.label }), _jsx("span", { children: p.grain && p.grain !== 'UNKNOWN' ? human(p.grain) : 'Reporting grain not reported' })] }, `${p.label}-${i}`)) }) : _jsx("p", { className: "state-inline", children: "No available reporting periods returned." })] }), _jsxs("div", { className: "drawer-subsection", children: [_jsx("h3", { children: "Taxonomy versions" }), c.taxonomyVersions?.length ? _jsx("div", { className: "tag-list", children: c.taxonomyVersions.map(v => _jsx("span", { className: "tag", children: v }, v)) }) : _jsx("p", { className: "state-inline", children: "No taxonomy version reported." })] }), _jsxs("div", { className: "drawer-subsection", children: [_jsx("h3", { children: "Known gaps & limitations" }), c.limitations.length ? _jsx("ul", { className: "limitations-list", children: c.limitations.map((x, i) => _jsx("li", { children: x }, `${x}-${i}`)) }) : _jsx("p", { className: "state-inline", children: "No limitations were supplied. This does not establish complete coverage." })] })] });
}
function MappingPanel({ state, onRetry }) {
    if (state.status === 'idle' || state.status === 'loading')
        return _jsx(ResourceLoading, { label: "field mappings" });
    if (state.status === 'error')
        return _jsx(ResourceError, { message: state.message ?? 'Field mappings are unavailable.', retryable: state.retryable, onRetry: onRetry });
    const result = state.data, rows = result.items;
    if (!rows.length)
        return _jsxs("div", { className: "empty-state compact-empty", children: [_jsx("span", { className: "empty-icon", children: "\u21C4" }), _jsx("h3", { children: "Mapping is not configured" }), _jsx("p", { children: "No source-to-canonical field mappings were returned. The mapping completion rate cannot be calculated from this response." })] });
    return _jsxs("div", { className: "mapping-content", children: [result.provenance === 'SYNTHETIC_DEMO' && _jsx(DemoNotice, { text: "Mapping rows are illustrative. Do not use them as a production data dictionary." }), _jsxs("div", { className: "mapping-summary", children: [_jsxs("div", { children: [_jsx("strong", { children: number(result.total) }), _jsx("span", { children: "Mapping records in response" })] }), _jsxs("div", { children: [_jsx("strong", { children: number(rows.filter(r => r.status === 'NEEDS_REVIEW').length) }), _jsx("span", { children: "Visible rows needing review" })] }), _jsx("p", { children: "Counts reflect this response page only where indicated; no mapping percentage is inferred." })] }), _jsx("div", { className: "mapping-table-wrap", children: _jsxs("table", { className: "mapping-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { scope: "col", children: "Source field" }), _jsx("th", { scope: "col", children: "Canonical field" }), _jsx("th", { scope: "col", children: "Transformation" }), _jsx("th", { scope: "col", children: "Status" })] }) }), _jsx("tbody", { children: rows.map((m) => _jsxs("tr", { children: [_jsxs("td", { "data-label": "Source field", children: [_jsx("strong", { children: m.sourceField }), _jsx("small", { children: m.sourceType }), m.schemaVersion && _jsxs("small", { children: ["Schema ", m.schemaVersion] })] }), _jsxs("td", { "data-label": "Canonical field", children: [m.canonicalField || 'Not mapped', m.canonicalType && _jsx("small", { children: m.canonicalType })] }), _jsx("td", { "data-label": "Transformation", children: m.transformation || m.note || 'Not reported' }), _jsxs("td", { "data-label": "Status", children: [_jsx(StatusBadge, { value: m.status, kind: "mapping" }), m.note && m.transformation && _jsx("small", { className: "mapping-note", children: m.note })] })] }, m.id)) })] }) })] });
}
function CreateSourceDialog({ name, setName, type, setType, agency, setAgency, purpose, setPurpose, tags, setTags, busy, error, onClose, onSubmit }) {
    const titleId = useId();
    const dialog = useRef(null);
    const close = useRef(null);
    useEffect(() => { close.current?.focus(); const key = (event) => { if (event.key === 'Escape' && !busy)
        onClose(); if (event.key === 'Tab' && dialog.current) {
        const els = [...dialog.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)')];
        const first = els[0], last = els[els.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
        }
        else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
        }
    } }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, [onClose, busy]);
    return _jsx("div", { className: "modal-backdrop", onMouseDown: e => { if (e.target === e.currentTarget && !busy)
            onClose(); }, children: _jsxs("section", { className: "create-dialog", role: "dialog", "aria-modal": "true", "aria-labelledby": titleId, ref: dialog, children: [_jsxs("div", { className: "dialog-head", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "SOURCE REGISTRY" }), _jsx("h2", { id: titleId, children: "Add new source" }), _jsx("p", { children: "Register metadata first; a record does not configure an upstream connector." })] }), _jsx("button", { ref: close, className: "icon-button", "aria-label": "Close add source dialog", disabled: busy, onClick: onClose, children: "\u00D7" })] }), _jsx(DemoNotice, { text: "In mock mode this creates a local demo draft for this session only. No source is connected and the draft is not persisted." }), _jsxs("form", { onSubmit: onSubmit, className: "create-form", children: [_jsxs("label", { children: ["Source name ", _jsx("span", { "aria-hidden": "true", children: "*" }), _jsx("input", { autoFocus: true, required: true, minLength: 2, maxLength: 120, value: name, onChange: e => setName(e.target.value), placeholder: "e.g. Training Outcomes Dataset" })] }), _jsxs("label", { children: ["Source type ", _jsx("select", { value: type, onChange: e => setType(e.target.value), children: TYPES.map(t => _jsx("option", { value: t, children: sourceTypeLabel(t) }, t)) })] }), _jsxs("label", { children: ["Agency / owner", _jsx("input", { value: agency, onChange: e => setAgency(e.target.value), maxLength: 160, placeholder: "Not required yet" })] }), _jsxs("label", { children: ["Purpose", _jsx("textarea", { value: purpose, onChange: e => setPurpose(e.target.value), maxLength: 500, rows: 3, placeholder: "What does this dataset contribute to SHRAMIK?" })] }), _jsxs("label", { children: ["Tags ", _jsx("span", { className: "label-sub", children: "comma separated" }), _jsx("input", { value: tags, onChange: e => setTags(e.target.value), placeholder: "Employment, training, skills" })] }), error && _jsx("p", { className: "form-error", role: "alert", children: error }), _jsxs("div", { className: "dialog-actions", children: [_jsx("button", { className: "button button-secondary", type: "button", disabled: busy, onClick: onClose, children: "Cancel" }), _jsx("button", { className: "button button-primary", type: "submit", disabled: busy || name.trim().length < 2, children: busy ? _jsxs(_Fragment, { children: [_jsx("span", { className: "spinner spinner-small" }), " Saving\u2026"] }) : 'Create source draft' })] })] })] }) });
}
