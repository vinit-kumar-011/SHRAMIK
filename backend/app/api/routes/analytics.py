"""Read-only, contract-aligned analytics APIs.

The batch pipeline owns calculations and persistence. These routes only read active,
validated output rows; an empty output store is an explicit state, never synthetic data.
"""

from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.encoders import jsonable_encoder
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.auth import require_supabase_user
from app.core.config import get_settings
from app.core.request_id import get_or_create_request_id
from app.db.session import get_db

router = APIRouter()
AnalysisMode = Literal["OFFICIAL", "DEMO"]


def _assert_analysis_mode_allowed(analysis_mode: AnalysisMode) -> None:
    """Make sure a client cannot opt into synthetic records in the official showcase."""
    if analysis_mode != "DEMO":
        return
    settings = get_settings()
    production_environment = settings.environment.strip().lower() in {"production", "prod"}
    if settings.showcase_mode or production_environment:
        raise HTTPException(
            status_code=403,
            detail="Demo analysis mode is disabled for the official showcase.",
        )


def _filters(
    *,
    analysis_mode: AnalysisMode,
    district_id: str | None,
    skill_id: str | None,
    year_from: int | None,
    year_to: int | None,
    year_column: str,
    district_column: str,
    skill_column: str,
) -> tuple[list[str], dict[str, Any]]:
    if year_from is not None and year_to is not None and year_from > year_to:
        raise HTTPException(status_code=400, detail="year_from must be less than or equal to year_to.")

    clauses = ["analysis_mode = :analysis_mode"]
    params: dict[str, Any] = {"analysis_mode": analysis_mode}
    if analysis_mode == "OFFICIAL":
        clauses.append("provenance_state = 'SOURCE_BACKED'")
    if district_id:
        clauses.append(f"{district_column} = :district_id")
        params["district_id"] = district_id
    if skill_id:
        clauses.append(f"{skill_column} = :skill_id")
        params["skill_id"] = skill_id
    if year_from is not None:
        clauses.append(f"{year_column} >= :year_from")
        params["year_from"] = year_from
    if year_to is not None:
        clauses.append(f"{year_column} <= :year_to")
        params["year_to"] = year_to
    return clauses, params


def _result_state(items: list[dict[str, Any]]) -> str:
    return "AVAILABLE" if items else "NO_VALIDATED_RESULTS"


def _items_envelope(request: Request, items: list[dict[str, Any]], total: int, limit: int, offset: int, analysis_mode: str) -> dict:
    return {
        "data": {"items": jsonable_encoder(items)},
        "meta": {
            "request_id": get_or_create_request_id(request),
            "analysis_mode": analysis_mode,
            "provenance_filter": "SOURCE_BACKED only" if analysis_mode == "OFFICIAL" else "DEMO and mixed provenance permitted",
            "result_state": _result_state(items),
            "returned": len(items),
            "total": total,
            "limit": limit,
            "offset": offset,
        },
    }


