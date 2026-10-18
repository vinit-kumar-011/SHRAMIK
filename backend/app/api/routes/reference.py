"""Read-only canonical geography and skill lookup endpoints.

These routes deliberately expose reference data only. Forecast outputs remain owned by
separate analytical services and are not computed as a side effect of GET requests.
"""
from collections import defaultdict
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import bindparam, text
from sqlalchemy.exc import InterfaceError, OperationalError
from sqlalchemy.orm import Session

from app.core.request_id import get_or_create_request_id
from app.db.session import get_db

router = APIRouter(tags=["reference data"])


def _database_unavailable(exc: Exception) -> HTTPException:
    return HTTPException(
        status_code=503,
        detail="The database is temporarily unavailable.",
    )


@router.get("/districts")
def list_districts(
    request: Request,
    state_id: Annotated[str | None, Query(min_length=1)] = None,
    active_only: bool = True,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 25,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Return a stable, paginated list of canonical districts."""
    filter_params = {
        "state_id": state_id,
        "active_only": active_only,
    }
    page_params = {
        **filter_params,
        "limit": page_size,
        "offset": (page - 1) * page_size,
    }
    where_sql = (
        "(:active_only = false OR d.is_active = true) "
        "AND (:state_id IS NULL OR d.state_id = :state_id)"
    )
    try:
        total = int(
            db.execute(
                text(f"SELECT count(*) FROM public.districts d WHERE {where_sql}"),
                filter_params,
            ).scalar_one()
        )
        rows = db.execute(
            text(
                """
                SELECT d.id AS district_id, d.name, d.state_id,
                       s.code AS state_code, d.lgd_district_code
                FROM public.districts AS d
                JOIN public.states AS s ON s.id = d.state_id
                WHERE (:active_only = false OR d.is_active = true)
                  AND (:state_id IS NULL OR d.state_id = :state_id)
                ORDER BY lower(s.name), lower(d.name), d.id
                LIMIT :limit OFFSET :offset
                """
            ),
            page_params,
        ).mappings().all()
    except (OperationalError, InterfaceError) as exc:
        raise _database_unavailable(exc) from exc

    return {
        "data": [dict(row) for row in rows],
        "meta": {
            "request_id": get_or_create_request_id(request),
            "page": page,
            "page_size": page_size,
            "total": total,
        },
    }


@router.get("/skills")
def list_skills(
    request: Request,
    sector_id: Annotated[str | None, Query(min_length=1)] = None,
    taxonomy_name: Annotated[str | None, Query(min_length=1)] = None,
    active_only: bool = True,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 25,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Return canonical skills and their taxonomy mapping metadata."""
    filter_params = {
        "sector_id": sector_id,
        "taxonomy_name": taxonomy_name,
        "active_only": active_only,
    }
    page_params = {
        **filter_params,
        "limit": page_size,
        "offset": (page - 1) * page_size,
    }
    where_sql = """
        (:active_only = false OR s.is_active = true)
        AND (:sector_id IS NULL OR s.sector_id = :sector_id)
        AND (
            :taxonomy_name IS NULL OR EXISTS (
                SELECT 1 FROM public.skill_taxonomy_mappings AS tm
                WHERE tm.skill_id = s.id
                  AND lower(tm.taxonomy_name) = lower(:taxonomy_name)
            )
        )
    """
    try:
        total = int(
            db.execute(
                text(f"SELECT count(*) FROM public.skills AS s WHERE {where_sql}"),
                filter_params,
            ).scalar_one()
        )
        rows = db.execute(
            text(
                f"""
                SELECT s.id AS skill_id, s.name, s.sector_id, sec.name AS sector_name
                FROM public.skills AS s
                JOIN public.sectors AS sec ON sec.id = s.sector_id
                WHERE {where_sql}
                ORDER BY lower(s.name), s.id
                LIMIT :limit OFFSET :offset
                """
            ),
            page_params,
        ).mappings().all()
        skill_ids = [row["skill_id"] for row in rows]
        mappings_by_skill: dict[str, list[dict[str, Any]]] = defaultdict(list)
        if skill_ids:
            mapping_query = text(
                """
                SELECT skill_id, taxonomy_name, taxonomy_version, taxonomy_code,
                       mapping_method, mapping_confidence
                FROM public.skill_taxonomy_mappings
                WHERE skill_id IN :skill_ids
                ORDER BY skill_id, taxonomy_name, taxonomy_version NULLS FIRST, taxonomy_code
                """
            ).bindparams(bindparam("skill_ids", expanding=True))
            mapping_rows = db.execute(mapping_query, {"skill_ids": skill_ids}).mappings().all()
            for mapping in mapping_rows:
                skill_id = mapping["skill_id"]
                mappings_by_skill[skill_id].append(
                    {key: value for key, value in dict(mapping).items() if key != "skill_id"}
                )
    except (OperationalError, InterfaceError) as exc:
        raise _database_unavailable(exc) from exc

    data = []
    for row in rows:
        item = dict(row)
        item["taxonomy_mappings"] = mappings_by_skill.get(item["skill_id"], [])
        data.append(item)
    return {
        "data": data,
        "meta": {
            "request_id": get_or_create_request_id(request),
            "page": page,
            "page_size": page_size,
            "total": total,
        },
    }
