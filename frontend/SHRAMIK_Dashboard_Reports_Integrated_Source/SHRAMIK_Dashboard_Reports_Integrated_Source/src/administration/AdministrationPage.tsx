import { useEffect, useMemo, useState } from 'react';
import { Check, FileText, Search, ShieldCheck, UserCog, Users, X } from 'lucide-react';
import './administration.css';
import { createAdministrationDataAdapter } from './adapter';
import type { AccessRequest, AccessRequestStatus, AdminUser, AuditEvent, AdministrationDataAdapter, AdministrationSnapshot } from './types';

const tabs = [
  { id: 'requests', label: 'Access requests' }, { id: 'users', label: 'Users' },
  { id: 'roles', label: 'Roles & permissions' }, { id: 'audit', label: 'Audit log' },
] as const;
type TabId = typeof tabs[number]['id'];

export default function AdministrationPage({ adapter }: { adapter?: AdministrationDataAdapter } = {}) {
  const [defaultAdapter] = useState(() => createAdministrationDataAdapter());
  const activeAdapter = adapter ?? defaultAdapter;
  const readOnly = activeAdapter.mode === 'rest';
  const [activeTab, setActiveTab] = useState<TabId>('requests');
  const [snapshot, setSnapshot] = useState<AdministrationSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [query, setQuery] = useState('');
  const [requestStatus, setRequestStatus] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setSnapshot(null);
    setRequests([]);
    setUsers([]);
    setAudit([]);
    setSelectedRequest(null);
    activeAdapter.getSnapshot(controller.signal)
      .then(value => {
        if (controller.signal.aborted) return;
        setSnapshot(value);
        setRequests(value.accessRequests);
        setUsers(value.users);
        setAudit(value.audit);
      })
      .catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Administration data could not be loaded.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [activeAdapter, retryCount]);
  const roles = snapshot?.roles ?? [];
  const synthetic = activeAdapter.mode === 'mock' || snapshot?.meta.provenance === 'SYNTHETIC_DEMO';

  const filteredRequests = useMemo(() => requests.filter(item =>
    (requestStatus === 'all' || item.status === requestStatus) &&
    (!query || `${item.name} ${item.email} ${item.organisation} ${item.id}`.toLowerCase().includes(query.toLowerCase()))
  ), [requests, query, requestStatus]);
  const filteredUsers = useMemo(() => users.filter(item =>
    !query || `${item.name} ${item.email} ${item.organisation} ${item.role}`.toLowerCase().includes(query.toLowerCase())
  ), [users, query]);
  const pendingCount = requests.filter(item => item.status === 'pending').length;

  const reviewRequest = (request: AccessRequest, status: Exclude<AccessRequestStatus, 'pending'>) => {
    if (readOnly) return;
    setRequests(current => current.map(item => item.id === request.id ? { ...item, status } : item));
    setSelectedRequest(current => current ? { ...current, status } : null);
    const action = status === 'approved' ? 'Request approved locally' : 'Request denied locally';
    const event: AuditEvent = { id: `AUD-DEMO-${Date.now()}`, timestamp: 'Just now · local demo', actor: 'Workspace Administrator (demo)', action, target: request.id, outcome: 'Local React state only' };
    setAudit(current => [event, ...current]);
    if (status === 'approved') {
      setUsers(current => current.some(user => user.email === request.email) ? current : [...current, {
        id: `USR-DEMO-${request.id}`, name: request.name, email: request.email, organisation: request.organisation,
        role: request.requestedRole, status: 'active', lastSeen: 'Never signed in · demo',
      }]);
    }
    setNotice(`${request.id}: ${status} in demo state only. No account or permission was changed on a server.`);
  };
  const changeRole = (user: AdminUser, role: string) => {
    if (readOnly) return;
    setUsers(current => current.map(item => item.id === user.id ? { ...item, role } : item));
    setAudit(current => [{ id: `AUD-DEMO-${Date.now()}`, timestamp: 'Just now · local demo', actor: 'Workspace Administrator (demo)', action: 'Role changed locally', target: user.id, outcome: `${user.role} → ${role} · no server write` }, ...current]);
    setNotice(`${user.name}: role changed in this demo session only.`);
  };
  const toggleUser = (user: AdminUser) => {
    if (readOnly) return;
    const status = user.status === 'active' ? 'suspended' : 'active';
    setUsers(current => current.map(item => item.id === user.id ? { ...item, status } : item));
    setAudit(current => [{ id: `AUD-DEMO-${Date.now()}`, timestamp: 'Just now · local demo', actor: 'Workspace Administrator (demo)', action: status === 'active' ? 'User activated locally' : 'User suspended locally', target: user.id, outcome: 'Local React state only' }, ...current]);
    setNotice(`${user.name}: status changed locally; no authentication account was modified.`);
  };

  return <div className="administration-page">
    <header className="administration-heading"><div><p className="administration-eyebrow">WORKSPACE / GOVERNANCE & ACCESS</p><h1>Administration<span>.</span></h1><p>Review access requests, inspect roles and permissions, and maintain an auditable view of workspace activity.</p></div><div className="administration-heading-mark" aria-hidden="true"><UserCog size={35}/><span>ACCESS<br/>CONTROL</span></div></header>
    {snapshot && synthetic && <div className="administration-demo-notice" role="note"><ShieldCheck size={18}/><div><strong>Demonstration workspace · SYNTHETIC_DEMO</strong><p>{snapshot.meta.note} Approve, deny, role and account controls modify only this page's local state. No account, authentication policy, or permission is changed on a server.</p></div></div>}
    {snapshot && !synthetic && <div className="administration-live-notice" role="note"><ShieldCheck size={18}/><div><strong>Administration API response · {snapshot.meta.provenance}</strong><p>{snapshot.meta.sourceLabel ?? 'Source label not supplied'} · {snapshot.meta.note} · {snapshot.meta.updatedAt ?? 'Update timestamp not supplied'}</p></div></div>}
    {error && <div className="administration-error" role="alert"><X size={17}/><div><strong>Administration data unavailable.</strong><p>{error}</p><button type="button" onClick={() => setRetryCount(count => count + 1)}>Retry request</button></div></div>}
    {loading && !snapshot && <div className="administration-loading" role="status"><FileText size={16}/> Loading workspace access data from the selected adapter…</div>}
    <section className="administration-metrics" aria-label="Workspace access summary"><article><span>Pending requests</span><strong>{pendingCount}</strong><small>{synthetic ? 'Local demo requests' : 'Current API response'}</small></article><article><span>Active users</span><strong>{users.filter(user => user.status === 'active').length}</strong><small>{synthetic ? 'Demo account list' : 'Current API response'}</small></article><article><span>Defined roles</span><strong>{roles.length}</strong><small>{synthetic ? 'Illustrative role catalogue' : 'API role catalogue'}</small></article><article><span>Audit events</span><strong>{audit.length}</strong><small>{synthetic ? 'Session-level log fixtures' : 'API audit records'}</small></article></section>
    <nav className="administration-tabs" aria-label="Administration views">{tabs.map(tab => <button type="button" key={tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)}>{tab.label}{tab.id === 'requests' && <span>{pendingCount}</span>}</button>)}</nav>

    {(activeTab === 'requests' || activeTab === 'users') && <div className="administration-list-toolbar"><label className="administration-search"><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search names, email, organisation or ID" aria-label="Search administration records"/></label>{activeTab === 'requests' && <label className="administration-status-filter"><span>Status</span><select value={requestStatus} onChange={event => setRequestStatus(event.target.value)}><option value="all">All requests</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="denied">Denied</option></select></label>}</div>}

    {activeTab === 'requests' && <section className="administration-panel"><div className="administration-panel-heading"><div><p className="administration-eyebrow">IDENTITY & ACCESS REVIEW</p><h2>Access requests</h2><p>{filteredRequests.length} matching requests · {synthetic ? 'fictional review queue' : 'server response'}</p></div><span className="administration-fixture-tag">{readOnly ? 'READ-ONLY API' : 'DEMO QUEUE'}</span></div><div className="administration-table-wrap"><table className="administration-table"><thead><tr><th>Applicant</th><th>Requested role</th><th>Submitted</th><th>Status</th><th/></tr></thead><tbody>{filteredRequests.map(request => <tr key={request.id}><td><button type="button" className="administration-record-link" onClick={() => setSelectedRequest(request)}><strong>{request.name}</strong><small>{request.email} · {request.organisation}</small><small>{request.id}</small></button></td><td>{request.requestedRole}</td><td>{request.submitted}</td><td><span className={`administration-status ${request.status}`}>{request.status}</span></td><td><button type="button" className="administration-review-button" onClick={() => setSelectedRequest(request)}>Review</button></td></tr>)}</tbody></table>{filteredRequests.length === 0 && <p className="administration-empty">No demo access requests match the current filters.</p>}</div></section>}

    {activeTab === 'users' && <section className="administration-panel"><div className="administration-panel-heading"><div><p className="administration-eyebrow">WORKSPACE MEMBERS</p><h2>Users</h2><p>{readOnly ? 'User records are read-only here; account and authorization changes require approved backend operations.' : 'Local role and status previews. Authentication is not connected to this page.'}</p></div><span className="administration-fixture-tag">{readOnly ? 'READ-ONLY API' : 'DEMO USERS'}</span></div><div className="administration-table-wrap"><table className="administration-table"><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Last seen</th><th>Local action</th></tr></thead><tbody>{filteredUsers.map(user => <tr key={user.id}><td><strong>{user.name}</strong><small>{user.email} · {user.organisation}</small><small>{user.id}</small></td><td><label className="administration-role-select"><span className="administration-visually-hidden">Role for {user.name}</span><select value={user.role} disabled={readOnly} onChange={event => changeRole(user,event.target.value)}>{roles.map(role => <option key={role.name} value={role.name}>{role.name}</option>)}</select></label></td><td><span className={`administration-status ${user.status}`}>{user.status}</span></td><td>{user.lastSeen}</td><td><button type="button" className="administration-secondary-button" disabled={readOnly} onClick={() => toggleUser(user)}>{user.status === 'active' ? 'Suspend locally' : 'Activate locally'}</button></td></tr>)}</tbody></table></div></section>}

    {activeTab === 'roles' && <section className="administration-panel"><div className="administration-panel-heading"><div><p className="administration-eyebrow">LEAST-PRIVILEGE MODEL</p><h2>Roles & permissions</h2><p>{synthetic ? 'Illustrative role descriptions; not effective authorization policies.' : 'Role metadata returned by the API. Effective permissions must still be enforced server-side.'}</p></div><ShieldCheck size={23}/></div><div className="administration-role-grid">{roles.map(role => <article key={role.name}><span className="administration-role-icon"><Users size={18}/></span><h3>{role.name}</h3><p>{role.summary}</p><div>{role.permissions.map(permission => <span key={permission}><Check size={12}/>{permission}</span>)}</div></article>)}</div><p className="administration-role-footnote">Production authorization must be enforced by the backend, not by hiding UI controls. This page does not grant or revoke permissions.</p></section>}

    {activeTab === 'audit' && <section className="administration-panel"><div className="administration-panel-heading"><div><p className="administration-eyebrow">ACTIVITY RECORD</p><h2>Audit log</h2><p>{synthetic ? 'Session event examples; not a backend audit ledger.' : 'Audit records returned by the authenticated API.'}</p></div><FileText size={23}/></div><div className="administration-table-wrap"><table className="administration-table"><thead><tr><th>Timestamp</th><th>Actor</th><th>Action</th><th>Target</th><th>Outcome</th></tr></thead><tbody>{audit.map(event => <tr key={event.id}><td>{event.timestamp}</td><td>{event.actor}</td><td>{event.action}</td><td><code>{event.target}</code></td><td>{event.outcome}</td></tr>)}</tbody></table></div></section>}

    {notice && <div className="administration-toast" role="status">{notice}<button type="button" onClick={() => setNotice('')} aria-label="Dismiss notification"><X size={14}/></button></div>}
    {selectedRequest && <div className="administration-drawer-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setSelectedRequest(null); }}><aside className="administration-drawer" role="dialog" aria-modal="true" aria-labelledby="administration-request-title"><div className="administration-drawer-header"><div><p className="administration-eyebrow">REQUEST REVIEW / DEMO</p><h2 id="administration-request-title">{selectedRequest.name}</h2><small>{selectedRequest.id}</small></div><button type="button" aria-label="Close request details" onClick={() => setSelectedRequest(null)}><X size={18}/></button></div><dl className="administration-request-detail"><div><dt>Email</dt><dd>{selectedRequest.email}</dd></div><div><dt>Organisation</dt><dd>{selectedRequest.organisation}</dd></div><div><dt>Requested role</dt><dd>{selectedRequest.requestedRole}</dd></div><div><dt>Submitted</dt><dd>{selectedRequest.submitted}</dd></div><div><dt>Purpose</dt><dd>{selectedRequest.purpose}</dd></div><div><dt>Supporting evidence</dt><dd>{selectedRequest.document}</dd></div><div><dt>Decision</dt><dd>{selectedRequest.status}</dd></div></dl><div className="administration-review-actions"><button type="button" className="administration-secondary-button" onClick={() => reviewRequest(selectedRequest,'denied')} disabled={readOnly || selectedRequest.status !== 'pending'}>Deny locally</button><button type="button" className="administration-primary-button" onClick={() => reviewRequest(selectedRequest,'approved')} disabled={readOnly || selectedRequest.status !== 'pending'}><Check size={14}/> Approve locally</button></div><p className="administration-drawer-footnote">{readOnly ? 'This connected view is read-only. Access decisions, role changes and suspensions must be enforced by approved server-side authorization APIs.' : 'These decisions are local demo state only and are not sent to the authentication provider or saved in the database.'}</p></aside></div>}
  </div>;
}
