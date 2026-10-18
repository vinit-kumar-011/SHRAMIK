# SHRAMIK Implementation Readiness: Database, API, Engines, ML, and Frontend

**Snapshot date:** 2026-10-18  
**Repository:** `vinit-kumar-011/SHRAMIK`  
**Working branch:** `develop` (this plan is being proposed from a separate docs branch)  
**Supabase project:** `SHRAMIK` (`vnmvejubmypbpiaxtrgc`)  
**Purpose:** A single implementation plan for the backend team so Database, FastAPI, analytical engines/ML, and frontend can progress in parallel without conflicting schema changes.

## Executive status

The project has a meaningful live database skeleton and detailed architecture/API/ML contracts. It is **not yet end-to-end ready**. The biggest blockers are migration-history reconciliation, no canonical demand/supply time series in the observation tables, and a backend/engine implementation gap between written contracts and executable routes.

### Verified live snapshot

Read-only queries against the active Supabase project verified:

- Project status: `ACTIVE_HEALTHY`; PostgreSQL 17.
- 25 public base tables; RLS enabled on all 25.
- Reference catalogue: 36 states/UTs, 784 districts, 21 sectors, 7 canonical pilot skills.
- Source-specific staging data: 29,372 DGT CTS seat-matrix rows, 16,815 NCVT/ITI listing rows, 538 PLFS 2025 benchmark cells, 2 e-Shram metadata rows, and 3,451 current NCO-2015 occupation rows.
- Supporting provenance: 12 source retrievals, 12 evidence items, and 23 source-capability records.
- Empty analytical tables at snapshot time: `demand_observations`, `supply_observations`, `model_versions`, `forecast_results`, `emerging_skill_signals`, `early_warnings`, `evidence_links`, and `synthetic_generation_runs`.
- NCO staging integrity: 3,451 current unique codes, 774 blank NCO-2004 concordance mappings deliberately left uninferred, all current rows share snapshot SHA-256 `2ec0571104b4a68e8e65491c4eb84c2f973bba41a223b3eb804f3b128f67de71`, and all current rows have source IDs and DGE URLs. The four reviewed Volume II-B additions are present.

These are point-in-time observations, not a guarantee that every column/check in the schema design document has already been diffed against the live database.

## The main blocker: migration history must be reconciled

The remote Supabase migration history currently has 23 recorded versions. The `develop` tree contains only the latest four SQL migration files for the NCO taxonomy/staging work. The database and repository therefore do not yet provide a complete, clean-rebuildable migration history from the code checked into `develop`.

**Until reconciliation is complete, do not run `supabase db push`, `supabase db reset`, or any operation that applies a guessed baseline to the live project.** Do not recreate production tables just to make local history look tidy.

Database owner / lead must:
1. Take and safely store a current schema-only dump and migration-history export outside Git (no credentials or personal data in the repository).
2. Compare the live schema, constraints, indexes, RLS, policies, triggers/functions and seed/reference data with the intended docs and repo.
3. Recover the authoritative historical migration files where possible; otherwise document a reviewed baseline/reconciliation strategy that supports both the existing live project and a clean new database.
4. Run a clean-database migration smoke test in a disposable/local project before applying any schema migration to the live project.
5. Record a written green light before changing shared schema.

This is a coordination gate, not a reason to block frontend implementation or pure analytical code.

## Existing contracts to treat as the integration source of truth

Before changing an API field, analytical meaning, or table:
- Database model: `docs/database/SHRAMIK_DATABASE_SCHEMA.md`
- REST interface: `docs/api/SHRAMIK_API_CONTRACTS.md` (currently documented as a draft v1.1 contract)
- Analytical model semantics: `docs/methodology/SHRAMIK_ML_OUTPUT_CONTRACT.md`
- Architecture / boundaries: `docs/architecture/SHRAMIK_ARCHITECTURE.md`
- Dataset and source/grain rules: `docs/data/SHRAMIK_CANONICAL_DATASET_PLAN.md`
- NCO staging / review / CTS candidates: `docs/data/NCO_2015_CATALOGUE_AND_CTS_CROSSWALK.md`

Documented contracts are not the same as implemented functionality. Breaking changes must update the contract first and be reviewed by the owners of all affected modules.

## Non-negotiable data and security boundaries

