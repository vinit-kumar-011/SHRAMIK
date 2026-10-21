# Skill Gap Analysis — QA Checklist

## Shared shell / visual
- [ ] Existing Dashboard route still renders and uses the same sidebar/topbar.
- [ ] `Skill Gaps` is the only active global navigation item.
- [ ] Sidebar order, dimensions, icon sizes, logo sizing, spacing, lower worker art and mission note match the existing app.
- [ ] Dotted canvas, typography and card tokens come from the global design system.
- [ ] Page content composition is distinct from Demand/Supply without creating new global navigation patterns.

## Filters and state
- [ ] Draft filters do not apply until Apply (unless the shared filter component defines a different convention).
- [ ] Apply triggers coherent refresh of overview, scatter, map/ranking, table, insights and optional flow.
- [ ] Reset uses backend-supported defaults.
- [ ] State selection on map synchronizes selected state/filter consistently.
- [ ] Earlier network responses cannot overwrite results for later filters.
- [ ] REST failure does not activate mock data silently; prior data is marked stale if retained.

## Math and visualization
- [ ] Demand/supply gap only computed for comparable definitions/units/periods/geographies.
- [ ] Gap sign (positive shortage, negative surplus) is consistently represented in chart, map, KPI and table.
- [ ] Scatter parity line appears only if same unit/definition supports it.
- [ ] Scatter axes/scales support the returned domain and zero values.
- [ ] Actual state/UT geometry is versioned/licensed and joined by canonical codes.
- [ ] No-data/suppressed map polygons are neutral and accessible.
- [ ] Map legend matches returned classifications/thresholds.
- [ ] Optional Sankey/flow diagram appears only if valid flow nodes/links exist.
- [ ] No screenshot values are represented as live/source-backed data.

## Interaction and accessibility
- [ ] Scatter points, map regions, tabs, rows, buttons and filters support keyboard focus and activation.
- [ ] Chart/map have screen-reader-friendly table/text alternatives.
- [ ] Tooltip has exact value, unit, period, source and provenance when available.
- [ ] Key insights open traceable evidence/details.
- [ ] Loading, empty, error, retry, partial/stale, not-comparable and no-geometry states are tested.
- [ ] Reduced-motion support is respected; background decorative layers do not change control positions.

## Responsive / technical
- [ ] 1440 CSS px checked.
- [ ] 1024 CSS px checked.
- [ ] 768 CSS px checked.
- [ ] 390 CSS px checked.
- [ ] No page-wide horizontal overflow.
- [ ] TypeScript check and build scripts that exist in `package.json` run successfully.
- [ ] Adapter contract tests cover filters, region selection, error and no-data behavior.
- [ ] Report only checks actually executed; list build/browser blockers precisely.
