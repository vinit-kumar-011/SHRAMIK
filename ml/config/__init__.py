"""SHRAMIK analytics configuration.

Every policy number lives here, never inside model code or the frontend
(ML output contract v1.1, sections 14, 15 and 18).
"""
from ml.config.gap_thresholds import GAP_THRESHOLD_PCT, MIN_FORECAST_DEMAND
from ml.config.history import HIGH_CONFIDENCE_MIN_HISTORY, MIN_FORECAST_HISTORY

CONTRACT_VERSION = "1.1"

__all__ = [
    "CONTRACT_VERSION",
    "GAP_THRESHOLD_PCT",
    "MIN_FORECAST_DEMAND",
    "MIN_FORECAST_HISTORY",
    "HIGH_CONFIDENCE_MIN_HISTORY",
]
