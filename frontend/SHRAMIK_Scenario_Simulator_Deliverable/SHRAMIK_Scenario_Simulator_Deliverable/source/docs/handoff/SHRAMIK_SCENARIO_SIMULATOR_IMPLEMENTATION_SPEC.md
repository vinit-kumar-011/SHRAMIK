# SHRAMIK Scenario Simulator — Implementation Specification

**Page type:** Authenticated analytical workspace  
**Intended route:** `/simulator` (confirm host routing)  
**Implementation target:** Independent React + TypeScript feature module for later app integration  
**Global design contract:** `SHRAMIK_GLOBAL_DESIGN_SYSTEM.md`  
**Visual references:** `reference/`  
**Status:** Ready for frontend implementation; API names and model assumptions require backend alignment.

## 1. Purpose

Enable planners to select a skill or occupation, configure a skilling intervention, run a scenario against an explicit baseline, and investigate the results by overview, region, sector, occupation and sensitivity.

This is not a general forecasting page. Its primary interaction is **configure → run → compare → investigate**.

## 2. Product rules

- Treat this as one sidebar page with five internal results views, not five separate pages.
- Use the existing SHRAMIK shell and shared components exactly as implemented by the main Dashboard.
- The primary view contains the intervention setup and the latest completed run/results.
- No simulation maths in React components. All production result calculations come from the backend/model service.
- For frontend development, use deterministic mock runs with visible `ILLUSTRATIVE DEMO DATA` provenance.
- A failed REST call must never silently switch to mock results.

## 3. Primary workspace layout

### A. Page heading and scope context

- Breadcrumb: `Home / Scenario Simulator`.
- Heading: `SCENARIO SIMULATOR`.
- Supporting text: `Explore how training and policy interventions could affect future skill demand and supply.`
- Scope/baseline strip: current selected skill/occupation, geography, baseline run/reference and evaluation year; only display real run metadata when supplied.
- The industrial/worker hero artwork is decorative. It must not contain UI labels that need to change with application state.

### B. Main three-step workflow

At desktop widths, keep the compact composition in the primary reference. The panels may reflow while retaining the same hierarchy.

#### Panel 1 — Select Skill / Occupation

- Toggle: `Skill View` / `Occupation View`.
- Search field with debounce, clear button, loading/no-results/error states.
- Selectable list of available canonical skills or occupations; identifiers come from the adapter.
- Selected item has a visible focus/selected treatment and stable ID.
- Selection changes invalidate old results and mark the current configuration `Modified — rerun to update results`.
- If an item has no compatible baseline, show why it cannot run and preserve the rest of the selection UI.

#### Panel 2 — Configure Intervention

Required inputs:

1. **Additional annual training seats** — numeric input plus synchronized slider; min/max/step from adapter/model limits. Default can be 0 for no additional seats. Do not call it total training capacity.
2. **Training lag** — explicit unit in years in the UI; adapter converts to integer months if that matches backend contract. Do not allow a fractional year unless the model supports it.
3. **Intervention start year** — selectable only within the supported model input window.
4. **Evaluation/result year** — explicit selected year where outcomes are summarised; separate from intervention start and the chart horizon.
5. **Geographic scope** — country/state/district only where available and supported; options come from the adapter.
6. **Baseline reference** — current approved baseline forecast/run. Show period and ID/version in details.
7. **Advanced assumptions (collapsible)** — only expose inputs that the backend/model contract actually supports (for example completion rate, certification rate or training-to-workforce-entry rate). If unsupported, do not present a working-looking control; instead show a disabled option with explanation or omit it.

Actions:
- `Reset` resets draft inputs to documented defaults, not necessarily the last-run configuration.
- `Run Simulation` validates all field and cross-field constraints, submits one request, disables duplicate submission and shows a progress state.
- Keep draft inputs when the request fails. Clear previous result data only according to documented UX; otherwise mark old results stale and visibly retain their old run timestamp/scope.

#### Panel 3 — Key Outcomes

Exactly four outcome cards for the selected evaluation year:

- Projected Demand
- Baseline Supply / Scenario Supply (render both or show scenario value with baseline comparison; title must not obscure which is which)
- Projected Skill Gap (signed shortage/surplus definition shown in tooltip)
- Gap-to-Demand Ratio (only when a comparable, valid denominator exists)

Rules:
- Render backend-returned display value, raw value, unit, delta and baseline comparison.
- No fabricated percentage-change badge. If the comparison is unavailable, show `Not available` with a short reason.
- Show `Updated from run <id>` or a run timestamp when available; show `Demo data` in mock mode.

### C. Projection chart

Title: `Demand vs Supply Projection`.

Series:
- Baseline demand (dashed)
- Scenario demand (solid or visually overlapped where identical)
- Baseline supply (dashed)
- Scenario supply (solid)
- Gap series may appear as a secondary view or tooltip, not silently share an incompatible scale.

Crucial logic:
- For a **training-capacity-only** intervention, baseline demand and scenario demand should be the same. Do not visually imply demand changed when only supply was manipulated.
- The scenario supply curve changes only when the model’s intervention lag and completion/workforce-entry assumptions permit an effect.
- Where baseline and scenario demand overlap, label that explicitly; do not offset the lines merely to make both visible.
- Forecast periods, units, bounds and uncertainty bands come from API results. Render uncertainty only when the backend supplies defined bounds.
- Legend entries are selectable accessibly; tooltips show period, value, unit and scenario/baseline status.

### D. Regional Impact preview

