# SHRAMIK Dashboard — Component Inventory & Data Binding Map

This inventory is the component contract. Every interactive analytical component reads through `LabourMarketDataAdapter`; do not add component-level `fetch()` calls or embed production data in JSX.

## 1. Component map

| Component | File | Responsibility | Data / actions | States expected |
|---|---|---|---|---|
| `SHRAMIKDashboard` | `src/SHRAMIKDashboard.tsx` | Page orchestration, filters, loading/error, active adapter, detail drawer | `getDashboard`, `getRegionRankings`, `getRegions`, `getProfile`, `getNotifications`, `search`, detail methods | Initial loading, refreshing, API error, retry, mock/REST provenance |
| `Header` | same | Search, region selection, notifications, identity | `getRegions`, `search`, `getNotifications`, `markNotificationRead`, `getProfile` via parent | No results, searching, unread count, profile/notification popovers |
| `Sidebar` | same | Locked navigation and mobile drawer | `getSectionDetail` through parent; optional app-router callback; `shramik:navigate` event | Active route, open/closed drawer |
| `KpiCard` | same | Four overview values, delta and sparkline | `DashboardSummary.kpis[]`; `getIndicatorDetail(id)` on click | Loading skeleton, normal value, detail loading/error |
| `ChartPanel` | same | Demand/supply lines and period selection | `DashboardSummary.trend[]`; changing 3/5-year window calls `getDashboard` | Empty trend, loading/refreshing, chart detail |
| `RegionalPanel` | same | Ranked states and metric selector | `getRegionRankings({ regionCode, metric })` | Loading, ranking error, empty response |
| `SummaryPanel` | same | Section header, view-all and row list | One of `emergingSkills[]`, `sectorGaps[]`, `occupationForecasts[]`; `getSectionDetail` | Empty rows, item-detail error, selected section detail |
| `DataRows` | same | Compact rows and bar indicators | Each row's API fields; bar `displayScore` is presentation-only 0–100 score | Empty list; detail response on click |
| `DetailDrawer` | same | Reusable detail workspace without expanding main dashboard | `DetailPayload` returned by indicator / section endpoints | Loading, error, facts, optional table, metadata |
| `Sparkline` | same | Small trend glyph | Numeric array provided per KPI | Empty array guarded |
| `SelectControl` | same | Accessible shared dropdown | Controlled value and change callback | Keyboard/focus behaviour |

## 2. Adapter files

| File | Role |
|---|---|
| `src/api/contracts.ts` | Strongly typed request/response models; single adapter interface |
| `src/api/adapter.ts` | Chooses the REST adapter when `VITE_SHRAMIK_API_BASE_URL` exists; otherwise uses mock adapter. `dataAdapter` prop can override it for host auth/routing. |
| `src/api/rest-adapter.ts` | HTTP implementation, JSON/error handling, abort support, cookie credentials, optional token-provider seam |
| `src/api/mock-adapter.ts` | Interactive deterministic adapter for local preview; every response declares `provenance: 'mock'` |
| `.env.example` | Configuration example |

## 3. Required interaction bindings

| UI event | Adapter method | Expected result |
|---|---|---|
| Initial page / refresh / region change / period change | `getDashboard({ regionCode, periodYears, signal })` | KPI cards, trend data, three summary lists, update/provenance metadata |
| Regional metric change | `getRegionRankings({ regionCode, metric, signal })` | Sorted values for `demand`, `supply`, or `skill-gap` |
| Search typing (debounced) | `search({ query, regionCode, signal })` | Typed suggestions from the backend/search index |
| Choose region search result | Parent region state | Triggers a new dashboard + ranking read |
| Choose KPI or summary row | `getIndicatorDetail(id, { regionCode })` | Detail facts, optional table and provenance |
| View all / chart details / nav section | `getSectionDetail(section, { regionCode })` | Section detail drawer payload |
| Open notifications | `getNotifications()` on initial load | Notification list and unread state |
| Mark a notification read | `markNotificationRead(id)` | Server mutation; UI marks read after success |
| Open profile | `getProfile()` on initial load; `getSectionDetail('profile')` when selected | Signed-in user identity/profile info |

## 4. API path mapping

The REST adapter prefixes paths with `/api/v1` unless the configured base URL already ends with it.

| Adapter method | HTTP route |
|---|---|
| `getRegions` | `GET /api/v1/regions` |
| `getProfile` | `GET /api/v1/me` |
| `getDashboard` | `GET /api/v1/dashboard/summary?region=IN&period=5y` |
| `getRegionRankings` | `GET /api/v1/dashboard/regions/rankings?region=IN&metric=demand` |
| `search` | `GET /api/v1/search?q=...&region=IN` |
| `getNotifications` | `GET /api/v1/notifications` |
| `markNotificationRead` | `PATCH /api/v1/notifications/{id}/read` |
| `getIndicatorDetail` | `GET /api/v1/dashboard/indicators/{id}?region=IN` |
| `getSectionDetail` | `GET /api/v1/dashboard/details/{section}?region=IN` |

## 5. Important data-shape rules

- Use stable `id` values; do not key lists by display labels when an id exists.
- `formattedValue` is for presentation; keep numeric `value` for calculations and validation.
- `displayScore` controls bar length only. It must not be presented as a statistical measure.
- Every dashboard payload has `meta.provenance` (`source-backed`, `mixed`, or `mock`), `sourceLabel`, `updatedAt`, and optional coverage/notes.
- Empty values should be `null` or empty arrays according to the interface, not strings like `N/A` where numeric math may be required.
- Icon selection uses `iconKey` mapped through a safe Lucide icon registry; never render HTML supplied by an API.
- The map artwork is illustrative and must not be used to visualize production values. The state ranking list is data-backed via its adapter response.
