# SHRAMIK Reports — Sidebar and Shared Shell Consistency Lock

**Decision:** Reports is one route/page. Builder, Library and Preview are internal views, not separate sidebar destinations.

## Canonical sidebar source of truth

Use the current Dashboard shell/implementation and `reference/SHRAMIK_Dashboard_Reference.png` as the authority for sidebar/topbar size, icons, font, row height, padding and active state. Do not infer dimensions from a reports design-board crop. Reuse shared components; don't rebuild or resize the shell locally.

Canonical order:
1. Dashboard
2. Demand
3. Supply
4. Skill Gaps
5. Forecasts
6. Emerging Skills
7. Scenario Simulator
8. Reports — **active**
9. Divider
10. Data Sources
11. Data Quality

Do not add Settings, Data Explorer, User Management or Access Requests based on generated mockups. The user may approve a future global navigation change separately.

## Visual-system constraints

Canvas `#F7F6F0`; cards `#FFFEFA`; muted surfaces `#F0EFE8`; main text `#171717`; outline `#292929`; muted text `#62625C`; yellow `#F2D34F`; navy `#203A5B`; orange `#EB791D`; teal `#20A89C`. Prefer global tokens over duplicated literals. The dotted canvas is CSS; worker imagery is decorative only.

## Page-specific areas

Reports content may use a split Builder layout, a full-width searchable Library table and a document-first Preview. None of these layouts may change the global shell. The report document itself has its own print styles and must hide application chrome when printed.
