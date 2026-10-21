# SHRAMIK Sidebar & Shared Shell Consistency Lock

**Decision:** Forecasts & Early Warnings must reuse the existing SHRAMIK Dashboard shell. Do not implement a page-specific topbar or sidebar.

## Canonical sidebar order

1. Dashboard
2. Demand
3. Supply
4. Skill Gaps
5. **Forecasts — active item on this page**
6. Emerging Skills
7. Scenario Simulator
8. Reports
9. Divider
10. Data Sources
11. Data Quality

The Forecasts page heading may read `FORECASTS & EARLY WARNINGS`; the sidebar label remains `Forecasts`.

## Reuse unchanged

- Existing shell component and the exact width/height/padding/gap values it already implements.
- Sidebar typography, icon family and icon box sizes, row height, row spacing, active yellow highlight, border, focus treatment, worker illustration and mission note.
- Global topbar: brand lockup, search, region/context selector if provided by the existing shell, notifications, and user profile.
- Shared global background/canvas, dotted texture, design tokens, button/select styles, focus rings, card radius and border/shadow rules.
- Existing responsive collapse behaviour and breakpoints.

## Do not do this

- Do not derive a new sidebar width from the forecast screenshot.
- Do not add Risk Radar, Scenarios, Performance or Alerts to the global sidebar; they are tabs/views inside Forecasts.
- Do not introduce Data Explorer, User Management, Access Requests or Settings into the sidebar unless the owner separately approves a global navigation change.
- Do not duplicate shared components into the page folder just to restyle them.
- Do not replace the fixed global dotted canvas with per-card backgrounds.

## When implemented

The page's internal tabs should use the global design system's tab/segmented-control pattern. Forecasts is highlighted in the shared sidebar; the selected internal view has its own accessible tab state. If the existing app exposes an `onNavigate` callback, use that convention for internal links. Otherwise expose only the page module and document its route integration requirements.
