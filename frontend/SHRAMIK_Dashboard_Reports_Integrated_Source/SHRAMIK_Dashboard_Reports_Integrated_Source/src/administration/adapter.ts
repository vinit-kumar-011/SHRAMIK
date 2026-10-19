import type { AdministrationDataAdapter } from './types';
import { mockAdministrationDataAdapter } from './mockAdapter';
import { RestAdministrationDataAdapter } from './restAdapter';

export function createAdministrationDataAdapter(baseUrl?: string): AdministrationDataAdapter {
  const configuredBase = baseUrl ?? (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_ADMINISTRATION_API_BASE_URL;
  return configuredBase?.trim()
    ? new RestAdministrationDataAdapter(configuredBase.trim())
    : mockAdministrationDataAdapter;
}
