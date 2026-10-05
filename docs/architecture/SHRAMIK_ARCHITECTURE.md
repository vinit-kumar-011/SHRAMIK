# SHRAMIK Technical Architecture

**Issue:** #1 — Define SHRAMIK technical architecture and contracts  
**Status:** Review-ready architecture baseline; detailed contracts are intentionally tracked in Issues #2, #4, and #5  
**Owner:** Lead  
**Branch:** `feature/architecture-contracts`

---

## 1. Purpose

SHRAMIK is a government-oriented **Labour Market Intelligence and Skill Demand-Supply Forecasting** platform.

The system helps planners answer:

1. Where is skill demand increasing?
2. Where is supply insufficient?
3. What skills may become scarce soon?
4. How strong is the evidence behind an insight?
5. What could happen under a training intervention?

SHRAMIK is a **decision-support system**, not a job portal, resume builder, course marketplace, candidate matching platform, or individual-worker surveillance system.

The core analytical loop is:

**Detect → Explain → Simulate → Plan**

---

## 2. High-Level Architecture

```text
                         ┌──────────────────────┐
                         │     DATA SOURCES     │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ INGESTION /          │
                         │ VALIDATION /         │
                         │ NORMALIZATION        │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ EVIDENCE STORE       │
                         │ PostgreSQL/Supabase  │
                         └──────────┬───────────┘
                                    │
                 ┌──────────────────┴──────────────────┐
                 │                                     │
                 ▼                                     ▼
        ┌──────────────────┐                 ┌──────────────────┐
        │ DEMAND / SUPPLY  │                 │ HISTORICAL      │
        │ ENGINES          │                 │ SERIES          │
        │ common-unit qty  │                 └────────┬─────────┘
        │ + display index  │                          │
        └────────┬─────────┘                          ▼
                 │                           ┌──────────────────┐
                 ▼                           │ EMERGING SKILL   │
        ┌──────────────────┐                 │ DETECTION        │
        │ FORECAST ENGINE  │                 └────────┬─────────┘
        │ demand + supply  │                          │
        └────────┬─────────┘                          │
                 ▼                                    │
        ┌──────────────────┐                          │
        │ GAP ENGINE       │──────────────────┐       │
        └────────┬─────────┘                  │       │
                 ▼                            ▼       ▼
        ┌──────────────────┐         ┌─────────────────────┐
        │ CONFIDENCE +     │────────▶│ EARLY WARNING       │
        │ EVIDENCE /       │         │ ENGINE              │
        │ per result       │         └─────────────────────┘
         └──────────────────┘

         FORECAST + GAP outputs
                  │
                  ▼
         ┌──────────────────┐
         │ WHAT-IF          │
         │ SIMULATOR        │
         │ seats + lag +    │
         │ location + skill │
         └────────┬─────────┘
                 │
                 ▼
        ┌──────────────────┐
        │ FASTAPI BACKEND  │
        │ REST + business  │
        │ orchestration    │
        └────────┬─────────┘
                 │
          ┌──────┴─────────────┐
          ▼                    ▼
┌──────────────────┐  ┌────────────────────┐
│ NEXT.JS FRONTEND │  │ OPTIONAL LLM       │
│ dashboard / map  │  │ via backend        │
│ charts / pages   │  │ on demand + cache  │
└──────────────────┘  └────────────────────┘
```

### Pipeline decisions

**Data architecture note:** The official PS requires heterogeneous labour-market sources and a dashboard spanning national → state → district levels. SHRAMIK therefore uses a national canonical data model with source/state-specific ingestion adapters. Issue #7 validates a small multi-state pilot; it does not define Odisha as the product's canonical geography. See `docs/data/SHRAMIK_NATIONAL_DATA_MODEL.md`.

There are two related analytical paths after normalized historical data is available.

**Forecast / shortage path**

Historical demand/supply → forecast → gap → confidence/evidence → early warnings

**Emerging-skill path**

