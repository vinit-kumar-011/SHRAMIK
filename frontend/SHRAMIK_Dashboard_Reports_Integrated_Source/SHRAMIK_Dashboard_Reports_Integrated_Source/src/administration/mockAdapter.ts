import type { AdministrationDataAdapter, AdministrationSnapshot } from './types';

const demoSnapshot: AdministrationSnapshot = {
  accessRequests: [
    { id: 'REQ-DEMO-1042', name: 'A. Researcher', email: 'researcher1@example.invalid', organisation: 'State Planning Unit · demo', requestedRole: 'Research Analyst', submitted: '19 Oct 2026', purpose: 'Review regional workforce supply and compare training coverage.', status: 'pending', document: 'Identity evidence · demo placeholder' },
    { id: 'REQ-DEMO-1041', name: 'B. Programme Officer', email: 'officer@example.invalid', organisation: 'Skills Programme Office · demo', requestedRole: 'Data Steward', submitted: '18 Oct 2026', purpose: 'Review source freshness and submit mapping corrections.', status: 'pending', document: 'Employment evidence · demo placeholder' },
    { id: 'REQ-DEMO-1038', name: 'C. Policy Fellow', email: 'fellow@example.invalid', organisation: 'Policy Research Group · demo', requestedRole: 'Read-only Viewer', submitted: '16 Oct 2026', purpose: 'View published labour market summaries for a policy brief.', status: 'approved', document: 'Organisation letter · demo placeholder' },
    { id: 'REQ-DEMO-1032', name: 'D. Data Analyst', email: 'analyst@example.invalid', organisation: 'Research Partner · demo', requestedRole: 'Research Analyst', submitted: '12 Oct 2026', purpose: 'Inspect source coverage and export reviewed summaries.', status: 'denied', document: 'Identity evidence · demo placeholder' },
  ],
  users: [
    { id: 'USR-DEMO-001', name: 'Workspace Administrator', email: 'admin@example.invalid', organisation: 'SHRAMIK Demo Workspace', role: 'Administrator', status: 'active', lastSeen: '19 Oct 2026 · demo' },
    { id: 'USR-DEMO-002', name: 'A. Researcher', email: 'researcher1@example.invalid', organisation: 'State Planning Unit · demo', role: 'Research Analyst', status: 'active', lastSeen: '18 Oct 2026 · demo' },
    { id: 'USR-DEMO-003', name: 'B. Programme Officer', email: 'officer@example.invalid', organisation: 'Skills Programme Office · demo', role: 'Data Steward', status: 'active', lastSeen: '17 Oct 2026 · demo' },
    { id: 'USR-DEMO-004', name: 'C. Policy Fellow', email: 'fellow@example.invalid', organisation: 'Policy Research Group · demo', role: 'Read-only Viewer', status: 'suspended', lastSeen: '11 Oct 2026 · demo' },
  ],
  roles: [
    { name: 'Administrator', summary: 'Manage workspace settings, access requests, user roles and audit review.', permissions: ['Review access', 'Manage roles', 'View audit trail', 'Manage data sources'] },
    { name: 'Data Steward', summary: 'Review source metadata, coverage, validation findings and mappings.', permissions: ['View sources', 'Review quality', 'Propose mappings'] },
    { name: 'Research Analyst', summary: 'Explore analytical pages and prepare reports using approved data.', permissions: ['View analytics', 'Run scenarios', 'Build reports'] },
    { name: 'Read-only Viewer', summary: 'View approved summaries without changing workspace state.', permissions: ['View approved pages'] },
  ],
  audit: [
    { id: 'AUD-DEMO-021', timestamp: '19 Oct 2026 · 11:18', actor: 'Workspace Administrator', action: 'Access review opened', target: 'REQ-DEMO-1042', outcome: 'Demo view event' },
    { id: 'AUD-DEMO-020', timestamp: '18 Oct 2026 · 15:42', actor: 'Workspace Administrator', action: 'Role inspected', target: 'Data Steward', outcome: 'No change' },
    { id: 'AUD-DEMO-019', timestamp: '17 Oct 2026 · 10:06', actor: 'System fixture', action: 'Request submitted', target: 'REQ-DEMO-1041', outcome: 'Pending · demo' },
  ],
  meta: {
    provenance: 'SYNTHETIC_DEMO',
    note: 'Fictional identity, access request, role and audit fixtures. Client-side changes do not affect authentication or authorization.',
    sourceLabel: 'Synthetic Administration fixtures',
    updatedAt: null,
  },
};

export class MockAdministrationDataAdapter implements AdministrationDataAdapter {
  readonly mode = 'mock' as const;
  async getSnapshot(signal?: AbortSignal): Promise<AdministrationSnapshot> {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    return {
      ...demoSnapshot,
      accessRequests: demoSnapshot.accessRequests.map(item => ({ ...item })),
      users: demoSnapshot.users.map(item => ({ ...item })),
      roles: demoSnapshot.roles.map(item => ({ ...item, permissions: [...item.permissions] })),
      audit: demoSnapshot.audit.map(item => ({ ...item })),
      meta: { ...demoSnapshot.meta },
    };
  }
}
export const mockAdministrationDataAdapter: AdministrationDataAdapter = new MockAdministrationDataAdapter();