@router.get("/forecasts", tags=["forecasts"])
def list_forecasts(
    request: Request,
    analysis_mode: AnalysisMode = Query(default="OFFICIAL"),
    district_id: str | None = Query(default=None, min_length=1, max_length=128),
    skill_id: str | None = Query(default=None, min_length=1, max_length=128),
    year_from: int | None = Query(default=None, ge=1900, le=2200),
    year_to: int | None = Query(default=None, ge=1900, le=2200),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    _user: dict = Depends(require_supabase_user),
    db: Session = Depends(get_db),
) -> dict:
    """List active persisted forecast records. Does not run the model or infer missing results."""
    _assert_analysis_mode_allowed(analysis_mode)
    clauses, params = _filters(
        analysis_mode=analysis_mode,
        district_id=district_id,
        skill_id=skill_id,
        year_from=year_from,
        year_to=year_to,
        year_column="period_year",
        district_column="district_id",
        skill_column="skill_id",
    )
    where_sql = " AND ".join(["is_active = TRUE", *clauses])
    params.update({"limit": limit, "offset": offset})
    total = db.execute(text(f"SELECT count(*) FROM forecast_results WHERE {where_sql}"), params).scalar_one()
    rows = db.execute(
        text(f"""
            SELECT id, contract_version, analysis_mode, provenance_state, district_id, skill_id,
                   period_type, period_year, data_status, reason_code, demand_quantity, supply_quantity,
                   demand_index, supply_index, forecast_demand, forecast_supply, demand_unit, supply_unit,
                   demand_temporal_semantics, supply_temporal_semantics, gap_eligible,
                   gap_eligibility_reason, gap, status, forecast_uncertainty, confidence_level,
                   confidence_inputs, evidence_coverage, model_version_id, calculation_run_id,
                   is_active, calculated_at, created_at
            FROM forecast_results
            WHERE {where_sql}
            ORDER BY period_year DESC, calculated_at DESC, district_id ASC, skill_id ASC
            LIMIT :limit OFFSET :offset
        """),
        params,
    ).mappings().all()
    items = [dict(row) for row in rows]
    return _items_envelope(request, items, int(total or 0), limit, offset, analysis_mode)


@router.get("/early-warnings", tags=["early-warnings"])
def list_early_warnings(
    request: Request,
    analysis_mode: AnalysisMode = Query(default="OFFICIAL"),
    district_id: str | None = Query(default=None, min_length=1, max_length=128),
    skill_id: str | None = Query(default=None, min_length=1, max_length=128),
    year_from: int | None = Query(default=None, ge=1900, le=2200),
    year_to: int | None = Query(default=None, ge=1900, le=2200),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    _user: dict = Depends(require_supabase_user),
    db: Session = Depends(get_db),
) -> dict:
    """List active warnings attached to active forecast results only."""
    _assert_analysis_mode_allowed(analysis_mode)
    clauses, params = _filters(
        analysis_mode=analysis_mode,
        district_id=district_id,
        skill_id=skill_id,
        year_from=year_from,
        year_to=year_to,
        year_column="w.detected_period",
        district_column="fr.district_id",
        skill_column="fr.skill_id",
    )
    where_sql = " AND ".join(["w.is_active = TRUE", "fr.is_active = TRUE", *clauses])
    params.update({"limit": limit, "offset": offset})
    from_sql = "FROM early_warnings w JOIN forecast_results fr ON fr.id = w.forecast_result_id"
    total = db.execute(text(f"SELECT count(*) {from_sql} WHERE {where_sql}"), params).scalar_one()
    rows = db.execute(
        text(f"""
            SELECT w.id, w.forecast_result_id, w.emerging_skill_signal_id, w.warning_type,
                   w.severity, w.detected_period, w.explanation_code, w.calculation_run_id,
                   w.is_active, w.created_at, fr.analysis_mode, fr.provenance_state,
                   fr.district_id, fr.skill_id, fr.period_year, fr.status, fr.gap,
                   fr.confidence_level, fr.data_status
            {from_sql}
            WHERE {where_sql}
            ORDER BY w.detected_period DESC, w.created_at DESC, w.severity ASC
            LIMIT :limit OFFSET :offset
        """),
        params,
    ).mappings().all()
    items = [dict(row) for row in rows]
    return _items_envelope(request, items, int(total or 0), limit, offset, analysis_mode)