Historical demand/supply series → recent-vs-historical trend analysis → emerging skill status

Emerging-skill detection therefore does **not** require a forecast-gap result. It is primarily historical-series based. Data quality can still be displayed for the emerging-skill result, but the module must not pretend that it was produced from the shortage pipeline.

Confidence is computed **per forecast/gap result** for each location + skill + forecast period. Early-warning logic consumes that confidence. Low-confidence results are downgraded to watch-level behaviour where appropriate.

The What-If Simulator is **not downstream of Early Warning or Emerging Skill Detection**. It consumes the baseline forecast/gap outputs plus user-provided scenario inputs.

### Critical LLM rule

**The LLM does not calculate SHRAMIK numerical analytics.**

Numerical results come from the data, analytical engines, forecasting code, and deterministic business rules.

The LLM is called **through the FastAPI backend**, receives structured results, and explains them in human-readable language. It is optional and must never block the core analytical experience.

---

## 3. Technology Decisions

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js + React + TypeScript | Main web application |
| Styling | Tailwind CSS | Consistent UI styling |
| UI components | shadcn/ui | Reusable accessible components |
| Charts | Recharts | Forecasts, indices, trends |
| Maps | Leaflet / React-Leaflet | Geographic intelligence |
| Backend | Python + FastAPI | REST API and orchestration |
| Data processing | Pandas + NumPy | Cleaning and analytical transformations |
| ML | scikit-learn / suitable classical forecasting | Forecasting and modelling |
| Database | PostgreSQL / Supabase | Structured evidence and application data |
| AI | LLM API | Explanation and planning briefs only |
| Frontend hosting | Vercel | Web deployment |
| Backend hosting | Render / Railway or equivalent | Python API deployment |
| Source control | Git + GitHub | Collaboration and release management |

### Forecasting baseline

The first forecast implementation must be unambiguous:

**Baseline = naïve last-value forecast**

The baseline predicts the next period using the most recent observed value.

A more suitable transparent model, such as exponential smoothing or linear trend, may then be evaluated against that baseline.

With short yearly series, the naïve baseline may legitimately perform as well as or better than the alternatives. **Keeping the naïve baseline is an acceptable MVP outcome** when evaluation does not show a reliable improvement from a more complex method.

Do not jump directly to XGBoost, LSTM, Transformers, or other complex models. Complexity is justified only if the data and time-aware evaluation show a meaningful improvement.

### Architecture principle

Use the **simplest technology that reliably solves the problem**.

Do not introduce microservices, Kubernetes, blockchain, a custom LLM, or deep-learning models unless a later engineering decision proves they are actually needed.

---

## 4. Major Modules

### 4.1 Data Ingestion

Responsible for a **national, source-agnostic ingestion layer**.

Pipeline:

**Source → adapter → validation → normalization → taxonomy/geography mapping → provenance → canonical observations**

The system must support heterogeneous source grain. A source may provide State, District, District × Sector, District × Skill, or District × Sector × Skill observations. Missing dimensions remain missing; the ingestion layer must never fabricate a skill, sector, or geography merely to satisfy an analytical key.

State/source-specific parsing belongs in adapters and must not leak into shared analytics, database semantics, or API code.

The hackathon dummy dataset is another adapter/input source, not a special hard-coded database schema.

It must preserve the distinction between:

- raw source data
- cleaned/normalized data
- canonical observations
- derived analytical values
- model forecasts

### Skill taxonomy

Skill/job-role mapping must use an explicit, documented taxonomy.

For MVP, the ingestion design should be **NCO/NSQF-aligned**:

- NCO-style occupation/job-role codes can anchor occupational classification.
- NSQF-aligned information can be retained where training/qualification data requires skill or qualification-level mapping.
- The exact code set, mappings, crosswalks, and fallback rules are finalized in **Issue #9 (data ingestion)**.

The team must not silently invent skill names or map unrelated job titles without recording the rule.

---

### National data model

