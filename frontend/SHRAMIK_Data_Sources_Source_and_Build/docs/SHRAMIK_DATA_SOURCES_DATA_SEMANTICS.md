# SHRAMIK Data Sources — Data Semantics and Display Rules

## 1. Provenance is mandatory

Every development fixture is labelled `SYNTHETIC_DEMO`. Any user-visible table/drawer containing fixture values should show a compact demo-data notice such as `Illustrative demo data — integrations not verified`. Do not label a record `SOURCE_BACKED` unless its lineage and validation are confirmed by the backend.

Allowed provenance values: `SOURCE_BACKED`, `SYNTHETIC_DEMO`, `DERIVED`, `MIXED`, `UNKNOWN`.

## 2. Do not collapse different dates

- **Reporting period:** period covered by the source dataset (e.g. annual or fiscal period). Use the exact backend-provided labels/range.
- **Source release date:** date a publisher released the relevant dataset/version; it may be unknown.
- **Last successful retrieval:** when SHRAMIK's retrieval/ingestion process last succeeded.
- **Last validation:** when this version passed applicable validation checks.
- **Last updated:** ambiguous. Avoid it unless clearly defined in the UI (prefer an explicit label).

A recent retrieval can download old source data. Retrieval recency alone does not prove source freshness.

## 3. Lifecycle vs freshness

Lifecycle indicates operational/registration state: `ACTIVE`, `PENDING_VALIDATION`, `STALE`, `FAILED`, `NOT_CONFIGURED`, `DISABLED`, `UNKNOWN`.

Freshness is a separate evaluation: `UP_TO_DATE`, `DUE_SOON`, `STALE`, `UNKNOWN`, `NOT_APPLICABLE`.

An integration may be configured but stale; it may be newly retrieved but awaiting validation. Keep these concepts separate if the backend supplies both. If only one backend status exists, do not invent the second one.

Suggested summary definitions:
- `Total sources`: count of source records in the summary scope.
- `Active`: count with lifecycle status `ACTIVE` under backend-defined criteria.
- `Needs attention`: count of `PENDING_VALIDATION`, `STALE` or `FAILED` records.
- `Not configured`: separate count; excluded from `Needs attention` by default until the product owner defines otherwise.

## 4. Coverage semantics

Coverage should identify dimensions such as geography, time, taxonomy/code systems and known gaps. It is not identical to source availability or record count. For geography, distinguish `COUNTRY`, `STATE_UT`, `DISTRICT`, `MULTI_REGION`, and `UNKNOWN` when the backend can support it. Do not claim nationwide coverage from a source name alone.

For time coverage, list actual available reporting periods and their grain. Missing history means `Not available` or a documented gap, not a zero-value observation.

## 5. Ingestion run semantics

- `QUEUED`: accepted for execution, not started.
- `RUNNING`: job has started.
- `SUCCEEDED`: job completed without warnings according to the backend's criteria.
- `WARNING`: job completed but has known warnings/partial acceptance.
- `FAILED`: job did not complete successfully.
- `CANCELLED`: job was cancelled.
- `NOT_CONFIGURED`: no runnable ingestion connector is configured.

`recordsRetrieved`, `recordsAccepted` and `recordsRejected` are different counts. A record can be retrieved but rejected during validation. Do not derive one count from another.

## 6. Mapping semantics

- `MAPPED`: accepted mapping exists.
- `NEEDS_REVIEW`: a proposed mapping exists but needs human review.
- `UNMAPPED`: no mapping configured.
- `REJECTED`: mapping or value set failed an explicit validation rule.
- `NOT_CONFIGURED`: mapping process is not set up.

A `100% mapped` claim requires a declared denominator and a backend-calculated result. Do not calculate percentages from only the visible rows in a paginated table.

## 7. Missingness and wording

Use `Not reported`, `Unknown`, `Not available`, `Not configured`, or `No runs recorded` to match the reason. Do not show `0`, `Active`, a fabricated date or a green success indicator as a generic fallback.
