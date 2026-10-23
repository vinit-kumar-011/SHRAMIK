from types import SimpleNamespace

from app.services.ingestion.source_registry import OGD_SOURCES, get_source


def test_registry_has_expected_aggregate_source_keys():
    assert set(OGD_SOURCES) == {
        "eshram_district_registrations",
        "udyam_district_enterprises",
        "udyam_district_services",
        "udyam_district_manufacturing",
        "mgnrega_district_employment",
        "jss_district_training_snapshot",
    }


def test_source_metadata_never_exposes_resource_env_name_or_source_uuid():
    settings = SimpleNamespace(
        ogd_api_key="do-not-return-this",
        ogd_eshram_resource_id="resource-123",
        ogd_udyam_resource_id=None,
        ogd_udyam_services_resource_id=None,
        ogd_udyam_manufacturing_resource_id=None,
        ogd_mgnrega_resource_id=None,
        ogd_jss_resource_id=None,
    )
    metadata = get_source("eshram_district_registrations").public_metadata(settings)
    assert metadata["configured"] is True
    assert "source_id" not in metadata
    assert "resource_id_setting" not in metadata
    assert "resource-123" not in str(metadata)
    assert "do-not-return-this" not in str(metadata)


def test_jss_resource_is_marked_as_historical_snapshot():
    jss = get_source("jss_district_training_snapshot")
    assert "2022" in jss.observed_grain
    assert "do not schedule daily" in jss.refresh_hint.lower()


def test_udyam_total_services_and_manufacturing_are_separate_resources():
    total = get_source("udyam_district_enterprises")
    services = get_source("udyam_district_services")
    manufacturing = get_source("udyam_district_manufacturing")
    assert len({total.source_id, services.source_id, manufacturing.source_id}) == 3
    assert "total-msme" in total.resource_url
    assert "services-msme" in services.resource_url
    assert "manufacturing-msme" in manufacturing.resource_url
    assert "Do not add" in services.interpretation
    assert "Do not add" in manufacturing.interpretation


def test_mgnrega_resource_is_marked_as_historical_period_snapshot():
    mgnrega = get_source("mgnrega_district_employment")
    assert "2023_08_31" in mgnrega.observed_grain
    assert "do not schedule as a live feed" in mgnrega.refresh_hint.lower()
    assert "not current conditions" in mgnrega.interpretation.lower()
