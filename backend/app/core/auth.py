"""Supabase access-token verification for protected SHRAMIK APIs."""

from typing import Any

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import get_settings

_bearer = HTTPBearer(auto_error=False)


async def require_supabase_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict[str, Any]:
    """Validate a bearer token against Supabase Auth; never trust decoded JWT claims alone."""
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="A valid Supabase access token is required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    settings = get_settings()
    supabase_url = (settings.supabase_url or "").strip().rstrip("/")
    api_key = (settings.supabase_publishable_key or settings.supabase_anon_key or "").strip()
    if not supabase_url or not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase token verification is not configured on this API.",
        )

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                supabase_url + "/auth/v1/user",
                headers={
                    "apikey": api_key,
                    "Authorization": "Bearer " + credentials.credentials,
                    "Accept": "application/json",
                },
            )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase Auth could not be reached to verify this session.",
        ) from exc

    if response.status_code in (401, 403):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The Supabase access token is invalid or expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not response.is_success:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase Auth is temporarily unable to verify this session.",
        )

    try:
        user = response.json()
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase Auth returned an invalid verification response.",
        ) from exc

    user_id = user.get("id") if isinstance(user, dict) else None
    if not isinstance(user_id, str) or not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Supabase Auth did not return a valid user identity.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return {
        "id": user_id,
        "email": user.get("email") if isinstance(user.get("email"), str) else None,
        "role": user.get("role") if isinstance(user.get("role"), str) else None,
    }
