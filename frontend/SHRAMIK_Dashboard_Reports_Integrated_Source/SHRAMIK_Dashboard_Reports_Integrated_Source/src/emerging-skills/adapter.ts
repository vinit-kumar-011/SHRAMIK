import { demoEmergingSkillsDataAdapter, type EmergingSkillsDataAdapter } from './EmergingSkillsPage';
import { RestEmergingSkillsDataAdapter } from './restAdapter';
import { UnavailableEmergingSkillsDataAdapter } from './unavailableAdapter';

/** Demo fixtures require an explicit opt-in; no API means no synthetic findings. */
export function createEmergingSkillsDataAdapter(baseUrl?: string): EmergingSkillsDataAdapter {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  if (env?.VITE_SHRAMIK_USE_DEMO_DATA === 'true' && !baseUrl) return demoEmergingSkillsDataAdapter;
  const configuredBase = baseUrl ?? env?.VITE_EMERGING_SKILLS_API_BASE_URL;
  return configuredBase?.trim()
    ? new RestEmergingSkillsDataAdapter(configuredBase.trim())
    : new UnavailableEmergingSkillsDataAdapter();
}
