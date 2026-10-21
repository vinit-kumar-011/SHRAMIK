# SHRAMIK Dashboard — Locked Visual & Structural Specification

**Status:** Approved visual direction for implementation. Treat `reference/dashboard-concept.png` as the visual source of truth. This brief supersedes personal interpretation of the screenshot.

## 1. Locked identity

- Warm off-white canvas: `#F7F6F0`.
- Fine charcoal dotted pattern: fixed to the viewport; its position should not jump or scroll with the content.
- Black/charcoal type and fine black outlines, rounded rectangular cards, restrained hard offset shadows.
- Yellow interaction accent: `#F2D34F`.
- Navy data series: `#203A5B`; orange secondary series: `#EB791D`; teal tertiary series: `#20A89C`.
- Compact, heavy/condensed display headings and clean, readable body text.
- Grayscale halftone construction imagery with selective yellow, navy, orange and teal accents.
- Light mode only for this dashboard. Do not add a dark theme as part of this implementation.

## 2. Locked desktop hierarchy

1. **Sticky topbar**: compact SHRAMIK mark/wordmark and descriptor on the left; global search; region selector; notification icon; user profile on the right.
2. **Left navigation rail**: Dashboard (active, yellow fill), Demand, Supply, Skill Gaps, Forecasts, Emerging Skills, Scenario Simulator, Reports; divider; Data Sources and Data Quality; construction-worker illustration at the bottom; short mission note.
3. **Hero band**: breadcrumb; “India’s Labour Market at a Glance” title and yellow underline on the left; construction-worker / industrial illustration and yellow sticky-note motif on the right.
4. **Four KPI cards in a single row**: Total Labour Demand, Total Labour Supply, Overall Skill Gap, Emerging Skills. Each card keeps its icon, compact label, primary value, change/context line, sparkline, and small open/detail affordance.
5. **Middle row in two columns**: Demand vs Supply Trends (wider, left) and Regional Intelligence (right). Trend panel has a compact period select and legend. Regional panel has map area, high/medium/low legend, top-five state list, and a single yellow CTA.
6. **Bottom row in three equal panels**: Emerging Skills, Skill Gaps by Sector, Occupation Forecasts. Keep each panel compact with five rows and bars/deltas.
7. **Small methodology/demo note** below the cards, not a new analytics section.

## 3. Non-negotiable rules

- Do not add additional dashboard panels or enlarge the amount of information above the approved density.
- Do not reorder the sections or change the two-column middle row / three-column bottom row at desktop sizes.
- Keep the dotted background fixed and consistent across routes. Individual cards must not create a new dotted pattern.
- Only decorative artwork may use parallax. Cards, charts, buttons, text, forms and navigation must not float or shift independently.
- Avoid large gradients, glassmorphism, dark-mode surfaces, excessive pills, excessive motion, or generic purple/blue SaaS styling.
- Keep the logo mark compact; do not scale the logo to hero-art proportions.
- Keep all dashboard text and numbers as HTML/data, not embedded in images.
- Keep the artwork as decoration; don't use a generated image to claim geographic/statistical accuracy.
- Do not invent or silently preserve illustrative metrics as real SHRAMIK findings.

## 4. Parallax and scroll behavior

- Dotted canvas remains viewport-fixed.
- Hero worker / skyline artwork shifts subtly at roughly 12% of scroll distance, capped to a small offset; the content itself uses normal document scrolling.
- Sidebar artwork may have a slight independent parallax only if performance remains smooth; it must not affect the navigation hit areas.
- Disable parallax under `prefers-reduced-motion: reduce` and on small screens if it causes clipping or jitter.
- Avoid scroll-jacking, large depth movement, and animation that interferes with chart reading.

## 5. Responsive adaptation is allowed; hierarchy changes are not

- Desktop (>= 1200px): 4 KPI cards in one row, two middle panels side by side, three lower panels in one row.
- Tablet (621–980px): collapse the sidebar behind a menu; use a 2×2 KPI grid; place the two middle panels vertically; bottom panels may flow to 2 columns, with the third below.
- Mobile (<= 620px): compact header; 2×2 KPI grid; stack analytical panels in order; keep text legible; no horizontal page overflow.
- The responsive layouts preserve the same section order and visual language; they do not introduce a new dashboard design.

## 6. Data truth and accessibility

- Every visual figure in the starter is a placeholder. Replace with validated, dated, source-backed indicators before any real use.
- Replace the illustrative India map with real state-boundary geometry if it communicates data. Keep the legend/value mapping aligned with the underlying data.
- Ensure semantic heading order, labels for inputs/selects, keyboard focus visibility, meaningful alt text, and adequate contrast.
- Keep animations optional and test with keyboard-only navigation and screen readers.

## 7. Active data adapter requirement

Dashboard components must not hard-code their own production payloads or treat a toast as an implementation of an action. All data reads and mutations flow through `LabourMarketDataAdapter` (`src/api/contracts.ts`). `MockLabourMarketDataAdapter` enables local interaction preview and marks all values `mock`. `RestLabourMarketDataAdapter` calls the `/api/v1` contract when `VITE_SHRAMIK_API_BASE_URL` is set, while the optional `dataAdapter` prop allows the host application to inject an authenticated adapter. API failures must remain visible; there is no silent REST-to-mock fallback.

The main interaction/data bindings are defined in `SHRAMIK_COMPONENT_INVENTORY.md`, and response schemas are documented in `docs/API_CONTRACT.md`. The current map asset remains decorative and cannot represent regional metrics.
