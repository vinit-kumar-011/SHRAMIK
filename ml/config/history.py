"""History rules (ML output contract v1.1, sections 9 and 18).

Both values are provisional MVP settings until source-backed coverage
is assessed in Issue #7.
"""

# Usable yearly observations needed before a forecast is produced.
# OFFICIAL counts source-backed observations only; DEMO counts all supplied.
MIN_FORECAST_HISTORY = 3

# Source-backed periods needed before HIGH confidence is even allowed.
HIGH_CONFIDENCE_MIN_HISTORY = 5
