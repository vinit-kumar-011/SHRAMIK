# SHRAMIK Canonical Dataset — National Source & Construction Plan

**Issue:** #7 — Prepare SHRAMIK canonical sample dataset  
**Status:** National data-model reconciliation / pilot construction  
**Owner:** Lead

## 1. Purpose

Build a small, reproducible **multi-state pilot dataset** for the SHRAMIK MVP while keeping the data model national from day one.

The official SIH 2026 PS 26246 requires an LMIS that aggregates heterogeneous labour-market signals including job portals/industry hiring, NCO/NSQF-coded postings, e-Shram, NCS and government employment data; cross-references training capacity and annual seat allocation; supports national-to-district drill-down; and demonstrates at least a few pilot sectors and States.

The dataset is therefore **not Odisha-centric** and must not assume that every source provides the same grain.

See docs/data/SHRAMIK_NATIONAL_DATA_MODEL.md.

## 2. Canonical data principle

SHRAMIK separates:

1. **Source data** — exactly what a source publishes.
2. **Normalized observations** — source records mapped to common geography/taxonomy/units where defensible.
3. **Derived analytical values** — indices, aggregates, compatibility decisions.
4. **Forecasts** — model outputs.
5. **Scenario outputs** — what-if calculations.

A source observation may be:
- STATE
- DISTRICT
- DISTRICT_SECTOR
- DISTRICT_SKILL
- DISTRICT_SECTOR_SKILL

Missing dimensions remain missing. Never fabricate a skill, sector, district, NCO code, or historical period.

## 3. Official PS data ecosystem

The dataset plan treats these as source families, not as one combined table:

- **NCO/NCS job codes:** occupational/job-role taxonomy and coded demand signals where available.
- **PLFS:** labour-market context and benchmarks.
- **e-Shram:** worker/supply context where public data supports the required use.
- **NCS / job portals / industry hiring:** demand signals where public/approved data is available.
- **Government employment databases:** vacancy and employment-market signals.
- **Training/skill systems:** training capacity, seats, enrolment, completion and placement/supply-pipeline signals.
- **Hackathon dummy data:** evaluation/demo input explicitly anticipated by the PS.

Each dataset gets a source_id, retrieval metadata, observed grain/capability, signal type, units, and provenance.

## 4. National reference dimensions

### Geography

Use state/UT codes and official LGD district codes where district-level data exists.

### Occupation / skill

Use NCO/NCS codes where available and NSQF/QP/NOS mappings where actually supplied by training data.

Every mapping records:
- mapping_method: OFFICIAL_CROSSWALK / MANUAL / INFERRED
- mapping_confidence: HIGH / MEDIUM / LOW
- mapping_source_id
- mapping_note

### Sector

Sector mappings must be explicit and traceable. Do not assign a sector merely because a skill name sounds related.

## 5. Source capability registry

Before a source is loaded into the canonical dataset, record:
- source_id
- source name/publisher
- canonical URL
- state scope, if state-specific
- signal type
- observed grain
- taxonomy
- period coverage
- unit
- flow/stock semantics
- geography coverage
- occupation/skill coverage
- retrieval/hash metadata
- parser/transformation version

This registry is the gate between source discovery and analytical ingestion.

## 6. Pilot scope

The PS asks for **a few pilot sectors and States**, not nationwide production coverage during the hackathon.

Select a small set of States based on:
- source accessibility
- reproducibility
- useful signal diversity
- taxonomy compatibility
- ability to demonstrate the national adapter architecture

Odisha may remain one pilot because its official employment/skill sources have already been audited, but it is no longer the mandatory geography.

A second/third state should be added when an official/public source can be reproduced without creating a new core schema.

Select 2–4 sectors only after verifying source coverage. The pilot must be small enough to validate end-to-end.

## 7. Demand signals

Candidate demand signals:
- NCS/job postings
- industry hiring signals
- notified vacancies
- government employment-market demand
- other approved/public labour-demand signals

Record the exact demand_signal_type.

A District × Year demand signal can support district-level context/forecasting only. It cannot be redistributed across skills without source evidence.

An occupation/NCO-coded demand signal can support skill/occupation-level forecasting when geography and time are also compatible.

## 8. Supply signals

Candidate supply signals:
- e-Shram worker/supply context
- training capacity
- annual seat allocation
- enrolment
- training completion
- placement outcomes
- other validated supply proxies

Record the exact supply_signal_type.

Training capacity, enrolment and completions remain separate measures. They must not automatically be treated as current employed supply.

## 9. Demand-supply compatibility

A gap is eligible only when the selected demand and supply signals are compatible on:
- unit
- flow/stock semantics
- time basis
- geography
- occupation/skill scope

If not compatible:
- preserve both signals
- record gap_eligible=false
- record gap_eligibility_reason
- do not fabricate a shortage

Vacancies versus annual training completions are, unless a stronger source definition exists, a **skill-pipeline pressure indicator**, not a literal labour-force shortage.

## 10. Provenance and demo data

### OFFICIAL

Only source-backed observations may be used.

### DEMO

The hackathon dummy dataset and explicitly generated synthetic records may be used to demonstrate the complete pipeline.

Synthetic data must never:
- be presented as government observations
- increase official history coverage
- determine production thresholds
- silently replace missing official evidence

Series provenance must distinguish:
- SOURCE_BACKED
- SYNTHETIC_DEMO
- MIXED_PROVENANCE

## 11. Historical periods

MVP analytical period: **YEAR (YYYY)**.

Do not convert annual source data into fabricated months or quarters.

Non-contiguous observations are allowed for history counting, but missing years remain missing.

## 12. Minimum-history validation

The current ML contract uses MIN_FORECAST_HISTORY = 3 as a provisional floor.

Before finalizing it, report source-backed coverage separately from demo coverage:
- source-backed series with 1/2/3/4/5+ usable years
- synthetic series with the same counts
- mixed-provenance series
- coverage by State and source capability

Only source-backed history can justify the final official-history threshold.

## 13. MIN_FORECAST_DEMAND

Select the final demand floor only from semantically valid source-backed demand quantities.

Synthetic generator ranges must never determine this threshold.

If source-backed data is too sparse to justify a value, leave it provisional and document the limitation.

## 14. Reproducibility

For every source resource record:
- source_id
- canonical_url
- retrieval_timestamp
- content identifier/path
- SHA-256
- publication date when known
- retrieval status
- parser/version
- transformation version

For synthetic generation record:
- generation_run_id
- generator name/version
- random seed
- parameters
- generation timestamp
- rationale

No manual spreadsheet edits may be the only way to reproduce the canonical dataset.

## 15. Acceptance criteria

The dataset build is ready for backend/ML consumption when:
- the national canonical model is documented
- at least a small multi-state pilot is selected or a clear source-backed pilot limitation is documented
- source capability/grain is recorded
- NCO/NCS/NSQF/LGD mappings are explicit where used
- source-backed and demo observations are separable
- provenance/retrieval hashes are recorded
- observations pass validation
- incompatible demand/supply signals are not forced into gaps
- the pipeline can be rerun reproducibly
- backend/ML developers can consume the output without inventing missing fields

**Important:** the old Odisha-only District × Sector × Skill × Year assumption is retired. The national canonical model is the authoritative target.