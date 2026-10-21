import type { AdministrationDataAdapter, AdministrationSnapshot } from './types';

/**
 * Safe production default while no secure Admin API exists. Empty data is preferable
 * to displaying fictional applicants or allowing a client-only "approval".
 */
export class UnavailableAdministrationDataAdapter implements AdministrationDataAdapter {
  readonly mode = 'unavailable' as const;

  async getSnapshot(signal?: AbortSignal): Promise<AdministrationSnapshot> {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    return {
      accessRequests: [],
      users: [],
      roles: [],
      audit: [],
      meta: {
        provenance: 'NOT_AVAILABLE',
        sourceLabel: 'Administration API not configured',
        updatedAt: null,
        note: 'No secured Administration API is configured. Real access-request review, user provisioning, role changes and audit reads are intentionally disabled instead of using fictional records.',
      },
    };
  }
}