The authoritative ingestion/canonicalization rules are defined in `docs/data/SHRAMIK_NATIONAL_DATA_MODEL.md`.

National reference dimensions include state, LGD district, sector, NCO/NCS occupation/job role, and NSQF/QP/NOS mappings where actually available. Source capability/grain is recorded explicitly.

The detailed forecast contract remains skill-level for MVP stability. National/state/district/sector dashboard views are deterministic rollups of supported analytical results; aggregate source signals must not be falsely joined to skill-level supply.

### 4.2 Evidence Store

The database is the system's persistent source of structured evidence.

Core entities include:

- locations
- sectors
- skills / job roles
- demand observations
- supply observations
- forecasts
- sources
- evidence records
- model metadata

Every important derived result should be traceable to relevant source/evidence metadata.

---

### 4.3 Demand Engine

Produces a **Demand Index** from available demand-side signals, while preserving a common-unit demand quantity for forecasting and gap analysis.

For the MVP, the preferred analytical unit is:

**worker/position headcount**

Examples:

- observed demand = number of relevant positions/openings in a period
- forecast demand = expected number of positions/openings in a future period

The Demand Index is a normalized display/ranking indicator. It is **not** the unit used by the Gap Engine.

The engine must:

- use only signals that actually exist in the dataset
- preserve underlying raw quantities
- document normalization/weighting assumptions
- produce reproducible results

No LLM-generated numbers.

---

### 4.4 Supply Engine

Produces a **Supply Index** from available supply-side signals, while preserving a common-unit supply quantity for forecasting and gap analysis.

For the MVP, the preferred analytical unit is **worker headcount**, using the same conceptual unit as demand wherever the data supports it.

The Supply Index is a normalized display/ranking indicator. It is **not** the unit used by the Gap Engine or simulator.

Examples of supply signals may include:

- trained workforce counts
- training completions
- available trained workforce indicators
- other validated supply proxies

The exact signal set is determined by the canonical dataset.

---

### 4.5 Forecast Engine

Produces future demand/supply estimates in the **same common analytical unit** used by the Gap Engine.

Requirements:

- begin with the naïve last-value baseline
- use time-aware validation
- avoid future-data leakage
- use a configurable forecast horizon
- record the model/version used
- handle insufficient history explicitly
- report uncertainty where supported by the model

### Data sparsity rule

Government and platform labour-market data may be:

- annual rather than monthly
- available at different geographic levels
- available at different occupation/skill levels
- fragmented across sources
- sparse or non-uniform across States
- heterogeneous in units and flow/stock semantics

For MVP, the canonical analytical period is **yearly (`YYYY`)** so sparse annual government data is not artificially converted into fake monthly or quarterly observations.

Higher-frequency source data may be aggregated to yearly periods.

**Do not upsample annual data into fabricated quarters or months.**

### Minimum history

The repository does not yet contain the canonical sample dataset, so the team **must validate data availability in Issue #7 before this threshold is treated as final**.

For MVP, use **3 usable yearly observations as the default minimum** for a simple baseline/trend forecast. Three years is a practical floor for a prototype when district-level government data is sparse; a stronger model may require more history.

This threshold must be configurable in the ML configuration and should be revisited after evaluating the actual canonical dataset.

When fewer than 3 usable periods are available:

- do not fabricate a forecast
- return an explicit insufficient-data result
- show the reason in the API/UI
- show a first-class **historical trend / descriptive view** where sufficient descriptive data exists
- do not label a descriptive trend as a forecast

If the canonical dataset later shows that most location + skill pairs have 5 or more usable periods, the forecasting threshold may be raised after evaluation by changing the configured minimum in `ml/config`. This is a configuration change, not an architectural redesign.

---

### 4.6 Gap Engine

The Gap Engine operates on **forecast headcount quantities**, not normalized indices.

Core definition:

`Gap = Forecast Demand - Forecast Supply`

Therefore:

- Forecast Demand = worker/position headcount
- Forecast Supply = worker headcount
- Gap = headcount difference

