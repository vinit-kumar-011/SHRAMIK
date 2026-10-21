# Claude Code Prompt — Build SHRAMIK Emerging Skills Intelligence as an integration-ready React page

You are implementing **one page module** in the existing SHRAMIK frontend. Read all supplied handoff documents before changing code.

## Required reading

1. `SHRAMIK_GLOBAL_DESIGN_SYSTEM.md`
2. `SHRAMIK_DASHBOARD_SPEC.md`
3. `SHRAMIK_COMPONENT_INVENTORY.md`
4. `SHRAMIK_EMERGING_SKILLS_IMPLEMENTATION_SPEC.md`
5. `SHRAMIK_EMERGING_SKILLS_API_CONTRACT.md`
6. `SKILL_DATA_SEMANTICS_AND_CLASSIFICATION.md`
7. `BACKEND_SKILL_RELATIONSHIP_GAP_AND_PROPOSAL.md`
8. `SIDEBAR_CONSISTENCY_LOCK.md`
9. `INTEGRATION_CONTRACT.md`
10. `QA_CHECKLIST.md`

Visual references:
- Primary page board: `reference/SHRAMIK_Emerging_Skills_Design_Board.png`
- Individual view crops: `reference/views/`
- Shared shell authority: `reference/SHRAMIK_Dashboard_Reference.png`

## First: inspect, don't assume

- Inspect the repository, current React/TypeScript version, route patterns, shared shell, current sidebar, tokens, chart/graph/map libraries, API client, auth and test setup.
- Identify existing components to reuse. Read any existing page modules and their adapter conventions.
- Do not create a second production app, duplicate global shell, new global design system, new sidebar, or unnecessary dependency set.
- If a shared component or backend route is not present, document the gap and implement the page against a clear injected interface/mock adapter.

## Implementation target

Build a reusable `EmergingSkillsPage` React + TypeScript content module with five internal views:
1. Skills Overview (default)
2. Skill Momentum
3. Occupation & Sector Connections
4. Regional Signals
5. Skill Profiles & Evidence

The component will be integrated into the full app later. It must not render the production shell inside the page module. If a standalone local preview is required, create a clearly separated preview-only wrapper that imitates the approved shell without being included in the integration export.

## Shared shell rules — non-negotiable

- Use the existing Dashboard's exact topbar/sidebar components, width, row heights, icon size, navigation order, active styles, spacing, fonts and global dotted canvas when composing the page in the app.
- Highlight the existing **Emerging Skills** navigation item. Internal views must not become global sidebar entries.
- Reuse the canonical tokens and existing card/button/select/table/tooltip/drawer/toast patterns.
- Use the Dashboard image as the shared-shell authority. The multi-view design board is a page composition reference only; its repeated sidebar/topbar are because it is a composite board.

## Data integration rules — non-negotiable

- All analytical visuals must be rendered from structured adapter data. The dashboard screenshot may never be embedded as the page.
- Define typed `EmergingSkillsDataAdapter` methods that match the API contract: overview, momentum, profile, relationships, regional signals, evidence, comparison, watchlist and skill alerts.
- Implement a deterministic mock adapter and REST adapter behind the same interface. Mock data must include `provenanceState: 'SYNTHETIC_DEMO'` and display “Illustrative demo data”.
- Blank API URL selects mock mode only for development/preview. When REST mode errors, show error/stale state and retry; never silently substitute mock values.
- No hard-coded category thresholds, fabricated metric values, made-up sources, fake confidence scores, fake freshness labels or invented graph edges.
- Skill category and rule version come from backend. If the endpoint does not provide rules/coverage, display “classification details unavailable” rather than inferring a label in React.
- Use verified state/UT GeoJSON geometry joined with canonical geography codes. The PNG/map shown in the board is not geographic data. If geometry/values unavailable, show a clear unavailable/no-data state.
- The graph must use nodes/edges from the adapter and surface relation basis: direct observation, approved mapping or derived association. Make a non-graph accessible list alternative.
- Comparison must check units, observation windows, geography and metric definitions before displaying numerical differences.
- Watchlist/alert actions only claim success after backend success. If the backend feature is not yet available, make the action clearly preview-only/disabled rather than fabricating persistence.

## Page-specific implementation

Follow the implementation spec. Overview uses category cards, ranked skills, category distribution, findings, watchlist and alerts. Skill Momentum uses an interactive bubble chart; the selected skill panel contains trend, evidence and compare actions. Connections has the dynamic relationship graph with occupation/sector lists. Regional Signals has the map, rankings and selected-region trend. Skill Profiles & Evidence has tabs for overview, why-category, evidence, relationships, region and compare.

Keep the information density moderate. Do not copy every component into every view. The key interaction is selecting a canonical skill and carrying it between relevant views. Use progressive disclosure for detailed evidence and category rules.

## Frontend module shape

Adapt to repository conventions, but favour:
- `EmergingSkillsPage.tsx`
- feature-scoped components (`overview`, `momentum`, `connections`, `regional-signals`, `skill-profile`)
- typed domain/adapter types
- `MockEmergingSkillsDataAdapter` and `RestEmergingSkillsDataAdapter`
- feature fixtures clearly marked `SYNTHETIC_DEMO`
- feature-scoped tests

Do not reorganize unrelated app areas. Export the content module and documented props for later integration. Do not add route or shell duplication unless the repository explicitly requires a temporary preview route.

## Required interaction states

Loading, empty, no results, low/partial coverage, unsupported region, stale, error + retry, unauthenticated/permission-disabled actions, mutation pending/success/failure. Prevent stale requests from overwriting newer filter results using AbortSignal or current app pattern.

Accessibility: keyboard-operable view tabs, focusable chart points or accessible alternative, graph node/list navigation, map list alternative, sufficient contrast, meaningful labels and reduced-motion support.

## Backend alignment

Review `backend/proposed_skill_relationship_schema.sql` as a proposal only. Do not apply it automatically. If the current backend schema lacks canonical skills, skill-occupation mapping, and posting-to-skill observations, report that gap and use the proposed contract for frontend mock development. Do not invent live backend routes; label them proposed until implemented.

## Deliverables

1. Working React page module and preview harness as appropriate to repo conventions.
2. Typed adapter interfaces with mock/REST implementations.
3. API contract/types kept aligned with handoff docs.
4. Unit/component tests for view switching, filters, selected skill, graph data/empty state, regional no-data behaviour, compare constraints and watchlist failures.
5. Integration notes, file list, commands actually run, test outcomes, and unresolved backend dependencies.
6. Screenshots of implemented page compared with the reference at desktop and mobile widths, if browser tools are available.

## Acceptance gate

Do not mark done unless all visible controls work or have a truthful disabled/unavailable state, every graph/chart/map value is data-driven, the shared shell is reused, mock mode is clearly labelled, and test/build results are reported honestly. If a check cannot be run, state that clearly.
