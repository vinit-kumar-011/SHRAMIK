from decimal import Decimal

from app.ingestion.csv_loader import _numeric_values_equal


def test_numeric_equality_ignores_decimal_scale() -> None:
    assert _numeric_values_equal(Decimal("359900.00"), Decimal("359900"))
    assert _numeric_values_equal("0.00", Decimal("0"))
    assert not _numeric_values_equal(Decimal("359900.01"), Decimal("359900"))


def test_numeric_equality_rejects_non_finite_or_invalid_values() -> None:
    assert not _numeric_values_equal("not-a-number", Decimal("1"))
    assert not _numeric_values_equal(Decimal("NaN"), Decimal("NaN"))
