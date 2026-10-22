import asyncio
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.core import auth


class FakeResponse:
    def __init__(self, status_code: int, payload):
        self.status_code = status_code
        self._payload = payload
        self.is_success = 200 <= status_code < 300

    def json(self):
        return self._payload


class FakeAsyncClient:
    def __init__(self, response: FakeResponse):
        self.response = response
        self.request_url = None
        self.request_headers = None

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, traceback):
        return False

    async def get(self, url: str, headers: dict):
        self.request_url = url
        self.request_headers = headers
        return self.response


def credentials(token: str = "valid-access-token") -> HTTPAuthorizationCredentials:
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


def test_supabase_session_is_checked_at_auth_user_endpoint(monkeypatch) -> None:
    fake_client = FakeAsyncClient(FakeResponse(200, {
        "id": "auth-user-123",
        "email": "reader@example.invalid",
        "role": "authenticated",
    }))
    monkeypatch.setattr(auth, "get_settings", lambda: SimpleNamespace(
        supabase_url="https://project.supabase.co",
        supabase_publishable_key="sb_publishable_test",
        supabase_anon_key=None,
    ))
    monkeypatch.setattr(auth.httpx, "AsyncClient", lambda timeout: fake_client)

    result = asyncio.run(auth.require_supabase_user(credentials()))

    assert result == {
        "id": "auth-user-123",
        "email": "reader@example.invalid",
        "role": "authenticated",
    }
    assert fake_client.request_url == "https://project.supabase.co/auth/v1/user"
    assert fake_client.request_headers["apikey"] == "sb_publishable_test"
    assert fake_client.request_headers["Authorization"] == "Bearer valid-access-token"


def test_invalid_supabase_token_is_rejected(monkeypatch) -> None:
    monkeypatch.setattr(auth, "get_settings", lambda: SimpleNamespace(
        supabase_url="https://project.supabase.co",
        supabase_publishable_key=None,
        supabase_anon_key="sb_anon_test",
    ))
    monkeypatch.setattr(auth.httpx, "AsyncClient", lambda timeout: FakeAsyncClient(
        FakeResponse(401, {"message": "invalid token"})
    ))

    with pytest.raises(HTTPException) as error:
        asyncio.run(auth.require_supabase_user(credentials("expired-token")))
    assert error.value.status_code == 401


def test_auth_verification_fails_closed_when_supabase_is_unconfigured(monkeypatch) -> None:
    monkeypatch.setattr(auth, "get_settings", lambda: SimpleNamespace(
        supabase_url="",
        supabase_publishable_key=None,
        supabase_anon_key=None,
    ))

    with pytest.raises(HTTPException) as error:
        asyncio.run(auth.require_supabase_user(credentials()))
    assert error.value.status_code == 503
