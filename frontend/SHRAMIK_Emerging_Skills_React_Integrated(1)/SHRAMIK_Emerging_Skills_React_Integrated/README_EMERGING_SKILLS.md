# SHRAMIK React frontend — Emerging Skills integration

This package integrates Emerging Skills as a **React + TypeScript feature module inside the existing SHRAMIK Dashboard shell**. It does not create a second production sidebar, topbar, or router. Select **Emerging Skills** in the existing sidebar to open the page.

## What is included
- `src/pages/EmergingSkillsPage.tsx`: reusable page component, five internal views, shared filters, adapter-driven requests, error/retry states, comparisons, profile/evidence panels, watchlist interaction and demo alert display.
- `src/SHRAMIKDashboard.tsx`: host integration. The original header and sidebar render once; the sidebar active state moves to Emerging Skills and the page is rendered inside the same content area.
- `src/emerging-skills-utilities.css` + Tailwind config: utilities required by the page, with Tailwind preflight disabled to avoid resetting the host shell.
- `docs/emerging-skills/`: handoff, specs, API contract, semantics, QA checklist and reference imagery.

## Run locally
Requires Node.js 20+ and npm with package registry access. From this folder:

```bash
npm install
npm run dev
npm run typecheck
npm test
npm run build
```

## Data and production boundaries
- The page currently defaults to the deterministic `demoEmergingSkillsDataAdapter` unless a caller passes `emergingSkillsAdapter` to `SHRAMIKDashboard`. Demo data is explicitly labelled `SYNTHETIC_DEMO` and is **not a labour-market finding**.
- The Emerging Skills API contract in `docs/emerging-skills/SHRAMIK_EMERGING_SKILLS_API_CONTRACT.md` is proposed; it does not assert those endpoints exist. The backend team must implement/confirm endpoints and provide an adapter before live use. Failed REST reads must not fall back to demo fixtures.
- State/UT GeoJSON and a canonical geography crosswalk are not included, so the Regional Signals page explicitly shows a map-unavailable state instead of a fake choropleth.
- Watchlist persistence and alert rules are demo-only until backed by authenticated APIs. The mock adapter's watchlist is in memory.
- Source detail actions, authentication and permissions must be wired by the host application.

## Verification in this environment
The source has been integrated and static integration checks are included. A Vite production build and strict typecheck could **not** be completed in this environment because dependencies could not be restored: the npm registry request stalled, and `npm ci --offline` reported an uncached `yallist` tarball. Do not describe this archive as a verified production bundle until `npm install`, `npm run typecheck`, `npm test` and `npm run build` pass on the target development machine.
