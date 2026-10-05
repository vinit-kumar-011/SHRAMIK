from fastapi import APIRouter, Request

from app.core.request_id import get_or_create_request_id

router = APIRouter(tags=["health"])


@router.get("/health")
def health(request: Request) -> dict:
    request_id = get_or_create_request_id(request)
    return {
        "data": {"status": "ok", "service": "shramik-api"},
        "meta": {"request_id": request_id},
    }