1. **Frontend -> FastAPI -> PostgreSQL/Supabase.** The browser must never connect directly to PostgreSQL and must not receive a service-role key.
2. `DATABASE_URL`, any database password, Supabase service-role secret, LLM key, and other credentials stay in local ignored `.env` files or deployment secrets. Commit only redacted examples.
3. OFFICIAL analysis uses only approved source-backed observations. DEMO may use synthetic records, visibly labelled with `analysis_mode` and `provenance_state`; synthetic records must never inflate official history.
4. Missing values remain NULL. Never turn missing demand/supply, missing years, ineligible gaps, or unavailable uncertainty into zero.
5. NCO-2015 is an occupation taxonomy, not a NIC industry taxonomy. Do not map occupations to sectors from wording alone. Similarity candidates are for reviewer triage only.
6. CTS training seats/capacity are not automatically job demand or current employed supply. Unit, flow/stock meaning, geography, skill scope and period must be compatible before calculating a gap.
7. GET requests read persisted analytical outputs; they do not train or run forecasts as a side effect. The simulator remains stateless for the MVP.
8. No ad hoc production DDL. Every proposed schema change has a migration, tests, an owner, and a reviewed pull request.

## Workstreams that can run in parallel

### A. Database / provenance (owner: one designated DB migration lead)

**First:** reconcile the 23 remote migration records and four-file repo state; perform a read-only schema/constraint/RLS/index diff against the schema documentation.

**Then:** finish the migration smoke test and baseline fixtures. Add or change tables only where an explicit contract gap is shown. Verify database-backed endpoints use expected indexes and correct foreign-key joins. Maintain RLS default-deny behavior; data access from FastAPI uses server-side credentials.

**Acceptance gate**
- Remote and local migration versions are reconciled and the strategy is documented.
- A clean disposable database can be created from repo migrations.
- Live schema diff has no unexplained differences in tables, columns, nullability, constraints, foreign keys, indexes, RLS, policies, triggers or functions.
- Seed/reference fixtures are deterministic and safe to rerun.
- No production migration is applied before this gate.

### B. Canonical dataset and taxonomy mappings (owner: data integration)

**Do next**
- Build a reproducible, versioned input dataset for a small multi-state pilot.
- Use the source capability/provenance registry for every adapter and preserve source grain.
- Prepare NCO-to-canonical-skill and CTS-to-NCO candidate files with evidence, review status and rationale.
- Keep all fuzzy candidates `PENDING_REVIEW`; promote only evidence-supported decisions.
- Implement a reproducible DEMO synthetic-data generator with a fixed seed and a `synthetic_generation_runs` record. Clearly mark all generated observations.
- Do not block on the inaccessible e-Shram endpoint; retain the verified metadata and record the source limitation.

**Acceptance gate**
- Repeatable dataset build with input hashes and transformation version.
- OFFICIAL and DEMO records remain distinguishable.
- At least three usable annual periods exist for any demo series expected to forecast; no fake months/quarters.
- Gaps are marked ineligible where headcount units or dimensions cannot be defensibly reconciled.
- Taxonomy candidates are reviewed separately from source import.

### C. Demand / supply / forecasting / analytical engines (owner: analytics/ML)

Build pure, testable functions first; keep them independent of FastAPI and Supabase. Persist only validated results through a separate orchestration/persistence layer.

Implementation order:
1. Observation eligibility + yearly series construction (source, provenance, units, grain, and missing-year rules).
2. Demand and supply measures/indices, with normalization assumptions versioned and headcounts kept separate from 0–100 indices.
3. Naive last-value forecasting baseline and time-aware validation; minimum history of 3 usable yearly periods remains provisional until source-backed coverage is assessed.
4. Gap eligibility and classification: `gap = forecast_demand - forecast_supply`; do not finalize `MIN_FORECAST_DEMAND` until justified by valid source-backed quantities (it is still documented as TBD).
5. Confidence/evidence coverage; three-period history alone must not qualify for HIGH confidence.
6. Early warning rules and severity.
7. Emerging-skill signal calculations from historical series.
8. Model evaluation and leakage checks; record model/version and trained-through cutoff.
9. Simulator consumes stored baseline forecasts, respects training lag, remains stateless, and never persists scenario outputs as ordinary forecasts.

**Acceptance gate**
- Contract validators cover every enum, null precedence, provenance combination, compatible gap, minimum history, deterministic ranking, and leakage/cutoff rule.
- Unit tests include insufficient history, source-unavailable, mixed provenance, zero/near-zero demand, incompatible supply proxies, and no-baseline simulations.
- Model output is stored only after validation; results are reproducible from versioned inputs/configuration.

### D. FastAPI / backend integration (owner: backend)

The repository currently has the FastAPI foundation and health route, but the documented analytical routes are not yet implemented. Implement against the existing REST contract, not a new shape invented endpoint by endpoint.

