-- Repair the browser read contract used by SHRAMIK's live analytics pages.
-- These are column-level grants only; existing RLS policies still constrain visible rows.
GRANT SELECT (id) ON public.source_metric_observations TO anon, authenticated;
GRANT SELECT (notes) ON public.data_sources TO anon, authenticated;
