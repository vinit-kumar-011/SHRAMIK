# SHRAMIK Demand Insights — Frontend Handoff Bundle

This is a **specification, reference and Claude implementation prompt bundle** for the frontend team. It is not a claim that the Demand Insights React page has already been implemented in the team's repository. Use it in the existing SHRAMIK React + TypeScript codebase.

## Start here

1. Read `CLAUDE_PROMPT_DEMAND_INSIGHTS.md` and give that prompt to Claude Code while it is opened on the existing SHRAMIK repository.
2. Keep `SHRAMIK_DEMAND_INSIGHTS_IMPLEMENTATION_SPEC.md`, `SHRAMIK_DEMAND_INSIGHTS_API_CONTRACT.md`, `SHRAMIK_GLOBAL_DESIGN_SYSTEM.md`, `SHRAMIK_DASHBOARD_SPEC.md`, `SHRAMIK_COMPONENT_INVENTORY.md`, `DESIGN_LOCK.md` and `SIDEBAR_CONSISTENCY_LOCK.md` available in the repository or attach them to the Claude task.
3. Use `reference/SHRAMIK_Demand_Insights_Reference.png` for this page's panel layout and `reference/SHRAMIK_Dashboard_Reference.png` for the global dashboard shell.
4. Follow `DEMAND_INSIGHTS_QA_CHECKLIST.md` during review.

## Important sidebar decision

Demand Insights **must reuse the existing Dashboard sidebar component without redesigning it**. Its nav item is named `Demand` and is the selected item for this route. The page heading remains `DEMAND INSIGHTS`. The sidebar variant in the Demand Insights image is not authoritative for navigation.

## What is included

- Demand Insights visual reference and approved Dashboard visual reference
- Full page implementation specification
- API/JSON contract for filter options, KPIs, trend, regional state metrics, occupations, skills and evidence-backed insights
- Global design system, Dashboard specification and existing component inventory
- Sidebar consistency lock, developer prompt and QA checklist
- Supporting industrial decorative artwork (optional); `india-map-illustrative.png` is **decorative only**, not acceptable map geography

## Key implementation principle

Implement the trend chart with the application's existing chart library and implement the regional map from verified/versioned state/UT GeoJSON joined to adapter-provided metrics by canonical codes. Never use the generated screenshot or decorative map PNG as the data visualization.
