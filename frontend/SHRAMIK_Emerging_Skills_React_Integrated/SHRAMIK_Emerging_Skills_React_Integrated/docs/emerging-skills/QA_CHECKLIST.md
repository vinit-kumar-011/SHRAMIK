# Emerging Skills Intelligence — QA checklist

## Structure and shared identity
- [ ] Existing shared shell is rendered once; no second production sidebar/topbar.
- [ ] Sidebar labels/order/dimensions are identical to Dashboard; Emerging Skills active.
- [ ] Five internal views only; internal tabs do not become global nav routes.
- [ ] Dotted canvas/tokens and shared component sizing are reused.
- [ ] Reference screenshot is never used as rendered application content.

## Data-driven visuals
- [ ] KPI cards and overview distribution come from adapter response.
- [ ] Momentum points use declared metrics/units/windows; size legend is documented.
- [ ] Graph nodes/edges are API data with relation type/basis and evidence metadata.
- [ ] No graph edges are made up to fill empty space.
- [ ] Regional map uses approved GeoJSON + canonical geography code join, not PNG shading.
- [ ] No-data states differ from zero.
- [ ] Profiles and evidence show source/provenance/rule versions.
- [ ] Compare rejects or qualifies incompatible units/windows/geographies.
- [ ] Watchlist/alert mutations are persisted only if endpoint confirms success.
- [ ] Demo mode is visibly marked; REST errors never silently fall back to demo values.

## States and behaviour
- [ ] Loading, empty, no results, low coverage, unsupported location, stale, error/retry, unauthenticated and permission-disabled states work.
- [ ] Selecting a skill updates the profile and keeps selection across view tabs.
- [ ] Selecting graph node opens details; filters refresh relationships.
- [ ] Selecting a map state refreshes state ranking and regional trend.
- [ ] Compare supports 2–4 skill IDs and removes duplicate IDs.
- [ ] Watchlist add/remove and alert-rule create/update/delete handle API errors and rollback feedback.
- [ ] Keyboard users can access tab panels, chart points or equivalent lists, nodes or equivalent relation list, table actions and dialogs.
- [ ] Graph/map includes non-visual/list alternatives and visible focus.
- [ ] Reduced motion is honoured; no aggressive parallax or autoplay.

## Responsive and release checks
- [ ] Validate at 320, 390, 768, 1024 and 1440 px (or project-standard viewports).
- [ ] No page-level horizontal overflow; tables/panels have deliberate mobile behaviour.
- [ ] Fonts loaded/failed cases are inspected; logo dimensions stay locked.
- [ ] Existing app lint, typecheck, unit tests and production build pass.
- [ ] Screenshots compared with page reference and Dashboard shell at target breakpoints.
- [ ] New dependencies are justified and existing dependencies reused when possible.
- [ ] API contracts and component inventory updated if implementation deviates.
- [ ] Validation report distinguishes tests actually run from tests not run.
