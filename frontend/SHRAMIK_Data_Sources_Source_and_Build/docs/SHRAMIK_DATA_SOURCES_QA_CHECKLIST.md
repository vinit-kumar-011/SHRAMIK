# SHRAMIK Data Sources — QA Checklist

## Visual and shell
- [ ] Existing global sidebar/topbar are reused; no duplicated shell in `DataSourcesPage`.
- [ ] Sidebar order matches `SHRAMIK_DATA_SOURCES_SIDEBAR_LOCK.md`; Data Sources is active.
- [ ] No unapproved User Management, Settings, Access Requests or other nav additions.
- [ ] Global tokens, typography, border and dotted-canvas conventions are reused.
- [ ] Summary cards remain visually quiet; table/detail drawer establish hierarchy.

## Registry interactions
- [ ] Search matches supported name/owner/type/tags fields.
- [ ] Status, type and agency filters combine as expected.
- [ ] Reset clears each filter and query.
- [ ] Pagination or load-more reflects real returned totals.
- [ ] Selecting a source opens its detail drawer and preserves query, filters, page and scroll context.
- [ ] Closing the drawer returns focus to the element that opened it.
- [ ] Any add/overflow action either works through the adapter or states `Not configured`.

## Semantics and provenance
- [ ] Every mock record displays `SYNTHETIC_DEMO` or an equally clear demo-data notice.
- [ ] No record is described as a verified live connector unless the backend proves it.
- [ ] Source reporting period, source release date, retrieval time and validation time are distinguished.
- [ ] Missing metadata uses accurate missing-state language, not fabricated dates or zeros.
- [ ] Lifecycle status and freshness remain distinct when both are provided.
- [ ] Counts are derived from records or API summary metadata, not duplicated hard-coded numbers.
- [ ] Coverage and mapping claims use defined denominators/scopes and backend-produced summaries.

## Details drawer tabs
- [ ] Overview can load independently.
- [ ] Ingestion History distinguishes queued/running/succeeded/warning/failed/cancelled/not configured.
- [ ] Coverage shows available periods and geographic scope, plus limitations.
- [ ] Field Mapping shows unmapped or review states, or an explicit not-configured state.
- [ ] Error in one tab does not blank all other detail tabs.
- [ ] Credentials, tokens and private connection strings are never displayed.

## Responsive and accessibility
- [ ] Desktop around 1440px and 1280px checked.
- [ ] Tablet around 1024px and 768px checked.
- [ ] Mobile around 390px and 320px checked.
- [ ] No page-wide horizontal overflow.
- [ ] Drawer/modal traps focus appropriately, closes with Escape when consistent with project conventions, and restores focus.
- [ ] All controls have labels, keyboard focus is visible, status is not colour-only, icon buttons have accessible names.
- [ ] Reduced-motion preference is respected.

## Engineering verification
- [ ] Existing lint, typecheck, tests and build were run if available; record actual results.
- [ ] No direct upstream source API calls from browser.
- [ ] No credentials/secrets in client code or fixtures.
- [ ] Mock/REST adapter boundary is replaceable.
- [ ] Loading, empty, no-results, error, permission-denied and not-configured states covered.
- [ ] The implementation summary distinguishes completed work from tests not run and backend capabilities still missing.
