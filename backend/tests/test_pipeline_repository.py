from __future__ import annotations

from datetime import date
from decimal import Decimal
from uuid import UUID

from app.analytics.engine import AnalyticsConfig, run_baseline_analytics
from app.db.pipeline_repository import persist_pipeline
from app.ingestion.canonical_csv import CanonicalObservation, ParsedBatch


RUN_ID = "00000000-0000-0000-0000-000000000999"
APPROVED = frozenset({("VACANCY_HEADCOUNT", "WORKER_HEADCOUNT")})


class FakeResult:
    def __init__(self, row=None):
        self.row = row

    def mappings(self):
        return self

    def first(self):
        return self.row


class FakeSession:
    """SQL-aware fake: exercise persistence control flow without a live database."""

    def __init__(self):
        self.calls = []
        self.generation_runs = {}
        self.observations = {"demand_observations": {}, "supply_observations": {}}
        self.model_versions = {}
        self.forecasts = {}
        self.evidence_links = {}

    @staticmethod
    def observation_key(table, row, *, selecting=False):
        signal = row.get("signal_type") if selecting else row.get(
            "demand_signal_type" if table == "demand_observations" else "supply_signal_type"
        )
        if row.get("provenance_state") == "SYNTHETIC_DEMO":
            lineage = row.get("generation_run_id")
        else:
            lineage = (row.get("source_id"), row.get("source_release"))
        return (
            row.get("state_id"), row.get("district_id"), row.get("sector_id"),
            row.get("skill_id"), row.get("observation_grain"), row.get("period_type"),
            row.get("period_year"), row.get("provenance_state"), lineage, signal,
        )

    def execute(self, statement, params=None):
        query = " ".join(str(statement).lower().split())
        p = dict(params or {})
        self.calls.append((query, p))

        if "pg_advisory_xact_lock" in query:
            return FakeResult()
        if query.startswith("select id, code from public.states"):
            return FakeResult({"id": p["state_id"], "code": "ST"})
        if query.startswith("select id, state_id from public.districts"):
            return FakeResult({"id": p["district_id"], "state_id": "state_test"})
        if query.startswith("select id from public.sectors"):
            return FakeResult({"id": p["sector_id"]})
        if query.startswith("select id, sector_id from public.skills"):
            return FakeResult({"id": p["skill_id"], "sector_id": "sector_test"})
        if query.startswith("select id from public.synthetic_generation_runs"):
            run = self.generation_runs.get(UUID(str(p["id"])))
            return FakeResult({"id": run["id"]} if run else None)
        if query.startswith("insert into public.synthetic_generation_runs"):
            run = dict(p)
            self.generation_runs[run["id"]] = run
            return FakeResult()

        if query.startswith("select id from public.demand_observations where"):
            key = self.observation_key("demand_observations", p, selecting=True)
            row = self.observations["demand_observations"].get(key)
            return FakeResult({"id": row["id"]} if row else None)
        if query.startswith("select id from public.supply_observations where"):
            key = self.observation_key("supply_observations", p, selecting=True)
            row = self.observations["supply_observations"].get(key)
            return FakeResult({"id": row["id"]} if row else None)
        if query.startswith("insert into public.demand_observations"):
            row = dict(p)
            key = self.observation_key("demand_observations", row)
            self.observations["demand_observations"][key] = row
            return FakeResult()
        if query.startswith("insert into public.supply_observations"):
            row = dict(p)
            key = self.observation_key("supply_observations", row)
            self.observations["supply_observations"][key] = row
            return FakeResult()
        if query.startswith("update public.demand_observations set"):
            row = next(v for v in self.observations["demand_observations"].values() if v["id"] == p["existing_id"])
            row.update({k: v for k, v in p.items() if k != "existing_id"})
            return FakeResult()
        if query.startswith("update public.supply_observations set"):
            row = next(v for v in self.observations["supply_observations"].values() if v["id"] == p["existing_id"])
            row.update({k: v for k, v in p.items() if k != "existing_id"})
            return FakeResult()

        if query.startswith("insert into public.model_versions"):
            key = (p["name"], p["version"])
            self.model_versions.setdefault(key, {
                "id": p["id"],
                "trained_through_period": p["trained_through_period"],
                "contract_version": "1.1",
                "is_baseline": True,
            })
            return FakeResult()
        if query.startswith("select id, trained_through_period, contract_version, is_baseline from public.model_versions"):
            row = self.model_versions.get((p["name"], p["version"]))
            return FakeResult(dict(row) if row else None)

        if query.startswith("update public.forecast_results set is_active = false"):
            for row in self.forecasts.values():
                if (
                    row["district_id"] == p["district_id"]
                    and row["skill_id"] == p["skill_id"]
                    and row["period_year"] == p["period_year"]
                    and row["analysis_mode"] == p["analysis_mode"]
                ):
                    row["is_active"] = False
            return FakeResult()
        if query.startswith("select id from public.forecast_results where"):
            key = (
                p["district_id"], p["skill_id"], p["period_year"], p["analysis_mode"],
                p["contract_version"], p["model_version_id"],
            )
            row = self.forecasts.get(key)
            return FakeResult({"id": row["id"]} if row else None)
        if query.startswith("insert into public.forecast_results"):
            row = dict(p)
            key = (
                row["district_id"], row["skill_id"], row["period_year"], row["analysis_mode"],
                row["contract_version"], row["model_version_id"],
            )
            self.forecasts[key] = row
            return FakeResult()
        if query.startswith("update public.forecast_results set"):
            row = next(v for v in self.forecasts.values() if v["id"] == p["existing_id"])
            row.update({k: v for k, v in p.items() if k != "existing_id"})
            return FakeResult()

        if query.startswith("select id from public.evidence_links where"):
            key = (p["evidence_item_id"], p["forecast_result_id"], "INPUT")
            row = self.evidence_links.get(key)
            return FakeResult({"id": row["id"]} if row else None)
        if query.startswith("insert into public.evidence_links"):
            key = (p["evidence_item_id"], p["forecast_result_id"], "INPUT")
            self.evidence_links[key] = dict(p)
            return FakeResult()

        raise AssertionError(f"Unexpected SQL in repository test: {query}")


