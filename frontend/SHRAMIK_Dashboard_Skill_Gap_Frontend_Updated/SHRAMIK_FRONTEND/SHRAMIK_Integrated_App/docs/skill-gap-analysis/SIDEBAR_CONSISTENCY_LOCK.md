# SHRAMIK Sidebar and Shared Shell — Consistency Lock

This is a global product decision for the Skill Gap Analysis page and all other analytical pages.

## Canonical navigation labels/order

1. Dashboard
2. Demand
3. Supply
4. Skill Gaps — **active for Skill Gap Analysis**
5. Forecasts
6. Emerging Skills
7. Scenario Simulator
8. Reports
9. Divider
10. Data Sources
11. Data Quality

The page heading is `SKILL GAP ANALYSIS`; the sidebar label remains `Skill Gaps`.

## Mandatory reuse

- Use the existing Dashboard shared shell component and sidebar source. Do not clone JSX or create a parallel CSS implementation.
- Preserve the exact existing runtime width, collapsed state/drawer breakpoint, topbar height, logo lockup dimensions, navigation row heights, icons, label alignment, active state, lower worker illustration and mission note.
- If the width cannot be found in source, use 248 px only as an explicitly documented fallback (240–260 px acceptable during preview) and ask the team to verify after integration.
- Nav row target 44–46 px and icon 18–20 px are fallbacks only, not overrides of existing component measurements.
- Reuse shared content gutter, spacing tokens, filter heights, KPI card sizes, card radius, border, shadow and fonts.
- `Skill Gaps` uses the same yellow selected treatment as existing active items. No new accent style.
- Keep the dotted canvas as a persistent shared background; content may scroll above it. Respect reduced-motion settings.

## Not allowed

- Do not copy the skill-gap reference's drawn sidebar into production.
- Do not rename `Skill Gaps` to `Skill Gap Analysis` in the global nav.
- Do not add Data Explorer, User Management, Access Requests, Settings or other navigation entries because a generated screenshot happens to include them; the real repository shell is authoritative.
- Do not create a second topbar, brand mark, search header or profile menu.

## Source-of-truth precedence

1. Actual shared shell and components in the host repository.
2. `reference/SHRAMIK_Dashboard_Reference.png` for visual proportions.
3. `SHRAMIK_GLOBAL_DESIGN_SYSTEM.md`.
4. Skill Gap Analysis reference image for content layout only.
5. Page spec/API contract.

The Skill Gap Analysis page can have a distinct analytical main canvas (scatterplot landscape, state map, key-insight rail and gap tables). The shared shell must remain consistent.
