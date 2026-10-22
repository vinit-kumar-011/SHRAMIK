import type { SkillGapDataAdapter } from './types';
import { MockSkillGapDataAdapter } from './mockAdapter';
import { RestSkillGapDataAdapter } from './restAdapter';
import { UnavailableSkillGapDataAdapter } from './unavailableAdapter';

export function createSkillGapDataAdapter(): SkillGapDataAdapter {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const baseUrl = env?.VITE_SHRAMIK_API_BASE_URL?.trim();
  const showcaseMode = env?.MODE === 'production' || env?.VITE_SHRAMIK_SHOWCASE_MODE === 'true';
  if (!showcaseMode && env?.VITE_SHRAMIK_USE_DEMO_DATA === 'true') return new MockSkillGapDataAdapter();
  if (baseUrl) return new RestSkillGapDataAdapter({ baseUrl, getAccessToken: () => null });
  return new UnavailableSkillGapDataAdapter();
}

export type { SkillGapDataAdapter } from './types';
