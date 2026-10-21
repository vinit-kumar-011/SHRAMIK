# Emerging Skills Intelligence — Component Inventory

| Component | Responsibility | Data source / adapter method | Interaction |
|---|---|---|---|
| `EmergingSkillsPage` | Page content and shared state; no production shell duplication | Adapter injected by host | Owns filters and selected view/skill |
| `EmergingSkillsViewTabs` | Five internal views | Local selected-view state or route query where host standard allows | Keyboard-accessible tab selection |
| `EmergingSkillsFilters` | Time window, geography, sector, category | `getFilterOptions`, `getRegions`, `getSectors` where available | Draft filters, Apply, Reset |
| `SkillCategoryMetricCards` | Counts for four categories | `getOverview` | Click category applies category filter |
| `TopEmergingSkillsTable` | Ranked signals | `getOverview`, `getMomentum` | Sort/select/view all |
| `SkillCategoryDistribution` | Category chart | `getOverview` | Select slice to filter category |
| `KeyInsightsPanel` | Evidence-backed summaries | `getOverview` | Open supporting skill/evidence |
| `SkillWatchlistPanel` | Current-user saved skills | `getWatchlist` | Add/remove/open; auth-aware |
| `RecentSkillAlerts` | Current-user/relevant skill alert items | `getSkillAlerts` | Open details or navigate to profile |
| `SkillMomentumChart` | Demand vs growth bubble chart | `getMomentum` | Select/focus point; accessible list alternative |
| `SelectedSkillSummary` | Compact selected-skill details | `getSkillProfile` | Open profile/compare/watchlist |
| `SkillRelationshipGraph` | Skill–occupation–sector network | `getRelationships` | Select nodes, inspect edge evidence |
| `RelationshipDetailsPanel` | Details for selected node/edge | Profile/evidence endpoints | Open selected entity and source evidence |
| `SkillRegionalMap` | State/UT choropleth using real geometry | `getRegionalSignals`; shared GeoJSON geometry | Select state, hover/focus details |
| `RegionalSkillRankings` | Ranked states/UTs | `getRegionalSignals` | Select state |
| `RegionalSkillTrend` | Regional time series | regional endpoint/profile metrics | Metric selector where supported |
| `SkillProfileHeader` | Canonical name, aliases, category/method badge | `getSkillProfile` | Compare/watchlist/alert controls |
| `WhyEmergingPanel` | Rule inputs, thresholds, category explanation | Profile/evidence API | Expand details and caveats |
| `SkillEvidenceTable` | Source and observation evidence | `getSkillEvidence` | Open permitted source references |
| `RelatedSkillsPanel` | Adjacent canonical skills | relationship/profile endpoints | Select another skill |
| `SkillComparisonView` | 2–4 skill side-by-side comparison | `compareSkills` | Add/remove skills; clear comparability warnings |
| `SkillWatchlistButton` | Persistence action | `addWatchlistItem` / `removeWatchlistItem` | Optimistic UI only if rollback-safe; show errors |
| `SkillAlertRuleEditor` | Configure condition supported by backend | `createSkillAlertRule` etc. | Validation, save, update/delete |
| `ProvenanceBadge` | Source state/freshness/quality display | Common metadata | Opens data-source/methodology notes |
| `PanelState` | Loading/empty/error/stale/insufficient coverage | Adapter result state | Retry/reload |

## Shared dependencies to reuse

- Existing dashboard topbar and sidebar; do not duplicate them in the integrated page.
- Global design tokens/styles, typography, icon library, button/select/table/card primitives.
- Existing API client, query/cache hooks, notification/toast system, access-control helpers and chart wrappers, if available.
- Use the project's already adopted chart/graph/map libraries where practical. Inspect package dependencies before introducing new ones.

## Suggested adapter interface

See `SHRAMIK_EMERGING_SKILLS_API_CONTRACT.md`. The frontend should define a typed `EmergingSkillsDataAdapter` with methods for overview, momentum, profile, relationships, regional signals, evidence, compare, watchlist and alerts. Mock and REST implementations must share this interface.
