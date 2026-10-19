# Claude Code Prompt — SHRAMIK Scenario Simulator

You are implementing the **Scenario Simulator page module** for the existing SHRAMIK Labour Market Intelligence System. Work in the current repository and established React + TypeScript conventions. This is an independently developed page/module that will be integrated into the full application later.

## First: inspect, do not assume

1. Inspect the current repository structure, `package.json`, routing, shared app shell, existing sidebar/topbar, design tokens, UI components, chart library, map/GeoJSON assets, data adapter pattern, tests and lint/build scripts.
2. Reuse existing shared components and libraries. Do not create a second app, a second design system, another sidebar, another topbar, or duplicate component packages.
3. Read these handoff files before coding:
   - `SHRAMIK_GLOBAL_DESIGN_SYSTEM.md`
   - `DESIGN_LOCK.md`
   - `SIDEBAR_CONSISTENCY_LOCK.md`
   - `SHRAMIK_SCENARIO_SIMULATOR_IMPLEMENTATION_SPEC.md`
   - `SHRAMIK_SCENARIO_SIMULATOR_COMPONENT_INVENTORY.md`
   - `SHRAMIK_SCENARIO_SIMULATOR_API_CONTRACT.md`
   - `SHRAMIK_SCENARIO_SIMULATOR_DATA_SEMANTICS.md`
   - `DATABASE_ARCHITECTURE_ALIGNMENT.md`
   - `QA_CHECKLIST.md`
4. Use `reference/scenario-simulator-design-board.png` for the complete composition and `reference/scenario-simulator-primary-layout.png` for the main workspace. The smaller images in `reference/` are separate result views, not more panels to stack into one page.

## Deliverable

Implement a reusable React + TypeScript module (suggested export: `ScenarioSimulatorPage`) with:
- one primary scenario workspace;
- a selectable skill/occupation scope;
- intervention configuration controls;
- key outcome cards and baseline/scenario projection chart;
- a data-driven regional-impact preview;
- exactly five internal result views: Overview, Regional Impact, Sector Breakdown, Occupation Impact, Sensitivity Analysis;
- typed adapter interface and mock + REST implementations;
- loading, empty, validation, stale, warning, success and failure states;
- unit tests for important interaction/data-semantics behaviour;
- implementation and validation report.

If the existing repository has established naming patterns, follow them while preserving the component boundary and behaviour.

## Mandatory simulation semantics — do not violate

1. Label the primary intervention input **Additional annual training seats**. It means an increment, not total baseline capacity.
2. Show baseline capacity/assumptions separately if available.
3. For a training-capacity-only intervention, **scenario demand must remain equal to baseline demand** for the same scope and periods. Do not change the demand curve to make the chart look more interesting. Only show scenario demand diverging if the API explicitly returns a supported, separately modelled demand-side effect.
4. The additional seats may affect scenario supply only after the configured training lag and model-supported completion/certification/workforce-entry assumptions. Never convert each seat to one new worker by default.
5. Start year, lag, chart horizon and selected evaluation/result year are separate values. The displayed evaluation year must match the KPI and regional result values.
6. Use the `demand - supply` gap sign convention if confirmed by the backend contract: positive is shortage; negative is surplus. Reject incompatible measure combinations rather than calculating a gap in the UI.
7. Gap-to-demand ratios and gap-reduction percentages are only displayed when mathematically and semantically valid. Handle zero and surplus baselines explicitly.
8. Forecast uncertainty bands are shown only when returned by the service with documented semantics.
9. Do not implement the production simulation formula or model calculations in React. Mock calculations belong only in the mock adapter and must be labelled `SYNTHETIC_DEMO` / `ILLUSTRATIVE DEMO DATA`.
10. A REST failure must never fall back silently to mock data.

## Shared-shell and visual rules

- Production module must not render its own global sidebar or topbar when the host app already supplies them. In a local development harness, use an isolated preview wrapper that is not used by the module in production integration.
- Reuse the canonical sidebar in this exact order: Dashboard, Demand, Supply, Skill Gaps, Forecasts, Emerging Skills, Scenario Simulator (active), Reports, divider, Data Sources, Data Quality. Do not add `Settings`, `Data Explorer`, `User Management` or `Access Requests` based on generated screenshots.
- Preserve existing shell dimensions (width, nav row height, icon sizes, spacing, active state, typography, lower worker artwork, global topbar and breakpoints) by importing/reusing the implementation, not copying guessed pixel values into this feature.
- Reuse global dotted CSS canvas and colour/type tokens. Decorative worker/industrial artwork may be PNG, but charts, map data, controls, tables and connections must be actual HTML/SVG/canvas components.
- Keep the approved main-page hierarchy. Lower reference crops represent alternate views, not permanently stacked panels.

## Architecture

- Add an exported `ScenarioSimulatorDataAdapter` interface for options, entity search, compatible baselines, `runSimulation`, `getRunStatus`, `getResults` and optional backend-supported sensitivity analysis.
- Implement deterministic `MockScenarioSimulatorAdapter` fixtures and a `RestScenarioSimulatorAdapter`. The host application supplies the API base URL/auth/session according to existing conventions.
- Proposed routes and response contracts are in `SHRAMIK_SCENARIO_SIMULATOR_API_CONTRACT.md`. These are not known to exist; adapt endpoint names to the backend team's actual contract. Do not write fake assumptions into production mode.
- Keep run input as a typed draft. After a completed result, changing any input marks results stale and clearly requires another run.
- Do not use hardcoded arrays inside the chart components. The mock adapter returns typed scenario result DTOs and the components render them.
- Ensure request cancellation/stale-response protection and prevent duplicate run submission.

## Functional requirements

- Skill/occupation mode toggles and entity search work.
- Sliders and numeric inputs are controlled and remain synchronized.
- Filters/options derive from adapter data, within returned limits.
- Evaluation year is separate from intervention start year and horizon.
- Run simulation flows through validating → submitting → queued/running (if supported) → succeeded/warning/failed.
- Error keeps the user's input values. Old outputs must be labelled stale, not shown as if they match the new draft.
- Internal view tabs work and only one result view is visible at a time.
- Map geometry is a real GeoJSON/SVG asset with values joined by canonical geography code. No-data regions are distinct from zero or lowest impact.
- Regional map/table use the same selected run and evaluation year.
- Sensitivity analysis must call a mock/backend analysis service; do not draw arbitrary curves from one run.
- All meaningful buttons have behaviour; no dead CTAs.

## Testing and acceptance

1. Run the repository's actual typecheck, lint, unit test and build commands where available.
2. Test that supply-only scenario leaves baseline and scenario demand equal unless a supported demand-side effect is present.
3. Test that additional seats do not equal workers one-for-one in production logic (there is no frontend production formula).
4. Test stale state after input changes, duplicate submit prevention, field and cross-field validation, queued run handling, errors, retry, empty results and unsupported comparisons.
5. Test map `No data` vs zero and synchronized map/table filters.
6. Test keyboard access, visible focus, chart text/table alternative and reduced motion.
7. Verify screenshots at 320, 390, 768, 1024 and 1440 px if browser tooling is available.
8. Report only tests actually run. If browser/build tooling is unavailable, say so explicitly.

## Final report

Provide:
- a list of created/modified files;
- how to preview the module without the main app shell;
- how the host app injects/reuses the shared shell and adapter;
- endpoints mocked vs connected;
- actual test/build results;
- remaining backend/model/data dependencies;
- any deviation from the supplied visual references and why.

Implement the page now. Do not respond only with a plan or another specification.