Interpretation:

- positive gap → shortage
- balanced band → approximately balanced
- negative gap → oversupply

### Balanced band

The initial classification configuration lives in:

`ml/config/gap_thresholds.py`

The thresholds should be **relative to forecast demand**, not one fixed headcount value for every district.

The default MVP policy may be:

- shortage: gap > +10% of forecast demand
- balanced: -10% ≤ gap ≤ +10% of forecast demand
- oversupply: gap < -10% of forecast demand

The percentage is configurable and must not be hard-coded into the frontend.

### Zero / near-zero demand

The Gap Engine uses a configurable minimum demand floor in:

`ml/config/gap_thresholds.py`

For MVP, define a placeholder constant:

`MIN_FORECAST_DEMAND = TBD`

The actual starting value must be set from the canonical dataset during Issue #5/#7 review. It should be a small, explicitly documented headcount floor rather than an arbitrary hidden value. Until it is set, implementations must not silently invent different defaults.

For MVP:

- if `Forecast Demand < MIN_FORECAST_DEMAND`, classify the result as `NO_DEMAND`
- do not apply the relative ±10% shortage/balance/oversupply percentage rule
- this classification is valid only when `data_status = SUFFICIENT`
- the API should return `status = NO_DEMAND` and preserve the underlying forecast/supply values where available

This prevents division-by-zero and avoids treating tiny labour markets as if a small absolute difference represented a meaningful percentage gap.

---

### 4.7 Confidence & Evidence Layer

Confidence is a trust signal, not a decorative badge.

Confidence is computed **per forecast/gap result** for a specific location + skill + forecast period.

It should consider factors such as:

- data coverage
- data freshness
- source quality/count
- historical consistency
- forecast quality
- missing-data impact
- uncertainty

Outputs should support:

- HIGH
- MEDIUM
- LOW

Low-confidence results must be visibly distinguished and should not automatically drive aggressive policy recommendations.

Unless separately validated and calibrated, a confidence score must **not** be presented as a probability that an event will happen.

When a series has only the minimum or near-minimum amount of history, confidence must be capped at **MEDIUM** (or **LOW** when other evidence is weak). A 3-year naïve forecast must therefore never receive HIGH confidence solely because freshness and coverage are good.

---

### 4.8 Early Warning Engine

Consumes:

- forecast demand/supply
- gap
- trend information
- emerging-skill status
- confidence/evidence

It identifies conditions such as:

- projected shortage
- worsening shortage
- emerging shortage
- rapid demand growth without matching supply growth
- oversupply

Warnings must have transparent deterministic rules and severity levels.

Low-confidence conditions should normally be treated as lower-priority/watch signals.

`NO_DEMAND` results produce **no shortage or oversupply warnings**.

---

### 4.9 Emerging Skill Detection

Emerging Skill Detection is **primarily historical-series based**. It consumes recent and historical demand/supply observations directly rather than requiring the Forecast → Gap pipeline.

The method should require:

- enough historical observations
- configurable growth thresholds
- transparent rules
- an explicit insufficient-data state

For MVP, Emerging Skill Detection requires **at least 3 usable yearly observations** by default so that the latest period can be compared with the preceding historical periods. Its minimum-history setting is separate from the forecast minimum and is defined in **Issue #18**. It must not silently inherit the forecasting threshold.

The output should distinguish:

- EMERGING
- NOT_EMERGING
- INSUFFICIENT_DATA

This module must never label a skill emerging solely because an LLM said so.

---

### 4.10 National / State / District Rollups

The product must support the PS drill-down path:

**National → State → District → Sector → Skill**

Rollups are deterministic and evidence-aware. A higher-level dashboard summary must not imply that every underlying state has the same source coverage or analytical grain. Coverage, provenance, and confidence remain visible.

### 4.12 What-If Simulator

MVP intervention:

**Additional training seats**

The simulator must be scoped by:

