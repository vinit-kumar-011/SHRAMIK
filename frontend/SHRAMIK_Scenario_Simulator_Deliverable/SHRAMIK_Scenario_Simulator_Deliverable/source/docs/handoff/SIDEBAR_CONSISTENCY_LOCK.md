# SHRAMIK Shared Shell & Sidebar Consistency Lock

**Decision:** Scenario Simulator must reuse the canonical Dashboard shell. The Scenario Simulator mockup is authoritative only for page content, not for redesigning the sidebar/topbar.

## Canonical navigation order

1. Dashboard
2. Demand
3. Supply
4. Skill Gaps
5. Forecasts
6. Emerging Skills
7. **Scenario Simulator — active on this page**
8. Reports
9. Divider
10. Data Sources
11. Data Quality

Do not copy extra Settings, Data Explorer, User Management or Access Requests entries from generated concepts into the global sidebar unless a separate global navigation decision approves them.

## Reuse, do not recreate

- Use the existing shell/layout component, sidebar, topbar, brand lockup, global search, notifications, profile menu, dotted canvas, and lower worker illustration.
- Keep current widths, row heights, icon size/stroke, font sizes, padding, gutters, border styles, active-yellow treatment and responsive breakpoints exactly as implemented in the canonical components.
- If no source component exists yet, use the Dashboard reference and global design tokens, then create a reusable shared component rather than a Scenario-specific duplicate.
- Page title: `SCENARIO SIMULATOR`. Sidebar item: `Scenario Simulator`.
- Do not use the generated image as the shell implementation.
