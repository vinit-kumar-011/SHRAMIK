import type { AdministrationDataAdapter } from './types';
import { mockAdministrationDataAdapter } from './mockAdapter';
import { RestAdministrationDataAdapter } from './restAdapter';
import { UnavailableAdministrationDataAdapter } from './unavailableAdapter';

/**
 * Never populate the default Administration view with fictional people or access
 * requests. Demo fixtures are enabled only by an explicit environment switch.
 */
export function createAdministrationDataAdapter(baseUrl?: string): AdministrationDataAdapter {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const showcaseMode = env?.MODE === 'production' || env?.VITE_SHRAMIK_SHOWCASE_MODE === 'true';
  // No secure, approved server-side Administration API is currently implemented.
  // Do not probe an arbitrary client-configured URL in the public SIH showcase.
  if (showcaseMode) return new UnavailableAdministrationDataAdapter();
  if (env?.VITE_SHRAMIK_USE_DEMO_DATA === 'true') return mockAdministrationDataAdapter;
  const configuredBase = baseUrl ?? env?.VITE_ADMINISTRATION_API_BASE_URL;
  return configuredBase?.trim()
    ? new RestAdministrationDataAdapter(configuredBase.trim())
    : new UnavailableAdministrationDataAdapter();
}