- location
- skill/job role
- intervention start period
- training duration / completion lag
- additional seats
- expected completion rate

Core calculation:

`Effective Additional Supply = Additional Seats × Expected Completion Rate`

Added supply does **not** appear immediately.

Because the MVP uses yearly periods, training lag is stored in **whole years**. A sub-year training duration is rounded up to the next whole year for the scenario calculation:

`lag_years = ceil(training_duration_months / 12)`

If training begins in period `t`, the cohort becomes available from period `t + lag_years`.

After the cohort becomes available, its effective added supply is assumed to **persist in every subsequent forecast period** for the scenario horizon. This is a simplifying MVP assumption and must be displayed to the user.

`Scenario Supply(t) = Baseline Forecast Supply(t) + Effective Additional Supply`

for all periods from cohort availability onward.

Then:

`Simulated Gap(t) = Forecast Demand(t) - Scenario Supply(t)`

Where baseline gap is positive and non-zero:

`Gap Reduction = (Baseline Gap - Simulated Gap) / Baseline Gap`

If the cohort becomes available **after the last forecast period in the scenario horizon**, the scenario has no effect within that horizon. The API should return the **baseline forecast/gap unchanged**, with an explicit reason such as `COHORT_AFTER_HORIZON`; this is a valid simulation result, not an API error.

If the baseline gap is zero, negative, `NO_DEMAND`, or otherwise not a positive shortage:

- return `gap_reduction = null`
- return `simulated_gap` using the scenario calculation, with `status = NO_DEMAND` when the baseline is `NO_DEMAND`
- include a reason explaining that gap reduction is defined only relative to a positive baseline shortage

The interface must clearly label the result as a **scenario simulation**, not a guaranteed real-world outcome.

---

### 4.11 AI Explanation Layer

The AI layer receives structured outputs from SHRAMIK.

It may:

- explain why an alert exists
- summarize evidence
- explain a forecast
- describe assumptions
- generate a planning brief

It may **not**:

- invent data
- invent sources
- replace the forecasting engine
- silently change calculated values
- claim certainty when evidence is weak

### Latency and caching

The AI brief is an **optional operation**. The frontend must not block initial page rendering while waiting for it.

For MVP:

- generate the brief on demand
- cache identical structured inputs using a stable request/input hash
- use a reasonable backend timeout
- return a controlled error on provider failure or timeout
- keep the underlying analytics fully usable

The MVP can use a normal `POST /api/generate-brief` request because it is initiated on demand; the UX must remain non-blocking. A future production version can move to an asynchronous job/status workflow if latency requires it.

If the AI provider fails, the core analytics application must continue to work.

---

## 5. Application Data Flow

### Forecast / shortage path

```text
Source data
   ↓
Validation
   ↓
Normalization
   ↓
Canonical historical records
   ↓
Demand/Supply quantities
   ↓
Forecast demand + supply
   ↓
Gap (common headcount unit)
   ↓
Confidence + evidence (per result)
   ↓
Early-warning rules
   ↓
API response
   ↓
Frontend visualization
```

### Emerging-skill path

```text
Canonical historical demand/supply series
   ↓
Recent-vs-historical analysis
   ↓
Emerging-skill status/score
   ↓
API response
   ↓
Frontend visualization
```

### Optional AI explanation path

```text
Structured analytics result
   ↓
FastAPI backend
   ↓
Cache lookup
   ├── cache hit → return existing brief
   └── cache miss → LLM provider → validate/store result
                                ↓
                         Frontend explanation
```

The frontend should **never recreate analytical formulas** that already belong to the backend/ML layer.

---

## 6. Integration Boundaries

### Frontend ↔ Backend

The frontend communicates through documented REST APIs.

Frontend developers should consume only documented fields.

Do not depend on:

- database tables directly
- internal Python functions
- undocumented response fields
- hidden calculations

### Backend ↔ ML

ML/analytics modules should return structured Python objects/data structures that the backend can validate and serialize.

