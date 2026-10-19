import type { SkillGapDataAdapter } from './types';
import { MockSkillGapDataAdapter } from './mockAdapter';
import { RestSkillGapDataAdapter } from './restAdapter';

export function createSkillGapDataAdapter(): SkillGapDataAdapter {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const baseUrl = env?.VITE_SHRAMIK_API_BASE_URL?.trim();
  if (baseUrl) return new RestSkillGapDataAdapter({ baseUrl, getAccessToken: () => null });
  return new MockSkillGapDataAdapter();
}

export type { SkillGapDataAdapter } from './types';
