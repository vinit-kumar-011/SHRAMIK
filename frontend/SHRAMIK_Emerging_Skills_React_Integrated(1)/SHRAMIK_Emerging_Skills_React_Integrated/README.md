# SHRAMIK Dashboard — Developer Handoff

This package contains the approved dashboard design reference, formal specification, global design system, component inventory, reusable visual assets, and a React + TypeScript implementation with a real data-adapter seam.

## Start locally

Requires Node.js 18 or newer.

```bash
npm install
npm run dev
```

Production checks:

```bash
npm run typecheck
npm run test:adapter
npm run build
npm run preview
```

## Activate API integration

The dashboard uses the interactive mock adapter by default. The `SHRAMIKDashboard` component also accepts a `dataAdapter` prop so the host application can inject a preconfigured adapter with its own authenticated session/token provider. To switch every component to the REST adapter, copy `.env.example` to `.env.local` and configure the backend host:

```dotenv
VITE_SHRAMIK_API_BASE_URL=http://localhost:8000
```

The REST adapter calls the endpoint set documented in `docs/API_CONTRACT.md`. It handles JSON responses, request cancellation, session-cookie credentials, errors and optional bearer-token injection through the constructor. If the configured host is missing or a route fails, the UI exposes the error and retry path; it does not silently replace a failed production read with mock values.

**Note:** setting the environment variable activates the REST adapter, but a backend must implement the documented endpoints and response models before the dashboard can show source-backed data. The package does not include a production API or authentication service.

## Files to hand to the developer

- `SHRAMIK_DASHBOARD_SPEC.md` — page anatomy, interaction expectations, responsive rules and acceptance criteria.
- `SHRAMIK_GLOBAL_DESIGN_SYSTEM.md` — canonical global SHRAMIK visual system.
- `SHRAMIK_COMPONENT_INVENTORY.md` — component responsibilities, adapter bindings and endpoint map.
- `SHRAMIK_Dashboard_Reference.png` — approved visual target.
- `DESIGN_LOCK.md` — concise non-negotiable design lock.
- `docs/API_CONTRACT.md` — REST routes and JSON contracts.
- `docs/DEVELOPER_INTEGRATION.md` — mounting guide for the existing SHRAMIK application.
- `docs/QA_CHECKLIST.md` — visual, responsive, accessibility and data-integrity checks.
- `docs/VALIDATION_REPORT.md` — checks performed and checks still needed.
- `public/assets/` — separate PNG assets used by the layout.
- `src/SHRAMIKDashboard.tsx` — dashboard components and orchestration.
- `src/api/contracts.ts` — stable typed data models.
- `src/api/adapter.ts` — adapter selection from environment.
- `src/api/rest-adapter.ts` — live API adapter.
- `src/api/mock-adapter.ts` — working local adapter for layout and interaction preview; all values are marked mock.

## Approved dashboard structure — don't redesign

1. Sticky topbar: compact brand, search, region, notifications and user profile.
2. Left navigation rail with worker art and a short mission note.
3. Hero: national/selected-region breadcrumb, large heading, worker-industrial art and sticky-note accent.
4. Exactly four KPIs: demand, supply, overall skill gap, emerging skills.
5. Middle row: demand/supply trend on the left and regional intelligence on the right.
6. Bottom row: emerging skills, skill gaps by sector, occupation forecasts.
7. Compact methodology and provenance note.

## Data-integrity caveats

The mock adapter's metrics and ranking entries are for visual/interaction development only. They are labelled in the dashboard and must not be used as factual SHRAMIK outputs. The included India map is decorative, not an accurate state-boundary/chloropleth layer. Use verified geometry and data before applying metric-driven map shading.


See [README_EMERGING_SKILLS.md](README_EMERGING_SKILLS.md) for the integrated Emerging Skills React page, build steps and backend readiness boundaries.
