# SHRAMIK shared shell / sidebar consistency lock

**This document is mandatory for the Emerging Skills Intelligence page and its five internal views.**

## Authority order

1. Existing SHRAMIK Dashboard implementation/shared shell and its actual tokens.
2. `SHRAMIK_GLOBAL_DESIGN_SYSTEM.md`.
3. `SHRAMIK_DASHBOARD_SPEC.md` and shared component inventory.
4. Emerging Skills page-specific spec.
5. Concept images, which illustrate layout only.

## Preserve exactly

- Shared topbar implementation, logo mark/wordmark dimensions, search, notification and profile controls.
- Sidebar component, width, collapsed/drawer breakpoints, row heights, icon sizes, spacing, section separator, typography, hover/focus/active state and worker/mission artwork treatment.
- Canonical navigation order from the existing Dashboard: Dashboard; Demand; Supply; Skill Gaps; Forecasts; Emerging Skills; Scenario Simulator; Reports; separator; Data Sources; Data Quality. If the running repository has an authoritative canonical label/route slightly different from this documentation, reuse the repository's source of truth rather than inventing a second variant.
- Global dotted canvas is a CSS pattern and remains visually constant across pages.
- Existing card, form, select, table, badge, tooltip, drawer, toast and chart primitives/tokens.

## Active item

Highlight **Emerging Skills** as the active sidebar item. Do not add Overview, Skill Momentum, Occupation Connections, Regional Signals, Profiles, Compare, Watchlist or Alerts as new global sidebar items. These are internal views, panels or actions on the Emerging Skills page.

## Content-area constraints

- Implement only the page content module when integrating. The host app provides the shell.
- The visual reference contains repeated mini shells because it is a design board. Do not stack/clone the shell in the real application.
- A preview-only wrapper can simulate the shared shell for isolated development, but must not be imported into production route composition.
- Do not alter sidebar dimensions to fit the page body; make the content responsive within the existing shell.
