# SHRAMIK Dashboard v1 — Developer Handoff Notes

The dashboard reference is locked. This handoff includes the source, specifications and data integration seam needed to implement the approved design without changing its information architecture.

## Canonical files

1. `SHRAMIK_Dashboard_Reference.png` — screenshot / visual source of truth.
2. `SHRAMIK_DASHBOARD_SPEC.md` — page requirements and acceptance criteria.
3. `SHRAMIK_GLOBAL_DESIGN_SYSTEM.md` — global identity and design tokens.
4. `SHRAMIK_COMPONENT_INVENTORY.md` — every component and its data-adapter binding.
5. `docs/API_CONTRACT.md` — REST endpoint/response contract.
6. `src/SHRAMIKDashboard.tsx` and `src/api/` — implementation and adapters.
7. `docs/DEVELOPER_INTEGRATION.md` — integration steps.
8. `docs/VALIDATION_REPORT.md` — validation status.

## Data adapters are active

`createLabourMarketDataAdapter()` selects one implementation at startup:

- `MockLabourMarketDataAdapter`: runs without a backend. Search, region/period filters, ranking metric switching, refresh, notifications and detail surfaces are interactive. Every response is marked `mock`.
- `RestLabourMarketDataAdapter`: activated by `VITE_SHRAMIK_API_BASE_URL`. All dashboard components continue to use the same interface while reading from the documented API endpoints.

There are no component-level API URLs. KPI opens, chart details, regional data, search, profile, notifications, row clicks and view-all actions pass through the adapter. REST integration requires a backend matching the API contract.

## Preserve the visual system

Maintain the fixed off-white dot canvas, compact SHRAMIK brand lockup, yellow selected navigation/action, worker collage, four-KPI row, two-panel middle row, and three-panel bottom row. Only the decorative hero illustration receives restrained parallax; honor `prefers-reduced-motion`.