The backend owns API concerns.

The ML layer owns analytical calculations.

### Backend ↔ Database

Database access belongs behind a reusable database/service layer.

API routes should not contain large blocks of raw database logic.

### Backend ↔ LLM

The backend owns:

- LLM provider calls
- input preparation from structured analytics
- caching
- timeout handling
- response validation
- safe failure behaviour

The frontend never calls the LLM provider directly.

### LLM ↔ Analytics

The LLM receives **structured, already-calculated facts**.

Conceptually:

```text
Analytics result
      ↓
Structured explanation input
      ↓
LLM
      ↓
Human-readable explanation
```

Not:

```text
Raw database dump → LLM → forecast
```

---

## 7. Initial API Surface

The final structures are specified in **Issue #4**, but the architecture reserves these logical API areas:

| Purpose | Endpoint candidate |
|---|---|
| Dashboard overview | `GET /api/dashboard` |
| District list | `GET /api/districts` |
| District detail | `GET /api/districts/{district_id}` |
| Skill list | `GET /api/skills` |
| Skill detail | `GET /api/skills/{skill_id}` |
| Forecast | `GET /api/forecasts/{skill_id}` |
| Early warnings | `GET /api/early-warnings` |
| Evidence | `GET /api/evidence/{forecast_id}` |
| Model evaluation | `GET /api/model-evaluation` |
| Simulation | `POST /api/simulate` |
| AI planning brief | `POST /api/generate-brief` |

These are **contract candidates**, not permission to implement undocumented behaviour. Issue #4 finalizes request/response details.

---

## 8. High-Level Response Convention

API responses should be:

- JSON
- consistently named
- explicitly typed/documented
- predictable for frontend developers

Successful responses should contain only fields defined by the API contract.

Errors should use one common structure across endpoints.

A representative error shape is:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "A readable explanation",
    "details": {}
  }
}
```

The exact production schema belongs in Issue #4.

A request with valid parameters but insufficient analytical history is **not an API error**. It should normally return HTTP **200** with an explicit data/status field and null analytical values where appropriate. HTTP error responses are reserved for invalid requests, authentication/authorization failures when applicable, server failures, and similar request/system errors.

### Null and insufficient-data convention

Analytical responses use:

`data_status = SUFFICIENT | INSUFFICIENT_DATA | UNAVAILABLE`

The `data_status` field describes data availability, while the `status` field describes the analytical classification (for example, `SHORTAGE | BALANCED | OVERSUPPLY | NO_DEMAND`). They are separate fields. **If `data_status` is not `SUFFICIENT`, `status` and forecast/gap analytical outputs must be `null`** because no valid analytical classification should be presented from insufficient or unavailable data.

When `data_status` is not `SUFFICIENT`:

- analytical numeric outputs such as forecast/gap should be `null` unless a documented non-forecast value is being returned
- include a human-readable `reason`
- do not display `0` as a substitute for missing data
- the frontend must render an explicit Insufficient data or Unavailable state

Example:

```json
{
  "data_status": "INSUFFICIENT_DATA",
  "reason": "Only 2 usable yearly observations are available; at least 3 are required for the MVP forecast."
}
```

---

## 9. High-Level ML Result Convention

Analytical outputs should carry enough metadata for the backend and frontend to understand what was calculated.

Representative structure:

```json
{
  "location_id": "OD-001",
  "skill_id": "SKILL-001",
  "period": "2027",
  "forecast_demand": 1250,
  "forecast_supply": 900,
  "gap": 350,
  "status": "SHORTAGE",
  "confidence_level": "HIGH",
  "evidence_coverage": 0.84,
  "model": {
    "name": "example-model",
    "version": "v1"
  }
}
```

This is an **architecture-level example**.

Important units:

- `forecast_demand` = worker/position headcount
- `forecast_supply` = worker headcount
- `gap` = headcount difference

A separate display/ranking index may be included, but it must not be substituted into the gap calculation.

The authoritative machine-readable ML contract is finalized in **Issue #5**.

---

## 10. Source of Truth Rules

When two layers disagree:

1. The documented contract wins.
2. Backend/ML calculations are the source of truth for analytical numbers.
3. Database records are the source of truth for persisted evidence.
4. Frontend is a presentation layer and must not invent calculations.
5. AI-generated text is explanatory and must not override structured analytics.

Any breaking change must update the relevant contract before dependent implementation continues.

---

## 11. Versioning & Reproducibility

Important analytical outputs should retain:

- model name
- model version
- calculation/processing version where useful
- source/update date
- relevant evidence metadata
- analytical period

The team should be able to explain:

**What data produced this result, using which model/rules, for which period, at what point in time?**

This is especially important for forecasts and planner-facing recommendations.

---

## 12. Security & Privacy Boundary

The prototype should operate on **aggregate labour-market information**.

Do not introduce unnecessary individual-level personally identifiable information such as:

- Aadhaar numbers
- phone numbers
- personal addresses
- named worker profiles

Secrets and API credentials must stay in environment variables and must never be committed to Git.

### Authentication

**No authentication/RBAC is planned for the MVP.**

The MVP is a controlled demonstration environment. Do not imply that production-grade government identity, departmental role-based access, or audit controls exist unless they are actually implemented.

Future production hardening may add:

- RBAC
- audit logging
- encryption controls
- stronger secrets management
- government identity integration

---

## 13. Deployment Architecture

MVP deployment can use:

```text
User
  ↓
