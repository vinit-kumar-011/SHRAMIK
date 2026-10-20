"""Deployment contract tests for the Vercel FastAPI entrypoint."""


def test_vercel_entrypoint_exports_the_application():
    from app.main import app as canonical_app
    from index import app as vercel_app

    assert vercel_app is canonical_app
