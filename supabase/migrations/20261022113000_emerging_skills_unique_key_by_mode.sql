-- Keep official and demo emerging-skill results independently addressable.
-- The forecast API is mode-aware, so this table's logical uniqueness must be too.
-- No rows are deleted; the indexes are rebuilt with analysis_mode in the key.

DROP INDEX IF EXISTS public.uq_emerging_active;
DROP INDEX IF EXISTS public.uq_emerging_logical_result;

CREATE UNIQUE INDEX uq_emerging_logical_result
  ON public.emerging_skill_signals
  (district_id, skill_id, period_type, period_year, analysis_mode, contract_version);

CREATE UNIQUE INDEX uq_emerging_active
  ON public.emerging_skill_signals
  (district_id, skill_id, period_type, period_year, analysis_mode, contract_version)
  WHERE is_active = TRUE;
