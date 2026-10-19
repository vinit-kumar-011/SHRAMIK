"""Fail-closed guard for explicit non-production pipeline writes."""
from __future__ import annotations

import os
from urllib.parse import urlsplit


class UnsafeDatabaseTarget(RuntimeError):
    """Raised when a requested database write target is not explicitly non-production."""


# Known live SHRAMIK project identifiers are denied for writes by default, even if an
# operator accidentally supplies the non-production environment flags for that project.
BLOCKED_PROJECT_MARKERS = ("vnmvejubmypbpiaxtrgc",)


def require_nonproduction_write_target(
    database_url: str | None,
    *,
    environ: dict[str, str] | None = None,
) -> str:
    """Return the validated database hostname or refuse to permit writes.

    A write requires a deliberate CLI flag plus four environment guards. The exact
    expected host must match, production-like hosts are rejected, and the currently
    connected live SHRAMIK Supabase project is deny-listed.
    """
    env = os.environ if environ is None else environ
    if not database_url:
        raise UnsafeDatabaseTarget("DATABASE_URL is not configured; no write was attempted.")

    if env.get("SHRAMIK_ENABLE_DB_WRITES", "").strip().lower() != "true":
        raise UnsafeDatabaseTarget(
            "Set SHRAMIK_ENABLE_DB_WRITES=true only for an explicitly approved non-production run."
        )
    deployment = env.get("SHRAMIK_DEPLOYMENT_ENV", "").strip().lower()
    if deployment not in {"development", "staging", "test"}:
        raise UnsafeDatabaseTarget(
            "SHRAMIK_DEPLOYMENT_ENV must explicitly be development, staging, or test."
        )
    if env.get("SHRAMIK_DATABASE_TARGET", "").strip().upper() != "NON_PRODUCTION":
        raise UnsafeDatabaseTarget("SHRAMIK_DATABASE_TARGET must be NON_PRODUCTION.")
    expected_host = env.get("SHRAMIK_EXPECTED_DATABASE_HOST", "").strip().lower()
    if not expected_host:
        raise UnsafeDatabaseTarget("SHRAMIK_EXPECTED_DATABASE_HOST must be set to the exact expected host.")

    try:
        parsed = urlsplit(database_url)
        hostname = (parsed.hostname or "").lower()
        username = (parsed.username or "").lower()
    except ValueError as exc:
        raise UnsafeDatabaseTarget("DATABASE_URL is malformed; refusing to write.") from exc
    if not hostname:
        raise UnsafeDatabaseTarget("DATABASE_URL must include a hostname.")
    if hostname != expected_host:
        raise UnsafeDatabaseTarget(
            "DATABASE_URL host does not match SHRAMIK_EXPECTED_DATABASE_HOST; refusing to write."
        )

    configured_blocked_hosts = {
        host.strip().lower()
        for host in env.get("SHRAMIK_BLOCKED_DATABASE_HOSTS", "").split(",")
        if host.strip()
    }
    if hostname in configured_blocked_hosts:
        raise UnsafeDatabaseTarget("Database host is on SHRAMIK_BLOCKED_DATABASE_HOSTS.")
    if any(marker in hostname or marker in username for marker in BLOCKED_PROJECT_MARKERS):
        raise UnsafeDatabaseTarget(
            "The active SHRAMIK Supabase project is blocked from this write path. "
            "Use a separate non-production project."
        )
    host_labels = hostname.replace("_", "-").split(".")
    if any(label in {"prod", "production", "live"} for label in host_labels):
        raise UnsafeDatabaseTarget("Production-like database hosts are not accepted by this write path.")
    return hostname
