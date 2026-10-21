from fastapi import APIRouter

from app.api.routes.health import router as health_router

api_router = APIRouter()
v1_router = APIRouter(prefix="/v1")

api_router.include_router(health_router)
api_router.include_router(v1_router)
