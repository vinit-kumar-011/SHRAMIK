from fastapi import HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from .request_id import get_or_create_request_id


def error_payload(code: str, message: str, details: object, request_id: str) -> dict:
    return {
        "error": {
            "code": code,
            "message": message,
            "details": details,
            "request_id": request_id,
        }
    }


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    request_id = get_or_create_request_id(request)
    status_map = {400: "INVALID_REQUEST", 401: "UNAUTHORIZED", 403: "FORBIDDEN", 404: "RESOURCE_NOT_FOUND", 503: "SERVICE_UNAVAILABLE", 504: "AI_TIMEOUT"}
    code = status_map.get(exc.status_code, "INTERNAL_ERROR")
    return JSONResponse(
        status_code=exc.status_code,
        content=error_payload(code, str(exc.detail), None, request_id),
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    request_id = get_or_create_request_id(request)
    return JSONResponse(
        status_code=422,
        content=error_payload("VALIDATION_ERROR", "Request validation failed.", exc.errors(), request_id),
    )


async def internal_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = get_or_create_request_id(request)
    return JSONResponse(
        status_code=500,
        content=error_payload("INTERNAL_ERROR", "An unexpected backend error occurred.", None, request_id),
    )


def register_exception_handlers(app: object) -> None:
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, internal_exception_handler)
