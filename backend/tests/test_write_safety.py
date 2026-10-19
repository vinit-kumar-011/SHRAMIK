from __future__ import annotations

import pytest

from app.db.write_safety import UnsafeDatabaseTarget, require_nonproduction_write_target


def safe_env(**overrides):
    env = {
        "SHRAMIK_ENABLE_DB_WRITES": "true",
        "SHRAMIK_DEPLOYMENT_ENV": "staging",
        "SHRAMIK_DATABASE_TARGET": "NON_PRODUCTION",
        "SHRAMIK_EXPECTED_DATABASE_HOST": "db.shramik-staging.example",
    }
    env.update(overrides)
    return env


def test_nonproduction_guard_accepts_exact_explicit_staging_target():
    host = require_nonproduction_write_target(
        "postgresql+psycopg://user:password@db.shramik-staging.example:5432/app",
        environ=safe_env(),
    )
    assert host == "db.shramik-staging.example"


@pytest.mark.parametrize(
    "env",
    [
        safe_env(SHRAMIK_ENABLE_DB_WRITES="false"),
        safe_env(SHRAMIK_DEPLOYMENT_ENV="production"),
        safe_env(SHRAMIK_DATABASE_TARGET="PRODUCTION"),
        safe_env(SHRAMIK_EXPECTED_DATABASE_HOST="other.example"),
    ],
)
def test_nonproduction_guard_fails_closed_when_any_guard_is_missing(env):
    with pytest.raises(UnsafeDatabaseTarget):
        require_nonproduction_write_target(
            "postgresql://user:password@db.shramik-staging.example:5432/app",
            environ=env,
        )


def test_connected_live_shramik_project_is_denylisted_even_if_flags_are_wrongly_enabled():
    host = "db.vnmvejubmypbpiaxtrgc.supabase.co"
    env = safe_env(SHRAMIK_EXPECTED_DATABASE_HOST=host)
    with pytest.raises(UnsafeDatabaseTarget, match="active SHRAMIK Supabase project"):
        require_nonproduction_write_target(
            f"postgresql://postgres:password@{host}:5432/postgres",
            environ=env,
        )


def test_expected_host_must_match_actual_database_host():
    with pytest.raises(UnsafeDatabaseTarget, match="does not match"):
        require_nonproduction_write_target(
            "postgresql://user:password@db.another.example:5432/app",
            environ=safe_env(),
        )


def test_unconfigured_database_url_never_allows_a_write():
    with pytest.raises(UnsafeDatabaseTarget, match="DATABASE_URL is not configured"):
        require_nonproduction_write_target(None, environ=safe_env())
