import type {
  EmergingSkillsDataAdapter, EmergingSkillsFilters, EmergingSkillsSummary, EmergingSkill, RegionalSignal,
} from './EmergingSkillsPage';

const message = 'Emerging Skills API is not configured. No live skill signals are available. Configure VITE_EMERGING_SKILLS_API_BASE_URL after deploying the approved service, or explicitly enable demo mode with VITE_SHRAMIK_USE_DEMO_DATA=true.';

export class UnavailableEmergingSkillsDataAdapter implements EmergingSkillsDataAdapter {
  private fail(signal?: AbortSignal): never {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    throw new Error(message);
  }
  async getSummary(_filters?: Partial<EmergingSkillsFilters>, signal?: AbortSignal): Promise<EmergingSkillsSummary> { return this.fail(signal); }
  async getSkills(_filters?: Partial<EmergingSkillsFilters>, signal?: AbortSignal): Promise<EmergingSkill[]> { return this.fail(signal); }
  async getSkillDetail(_skillId: string, _filters?: Partial<EmergingSkillsFilters>, signal?: AbortSignal): Promise<EmergingSkill | null> { return this.fail(signal); }
  async getRelationships(_skillId: string, _filters?: Partial<EmergingSkillsFilters>, signal?: AbortSignal): Promise<{ nodes: any[]; edges: any[]; meta: any } | null> { return this.fail(signal); }
  async getRegionalSignals(_skillId: string, _filters?: Partial<EmergingSkillsFilters>, signal?: AbortSignal): Promise<RegionalSignal[] | null> { return this.fail(signal); }
  async getEvidence(_skillId: string, _filters?: Partial<EmergingSkillsFilters>, signal?: AbortSignal): Promise<any | null> { return this.fail(signal); }
  async compareSkills(_skillIds: string[], _filters?: Partial<EmergingSkillsFilters>, signal?: AbortSignal): Promise<any | null> { return this.fail(signal); }
  async getWatchlist(signal?: AbortSignal): Promise<string[]> { return this.fail(signal); }
  async addWatchlistItem(_skillId: string, signal?: AbortSignal): Promise<boolean> { return this.fail(signal); }
  async removeWatchlistItem(_skillId: string, signal?: AbortSignal): Promise<boolean> { return this.fail(signal); }
  async getSkillAlerts(signal?: AbortSignal): Promise<any[]> { return this.fail(signal); }
}