- A real state-boundary GeoJSON/SVG choropleth, never the generated screenshot or a flat map image.
- Colour represents a documented output metric, default `Gap reduction (%)` only if computable and comparable.
- Legend must include shortage increase/no change/reduction bands and `No data`.
- Hover/focus shows state, baseline gap, scenario gap, delta/reduction, evaluation year, quality status and provenance.
- Selecting a state filters/synchronizes the regional-impact results; it should not silently change the draft intervention scope before user confirms if that would discard a configured scenario.
- Table rows and map use the same response dataset and current evaluation year.

## 4. Result workspace — five internal views

These are alternate tabs/states, not five permanently stacked sections. The results tabs become available after a valid completed run, while the interface can show a helpful disabled/empty state before then.

### 1. Overview
- Four outcome cards.
- Demand/supply/baseline/scenario chart.
- Brief model assumption summary and provenance banner.
- Most relevant regional impact preview.
- Key caveats and run metadata.

### 2. Regional Impact
- Metric selector (gap, gap change or gap reduction where computable).
- Interactive choropleth and full region ranking table.
- Click a region to inspect baseline/scenario values, absolute change, percentage change, data quality and source/lineage metadata.
- Incompatible/missing regions display `No comparable data`, not zero.

### 3. Sector Breakdown
- Sector-level baseline versus scenario demand/supply/gap view.
- Ranked table with sector, metric values, delta, unit, evaluation year, coverage and quality status.
- Only aggregate/split dimensions supported by the backend should be enabled.

### 4. Occupation Impact
- NCO-coded occupation selector and ranked results.
- Show baseline demand/supply, scenario demand/supply, gap and gap-to-demand ratio only if valid.
- Link into relevant occupation/skill details only where routes/data exist.

### 5. Sensitivity Analysis
- Explore one or more supported input parameters over a declared range.
- Show which parameters were varied, fixed assumptions, result metric and model version.
- This is a separate analytical run or backend-supported sensitivity response, not a chart that re-scales the latest run without recomputing results.
- Clearly distinguish sensitivity analysis from a probability distribution or formal uncertainty interval.

## 5. Result status and stale-state rules

Use an explicit state machine:

`idle → validating → submitting → queued/running → succeeded | warning | failed`.

- A queued/running response is polled only if supported by the backend contract, with bounded retries/backoff and a visible status label.
- `succeeded`: show completed output and run metadata.
- `warning`: show results plus explicit quality warnings and any withheld metrics.
- `failed`: preserve inputs; show a plain-language error and retry action where meaningful.
- Any changes to scenario input after a completed run mark the current results `STALE — inputs changed; rerun to update`.
- Never show old results as if they match the new draft inputs.
- Do not claim `live`, `real-time`, or `latest` unless metadata proves that status.

## 6. Validation rules

- Require either a selected skill ID or an occupation code, according to selected mode; do not accept a display label as identifier.
- Additional annual seats must be within model-provided limits and increments.
- Training lag must be valid for the model; convert years ↔ months only at the adapter boundary.
- Start year must be supported by the baseline forecast/run window.
- Evaluation year must fall within the returned scenario horizon and occur after the relevant intervention/lag timing as defined by model semantics; do not infer a different period convention in the UI.
- Geographic scope, sector and selected entity must form a valid supported combination.
- Baseline and scenario must match units, metric definition, geography, occupation/skill scope and period before comparisons are displayed.
- If scenario output is missing or rejected, do not calculate it in the browser as a fallback.

## 7. Responsive behaviour

- Desktop ≥1200 px: selection and configuration panels on the left; outcomes/projection in the centre; regional-impact preview on the right when space permits.
- Tablet 621–1199 px: selection and configuration can be a two-column upper row; results below; regional preview stacks under the chart as needed.
- Mobile ≤620 px: single column in workflow order; sliders/numeric inputs remain usable; chart offers a scroll-safe canvas or compact layout; map and tables fit viewport; results tabs may become a horizontal scrollable tab bar with keyboard support.
- No horizontal page overflow. Keep same information hierarchy even when stacking.
- Respect `prefers-reduced-motion`; no parallax/scroll-jacking in the analytical workspace.

## 8. Accessibility

- Every slider has a visible label, numeric input partner and keyboard control.
- Colour is not the only indicator of positive/negative gap; use labels/icons/signs.
- Chart values are available as accessible tooltip/detail table or text summary.
- Map states are keyboard reachable through an equivalent region list/table; tooltip information is not hover-only.
- Tabs expose selected state and keyboard behaviour.
- Run status uses appropriate live-region feedback without announcing every chart point.
- Error messages are associated with fields, and focus moves to the first invalid input on submit.

## 9. Acceptance criteria

- Page exports as a standalone React component and can render in a harness without duplicate global shell in production mode.
- Existing sidebar/topbar/tokens are reused.
- Selection and all parameters flow through controlled typed state.
- Slider/numeric controls stay synchronized.
- A changed configuration marks current results stale.
- Run status handles idle/loading/queued/success/warning/failure and prevents duplicate submissions.
- Demand curves remain identical for supply-only interventions unless a specific demand effect is returned by the backend.
- Training seats do not equate one-for-one to workers; conversion assumptions are explicit.
- Results views consume adapter responses and are not derived by duplicating formulas in UI.
- Map uses real geometry plus structured data and has a no-data state.
- Mock provenance remains visible, including in any local export/download.
- Keyboard, screen reader, reduced-motion and desktop/tablet/mobile checks are documented.
