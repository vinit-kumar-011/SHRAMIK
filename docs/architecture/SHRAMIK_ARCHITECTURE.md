# SHRAMIK Technical Architecture

**Issue:** #1 — Define SHRAMIK technical architecture and contracts  
**Status:** Initial architecture baseline  
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
                    │   DATA SOURCES       │
                    │ Jobs / surveys /     │
                    │ training / official  │
                    │ statistics / demo    │
                    │ data                  │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ DATA INGESTION &      │
                    │ VALIDATION            │
                    │ raw → clean →        │
                    │ normalize → map      │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ EVIDENCE STORE       │
                    │ PostgreSQL /         │
                    │ Supabase             │
                    └──────────┬───────────┘
                               │
               ┌───────────────┴────────────────┐
               │                                │
               ▼                                ▼
      ┌─────────────────┐              ┌─────────────────┐
      │ DEMAND ENGINE   │              │ SUPPLY ENGINE   │
      └────────┬────────┘              └────────┬────────┘
               │                                │
               └──────────────┬─────────────────┘
                              ▼
                    ┌──────────────────────┐
                    │ FORECAST ENGINE     │
                    │ demand + supply     │
                    └──────────┬───────────┘
                               ▼
                    ┌──────────────────────┐
                    │ GAP ENGINE          │
                    │ demand - supply     │
                    └──────────┬───────────┘
                               ▼
                    ┌──────────────────────┐
                    │ CONFIDENCE +         │
                    │ EVIDENCE SCORING     │
                    └──────────┬───────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
       ┌─────────────────┐           ┌─────────────────┐
       │ EARLY WARNING   │           │ EMERGING SKILL  │
       │ ENGINE          │           │ DETECTION       │
       └────────┬────────┘           └────────┬────────┘
                │                             │
                └──────────────┬──────────────┘
                               ▼
                    ┌──────────────────────┐
                    │ WHAT-IF SIMULATOR    │
                    │ training seats /     │
                    │ scenario assumptions │
                    └──────────┬───────────┘
                               ▼
                    ┌──────────────────────┐
                    │ FASTAPI BACKEND      │
                    │ REST APIs + business │
                    │ orchestration        │
                    └──────────┬───────────┘
                               │
                    ┌──────────┴───────────┐
                    ▼                      ▼
          ┌─────────────────┐    ┌──────────────────┐
          │ NEXT.JS FRONTEND│    │ LLM EXPLAINER   │
          │ dashboard / map │    │ explanation /    │
          │ charts / pages  │    │ planning brief   │
          └─────────────────┘    └──────────────────┘
```

### Critical rule

**The LLM does not calculate SHRAMIK's numerical analytics.**

Numerical results come from the data, analytical engines, forecasting code, and deterministic business rules.

The LLM receives structured results and explains them in human-readable language.

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
| ML | scikit-learn / XGBoost / suitable classical forecasting | Forecasting and modelling |
| Database | PostgreSQL / Supabase | Structured evidence and application data |
| AI | LLM API | Explanation and planning briefs only |
| Frontend hosting | Vercel | Web deployment |
| Backend hosting | Render / Railway or equivalent | Python API deployment |
| Source control | Git + GitHub | Collaboration and release management |

### Architecture principle

Use the **simplest technology that reliably solves the problem**.

Do not introduce microservices, Kubernetes, blockchain, a custom LLM, or deep-learning models unless a later engineering decision proves they are actually needed.

---

## 4. Major Modules

### 4.1 Data Ingestion

Responsible for:

- accepting source datasets
- validating schemas
- handling missing/invalid values
- normalizing units and names
- mapping locations, sectors, and skills
- storing provenance
- producing a reproducible canonical dataset

It must preserve the distinction between:

- raw source data
- cleaned/normalized data
- derived analytical values

---

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

Produces a **Demand Index** from available demand-side signals.

The engine must:

- use only signals that actually exist in the dataset
- preserve underlying raw quantities
- document normalization/weighting assumptions
- produce reproducible results

No LLM-generated numbers.

---

### 4.4 Supply Engine

Produces a **Supply Index** from available supply-side signals.

Examples of signals may include:

- training output
- available trained workforce indicators
- completion data
- other validated supply proxies

The exact signal set is determined by the canonical dataset.

---

### 4.5 Forecast Engine

Produces future demand/supply estimates.

Requirements:

- begin with a transparent baseline
- use time-aware validation
- avoid future-data leakage
- use a configurable forecast horizon
- record the model/version used
- handle insufficient history explicitly
- report uncertainty where supported by the model

The project does **not** assume that a more complex model is automatically better.

---

### 4.6 Gap Engine

Core definition:

`Gap = Forecast Demand - Forecast Supply`

Interpretation:

- positive gap → shortage
- near-zero gap → balanced
- negative gap → oversupply

Classification thresholds must be configurable rather than hidden inside frontend code.

---

### 4.7 Confidence & Evidence Layer

Confidence is a trust signal, not a decorative badge.

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

---

### 4.8 Early Warning Engine

Consumes upstream analytical outputs and identifies conditions such as:

- projected shortage
- worsening shortage
- emerging shortage
- rapid demand growth without matching supply growth
- oversupply

Warnings must have transparent deterministic rules and severity levels.

Low-confidence conditions should normally be treated as lower-priority/watch signals.

---

### 4.9 Emerging Skill Detection

Identifies skills showing meaningful recent growth relative to historical behaviour.

The method should require:

- enough historical observations
- configurable growth thresholds
- transparent rules
- an explicit insufficient-data state

---

### 4.10 What-If Simulator

MVP intervention:

**Additional training seats**

Core calculation:

`Effective Additional Supply = Additional Seats × Expected Completion Rate`

`Simulated Supply = Baseline Forecast Supply + Effective Additional Supply`

`Simulated Gap = Forecast Demand - Simulated Supply`

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

If the AI provider fails, the core analytics application must continue to work.

---

## 5. Application Data Flow

A normal analytical request should conceptually follow:

```text
Source data
   ↓
