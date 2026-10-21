export type AccessRequestStatus = 'pending' | 'approved' | 'denied';
export type AdminUserStatus = 'active' | 'suspended';
export type AdminProvenance = 'SOURCE_BACKED' | 'DERIVED' | 'MIXED' | 'SYNTHETIC_DEMO' | 'NOT_AVAILABLE';

export interface AccessRequest {
  id: string; name: string; email: string; organisation: string; requestedRole: string;
  submitted: string; purpose: string; status: AccessRequestStatus; document: string;
}
export interface AdminUser {
  id: string; name: string; email: string; organisation: string; role: string;
  status: AdminUserStatus; lastSeen: string;
}
export interface AuditEvent {
  id: string; timestamp: string; actor: string; action: string; target: string; outcome: string;
}
export interface AdminRole {
  name: string; summary: string; permissions: string[];
}
export interface AdministrationSnapshot {
  accessRequests: AccessRequest[];
  users: AdminUser[];
  roles: AdminRole[];
  audit: AuditEvent[];
  meta: { provenance: AdminProvenance; note: string; sourceLabel?: string; updatedAt?: string | null };
}
export interface AdministrationDataAdapter {
  readonly mode: 'mock' | 'rest' | 'unavailable';
  getSnapshot(signal?: AbortSignal): Promise<AdministrationSnapshot>;
}
