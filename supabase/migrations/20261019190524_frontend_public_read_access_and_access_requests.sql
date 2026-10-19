-- Public read surface and access request intake for the SHRAMIK React application.
-- Expose only source-backed read surfaces to browser roles, and allow pending access-request inserts only.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

DROP POLICY IF EXISTS shramik_public_states_read ON public.states;
DROP POLICY IF EXISTS shramik_public_districts_read ON public.districts;
DROP POLICY IF EXISTS shramik_public_sectors_read ON public.sectors;
DROP POLICY IF EXISTS shramik_public_skills_read ON public.skills;
DROP POLICY IF EXISTS shramik_public_sources_read ON public.data_sources;
DROP POLICY IF EXISTS shramik_public_source_metrics_read ON public.source_metric_observations;
CREATE POLICY shramik_public_states_read ON public.states FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY shramik_public_districts_read ON public.districts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY shramik_public_sectors_read ON public.sectors FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY shramik_public_skills_read ON public.skills FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY shramik_public_sources_read ON public.data_sources FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY shramik_public_source_metrics_read ON public.source_metric_observations
  FOR SELECT TO anon, authenticated USING (provenance_state = 'SOURCE_BACKED' AND is_synthetic IS FALSE);

GRANT SELECT (id, name, code) ON public.states TO anon, authenticated;
GRANT SELECT (id, state_id, name, lgd_district_code, is_active) ON public.districts TO anon, authenticated;
GRANT SELECT (id, code, name, description, is_active) ON public.sectors TO anon, authenticated;
GRANT SELECT (id, code, name, sector_id, description, is_active, sector_mapping_method, sector_mapping_confidence) ON public.skills TO anon, authenticated;
GRANT SELECT (id, name, source_type, publisher, url, publication_date, accessed_at, coverage_start, coverage_end) ON public.data_sources TO anon, authenticated;
GRANT SELECT (source_id, metric_code, metric_type, value_numeric, unit, observation_grain, state_id, sector_id, skill_id, reference_period, period_start, period_end, as_of_date, dimension_values, provenance_state, is_synthetic)
  ON public.source_metric_observations TO anon, authenticated;

CREATE OR REPLACE VIEW public.sh_public_dashboard_kpis WITH (security_invoker = true) AS
WITH source_rows AS (
  SELECT m.metric_code, m.state_id, m.value_numeric, m.unit, m.reference_period, m.dimension_values,
         m.source_id, d.name AS source_label, COALESCE(d.url, m.dimension_values->>'source_url') AS source_url
  FROM public.source_metric_observations AS m
  LEFT JOIN public.data_sources AS d ON d.id = m.source_id
  WHERE m.provenance_state = 'SOURCE_BACKED' AND m.is_synthetic IS FALSE
)
SELECT 'ESHRAM_REGISTRATION_COUNT'::text AS metric_code, 'e-Shram registrations'::text AS title,
       r.value_numeric, 'registrations'::text AS unit, r.reference_period, r.source_label, r.source_url,
       COALESCE(NULLIF(r.dimension_values->>'snapshot_date',''),
                CASE WHEN r.reference_period LIKE 'AS_OF_%' THEN substring(r.reference_period FROM 7) END) AS as_of_date,
       'Cumulative portal registrations; not active jobseekers or available labour supply.'::text AS interpretation_note,
       1::integer AS sort_order
FROM source_rows AS r
WHERE r.metric_code = 'ESHRAM_REGISTRATION_COUNT' AND r.state_id IS NULL
UNION ALL
SELECT 'CTS_PROVISIONAL_SEAT_CAPACITY_BY_TRADE_STATE'::text, 'Provisional CTS seat capacity'::text,
       SUM(r.value_numeric), 'seats'::text,
       ('Academic session ' || COALESCE(MAX(r.dimension_values->>'academic_session'), '2026') || ' (provisional)')::text,
       MAX(r.source_label), MAX(r.source_url), MAX(NULLIF(r.dimension_values->>'source_as_of_date','')),
       'Provisional seats are training capacity context, not enrolments, completions, unique workers or actual labour supply.'::text,
       2::integer
FROM source_rows AS r
WHERE r.metric_code = 'CTS_PROVISIONAL_SEAT_CAPACITY_BY_TRADE_STATE' AND r.state_id IS NOT NULL
HAVING COUNT(*) > 0
UNION ALL
SELECT 'CTS_ITI_COUNT'::text, 'Industrial Training Institutes'::text,
       SUM(r.value_numeric), 'ITIs'::text, 'Source registry snapshot'::text,
       MAX(r.source_label), MAX(r.source_url), MAX(NULLIF(r.dimension_values->>'source_as_of_date','')),
       'Source-backed state/UT institute counts; totals depend on the registered source coverage.'::text,
       3::integer
FROM source_rows AS r
WHERE r.metric_code = 'CTS_ITI_COUNT' AND r.state_id IS NOT NULL
HAVING COUNT(*) > 0
UNION ALL
SELECT 'UR'::text, 'Unemployment rate (PLFS 2025)'::text, r.value_numeric, '%'::text,
       r.reference_period, r.source_label, r.source_url,
       NULLIF(r.dimension_values->>'source_value_review_date',''),
       'Published PLFS benchmark for persons, all ages, combined rural/urban; not a model forecast.'::text,
       4::integer
