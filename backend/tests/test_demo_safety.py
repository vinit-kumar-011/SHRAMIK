from __future__ import annotations

import pytest

from app.ingestion.demo import validate_demo_database_target


@pytest.mark.parametrize(
    "url",
    [
        "postgresql://user:password@localhost:5432/shramik",
        "postgresql+psycopg://user:password@127.0.0.1:5432/shramik",
        "postgresql://user:password@[::1]:5432/shramik",
    ],
)
def test_demo_generator_allows_local_throwaway_database(url: str) -> None:
    validate_demo_database_target(url)


@pytest.mark.parametrize(
    "url",
    [
        "postgresql://user:password@db.example.supabase.co:5432/postgres",
        "postgresql://remote.example:5432/shramik",
    ],
)
def test_demo_generator_blocks_remote_database_by_default(url: str) -> None:
    with pytest.raises(RuntimeError, match="Refusing to write SYNTHETIC_DEMO rows"):
        validate_demo_database_target(url)


def test_remote_demo_write_requires_both_explicit_opt_ins() -> None:
    url = "postgresql://user:password@db.example.supabase.co:5432/postgres"

    with pytest.raises(RuntimeError, match="requires both"):
        validate_demo_database_target(url, allow_remote_flag=True, allow_remote_env=False)

    with pytest.raises(RuntimeError, match="requires both"):
        validate_demo_database_target(url, allow_remote_flag=False, allow_remote_env=True)

    validate_demo_database_target(
        url,
        allow_remote_flag=True,
        allow_remote_env=True,
    )


def test_demo_generator_blocks_missing_or_malformed_database_url() -> None:
    with pytest.raises(RuntimeError, match="DATABASE_URL is not configured"):
        validate_demo_database_target(None)

    with pytest.raises(RuntimeError, match="could not be parsed"):
        validate_demo_database_target("postgresql://[::1")
