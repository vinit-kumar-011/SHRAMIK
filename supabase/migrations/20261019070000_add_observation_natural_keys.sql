-- Prevent duplicate normalized observations and make safe batch replays possible.
-- Existing duplicates are detected before index creation; resolve them explicitly
-- rather than silently deleting or picking a row during migration.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.demand_observations
    WHERE is_synthetic IS FALSE
    GROUP BY state_id, district_id, sector_id, skill_id, observation_grain,
             period_type, period_year, demand_signal_type, source_id,
             source_release
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate source-backed demand observation identities exist; review before adding natural-key indexes';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.demand_observations
    WHERE is_synthetic IS TRUE
    GROUP BY state_id, district_id, sector_id, skill_id, observation_grain,
             period_type, period_year, demand_signal_type, generation_run_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate synthetic demand observation identities exist; review before adding natural-key indexes';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.supply_observations
    WHERE is_synthetic IS FALSE
    GROUP BY state_id, district_id, sector_id, skill_id, observation_grain,
             period_type, period_year, supply_signal_type, source_id,
             source_release
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate source-backed supply observation identities exist; review before adding natural-key indexes';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.supply_observations
    WHERE is_synthetic IS TRUE
    GROUP BY state_id, district_id, sector_id, skill_id, observation_grain,
             period_type, period_year, supply_signal_type, generation_run_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate synthetic supply observation identities exist; review before adding natural-key indexes';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS demand_observations_source_identity_uidx
  ON public.demand_observations (
    state_id, district_id, sector_id, skill_id, observation_grain,
    period_type, period_year, demand_signal_type, source_id, source_release
  ) NULLS NOT DISTINCT
  WHERE is_synthetic IS FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS demand_observations_synthetic_identity_uidx
  ON public.demand_observations (
    state_id, district_id, sector_id, skill_id, observation_grain,
    period_type, period_year, demand_signal_type, generation_run_id
  ) NULLS NOT DISTINCT
  WHERE is_synthetic IS TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS supply_observations_source_identity_uidx
  ON public.supply_observations (
    state_id, district_id, sector_id, skill_id, observation_grain,
    period_type, period_year, supply_signal_type, source_id, source_release
  ) NULLS NOT DISTINCT
  WHERE is_synthetic IS FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS supply_observations_synthetic_identity_uidx
  ON public.supply_observations (
    state_id, district_id, sector_id, skill_id, observation_grain,
    period_type, period_year, supply_signal_type, generation_run_id
  ) NULLS NOT DISTINCT
  WHERE is_synthetic IS TRUE;

COMMENT ON INDEX public.demand_observations_source_identity_uidx IS
  'Natural identity for source-backed demand facts; NULLs are treated as equal.';
COMMENT ON INDEX public.demand_observations_synthetic_identity_uidx IS
  'Natural identity for replay-safe synthetic demand facts within a generation run.';
COMMENT ON INDEX public.supply_observations_source_identity_uidx IS
  'Natural identity for source-backed supply facts; NULLs are treated as equal.';
COMMENT ON INDEX public.supply_observations_synthetic_identity_uidx IS
  'Natural identity for replay-safe synthetic supply facts within a generation run.';
