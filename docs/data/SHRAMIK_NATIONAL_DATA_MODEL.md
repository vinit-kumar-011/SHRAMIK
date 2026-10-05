# SHRAMIK National Data Model & Ingestion Contract

**Authority:** SIH 2026 Problem Statement 26246 + SHRAMIK architecture/data contracts  
**Status:** Authoritative national data-model addendum  
**Purpose:** Prevent state/source-specific data assumptions from leaking into backend, ML, or frontend implementation.

## 1. Problem-statement alignment

SHRAMIK is a national Labour Market Intelligence System. The prototype must aggregate heterogeneous labour-market signals rather than assume one source or one state publishes a complete common dataset.

The official PS names:
- NCO/NCS job codes
- PLFS reports
- e-Shram public datasets
- NCS/government employment data
- job portals and industry hiring signals
- training capacity and annual seat allocation
- dummy data for hackathon evaluation
- pilot coverage across a few sectors and States

Therefore **Odisha is a pilot/source adapter, not the canonical data model**.

## 2. Core architecture

```
State / National Source
        ↓
Source Adapter
        ↓
Raw Source Record
        ↓
Validation + Normalization
        ↓
NCO/NCS + NSQF mapping where applicable
LGD geography mapping
Sector mapping
        ↓
Canonical Observation
        ↓
Demand / Supply Engines
        ↓
Skill-level Forecasts
        ↓
District / State / National Rollups
```

The core analytical engine must not contain state-specific parsing logic.

## 3. Canonical observation model

The canonical observation model is **capability-aware**. A source may provide different analytical grain.

Required dimensions when the source supports them:

- state
- district / LGD geography
- sector
- skill/job role
- NCO/NCS code
- period
- signal type
- value
- unit
- source
- provenance
- mapping metadata

Not every observation must populate every dimension.

Examples of valid source grain:

- District × Year
- District × Sector × Year
- District × Skill × Year
- District × Sector × Skill × Year
- State × Skill × Year

Missing dimensions mean the source does not provide that resolution. They must remain NULL/absent and must never be fabricated.

## 4. Analytical capability levels

Each normalized source/series should expose its supported grain/capability, for example:

- STATE
- DISTRICT
- DISTRICT_SECTOR
- DISTRICT_SKILL
- DISTRICT_SECTOR_SKILL

This metadata controls what downstream analytics may consume.

A District × Year vacancy series can support district-level demand forecasting/context, but it cannot be silently converted into District × Skill demand.

A District × Skill × Year demand series can support skill-level forecasting.

## 5. State adapters

Each state/source adapter is responsible only for source-specific extraction and mapping.

Example:

```
ingestion/
  common/
    validation
    provenance
    nco_mapping
    lgd_mapping
    sector_mapping
  states/
    odisha/
    karnataka/
    maharashtra/
```

Adding a state must not require changes to:
- forecast algorithms
- gap formulas
- API response semantics
- frontend components

unless the canonical contract itself changes.

## 6. National taxonomies

### NCO / NCS

NCO/NCS identifiers are national occupational/job-role anchors.

Retain source codes and taxonomy version. Never invent an NCO/NCS code.

### NSQF / QP / NOS

Retain these mappings where the training source actually provides them.

Mappings must record:
- method: OFFICIAL_CROSSWALK / MANUAL / INFERRED
- confidence: HIGH / MEDIUM / LOW
- source
- note

### LGD

Use official LGD codes for administrative geography.

State-specific district names are normalized through the LGD mapping layer.

## 7. Source roles

Sources do not all need to provide the same signal.

| Source family | Typical role |
|---|---|
| NCS / job portals / industry hiring | labour-demand signals |
| e-Shram | worker/supply context |
| PLFS | labour-market context/benchmarks |
| training systems / ITIs / skill schemes | training capacity, enrolment, completion, supply pipeline |
| government employment databases | vacancy/employment-market signals |
| NCO/NCS/NSQF | taxonomy and crosswalks |
| hackathon dummy data | evaluation/demo input |

The actual role is recorded per dataset/signal. Do not assume a source contains a field it does not provide.

## 8. Forecasting boundary

The MVP detailed forecast record remains District × Skill × Forecast Period so that the existing API/ML contract remains stable.

Broader PS-required views are produced through deterministic rollups:

- District intelligence → aggregate supported skill forecasts
- State intelligence → aggregate district results
- National intelligence → aggregate state/district results

A source that only supports district-level demand can be shown as district-level context and forecasted at that level only if the forecasting contract is explicitly extended. It must not be joined to skill supply and called a skill shortage.

## 9. Gap eligibility

Demand and supply are compared only when unit, flow/stock semantics, time basis, geography, and occupation/skill scope are compatible.

If they are not compatible:
- preserve both signals
- expose the incompatibility
- do not fabricate a gap

This is especially important when combining job vacancies with training completions.

## 10. Official vs demo

OFFICIAL:
- only source-backed observations
- no synthetic history
- provenance_state = SOURCE_BACKED

DEMO:
- may use the hackathon dummy dataset and explicitly generated demo records
- provenance is visible
- synthetic data never becomes evidence of real national coverage

The hackathon dummy dataset is an input adapter target, not a reason to hard-code a dummy schema into the core.

## 11. Pilot strategy

The prototype should cover a **few States and sectors**, as required by the PS.

State selection is an implementation/demo decision. It must not change the national schema.

A pilot may contain Odisha plus other states if their official/public sources are useful, but the architecture remains national.

## 12. Non-negotiable rules for implementation

1. Never hard-code Odisha into shared models.
2. Never assume every state has the same source fields.
3. Never invent missing skill/NCO/sector dimensions.
4. Never treat a state-specific parser as the canonical data model.
5. Preserve source grain and provenance.
6. Normalize through explicit mappings.
7. Keep raw/source, normalized, derived, and forecast data distinguishable.
8. Keep source-backed and synthetic/demo data distinguishable.
9. Use NCO/NCS/NSQF/LGD mappings where actually supported.
10. Make source capability/grain explicit before an analytical engine consumes a series.

## 13. Implementation order

Before backend data models are finalized:

1. approve this national data model
2. reconcile Issue #2 database schema
3. reconcile Issue #7 canonical dataset plan
4. reconcile Issue #9 ingestion pipeline
5. implement Issue #8 database
6. implement source adapters/ingestion
7. implement demand/supply engines
8. implement forecasting and rollups

**Backend developers must not implement the old Odisha-only District × Sector × Skill × Year assumption.**
