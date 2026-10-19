import { demoEmergingSkillsDataAdapter, type EmergingSkillsDataAdapter } from './EmergingSkillsPage';
import { RestEmergingSkillsDataAdapter } from './restAdapter';

/** Blank API URL means explicit demo fixtures; configured REST failures stay visible. */
export function createEmergingSkillsDataAdapter(baseUrl?: string): EmergingSkillsDataAdapter {
  const configuredBase = baseUrl ?? (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_EMERGING_SKILLS_API_BASE_URL;
  return configuredBase?.trim()
    ? new RestEmergingSkillsDataAdapter(configuredBase.trim())
    : demoEmergingSkillsDataAdapter;
}
