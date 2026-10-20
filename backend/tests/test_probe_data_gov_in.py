import hashlib
import json

import pytest

import app.ingestion.probe_data_gov_in as probe


class FakeClient:
    def __init__(self, api_key: str):
        assert api_key == "test-local-key"

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return None

    def iter_records(self, resource_id: str, *, page_size: int, max_records: int):
        assert resource_id == "12345678-1234-1234-1234-123456789abc"
        assert page_size == 10
        assert max_records == 10
        return iter([
            {"state": "Example State", "district": "Example District", "registration_count": "123"},
            {"state": "Example State", "district": "Other District", "registration_count": "456"},
        ])


def _args(output_dir):
    return [
        "--resource-id", "12345678-1234-1234-1234-123456789abc",
        "--source-id", "test-district-data",
        "--source-url", "https://www.data.gov.in/resource/test-resource",
        "--output-dir", str(output_dir),
        "--max-records", "10",
    ]


def test_probe_writes_records_and_hash_manifest(monkeypatch, tmp_path, capsys):
    monkeypatch.setenv("DATA_GOV_IN_API_KEY", "test-local-key")
    monkeypatch.setattr(probe, "DataGovInClient", FakeClient)

    exit_code = probe.main(_args(tmp_path))

    assert exit_code == 0
    out = capsys.readouterr().out
    assert "Fetched 2 records." in out
    files = list(tmp_path.glob("*.json"))
    manifests = list(tmp_path.glob("*.manifest.json"))
    records_files = [path for path in files if not path.name.endswith(".manifest.json")]
    assert len(manifests) == 1
    assert len(records_files) == 1

    manifest = json.loads(manifests[0].read_text(encoding="utf-8"))
    records_bytes = records_files[0].read_bytes()
    assert hashlib.sha256(records_bytes).hexdigest() == manifest["records_sha256"]
    assert manifest["record_count"] == 2
    assert manifest["observed_fields"] == ["district", "registration_count", "state"]
    assert manifest["grain_status"] == "PENDING_VERIFICATION"
    assert manifest["api_key_stored"] is False
    assert "test-local-key" not in manifests[0].read_text(encoding="utf-8")
    assert "test-local-key" not in records_files[0].read_text(encoding="utf-8")


def test_probe_refuses_to_run_without_local_api_key(monkeypatch, tmp_path):
    monkeypatch.delenv("DATA_GOV_IN_API_KEY", raising=False)

    with pytest.raises(SystemExit) as exc:
        probe.main(_args(tmp_path))

    assert exc.value.code == 2
    assert list(tmp_path.iterdir()) == []
