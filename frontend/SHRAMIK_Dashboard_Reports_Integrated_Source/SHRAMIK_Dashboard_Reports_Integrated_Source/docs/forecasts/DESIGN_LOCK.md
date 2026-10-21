# Forecasts & Early Warnings — Design Lock

## Source-of-truth order

1. Existing SHRAMIK app's shared shell, shared components and canonical tokens.
2. `SHRAMIK_GLOBAL_DESIGN_SYSTEM.md` and `SHRAMIK_DASHBOARD_SPEC.md`.
3. `reference/SHRAMIK_Dashboard_Reference.png` for shared topbar/sidebar proportions and identity.
4. `reference/Forecasts_Five_View_Design_Board.png` for Forecasts' five content-view compositions.
5. Page-specific specification, component inventory and API contract.

## What is approved

- The feature is **one Forecasts & Early Warnings page/workspace** with five internal views, not five separate app routes or sidebar entries.
- The default view is Forecast Overview.
- Internal views: Forecast Overview, Risk Radar, Scenario Analysis, Model Performance, Alert Management.
- The approved dashboard identity remains light-mode Civic Intelligence: warm off-white fixed dotted canvas, bold condensed headings, ink outlines, yellow primary accents, restrained navy/orange/teal, documentary-style industrial artwork and selective hard-offset shadows.
- The page must be designed for data clarity rather than decoration. The forecast chart and warning evidence should be the visual priority.

## What is not approved

- Do not show every view's content simultaneously. The five-view board is a design board showing alternative internal tab contents.
- Do not create separate Forecast Overview / Risk Radar / Scenario / Performance / Alerts entries in the left sidebar.
- Do not copy extra sidebar items that appear in one of the generated concept images.
- Do not treat any generated screenshot text, map shading, number, risk alert, driver contribution or model metric as valid data.
- Do not use the raster India map as a data map. Production map shading must use verified state geometry and canonical state identifiers.
- Do not add animation to chart marks/cards as decoration. Keep parallax limited to decorative artwork and respect reduced-motion.