Vercel
  ↓
Next.js frontend
  ↓ HTTPS
FastAPI backend host
  ├── analytics / ML modules
  ├── database access
  └── AI provider (optional, backend-mediated)
        ↓
Supabase / PostgreSQL
```

The exact hosting provider can change without changing the application logical architecture.

---

## 14. Repository Module Boundary

Planned repository structure:

```text
SHRAMIK/
├── frontend/          # Next.js application
├── backend/           # FastAPI application
├── ml/
│   ├── config/        # analytical thresholds / model settings
│   └── ...            # analytics / forecasting logic
├── data/
│   ├── raw/           # source inputs
│   └── processed/     # normalized datasets
├── docs/              # architecture, API, methodology
└── scripts/           # setup / data / utility scripts
```

### Important boundary

Do not place analytical business logic inside React components.

Do not place frontend rendering logic inside ML modules.

Do not put the whole backend into one large Python file.

Configuration values that affect analytical classification must live in the ML/config area, be documented, and be version-controlled with the code.

---

## 15. Beginner Mental Model

Think of SHRAMIK as a chain of responsibility:

**Data tells us what happened.**

**Demand/Supply engines produce common-unit quantities plus optional display indices.**

**Forecasting estimates what may happen next in the same common unit.**

**Gap analysis compares future demand and supply in headcount.**

**Confidence/evidence tells us how much we should trust each forecast/gap result.**

**Early warnings detect important changes using those analytical results.**

**Emerging-skill detection looks directly at historical trends.**

**The simulator asks what if we intervene, and when would the added supply appear.**

**The backend delivers those structured results.**

**The frontend makes them understandable.**

**The LLM explains the already-calculated result in natural language.**

---

## 16. Decisions Locked by This Architecture

For MVP, the team agrees that:

- SHRAMIK is a planner-facing decision-support platform.
- Backend APIs are the integration boundary.
- ML is a separate analytical layer.
- PostgreSQL/Supabase is the structured evidence store.
- The frontend does not own analytical calculations.
- Demand and supply gap calculations use common-unit headcount quantities, not normalized indices.
- Display/ranking indices are separate from analytical headcount quantities.
- Forecasts use yearly (`YYYY`) periods in the MVP.
- A location + skill forecast requires at least 3 usable yearly observations by default, provisionally; this is validated against the canonical dataset in Issue #7.
- Insufficient data returns an explicit status and does not fabricate numeric values.
- Emerging-skill detection is historical-series based and does not require the forecast-gap pipeline.
- Confidence is computed per location + skill + forecast period result.
- Early warnings consume forecast, gap, emerging-skill status, and confidence/evidence.
- The baseline forecast is a naïve last-value forecast.
- Time-aware validation and no data leakage are mandatory.
- Transparent classical/statistical methods are preferred over unnecessary deep learning.
- The MVP simulation focuses on training-seat interventions and includes a training duration/lag and target location/skill.
- The LLM is backend-mediated, optional, non-blocking to the core UI, and cached where possible.
- No authentication/RBAC is planned for the MVP.
- Aggregate data is preferred over individual worker data.
- GitHub contracts should be documented before dependent feature work.

---

## 17. Issue Dependency Map

```text
#1 Architecture
 ├──→ #2 Database schema
 ├──→ #4 API contracts
 ├──→ #5 ML output contract
 └──→ #6 Development environment

