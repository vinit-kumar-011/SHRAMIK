# SHRAMIK Scenario Simulator — Frontend Handoff

**Purpose:** Build Scenario Simulator as an independently developed React + TypeScript page module that can be integrated into the SHRAMIK app later.  
**Status:** Handoff/specification package. This is not the completed React implementation and does not claim the backend endpoints already exist.

## Start here

1. Read `DESIGN_LOCK.md` and `SIDEBAR_CONSISTENCY_LOCK.md`.
2. Give `CLAUDE_PROMPT_SHRAMIK_SCENARIO_SIMULATOR.md` to Claude Code while it is working in the existing SHRAMIK repository (or a clean feature branch/module workspace).
3. Use `SHRAMIK_SCENARIO_SIMULATOR_IMPLEMENTATION_SPEC.md` for the exact component layout and interaction rules.
4. Use `SHRAMIK_SCENARIO_SIMULATOR_API_CONTRACT.md` and `SHRAMIK_SCENARIO_SIMULATOR_DATA_SEMANTICS.md` when implementing the adapter and mock fixtures.
5. Validate with `QA_CHECKLIST.md` and report the exact commands/tests actually run.

## Package contents

- `CLAUDE_PROMPT_SHRAMIK_SCENARIO_SIMULATOR.md` — implementation prompt for a modular React page.
- `SHRAMIK_SCENARIO_SIMULATOR_IMPLEMENTATION_SPEC.md` — detailed page layout, interaction, behavior, responsiveness and acceptance criteria.
- `SHRAMIK_SCENARIO_SIMULATOR_COMPONENT_INVENTORY.md` — component responsibilities and adapter methods.
- `SHRAMIK_SCENARIO_SIMULATOR_API_CONTRACT.md` — proposed REST shapes/endpoints and adapter interface; routes are proposals until aligned with the backend team.
- `SHRAMIK_SCENARIO_SIMULATOR_DATA_SEMANTICS.md` — metric definitions and non-negotiable simulation semantics.
- `DATABASE_ARCHITECTURE_ALIGNMENT.md` — how this page maps to the existing architecture proposal.
- `INTEGRATION_CONTRACT.md` — independent module export and future app integration expectations.
- `SIDEBAR_CONSISTENCY_LOCK.md` — canonical shell and nav rules.
- `DESIGN_LOCK.md` — visual structure and style rules.
- `QA_CHECKLIST.md` — interaction, edge-case, accessibility and responsive testing.
- `VALIDATION_REPORT.md` — status of this handoff package; implementation/build has not been run here.
- `SHRAMIK_GLOBAL_DESIGN_SYSTEM.md` — current design-system source document copied for the developer.
- `reference/` — full design board, crop of primary simulator composition, alternate result-view references, and the approved Dashboard reference.

## Recommended development mode

Use a typed `ScenarioSimulatorDataAdapter` with two implementations:

- `MockScenarioSimulatorAdapter`: deterministic, clearly labelled illustrative data for frontend work while source verification and backend development continue.
- `RestScenarioSimulatorAdapter`: calls SHRAMIK API routes configured by the host app. It must surface network/HTTP errors and must not silently fall back to mock data.

Keep simulation/business logic out of React components. The mock adapter can implement a deterministic toy calculation for interface testing only, with a persistent `SYNTHETIC_DEMO` provenance label. Production calculations belong to the backend/model service.

## Local setup

This package contains design and implementation handoff files, not a ready-to-run React app. The frontend developer should add the module to the existing React + TypeScript project or create a temporary isolated component harness using the repository's established tooling. Do not create a second product shell or replace dependencies just for this page.
