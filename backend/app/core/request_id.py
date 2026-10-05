import re
from uuid import uuid4

from fastapi import Request

REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9._:-]{1,64}$")


def get_or_create_request_id(request: Request) -> str:
    request_id = getattr(request.state, "request_id", None)
    if request_id:
        return request_id

    supplied = request.headers.get("X-Request-ID")
    request_id = supplied if supplied and REQUEST_ID_PATTERN.fullmatch(supplied) else None
    request_id = request_id or f"req_{uuid4().hex}"
    request.state.request_id = request_id
    return request_id
