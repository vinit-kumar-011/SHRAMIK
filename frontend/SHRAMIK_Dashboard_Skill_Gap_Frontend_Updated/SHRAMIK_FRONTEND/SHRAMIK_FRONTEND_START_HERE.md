# SHRAMIK Frontend — Start Here

## Canonical integrated app

Open the `SHRAMIK_Integrated_App/` folder for the unified React + TypeScript application. It combines the updated Dashboard and Skill Gap Analysis using one shared `Header`, `Sidebar`, CSS design system, and detail drawer.

- `SHRAMIK_Integrated_App/index.html` — Dashboard entry.
- `SHRAMIK_Integrated_App/skill-gap-analysis.html` (in `dist/` for the static build) — Skill Gaps entry inside the same shell.
- `SHRAMIK_Integrated_App/src/SHRAMIKDashboard.tsx` — shared shell and Dashboard composition.
- `SHRAMIK_Integrated_App/src/skill-gaps/SkillGapAnalysisPage.tsx` — Skill Gap Analysis page content only (no duplicate topbar/sidebar).
- `SHRAMIK_Integrated_App/IMPLEMENTATION_REPORT.md` — implementation summary, tests, and blockers.
- `SHRAMIK_Integrated_App/dist/DEPLOYMENT_README.md` — run/deploy notes for the static fallback build.

The legacy `SHRAMIKDashboard.html`, `SHRAMIK · Labour Market Intelligence Dashboard.html`, and `SHRAMIK · Skill Gap Analysis.html` filenames now redirect to the canonical integrated app so those two pages cannot drift to different topbar/sidebar implementations. The original Skill Gap Analysis baseline is preserved at `SHRAMIK_Integrated_App/reference/baseline/SHRAMIK_Skill_Gap_Analysis_Baseline.html`.

## Data status

Mock values are clearly labelled as illustrative. The map requires an approved, versioned and licensed GeoJSON/canonical state-code crosswalk; the supply–demand flow requires validated backend nodes and links. Neither is fabricated to fill a visual hole.

## Build status

The included `dist/` is a custom offline static fallback build, not a Vite-generated production build, because npm registry DNS was unavailable in the build environment. See its `DEPLOYMENT_README.md` and `BUILD_REPORT.json`. Run `npm install` and `npm run build` on a machine with npm registry access for the normal Vite build.

Other legacy pages in this archive (such as Administration and Scenario Simulator) are preserved as-is and still need integration into the shared app as their pages are upgraded.
