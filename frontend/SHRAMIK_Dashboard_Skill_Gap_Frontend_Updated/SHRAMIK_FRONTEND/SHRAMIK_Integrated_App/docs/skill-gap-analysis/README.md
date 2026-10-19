# SHRAMIK Skill Gap Analysis — Developer Handoff

This package is an implementation handoff for one independently developed React + TypeScript page that will later be integrated into the main SHRAMIK app.

## Start here

1. Read `CLAUDE_PROMPT_SHRAMIK_SKILL_GAP_ANALYSIS.md`.
2. Read `SHRAMIK_SKILL_GAP_ANALYSIS_IMPLEMENTATION_SPEC.md` and `SHRAMIK_SKILL_GAP_ANALYSIS_API_CONTRACT.md`.
3. Read `SHRAMIK_GLOBAL_DESIGN_SYSTEM.md`, `SHRAMIK_DASHBOARD_SPEC.md`, `SHRAMIK_COMPONENT_INVENTORY.md`, and `SIDEBAR_CONSISTENCY_LOCK.md`.
4. Review `reference/SHRAMIK_Skill_Gap_Analysis_Reference.png` for the page-specific composition and `reference/SHRAMIK_Dashboard_Reference.png` for the shared shell.
5. Open the actual frontend repository and inspect existing shared shell/components/dependencies before editing anything.

## Important: integration model

- The deliverable is a **page module**, not a second independent React app.
- Export a `SkillGapAnalysisPage`/content component and keep it isolated from global routing/auth initialization so it can be bound later.
- Reuse the host app's shared shell in the actual application. Do not duplicate the sidebar or topbar in the production page module.
- If a local visual preview wrapper is required during page work, keep it in a clearly named preview-only component and compose the same shared shell component; do not ship a parallel shell implementation.
- Use the shared API client/data adapter conventions. Do not add a new design system or dependency before checking what is already installed.

## Reference/real-data boundary

All numerical values in the screenshot are illustrative. The app must not ship them as factual or source-backed data. The raster map in the screenshot is a visual reference only. In source-backed mode, use actual state/UT GeoJSON and values joined by canonical codes; if geometry or data is unavailable, show an explicit unavailable state.

## What this package includes

- Page implementation specification.
- API contract proposal and response shapes.
- Component inventory and data ownership rules.
- Global design system and Dashboard/sidebar lock copied as references.
- Data semantics and QA checklist.
- Claude Code implementation prompt.
- Dashboard, Demand, Supply and Skill Gap reference images.

## Definition of handoff completion

The frontend implementer should return changed files, component reuse notes, adapter endpoints, geography geometry source/license/version, tests/build/browser checks actually run, and any integration blockers. This ZIP itself does not contain the completed React page implementation.
