# Demand Insights QA Checklist

## Shared shell and sidebar
- [ ] Reuses the Dashboard's actual shared topbar and sidebar components.
- [ ] Sidebar order/labels match the dashboard reference exactly: Dashboard, Demand, Supply, Skill Gaps, Forecasts, Emerging Skills, Scenario Simulator, Reports, divider, Data Sources, Data Quality.
- [ ] `Demand` is active; page heading says `DEMAND INSIGHTS`.
- [ ] No additional sidebar items copied from the Demand Insights mock image.

## Layout and responsive behaviour
- [ ] Dotted CSS canvas persists across the page and does not impair chart/table legibility.
- [ ] Layout order remains intro, filter bar, four KPIs, trend + regional map, three lower panels, provenance/update note.
- [ ] No horizontal overflow at 1440, 1024, 768 and 390 CSS-pixel widths.
- [ ] Artwork is decorative, behind content, and respects reduced-motion preference.

## Interactions
- [ ] Draft vs applied filters are distinct.
- [ ] Apply and Reset refresh all panels under one filter snapshot.
- [ ] Map state click and keyboard activation sync the state filter and update data.
- [ ] Chart tooltip and accessible table alternative work.
- [ ] KPI, occupation and skill details open meaningful detail content.
- [ ] View All, search, retry and refresh controls are functional.

## Data integrity
- [ ] Chart uses API/adapter data, not values extracted from the image.
- [ ] Map uses verified GeoJSON and canonical state/UT codes—not a raster PNG.
- [ ] Missing/suppressed states are neutral and not coloured as the lowest value.
- [ ] Units correctly distinguish observed counts from indices.
- [ ] Provenance, source, update timestamp and supported coverage are visible.
- [ ] Failed API requests never silently fall back to mock mode.
- [ ] AI narrative numerical claims cite supporting values/source references.

## Engineering
- [ ] No second React app or duplicate shell created.
- [ ] Existing package scripts are used for typecheck/test/build.
- [ ] Test/build output is reported honestly.
