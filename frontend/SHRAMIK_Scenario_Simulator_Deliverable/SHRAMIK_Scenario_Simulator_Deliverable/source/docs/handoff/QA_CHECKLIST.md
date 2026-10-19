# Scenario Simulator — QA Checklist

## Visual / shared shell
- [ ] Reuses canonical Dashboard topbar and sidebar; `Scenario Simulator` is active.
- [ ] Sidebar labels/order/width/icons/row heights/worker illustration match the live shared component.
- [ ] Global dotted CSS canvas and design tokens are reused.
- [ ] Page does not use generated screenshot as DOM/background UI.
- [ ] Layout proportions follow the primary reference; lower board images are alternate views, not stacked pages.

## Input behaviour
- [ ] Skill View / Occupation View loads options with stable identifiers.
- [ ] Search is debounced/cancellable and handles no results/errors.
- [ ] Additional annual seats number input and slider stay synchronized.
- [ ] Supported limits and steps come from the adapter/model; invalid values are reported rather than silently clamped.
- [ ] Training lag has a visible unit; conversion to months is explicit and tested if required.
- [ ] Intervention start year and evaluation year remain distinct.
- [ ] Geography/sector/entity compatibility is validated.
- [ ] Reset behaviour is specified and tested.
- [ ] Inputs persist after API/model failure.

## Run lifecycle
- [ ] Idle, validating, submitting, queued/running, succeeded, succeeded-with-warnings and failed states behave correctly.
- [ ] Duplicate run submit is blocked.
- [ ] Changed draft input marks old results stale.
- [ ] Stale outputs are not presented as matching the new draft.
- [ ] Retry is available only where meaningful.
- [ ] Older asynchronous responses cannot overwrite a newer run/scope.
- [ ] REST failure never silently falls back to mock data.

## Calculation semantics
- [ ] Training intervention is labelled as additional annual seats.
- [ ] For supply-only interventions, baseline and scenario demand remain identical unless a supported demand-side effect is explicitly modeled.
- [ ] Scenario supply changes only per backend result and documented lag/conversion assumptions.
- [ ] Seats are not treated as one-to-one new workers.
- [ ] Gap sign convention is consistent: demand minus supply; positive shortage, negative surplus.
- [ ] Incompatible metric pairs never produce a shortage card/ratio.
- [ ] Gap-reduction percentages handle zero/surplus baselines appropriately.
- [ ] Confidence/uncertainty bands render only with supported backend fields.

## Results views
- [ ] Overview, Regional Impact, Sector Breakdown, Occupation Impact and Sensitivity Analysis are internal tabs/views on one page.
- [ ] Only selected view content is visible at once.
- [ ] Results are keyed to one simulation run ID and explicit evaluation year.
- [ ] Map uses real geometry and canonical geography codes; no-data regions remain distinct.
- [ ] Regional map and table use the same response and filters.
- [ ] Sensitivity curves come from a backend/mock service result, not arbitrary frontend interpolation.
- [ ] Run/model/provenance/limitations metadata are visible.

## Accessibility / responsive
- [ ] Keyboard-only controls, visible focus, correct tab semantics and field-error focus.
- [ ] Colour is not the only shortage/surplus signal.
- [ ] Chart has accessible value table or summary.
- [ ] Map has an equivalent region list/table for keyboard users.
- [ ] Reduced motion respected; no parallax/scroll-jacking.
- [ ] Tested at 320, 390, 768, 1024 and 1440 px; no page-level horizontal overflow.

## Reporting
- [ ] Actual `npm run build`/typecheck/test commands and results documented accurately.
- [ ] Do not claim browser validation if no browser test was actually run.
- [ ] Remaining backend dependencies are listed clearly.
