"""Gap classification policy (ML output contract v1.1, sections 14 and 15).

These are policy settings, not model behaviour. Change them here only;
never duplicate them in frontend code.
"""
from decimal import Decimal

# SHORTAGE when gap > +10% of forecast demand; OVERSUPPLY when gap < -10%.
# Exactly +10% (or -10%) is BALANCED.
GAP_THRESHOLD_PCT = Decimal("0.10")

# Contract section 15: "MIN_FORECAST_DEMAND = TBD". The value must be chosen
# from SOURCE-BACKED canonical data (Issue #7), never from synthetic ranges.
# It is deliberately left unset: code that needs it must receive it
# explicitly, and fails loudly if it is still None.
MIN_FORECAST_DEMAND = None
