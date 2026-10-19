# SHRAMIK — Emerging Skills Intelligence frontend handoff

**Purpose:** Implement one independently developable React + TypeScript page module with five internal views, ready to be integrated into the main SHRAMIK app later.

**Status:** Specification and frontend handoff. This ZIP is not a completed React implementation and it does not claim the proposed endpoints or new schema tables already exist.

## Start here

1. Read `CLAUDE_PROMPT_SHRAMIK_EMERGING_SKILLS.md`.
2. Read `SHRAMIK_EMERGING_SKILLS_IMPLEMENTATION_SPEC.md` and `SIDEBAR_CONSISTENCY_LOCK.md`.
3. Use `reference/SHRAMIK_Emerging_Skills_Design_Board.png` as the page composition reference and `reference/SHRAMIK_Dashboard_Reference.png` as the authority for the shared shell.
4. Use the API and semantics documents to keep all analytical visuals data-driven and honest.
5. Build the page module and a preview harness in the existing repo/worktree. Do not create a second production app or duplicate the global shell.

## Package contents

- `CLAUDE_PROMPT_SHRAMIK_EMERGING_SKILLS.md` — implementation prompt for Claude Code.
- `SHRAMIK_EMERGING_SKILLS_IMPLEMENTATION_SPEC.md` — five views, layout, interactions and states.
- `SHRAMIK_EMERGING_SKILLS_API_CONTRACT.md` — proposed typed endpoints and payloads.
- `SHRAMIK_EMERGING_SKILLS_COMPONENT_INVENTORY.md` — component responsibilities.
- `SKILL_DATA_SEMANTICS_AND_CLASSIFICATION.md` — category definitions, metrics and data-truth rules.
- `BACKEND_SKILL_RELATIONSHIP_GAP_AND_PROPOSAL.md` — the currently identified schema gap and how to address it additively.
- `backend/proposed_skill_relationship_schema.sql` — illustrative additive PostgreSQL migration proposal; review and adapt before running.
- `SIDEBAR_CONSISTENCY_LOCK.md` — canonical navigation and shell rules.
- `INTEGRATION_CONTRACT.md` — integration shape for later app assembly.
- `QA_CHECKLIST.md` — acceptance and regression checklist.
- `SHRAMIK_GLOBAL_DESIGN_SYSTEM.md`, `SHRAMIK_DASHBOARD_SPEC.md`, `SHRAMIK_COMPONENT_INVENTORY.md` — copied canonical reference documents.
- `reference/` — design board, dashboard shell reference and individual view crops.

## Proposed React integration shape

Export a page content component (suggested name `EmergingSkillsPage`) that accepts an `EmergingSkillsDataAdapter` and optional initial filters/callbacks. It should not own or recreate the production global topbar/sidebar. For a standalone visual preview, a preview-only shell may be used, but mark it clearly and keep it out of the reusable page module.

## Development data mode

Use a deterministic mock adapter for local UI development until the backend endpoints and source-backed skill relationships are ready. All mock responses must include `provenanceState: "SYNTHETIC_DEMO"` and be visibly labelled **Illustrative demo data**. Do not present the design-board values as real research findings.

## Verification status

This handoff contains specifications and reference images. It does not include an implemented Emerging Skills React page, and no build/test result is claimed for such a page. The developer should run the repository's actual typecheck, lint, tests and production build after implementation.
