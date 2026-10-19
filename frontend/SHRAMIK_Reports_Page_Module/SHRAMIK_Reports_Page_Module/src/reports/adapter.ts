import type { ReportsDataAdapter } from './adapterTypes';
import { DemoReportsAdapter } from './demoAdapter';
import { RestReportsAdapter } from './restAdapter';

export function createReportsAdapter(): ReportsDataAdapter {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const baseUrl = env?.VITE_SHRAMIK_API_BASE_URL?.trim();
  if (baseUrl) return new RestReportsAdapter(baseUrl);
  return new DemoReportsAdapter();
}
export type { ReportsDataAdapter } from './adapterTypes';
