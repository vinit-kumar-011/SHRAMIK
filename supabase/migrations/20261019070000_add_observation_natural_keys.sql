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

CREATE UNIQUE INDEX IF NOT EXISTS uq_demand_source_key
  ON public.demand_observations (
    state_id, district_id, sector_id, skill_id, observation_grain,
    period_type, period_year, source_id, source_release, demand_signal_type
  ) NULLS NOT DISTINCT
  WHERE provenance_state = 'SOURCE_BACKED';

CREATE UNIQUE INDEX IF NOT EXISTS uq_demand_synthetic_key
  ON public.demand_observations (
    state_id, district_id, sector_id, skill_id, observation_grain,
    period_type, period_year, generation_run_id, demand_signal_type
  ) NULLS NOT DISTINCT
  WHERE provenance_state = 'SYNTHETIC_DEMO';

CREATE UNIQUE INDEX IF NOT EXISTS uq_supply_source_key
  ON public.supply_observations (
    state_id, district_id, sector_id, skill_id, observation_grain,
    period_type, period_year, source_id, source_release, supply_signal_type
  ) NULLS NOT DISTINCT
  WHERE provenance_state = 'SOURCE_BACKED';

CREATE UNIQUE INDEX IF NOT EXISTS uq_supply_synthetic_key
  ON public.supply_observations (
    state_id, district_id, sector_id, skill_id, observation_grain,
    period_type, period_year, generation_run_id, supply_signal_type
  ) NULLS NOT DISTINCT
  WHERE provenance_state = 'SYNTHETIC_DEMO';

COMMENT ON INDEX public.uq_demand_source_key IS
  'Natural identity for source-backed demand facts; NULLs are treated as equal.';
COMMENT ON INDEX public.uq_demand_synthetic_key IS
  'Natural identity for replay-safe synthetic demand facts within a generation run.';
COMMENT ON INDEX public.uq_supply_source_key IS
  'Natural identity for source-backed supply facts; NULLs are treated as equal.';
COMMENT ON INDEX public.uq_supply_synthetic_key IS
  'Natural identity for replay-safe synthetic supply facts within a generation run.';
