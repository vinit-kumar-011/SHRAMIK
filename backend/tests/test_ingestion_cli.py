from __future__ import annotations

from types import SimpleNamespace

from backend.scripts import ingest_canonical_observations as cli


def test_importer_defaults_to_read_only_validation():
    args = cli.build_parser().parse_args(
        ["--demand-csv", "demand.csv", "--supply-csv", "supply.csv"]
    )
    assert args.write is False
    assert args.confirm_db_host is None


def test_importer_refuses_writes_in_production(monkeypatch, capsys):
    monkeypatch.setattr(
        cli,
        "get_settings",
        lambda: SimpleNamespace(
            environment="production",
            database_url="postgresql+psycopg://user:secret@prod.example.test:5432/shramik",
        ),
    )
    monkeypatch.setattr(cli, "SessionLocal", object())

    result = cli.main([
        "--demand-csv", "not-read-demand.csv",
        "--supply-csv", "not-read-supply.csv",
        "--write",
        "--confirm-db-host", "prod.example.test",
    ])

    assert result == 2
    assert "Refusing ingestion writes in a production environment" in capsys.readouterr().err


def test_importer_requires_exact_database_host_confirmation(monkeypatch, capsys):
    monkeypatch.setattr(
        cli,
        "get_settings",
        lambda: SimpleNamespace(
            environment="development",
            database_url="postgresql+psycopg://user:secret@dev.example.test:5432/shramik",
        ),
    )
    monkeypatch.setattr(cli, "SessionLocal", object())

    result = cli.main([
        "--demand-csv", "not-read-demand.csv",
        "--supply-csv", "not-read-supply.csv",
        "--write",
        "--confirm-db-host", "prod.example.test",
    ])

    assert result == 2
    assert "exact hostname" in capsys.readouterr().err