Suggested delivery order:
1. Database repositories/read services and canonical lookup endpoints: districts and skills.
2. Dashboard and district/skill detail read endpoints.
3. Forecasts, warnings, evidence and model-evaluation read endpoints.
4. A separate analytical orchestration command/job that validates and persists model outputs.
5. `POST /api/v1/simulate` using stored baseline outputs.
6. `POST /api/v1/generate-brief` only after numerical results/evidence exist; an LLM may explain validated results but must not calculate analytics.
7. Auth/CORS/rate-limit configuration appropriate to the actual deployment, standardized errors, request IDs, pagination and health/readiness probes.

**Acceptance gate**
- OpenAPI matches `docs/api/SHRAMIK_API_CONTRACTS.md`.
- API integration tests exercise empty database, populated demo database, RLS/permissions, pagination, invalid filters, and null behavior.
- No endpoint leaks SQL/internal exceptions or reads an undocumented table field.
- A successful forecast run can be traced from input snapshot to model version to persisted output.

### E. Frontend (owner: frontend)

Frontend may begin now with mocked responses shaped exactly like the API contract. Do not wait for the ML engine and do not use direct Supabase table queries.

Build in this order:
1. Typed API client, envelopes, error/loading/empty states, `analysis_mode` (OFFICIAL/DEMO), and period filters.
2. National dashboard, with forecast counts that preserve mutually exclusive count semantics.
3. District drill-down and sector/skill filters.
4. Skill detail / forecast history, including history and provenance.
5. Evidence/provenance panels and model evaluation.
6. Scenario simulator using the stateless request/response contract.
7. AI-generated brief as optional presentation over validated metrics and evidence, never as a numeric source.

**Acceptance gate**
- Frontend consumes only FastAPI contracts; all API origins come from environment configuration.
- Empty/insufficient data is a designed state, not a fabricated zero-filled chart.
- Synthetic/demo outputs have a visible label.
- Component tests use contract-shaped fixtures; integration switches to the backend without rewriting the UI.

## Working agreement to prevent conflicts

- Use `develop` as integration branch. Do not commit directly to it for feature work.
- Use one branch and one PR per workstream, e.g. `feature/api-read-endpoints`, `feature/ml-series-and-baseline`, `feature/frontend-api-client`, `feature/data-demo-generator`, `feature/db-migration-reconciliation`.
- Only the designated DB migration lead edits/applies shared migration files. Others propose migration diffs by PR and must not run live DDL.
- Before editing shared contract files, announce it in the team channel and request review from API + ML + frontend owners as applicable.
- Keep PRs small; include tests, source/provenance notes and migration impact. Never rebase/force-push another person's branch.
- Use local `.env` files ignored by Git; share onboarding steps, never secrets. Each teammate uses their own individual account.
- Daily integration: review open PRs, run tests, merge in dependency order, and update the status below.

## Fastest low-conflict build sequence

1. **Now:** share this plan; add the trusted backend teammate to GitHub and Supabase; nominate the single migration owner.
2. **Parallel immediately:** frontend builds against mocked contract fixtures; ML builds pure-function engines and tests; backend builds read endpoints and repository layer against the contract; data integration builds the reproducible demo dataset.
3. **In parallel but gated:** database migration reconciliation and schema diff. No schema changes until this passes.
4. **Integrate:** load the versioned DEMO series; run pipeline once; validate and persist model outputs; use API to power the frontend.
5. **End-to-end gate:** clean setup from documented steps; lint/type/unit tests; database migration smoke test; API contract tests; one fully traceable forecast/gap/warning/evidence scenario; one simulator case; visible OFFICIAL vs DEMO distinction.

## Definition of “ready for frontend + engines + ML”

- [ ] Migration history and clean rebuild path reconciled.
- [ ] Live schema diff reviewed and signed off.
- [ ] Reproducible multi-state pilot input dataset or documented evidence-backed limitation.
- [ ] Reproducible synthetic DEMO series with provenance.
- [ ] Demand/supply/forecast/gap/confidence/warning/emerging-skill functions implemented and tested.
- [ ] Validated results written to analytical tables with model/version metadata.
- [ ] Required REST endpoints implemented and contract-tested.
- [ ] Frontend renders contract fixtures and then real API responses without querying Supabase directly.
- [ ] Simulator and evidence trace end-to-end.
- [ ] Secrets, RLS, CORS and production migration process reviewed.

This is an implementation plan, not an assertion that currently missing code or data already exists. The live DB snapshot is captured above so changes can be measured against it.
