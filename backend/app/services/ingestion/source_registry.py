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
        resource_url="https://api.data.gov.in/resource/1d4d1c5a-feea-423b-be4f-c3636fdd1d82",
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
        resource_url="https://ap.data.gov.in/resource/district-wise-total-msme-registered-enterprises-under-udyam-registration-till-last-date",
        observed_grain="DISTRICT_SNAPSHOT",
        measure="District-level registered enterprise counts; confirm the chosen resource's fields and LGD-code field.",
        refresh_hint="Daily/periodic according to the selected OGD resource",
        interpretation=(
            "Enterprise registrations are an economic-activity context signal, not vacancies, "
            "hiring demand, or an employment count."
        ),
    ),
    "udyam_district_services": OGDSource(
        key="udyam_district_services",
        name="District-wise services MSME registrations under UDYAM",
        publisher="Ministry of Micro, Small and Medium Enterprises / OGD India",
        source_id="10000000-0000-4000-8000-000000000016",
        resource_id_setting="ogd_udyam_services_resource_id",
        catalogue_url="https://www.data.gov.in/catalog/udyam-registration-msme-registration",
        resource_url="https://api.data.gov.in/resource/c3dfe7e6-0cfd-4ddb-8f79-9cb3695d9866",
        observed_grain="DISTRICT_SNAPSHOT",
        measure="District-wise registered services enterprises; field names and resource ID require confirmation.",
        refresh_hint="Daily/periodic according to the selected OGD resource",
        interpretation=(
            "Services-sector enterprise registrations are context, not vacancies or workforce counts. "
            "Do not add this value to total UDYAM enterprises."
        ),
    ),
    "udyam_district_manufacturing": OGDSource(
        key="udyam_district_manufacturing",
        name="District-level manufacturing MSME registrations under UDYAM",
        publisher="Ministry of Micro, Small and Medium Enterprises / OGD India",
        source_id="10000000-0000-4000-8000-000000000017",
        resource_id_setting="ogd_udyam_manufacturing_resource_id",
        catalogue_url="https://www.data.gov.in/catalog/udyam-registration-msme-registration",
        resource_url="https://api.data.gov.in/resource/ae789703-638a-4942-b79e-17868103dec8",
        observed_grain="DISTRICT_SNAPSHOT",
        measure="District-wise registered manufacturing enterprises; field names and resource ID require confirmation.",
        refresh_hint="Daily/periodic according to the selected OGD resource",
        interpretation=(
            "Manufacturing enterprise registrations are sectoral economic context, not vacancies or workforce counts. "
            "Do not add this value to total UDYAM enterprises."
        ),
    ),
    "mgnrega_district_employment": OGDSource(
        key="mgnrega_district_employment",
        name="District-wise MGNREGA data at a glance (01 Apr–31 Aug 2023)",
        publisher="Ministry of Rural Development / OGD India",
        source_id="10000000-0000-4000-8000-000000000014",
        resource_id_setting="ogd_mgnrega_resource_id",
        catalogue_url="https://www.data.gov.in/catalog/mahatma-gandhi-national-rural-employment-guarantee-act-mgnrega",
        resource_url="https://api.data.gov.in/resource/ee03643a-ee4c-48c2-ac30-9f2ff26ab722",
        observed_grain="DISTRICT_SNAPSHOT_2023_08_31",
        measure="Fixed-period dataset (01 Apr–31 Aug 2023) including job cards, workers, person-days, households worked, average days and wage rates; validate exact API fields before normalisation.",
        refresh_hint="Historical fixed-period snapshot covering 01 Apr–31 Aug 2023; do not schedule as a live feed.",
        interpretation=(
            "This is a historical rural public-works programme signal, not private-sector vacancies or a "
            "measure of total labour demand. Do not interpret the 2023 period as current conditions."
        ),
    ),
    "jss_district_training_snapshot": OGDSource(
        key="jss_district_training_snapshot",
        name="District-wise JSS enrolled and assessed snapshot",
        publisher="Ministry of Skill Development and Entrepreneurship / OGD India",
        source_id="10000000-0000-4000-8000-000000000015",
        resource_id_setting="ogd_jss_resource_id",
        catalogue_url="https://www.data.gov.in/catalog/msde-jan-shikshan-sansthan",
        resource_url="https://api.data.gov.in/resource/6bd63a89-58cc-4a25-971e-7fb1e5f6775f",
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
