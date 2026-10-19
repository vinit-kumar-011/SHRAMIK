from ml.gap import SignalProfile
from ml.series import Observation

PROFILE = SignalProfile(unit="PERSONS", flow_stock="FLOW", time_basis="CALENDAR_YEAR",
                        geography="D1", occupation_scope="S1")


def obs(year, qty, synthetic=False, evidence=True, source="src-1"):
    return Observation(
        period_year=year,
        quantity=qty,
        is_synthetic=synthetic,
        source_id=None if synthetic else source,
        evidence_item_id=("ev-%d" % year) if (evidence and not synthetic) else None,
        source_date=None if synthetic else "%d-12-31" % year,
    )


def raises(exc_type, fn, *args, **kwargs):
    try:
        fn(*args, **kwargs)
    except exc_type:
        return True
    raise AssertionError(f"expected {exc_type.__name__}")