Validation
   ↓
Normalization
   ↓
Canonical records
   ↓
Demand/Supply calculations
   ↓
Forecast
   ↓
Gap
   ↓
Confidence + evidence
   ↓
Warning / emerging-skill rules
   ↓
API response
   ↓
Frontend visualization
   ↓
Optional AI explanation
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
Raw database dump → LLM → "forecast"
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

---

## 9. High-Level ML Result Convention

Analytical outputs should carry enough metadata for the backend and frontend to understand what was calculated.

Representative structure:

```json
{
  "location_id": "OD-001",
  "skill_id": "SKILL-001",
  "period": "2027-Q1",
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

The team should be able to explain:

**What data produced this result, using which model/rules, at what point in time?**

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

Future production hardening may add stronger RBAC, audit logging, encryption controls, and other enterprise security measures.

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
  └── AI provider
        ↓
Supabase / PostgreSQL
```

The exact hosting provider can change without changing the application's logical architecture.

---

## 14. Repository Module Boundary

Planned repository structure:

```text
SHRAMIK/
├── frontend/          # Next.js application
├── backend/           # FastAPI application
├── ml/                # analytics / forecasting logic
├── data/
│   ├── raw/           # source inputs
│   └── processed/     # normalized datasets
├── docs/              # architecture, API, methodology
└── scripts/            # setup / data / utility scripts
```

### Important boundary

Do not place analytical business logic inside React components.

Do not place frontend rendering logic inside ML modules.

Do not put the whole backend into one large Python file.

---

## 15. Beginner Mental Model

Think of SHRAMIK as a chain of responsibility:

**Data tells us what happened.**

**Demand/Supply engines turn raw observations into comparable indicators.**

**Forecasting estimates what may happen next.**

**Gap analysis compares future demand and supply.**

**Confidence/evidence tells us how much we should trust the conclusion.**

**Early warnings detect important changes.**

**The simulator asks “what if we intervene?”**

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
- The LLM does not own numerical forecasting.
- Analytical outputs require provenance/confidence metadata.
- Time-aware validation and no data leakage are mandatory.
- Transparent classical/statistical methods are preferred over unnecessary deep learning.
- The MVP simulation focuses on training-seat interventions.
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
 └──→ Data available for analytics

#13 Demand/Supply
 └──→ #14 Forecasting
       └──→ #15 Gap analysis
             └──→ #16 Confidence/Evidence
                   ├──→ #17 Early warnings
                   ├──→ #18 Emerging skills
                   └──→ #22 Model evaluation

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

---

## 19. Completion Checklist for Issue #1

This issue is ready for review when:

- [x] Overall architecture is documented
- [x] Main modules are defined
- [x] End-to-end data flow is documented
- [x] Technology choices are recorded
- [x] Frontend/backend boundary is explicit
- [x] Backend/ML boundary is explicit
- [x] Database/evidence responsibility is explicit
- [x] Initial API surface is recorded
- [x] High-level ML result structure is recorded
- [x] LLM limitations are explicit
- [x] Security/privacy boundaries are explicit
- [x] Repository module boundaries are documented
- [ ] Detailed API contract completed in Issue #4
- [ ] Detailed ML contract completed in Issue #5
- [ ] Database schema finalized in Issue #2

---

## Related Issues

- **#2** Design SHRAMIK database schema
- **#4** Define SHRAMIK API contracts
- **#5** Define SHRAMIK ML output contract
- **#6** Set up SHRAMIK development environment