#2 + #4 + #6
 ├──→ #8 Database implementation
 ├──→ #12 Backend foundation
 └──→ #11 Frontend foundation

#7 + #9
 └──→ Canonical historical data available
       ├──→ #13 Demand/Supply engines
       │      └──→ #14 Forecasting
       │             └──→ #15 Gap analysis
       │                    └──→ #16 Confidence/Evidence
       │                           ├──→ #17 Early warnings
       │                           └──→ #22 Model evaluation
       │
       └──→ #18 Emerging skills
              historical-series path; no forecast dependency

#19 Simulation
#20/#21 APIs
#23 AI brief
       ↓
#24–#31 Frontend experiences
       ↓
#32 Integration
       ↓
#33 CI
       ↓
#34 Security
       ↓
#35 Deployment
       ↓
#36 E2E testing
       ↓
#37 Final release/demo
```

---

## 18. What This Issue Does NOT Implement

Issue #1 is architecture and shared-contract work.

Do **not** turn this issue into:

- full API implementation
- full forecasting implementation
- complete frontend screens
- production deployment
- LLM application code
- complete database migration code

Those are separate roadmap issues.

The open items in the checklist are **intentional dependencies**. They are not missing work inside Issue #1.

---

## 19. Completion Checklist for Issue #1

This issue is ready for review when:

- [x] Overall architecture is documented
- [x] Main modules are defined
- [x] End-to-end data flows are documented
- [x] Technology choices are recorded
- [x] Frontend/backend boundary is explicit
- [x] Backend/ML boundary is explicit
- [x] Database/evidence responsibility is explicit
- [x] Common-unit gap definition is explicit
- [x] Forecast period granularity is defined
- [x] Forecast minimum-history rule is defined provisionally and must be validated against the canonical dataset in Issue #7
- [x] Minimum-history configuration location is documented
- [x] Emerging-skill pipeline position and minimum-history rule are explicit
- [x] Confidence scope and minimum-history confidence cap are explicit
- [x] Simulator time/lag and scope are explicit
- [x] AI caching/latency boundary is explicit
- [x] Authentication/RBAC MVP boundary is explicit
- [x] Insufficient-data/null convention is explicit
- [x] Skill taxonomy decision is assigned to ingestion work
- [x] Initial API surface is recorded
- [x] High-level ML result structure is recorded
- [x] LLM limitations are explicit
- [x] Security/privacy boundaries are explicit
- [x] Repository module boundaries are documented
- [x] Detailed API contract intentionally deferred to Issue #4
- [x] Detailed ML contract intentionally deferred to Issue #5
- [x] Detailed database schema intentionally deferred to Issue #2

---

## Related Issues

- **#2** Design SHRAMIK database schema
- **#4** Define SHRAMIK API contracts
- **#5** Define SHRAMIK ML output contract
- **#6** Set up SHRAMIK development environment
- **#9** Build SHRAMIK data ingestion and validation pipeline
- **#13–#18** Implement SHRAMIK analytical intelligence