def make_observation(kind: str, year: int, value: int) -> CanonicalObservation:
    is_demand = kind == "demand"
    return CanonicalObservation(
        kind=kind,
        state_id="state_test",
        district_id="district_test",
        sector_id="sector_test",
        skill_id="skill_test",
        observation_grain="DISTRICT_SECTOR_SKILL",
        period_type="YEAR",
        period_year=year,
        signal_type="VACANCY_HEADCOUNT" if is_demand else "WORKER_HEADCOUNT",
        value=Decimal(value),
        source_id=None,
        source_release=None,
        source_date=date(year, 12, 31),
        retrieval_id=None,
        evidence_item_id=None,
        provenance_state="SYNTHETIC_DEMO",
        is_synthetic=True,
        generation_run_id=RUN_ID,
        transformation_note="deterministic persistence test fixture",
        unit="persons",
        flow_stock_semantics="annual headcount",
        quantity_semantics="FLOW",
    )


def make_batch(kind: str, values: tuple[int, int, int]) -> ParsedBatch:
    rows = tuple(
        make_observation(kind, year, value)
        for year, value in zip((2021, 2022, 2023), values, strict=True)
    )
    return ParsedBatch(
        kind=kind,
        observations=rows,
        issues=(),
        sha256=("a" if kind == "demand" else "b") * 64,
        source_path=f"{kind}.csv",
        synthetic_capabilities={"demand": {}, "supply": {}},
    )


def build_analytics(demand, supply):
    return run_baseline_analytics(
        demand,
        supply,
        demand_signal_type="VACANCY_HEADCOUNT",
        supply_signal_type="WORKER_HEADCOUNT",
        config=AnalyticsConfig(
            analysis_mode="DEMO",
            min_history=3,
            approved_gap_signal_pairs=APPROVED,
        ),
    )


def persist(session, demand, supply, analytics):
    return persist_pipeline(
        session,
        demand,
        supply,
        analytics,
        demand_signal_type="VACANCY_HEADCOUNT",
        supply_signal_type="WORKER_HEADCOUNT",
        default_generation_run_id=RUN_ID,
        input_hashes={"demand": demand.sha256, "supply": supply.sha256},
    )


def test_repository_persists_observations_model_and_forecast_without_live_database():
    demand = make_batch("demand", (120, 130, 140))
    supply = make_batch("supply", (90, 95, 100))
    analytics = build_analytics(demand, supply)
    session = FakeSession()

    counts = persist(session, demand, supply, analytics)

    assert counts["generation_runs_inserted"] == 1
    assert counts["observations_inserted"] == 6
    assert counts["model_versions_resolved"] == 1
    assert counts["forecasts_inserted"] == 1
    assert len(session.model_versions) == 1
    saved = next(iter(session.forecasts.values()))
    assert saved["gap"] == Decimal("40.0")
    assert saved["status"] == "SHORTAGE"
    assert saved["is_active"] is True
    assert saved["model_version_id"] is not None


def test_repository_rerun_updates_same_logical_records_instead_of_duplicating():
    demand = make_batch("demand", (120, 130, 140))
    supply = make_batch("supply", (90, 95, 100))
    analytics = build_analytics(demand, supply)
    session = FakeSession()

    persist(session, demand, supply, analytics)
    second = persist(session, demand, supply, analytics)

    assert second["generation_runs_inserted"] == 0
    assert second["observations_inserted"] == 0
    assert second["observations_updated"] == 6
    assert second["forecasts_inserted"] == 0
    assert second["forecasts_updated"] == 1
    assert len(session.observations["demand_observations"]) == 3
    assert len(session.observations["supply_observations"]) == 3
    assert len(session.forecasts) == 1
