# Skill Gap Analysis — Component Inventory

This page must extend/reuse the shared SHRAMIK component library. It must not create another global shell or its own design token layer.

| Component | Type | Data source / adapter | Primary behavior | Required states |
|---|---|---|---|---|
| Shared app shell | Shared | Existing application shell | Renders the canonical header/sidebar and app canvas | Existing host app states |
| Shared sidebar | Shared, do not clone | Existing shell | `Skill Gaps` is active; labels/order and dimensions remain canonical | Active, focus, collapsed/drawer |
| Shared topbar | Shared, do not clone | Existing shell | Search, notifications, profile | Existing host app states |
| Page hero | Page-specific composition | Static labels + optional decorative asset | Shows title/copy and decorative artwork; does not contain metrics | Normal/responsive |
| Filter toolbar | Shared filters | `getFilterOptions()` | Draft and applied filter snapshots; Apply/Reset; all panels reload together | Loading/options error/invalid selection |
| KPI strip | Shared KPI card × 4 | `getOverview(filters)` | Demand, supply, gap/shortage, significant gaps; clicking opens shared detail | Loading/zero/unavailable/stale/error/detail |
| View tabs | Shared tabs/segmented control | Client view state; panel adapter methods | Overview, Occupations, Skills, Sectors, Regions | Selected/focus/disabled if unsupported |
| Skill Gap Landscape | Page-specific chart built using shared chart wrapper | `getGapLandscape(filters)` | Demand-vs-supply scatter; parity line only when valid; point selection opens details | Loading/empty/error/partial/invalid scale |
| Regional gap map | Shared map/chart primitives + verified GeoJSON | `getRegionalGaps(filters, metric)` | Choropleth and ranking use same response and classification | Loading/no geometry/no coverage/no data/error/retry/stale |
| Gap map legend | Shared legend | Returned classifications/scale | Explains shortage, balance, surplus and no data | Normal / partial coverage |
| Key Insights rail | Shared insight/notice card | `getSkillGapInsights(filters)` | Shows up to four source-linked findings | Loading/unavailable/error/empty |
| Top Skills by Gap table | Shared data table | `getRankedSkills(filters, sort, page)` | Sorting/pagination, row detail, View All | Loading/empty/error/stale |
| Sector flow panel | Page-specific chart using existing library | `getSectorFlow(filters, sector)` | Render only measured and well-defined flows; otherwise explanatory unavailable state | Loading/valid/empty/invalid contract/error |
| Detail drawer | Shared detail drawer | `getDetail(type, id, filters)` | Definition, demand/supply/gap, formula, filters, source, coverage and provenance | Loading/not found/error/normal |
| Provenance strip | Shared metadata/status component | Page payload metadata | Period, source label, provenance, data freshness and coverage | Current/stale/partial/mock/unavailable |

## Shared dimensions and tokens

The host repository is authoritative for sidebar width, header height, logo size, nav row/icon size, content gutter, control height, card padding/radius, borders and shadow. Do not guess these if they are available from actual source components/styles. The shared shell lock is documented in `SIDEBAR_CONSISTENCY_LOCK.md`.

## Data/state ownership

- Page controller owns applied filters, request cancellation/order, payload state, selected tab, selected metric, selected region and selected detail target.
- Adapter owns network/mock access and response normalization.
- Components receive typed data and event callbacks; leaf components do not issue ad-hoc `fetch()` calls.
- Charts/map own only ephemeral hover/focus/tooltip state.
- Business/forecast/gap logic stays in the backend/analytics service.

## Component definition of done

Every visible control performs a meaningful action or is explicitly disabled with a reason. No chart, table row, View All button or map region is decorative-only if presented as interactive. Every data visual includes unit, period, provenance and a no-data/error route as relevant.
