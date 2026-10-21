# SHRAMIK Reports — Data Semantics and Truthfulness Rules

## Provenance states

- `SOURCE_BACKED`: directly from an authorised source dataset or validated official output.
- `DERIVED`: computed from identified source-backed inputs using a documented method.
- `MIXED`: includes more than one provenance state; specify which content is affected.
- `SYNTHETIC_DEMO`: deterministic mock data used only for UI implementation/testing.
- `NOT_AVAILABLE`: absent or insufficient information.

## Required metadata

Each report should carry report ID/version, creation time if known, scope, period, reference year, section selection, source snapshot IDs, template version, metric definitions/units, data provenance, methodology/model versions where applicable, coverage and limitations.

For each metric or chart series, include metric code/definition, unit, temporal basis, reference period, geography, value, quality status, source/lineage reference and applicable uncertainty. Timestamps must come from the backend; don't invent freshness.

## Rules

- Don't equate a missing value with zero.
- Don't mix metrics with incompatible units or semantics.
- Don't describe an estimate as observed fact; label forecasts and scenarios explicitly.
- Don't write recommendations as data facts. They must be supported by source findings and clearly identified as analysis, or omitted.
- Don't silently mix synthetic fixture and source-backed data. The demo label must travel with preview, print and CSV exports.
- Source coverage and quality are content, not decoration. Include unavailable/limited-data notes when a chosen section has insufficient evidence.
- Report generation must use a frozen snapshot/config/template version, so a previous report does not change silently when source data updates.
- Do not imply official agency endorsement or use official seals/logos that are not approved.