FROM source_rows AS r
WHERE r.metric_code = 'UR' AND r.state_id IS NULL AND r.reference_period = 'CY2025'
  AND r.dimension_values->>'sex' = 'person' AND r.dimension_values->>'area' = 'combined'
  AND r.dimension_values->>'age_domain' = 'all_ages';

CREATE OR REPLACE VIEW public.sh_public_dashboard_regions WITH (security_invoker = true) AS
WITH source_rows AS (
  SELECT m.metric_code, m.state_id, m.value_numeric, m.unit, m.reference_period, m.dimension_values,
         d.name AS source_label, COALESCE(d.url, m.dimension_values->>'source_url') AS source_url
  FROM public.source_metric_observations AS m
  LEFT JOIN public.data_sources AS d ON d.id = m.source_id
  WHERE m.provenance_state = 'SOURCE_BACKED' AND m.is_synthetic IS FALSE
),
state_metrics AS (
  SELECT 'REGISTRATIONS'::text AS metric_key, 'e-Shram registrations'::text AS metric_label,
         s.id AS state_id, s.name AS state_name, SUM(r.value_numeric) AS value_numeric,
         'registrations'::text AS unit, MAX(r.reference_period) AS reference_period,
         MAX(r.source_label) AS source_label, MAX(r.source_url) AS source_url,
         MAX(NULLIF(r.dimension_values->>'snapshot_date','')) AS as_of_date,
         'Cumulative portal registrations; not active jobseekers or available labour supply.'::text AS interpretation_note
  FROM source_rows AS r JOIN public.states AS s ON s.id = r.state_id
  WHERE r.metric_code = 'ESHRAM_REGISTRATION_COUNT' GROUP BY s.id, s.name
  UNION ALL
  SELECT 'TRAINING_SEATS'::text, 'Provisional CTS seat capacity'::text, s.id, s.name,
         SUM(r.value_numeric), 'seats'::text, 'Academic session 2026 (provisional)'::text,
         MAX(r.source_label), MAX(r.source_url), MAX(NULLIF(r.dimension_values->>'source_as_of_date','')),
         'Provisional training capacity context, not actual labour supply.'::text
  FROM source_rows AS r JOIN public.states AS s ON s.id = r.state_id
  WHERE r.metric_code = 'CTS_PROVISIONAL_SEAT_CAPACITY_BY_TRADE_STATE' GROUP BY s.id, s.name
  UNION ALL
  SELECT 'ITI_COUNT'::text, 'Industrial Training Institutes'::text, s.id, s.name,
         SUM(r.value_numeric), 'ITIs'::text, 'Source registry snapshot'::text,
         MAX(r.source_label), MAX(r.source_url), MAX(NULLIF(r.dimension_values->>'source_as_of_date','')),
         'Source-backed institute counts; source coverage may vary.'::text
  FROM source_rows AS r JOIN public.states AS s ON s.id = r.state_id
  WHERE r.metric_code = 'CTS_ITI_COUNT' GROUP BY s.id, s.name
)
SELECT * FROM state_metrics;
GRANT SELECT ON public.sh_public_dashboard_kpis TO anon, authenticated;
GRANT SELECT ON public.sh_public_dashboard_regions TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  organization text NOT NULL,
  requested_role text NOT NULL,
  purpose text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT access_requests_name_length CHECK (char_length(btrim(full_name)) BETWEEN 2 AND 100),
  CONSTRAINT access_requests_email_shape CHECK (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  CONSTRAINT access_requests_organization_length CHECK (char_length(btrim(organization)) BETWEEN 2 AND 160),
  CONSTRAINT access_requests_role_allowed CHECK (requested_role IN ('Read-only Viewer', 'Research Analyst', 'Data Steward')),
  CONSTRAINT access_requests_purpose_length CHECK (char_length(btrim(purpose)) BETWEEN 20 AND 1200),
  CONSTRAINT access_requests_status_pending CHECK (status IN ('PENDING', 'APPROVED', 'DENIED'))
);
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.access_requests FROM anon, authenticated;
GRANT INSERT (id, full_name, email, organization, requested_role, purpose) ON public.access_requests TO anon, authenticated;
DROP POLICY IF EXISTS shramik_access_requests_insert_pending ON public.access_requests;
CREATE POLICY shramik_access_requests_insert_pending ON public.access_requests FOR INSERT TO anon, authenticated
WITH CHECK (status = 'PENDING'
  AND char_length(btrim(full_name)) BETWEEN 2 AND 100
  AND email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  AND char_length(btrim(organization)) BETWEEN 2 AND 160
  AND requested_role IN ('Read-only Viewer', 'Research Analyst', 'Data Steward')
  AND char_length(btrim(purpose)) BETWEEN 20 AND 1200);
COMMENT ON TABLE public.access_requests IS
  'Public access-request intake. Browser roles may submit validated pending requests only. Review, approval and account provisioning require an authorized server-side workflow.';
