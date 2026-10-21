# SHRAMIK Sidebar Consistency Lock

**Decision:** Demand Insights must use the exact same shared sidebar component and navigation structure as the approved SHRAMIK Dashboard. No page-specific sidebar variant.

## Use this approved order

1. Dashboard
2. Demand — **active item on the Demand Insights route**
3. Supply
4. Skill Gaps
5. Forecasts
6. Emerging Skills
7. Scenario Simulator
8. Reports
9. Divider
10. Data Sources
11. Data Quality

Keep the width, spacing, icon style, font, selected item treatment, lower worker image and mission note exactly consistent with the dashboard. The page heading can say `DEMAND INSIGHTS`; the existing navigation link remains `Demand`.

The Demand Insights concept screenshot added extra admin links and altered labels. Those are not approval to change the global sidebar. Specifically, do not add Data Explorer, User Management, Access Requests or Settings to this page's sidebar unless the owner separately approves a global navigation change. Reuse the existing shared sidebar and topbar component from the running SHRAMIK app.

## Source-of-truth precedence

- Dashboard image and existing shared shell: global navigation/sidebar/topbar.
- Demand Insights reference: page-specific content placement and card/chart/map composition.
- Global design system: tokens, typography, dotted canvas, interaction and motion rules.
- Demand Insights spec/API contract: data contracts and component behaviour.
