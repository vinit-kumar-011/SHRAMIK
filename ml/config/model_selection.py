"""Model-selection rules (ML output contract v1.1, section 10).

The naive last-value baseline is the default. A transparent candidate replaces
it only when a time-aware back-test shows a clear, repeated improvement. These
numbers are provisional MVP settings, fixed before looking at any results, and
should be reviewed with the methodology owner (Issue #14).
"""

# Candidates evaluated against the baseline, in tie-break order.
CANDIDATE_MODELS = ("linear_trend", "simple_exp_smoothing")

# Rolling-origin back-test: each origin trains on all earlier years and predicts
# the next observed year. A candidate is only considered with at least this
# many origins per series (demand and supply each).
MIN_EVAL_ORIGINS = 3

# Training points every model needs at each origin. Using one shared minimum
# means every model is scored on exactly the same origins.
MIN_TRAIN_POINTS = 3

# A candidate must cut the pooled scaled error by at least this share...
MIN_RELATIVE_IMPROVEMENT = 0.10
# ...and be strictly better than the baseline on more than this share of origins.
MIN_WIN_SHARE = 0.5

# Simple exponential smoothing weight on the newest year. Fixed, not fitted:
# fitting a parameter on 3-6 yearly points would overfit.
SES_ALPHA = 0.5
