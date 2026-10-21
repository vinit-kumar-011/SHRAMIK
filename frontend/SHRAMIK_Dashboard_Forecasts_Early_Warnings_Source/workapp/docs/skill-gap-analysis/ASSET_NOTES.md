# Asset Notes — Skill Gap Analysis

## Reference images included

- `reference/SHRAMIK_Skill_Gap_Analysis_Reference.png`: content layout and unique analytical composition. Use for visual comparison only; it is not an implementation or a data source.
- `reference/SHRAMIK_Dashboard_Reference.png`: authoritative shared shell and sidebar visual reference.
- `reference/SHRAMIK_Demand_Insights_Reference.png`: comparison for one sibling analytics page.
- `reference/SHRAMIK_Supply_Insights_Reference.png`: comparison for one sibling analytics page.

## Decorative assets

Prefer the existing SHRAMIK global assets from the main Dashboard package/repository (`hero-worker-industrial.png`, `sidebar-workers.png`, `industrial-skyline.png`, `accent-circles.png`, `dot-grid-accent.png`, `sticky-note-decorative.png`, if those files exist at integration time). Check actual repository paths before importing. Reuse the shared lower sidebar worker art from the shell instead of adding a second copy.

Do not use a full-page reference screenshot as a CSS background or in place of real components. Do not use a raster India map as data geography. The production state/UT map requires actual licensed GeoJSON boundaries, stable feature codes, a documented code crosswalk and data-backed choropleth shading.

Decorative hero artwork must have appropriate alternative text if meaningful; mark it decorative (`alt=""`) if it adds no new information beyond the adjacent heading/copy.
