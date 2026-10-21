# SHRAMIK Data Sources — Sidebar and Shared Shell Consistency Lock

**Decision:** Data Sources is one canonical sidebar destination. Overview, Ingestion History, Data Coverage and Field Mapping are internal source-detail tabs, not new top-level routes.

## Canonical navigation order

Use the existing application shell and the dashboard reference as the authority for exact widths, spacing, icons and typography. Do not redraw or resize the shell in this page.

1. Dashboard
2. Demand
3. Supply
4. Skill Gaps
5. Forecasts
6. Emerging Skills
7. Scenario Simulator
8. Reports
9. Divider
10. Data Sources — **active**
11. Data Quality

Do not add `User Management`, `Settings`, `Access Requests` or other top-level destinations based on generated visuals. These require a separate, explicit product decision.

## Visual system

Use the approved Civic Intelligence system: warm canvas `#F7F6F0`, white/warm-white surfaces, ink `#171717`, muted text `#62625C`, border `#292929` / `#D8D6CD`, yellow accent `#F2D34F`, navy `#203A5B`, orange `#EB791D`, teal `#20A89C`, restrained use of offsets/shadows, and the dotted background from CSS. Prefer global design tokens over page-level literals.

## Use of references

- `reference/SHRAMIK_Dashboard_Reference.png` controls the shared shell.
- `reference/SHRAMIK_Data_Sources_Reference.png` guides page content composition only.
- If they conflict, use the dashboard reference and the global design system for the shell, and adapt page content accordingly.

The source details panel should be a drawer/overlay at responsive sizes. It must not permanently crush the registry on medium/small screens just to match a static screenshot.
