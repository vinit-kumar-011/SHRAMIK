"""Allow-listed public datasets eligible for OGD API retrieval.

Resource IDs are environment-configured rather than guessed from catalogue pages.
Only reviewed aggregate datasets should be registered here. Do not add worker-level
or otherwise sensitive datasets to this generic OGD snapshot path.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


@dataclass(frozen=True)
class OGDSource:
    key: str
    name: str
    publisher: str
    source_id: str
    resource_id_setting: str
    catalogue_url: str
    resource_url: str
    observed_grain: str
    measure: str
    refresh_hint: str
    interpretation: str
    use_for_labour_gap: bool = False

    def public_metadata(self, settings: Any) -> dict[str, Any]:
        """Metadata safe for API responses; never returns credentials or IDs."""
        payload = asdict(self)
        payload.pop("source_id", None)
        payload.pop("resource_id_setting", None)
        payload["configured"] = bool(
            getattr(settings, "ogd_api_key", None)
            and getattr(settings, self.resource_id_setting, None)
        )
        return payload


OGD_SOURCES: dict[str, OGDSource] = {
    "eshram_district_registrations": OGDSource(
        key="eshram_district_registrations",
        name="District-wise e-Shram unorganised-worker registrations",
        publisher="Ministry of Labour and Employment / OGD India",
        source_id="10000000-0000-4000-8000-000000000002",
        resource_id_setting="ogd_eshram_resource_id",
        catalogue_url="https://www.data.gov.in/catalog/demographic-data-unorganised-workers-registered-eshram-portal",
        resource_url="https://www.data.gov.in/catalog/demographic-data-unorganised-workers-registered-eshram-portal",
        observed_grain="DISTRICT_DAILY_SNAPSHOT",
        measure="Cumulative e-Shram registrations as of the previous day; inspect fields before normalisation.",
        refresh_hint="Daily, when the upstream resource is updated",
        interpretation=(
            "Registration stock is not an estimate of active jobseekers, available workers, "
            "or labour supply. Do not add registrations across dates."
        ),
    ),
    "udyam_district_enterprises": OGDSource(
        key="udyam_district_enterprises",
        name="District-wise UDYAM registered enterprises",
        publisher="Ministry of Micro, Small and Medium Enterprises / OGD India",
        source_id="10000000-0000-4000-8000-000000000013",
        resource_id_setting="ogd_udyam_resource_id",
        catalogue_url="https://www.data.gov.in/catalog/udyam-registration-msme-registration",
        resource_url="https://www.data.gov.in/resource/district-wise-services-msme-registered-enterprises-under-udyam-registration-till-last-date",
        observed_grain="DISTRICT_SNAPSHOT",
        measure="District-level registered enterprise counts; confirm the chosen resource's fields and LGD-code field.",
        refresh_hint="Daily/periodic according to the selected OGD resource",
        interpretation=(
            "Enterprise registrations are an economic-activity context signal, not vacancies, "
            "hiring demand, or an employment count."
        ),
    ),
    "mgnrega_district_employment": OGDSource(
        key="mgnrega_district_employment",
        name="District-wise MGNREGA data at a glance",
        publisher="Ministry of Rural Development / OGD India",
        source_id="10000000-0000-4000-8000-000000000014",
        resource_id_setting="ogd_mgnrega_resource_id",
        catalogue_url="https://www.data.gov.in/catalog/mahatma-gandhi-national-rural-employment-guarantee-act-mgnrega",
        resource_url="https://www.data.gov.in/catalog/mahatma-gandhi-national-rural-employment-guarantee-act-mgnrega",
        observed_grain="DISTRICT_DAILY_PROGRAMME_SNAPSHOT",
        measure="MGNREGA scheme-level employment/programme indicators; retain source period and field semantics.",
        refresh_hint="Daily/periodic according to the selected OGD resource",
        interpretation=(
            "This is a rural public-works programme signal, not private-sector vacancies or a "
            "measure of total labour demand."
        ),
    ),
    "jss_district_training_snapshot": OGDSource(
        key="jss_district_training_snapshot",
        name="District-wise JSS enrolled and assessed snapshot",
        publisher="Ministry of Skill Development and Entrepreneurship / OGD India",
        source_id="10000000-0000-4000-8000-000000000015",
        resource_id_setting="ogd_jss_resource_id",
        catalogue_url="https://www.data.gov.in/catalog/msde-jan-shikshan-sansthan",
        resource_url="https://www.data.gov.in/catalog/msde-jan-shikshan-sansthan",
        observed_grain="DISTRICT_SNAPSHOT_2022_04_27",
        measure="Enrolled and assessed counts reported for the 27 April 2022 snapshot.",
        refresh_hint="One dated snapshot; do not schedule daily refresh unless a new dated resource is verified",
        interpretation=(
            "Useful as historical training-programme context only. A catalogue metadata refresh does not "
            "make the underlying 2022 snapshot current."
        ),
    ),
}


def get_source(source_key: str) -> OGDSource:
    """Return a registered source; arbitrary URLs/resource IDs are never accepted."""
    try:
        return OGD_SOURCES[source_key]
    except KeyError as exc:
        raise KeyError(f"Unknown OGD source key: {source_key}") from exc