@router.get("/emerging-skills", tags=["emerging-skills"])
def list_emerging_skills(
    request: Request,
    analysis_mode: AnalysisMode = Query(default="OFFICIAL"),
    district_id: str | None = Query(default=None, min_length=1, max_length=128),
    skill_id: str | None = Query(default=None, min_length=1, max_length=128),
    year_from: int | None = Query(default=None, ge=1900, le=2200),
    year_to: int | None = Query(default=None, ge=1900, le=2200),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    _user: dict = Depends(require_supabase_user),
    db: Session = Depends(get_db),
) -> dict:
    """List active, persisted emerging-skill signals without manufacturing rankings."""
    _assert_analysis_mode_allowed(analysis_mode)
    clauses, params = _filters(
        analysis_mode=analysis_mode,
        district_id=district_id,
        skill_id=skill_id,
        year_from=year_from,
        year_to=year_to,
        year_column="period_year",
        district_column="district_id",
        skill_column="skill_id",
    )
    where_sql = " AND ".join(["is_active = TRUE", *clauses])
    params.update({"limit": limit, "offset": offset})
    total = db.execute(text(f"SELECT count(*) FROM emerging_skill_signals WHERE {where_sql}"), params).scalar_one()
    rows = db.execute(
        text(f"""
            SELECT id, contract_version, district_id, skill_id, period_type, period_year,
                   data_status, emerging_skill_status, recent_growth_rate, historical_growth_rate,
                   signal_strength, analysis_mode, provenance_state, history_periods,
                   total_history_periods, synthetic_history_periods, is_contiguous,
                   calculation_run_id, is_active, calculated_at, created_at
            FROM emerging_skill_signals
            WHERE {where_sql}
            ORDER BY period_year DESC, signal_strength DESC NULLS LAST, district_id ASC, skill_id ASC
            LIMIT :limit OFFSET :offset
        """),
        params,
    ).mappings().all()
    items = [dict(row) for row in rows]
    return _items_envelope(request, items, int(total or 0), limit, offset, analysis_mode)


@router.get("/status", tags=["analytics"])
def analytics_status(
    request: Request,
    _user: dict = Depends(require_supabase_user),
    db: Session = Depends(get_db),
) -> dict:
    """Report source-input and output counts for operational diagnostics."""
    counts = {
        "demand_observations": int(db.execute(text("""
            SELECT count(*) FROM demand_observations
            WHERE provenance_state = 'SOURCE_BACKED' AND is_synthetic = FALSE
        """)).scalar_one() or 0),
        "supply_observations": int(db.execute(text("""
            SELECT count(*) FROM supply_observations
            WHERE provenance_state = 'SOURCE_BACKED' AND is_synthetic = FALSE
        """)).scalar_one() or 0),
        "active_official_source_backed_forecasts": int(db.execute(text("""
            SELECT count(*) FROM forecast_results
            WHERE is_active = TRUE AND analysis_mode = 'OFFICIAL'
              AND provenance_state = 'SOURCE_BACKED' AND data_status = 'SUFFICIENT'
        """)).scalar_one() or 0),
        "active_official_source_backed_warnings": int(db.execute(text("""
            SELECT count(*) FROM early_warnings w
            JOIN forecast_results fr ON fr.id = w.forecast_result_id
            WHERE w.is_active = TRUE AND fr.is_active = TRUE
              AND fr.analysis_mode = 'OFFICIAL' AND fr.provenance_state = 'SOURCE_BACKED'
              AND fr.data_status = 'SUFFICIENT'
        """)).scalar_one() or 0),
        "active_official_source_backed_emerging_skills": int(db.execute(text("""
            SELECT count(*) FROM emerging_skill_signals
            WHERE is_active = TRUE AND analysis_mode = 'OFFICIAL'
              AND provenance_state = 'SOURCE_BACKED' AND data_status = 'SUFFICIENT'
        """)).scalar_one() or 0),
    }
    return {
        "data": {
            "source_inputs": {
                "demand_observations": counts["demand_observations"],
                "supply_observations": counts["supply_observations"],
            },
            "published_outputs": {
                key: value for key, value in counts.items()
                if key not in ("demand_observations", "supply_observations")
            },
        },
        "meta": {
            "request_id": get_or_create_request_id(request),
            "result_state": "AVAILABLE" if counts["active_official_source_backed_forecasts"] else "NO_VALIDATED_RESULTS",
            "note": (
                "Source-input counts include SOURCE_BACKED, non-synthetic observations only. "
                "Published-output counts include active official source-backed results only. "
                "This endpoint does not start an analytics run."
            ),
        },
    }
