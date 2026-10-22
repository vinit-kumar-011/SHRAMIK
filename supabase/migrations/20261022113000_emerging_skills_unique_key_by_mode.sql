-- Keep official and demo emerging-skill results independently addressable.
-- The logical key is a table constraint; the active key is a partial unique index.
-- No rows are deleted.
ALTER TABLE public.emerging_skill_signals
  DROP CONSTRAINT IF EXISTS uq_emerging_logical_result;
DROP INDEX IF EXISTS public.uq_emerging_active;

ALTER TABLE public.emerging_skill_signals
  ADD CONSTRAINT uq_emerging_logical_result
  UNIQUE (district_id, skill_id, period_type, period_year, analysis_mode, contract_version);

CREATE UNIQUE INDEX uq_emerging_active
  ON public.emerging_skill_signals
  (district_id, skill_id, period_type, period_year, analysis_mode, contract_version)
  WHERE is_active = TRUE;
