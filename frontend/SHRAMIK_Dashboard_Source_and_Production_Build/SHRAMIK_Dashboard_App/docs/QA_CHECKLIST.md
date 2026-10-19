# QA checklist

- [ ] Desktop at 1440 × 900: header and sidebar proportions, 4 KPI cards in one row, trend/regional panels side-by-side, 3 summary panels in one row.
- [ ] Laptop at 1024 × 768: all four KPI cards remain aligned; headings and values are not clipped.
- [ ] Tablet around 768px: sidebar becomes a drawer, KPIs become a 2 × 2 grid, analytics panels stack in the required order.
- [ ] Mobile at 390px and 320px: no horizontal scroll; search can be exposed in a future mobile search UI; region/profile controls remain usable.
- [ ] Keyboard tab order and visible focus indicators.
- [ ] Reduced-motion OS preference disables parallax and nonessential transitions.
- [ ] VoiceOver/NVDA labels for search, selectors, charts and illustrative map.
- [ ] Replace all demonstration data; ensure map/legend/source date units are correct.
- [ ] Connect route navigation and all header/card/panel controls.
- [ ] Check image scaling and transparent/cropped edges at production display sizes.

## Data-adapter integration checks

- [ ] `npm run test:adapter` passes in the installed package.
- [ ] Mock mode labels dashboard values as illustrative and returns the four KPI cards, trend and summary row sets through the adapter.
- [ ] REST mode starts when `VITE_SHRAMIK_API_BASE_URL` is configured and does not silently substitute mock values on HTTP failure.
- [ ] Region + period filters request a new dashboard response; regional metric changes request a new ranking response.
- [ ] Global search calls `search()` and selecting a region result updates the filter.
- [ ] KPI clicks, row clicks, chart detail, View all, nav items and profile detail request adapter payloads (or use the host app router when supplied).
- [ ] Mark-read calls the notification mutation and only updates the row on success.
- [ ] API errors, empty results, source label, timestamp and provenance are visible.
- [ ] The source-backed REST payload is validated against `docs/API_CONTRACT.md` before enabling official use.
