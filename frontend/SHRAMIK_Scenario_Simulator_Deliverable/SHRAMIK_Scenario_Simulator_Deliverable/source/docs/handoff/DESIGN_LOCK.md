# Scenario Simulator — Design Lock

## Intent

Scenario Simulator is an intervention-planning workspace. It should feel different from the overview/insight pages: controls explain the intervention, results explain the consequences, and alternate result views support deeper analysis.

## Visual source of truth

- `reference/scenario-simulator-design-board.png`: overall reference board.
- `reference/scenario-simulator-primary-layout.png`: primary page hierarchy and first-run interaction.
- `reference/results-overview-reference.png`, `sector-impact-reference.png`, `sensitivity-analysis-reference.png`: alternate results views. These are separate states/views, not three panels to stack below the primary page.
- `reference/SHRAMIK_Dashboard_Reference.png`: authoritative source for shared shell dimensions, topbar, sidebar, dotted canvas and worker artwork placement.
- `SHRAMIK_GLOBAL_DESIGN_SYSTEM.md`: design tokens and interaction standards.

## Locked visual principles

- Warm dotted canvas: use the global CSS background token/pattern, not a raster screenshot.
- Same compact SHRAMIK wordmark, topbar, search, notification and profile controls as the existing app.
- Same sidebar component, navigation order, width, row heights, icon sizes, selected style and lower worker/mission artwork.
- Display font and body font must come from the global design system; do not import one-off font stacks.
- Warm white cards, thin dark outlines, modest radius, sparse hard-offset shadows and restrained yellow action/highlight colour.
- Navy/blue can represent demand or primary series, orange/teal can distinguish supply/secondary series, and semantic warning colours must retain clear labels; never rely on colour alone.
- No extra decorative panels or extra KPI cards beyond the approved four outcome KPIs.
- Hero artwork is decorative only. Do not bake charts, numbers, filters or the map into a PNG.
- No parallax or scroll-jacking inside this analytical workspace; honour reduced motion.

## Corrected simulation semantics are part of the design lock

1. Label the intervention control **Additional annual training seats**. Do not ambiguously label it as total system capacity.
2. Show the baseline capacity/assumption separately when available.
3. A training-capacity intervention changes scenario supply only after the configured training lag and modelled completion/entry assumptions.
4. Demand remains identical between baseline and scenario for a supply-side-only intervention. Change demand only when a separate, explicitly configured and supported demand-side assumption exists.
5. Show the selected result/evaluation year. The intervention start year, lag and evaluation year are separate concepts.
6. Never treat each additional seat as one additional qualified worker. Model the conversion path or show the missing assumption.
7. Results are model outputs. React must not calculate or fabricate projected values.
