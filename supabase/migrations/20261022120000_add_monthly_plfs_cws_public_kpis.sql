-- Publish the latest *complete* all-India PLFS monthly CWS release as context KPIs.
-- Keep monthly CWS (age 15+) separate from annual CY2025 usual-status/context metrics.
-- Only SOURCE_BACKED, non-synthetic source_metric_observations are eligible.

CREATE OR REPLACE VIEW public.sh_public_dashboard_kpis AS
WITH source_rows AS (
    SELECT
        m.metric_code,
        m.state_id,
        m.value_numeric,
        m.unit,
        m.reference_period,
        m.period_end,
        m.observation_grain,
        m.dimension_values,
        m.source_id,
        d.name AS source_label,
        COALESCE(d.url, m.dimension_values ->> 'source_url') AS source_url
    FROM public.source_metric_observations AS m
    LEFT JOIN public.data_sources AS d ON d.id = m.source_id
    WHERE m.provenance_state = 'SOURCE_BACKED'
      AND m.is_synthetic IS FALSE
),
monthly_cws_releases AS (
    SELECT
        r.reference_period,
        max(r.period_end) AS period_end
    FROM source_rows AS r
    WHERE r.metric_code IN ('CWS_LFPR', 'CWS_WPR', 'CWS_UR')
      AND r.state_id IS NULL
      AND r.observation_grain = 'NATIONAL'
      AND r.reference_period LIKE 'MONTHLY_%'
      AND r.dimension_values ->> 'frequency' = 'monthly'
      AND r.dimension_values ->> 'survey_basis' = 'current_weekly_status'
      AND r.dimension_values ->> 'age_domain' = '15_years_and_above'
      AND r.dimension_values ->> 'area' = 'combined'
      AND r.dimension_values ->> 'sex' = 'person'
      AND r.dimension_values ->> 'metric_role' = 'PUBLISHED_CONTEXT'
    GROUP BY r.reference_period
    HAVING count(DISTINCT r.metric_code) = 3
    ORDER BY max(r.period_end) DESC
    LIMIT 1
)
SELECT
    'ESHRAM_REGISTRATION_COUNT'::text AS metric_code,
    'e-Shram registrations'::text AS title,
    r.value_numeric,
    'registrations'::text AS unit,
    r.reference_period,
    r.source_label,
    r.source_url,
    COALESCE(
        NULLIF(r.dimension_values ->> 'snapshot_date', ''),
        CASE
            WHEN r.reference_period LIKE 'AS_OF_%'
                THEN SUBSTRING(r.reference_period FROM 7)
            ELSE NULL::text
        END
    ) AS as_of_date,
    'Cumulative portal registrations; not active jobseekers or available labour supply.'::text AS interpretation_note,
    1 AS sort_order
FROM source_rows AS r
WHERE r.metric_code = 'ESHRAM_REGISTRATION_COUNT'
  AND r.state_id IS NULL

UNION ALL

SELECT
    'CTS_PROVISIONAL_SEAT_CAPACITY_BY_TRADE_STATE'::text AS metric_code,
    'Provisional CTS seat capacity'::text AS title,
    sum(r.value_numeric) AS value_numeric,
    'seats'::text AS unit,
    ('Academic session ' || COALESCE(max(r.dimension_values ->> 'academic_session'), '2026'))
        || ' (provisional)' AS reference_period,
    max(r.source_label) AS source_label,
    max(r.source_url) AS source_url,
    max(NULLIF(r.dimension_values ->> 'source_as_of_date', '')) AS as_of_date,
    'Provisional seats are training capacity context, not enrolments, completions, unique workers or actual labour supply.'::text AS interpretation_note,
    2 AS sort_order
FROM source_rows AS r
WHERE r.metric_code = 'CTS_PROVISIONAL_SEAT_CAPACITY_BY_TRADE_STATE'
  AND r.state_id IS NOT NULL
HAVING count(*) > 0

UNION ALL

SELECT
    'CTS_ITI_COUNT'::text AS metric_code,
    'Industrial Training Institutes'::text AS title,
    sum(r.value_numeric) AS value_numeric,
    'ITIs'::text AS unit,
    'Source registry snapshot'::text AS reference_period,
    max(r.source_label) AS source_label,
    max(r.source_url) AS source_url,
    max(NULLIF(r.dimension_values ->> 'source_as_of_date', '')) AS as_of_date,
    'Source-backed state/UT institute counts; totals depend on the registered source coverage.'::text AS interpretation_note,
    3 AS sort_order
FROM source_rows AS r
WHERE r.metric_code = 'CTS_ITI_COUNT'
  AND r.state_id IS NOT NULL
HAVING count(*) > 0

UNION ALL

SELECT
    'CWS_LFPR'::text AS metric_code,
    'Labour force participation rate (monthly PLFS CWS, age 15+)'::text AS title,
    r.value_numeric,
    '%'::text AS unit,
    COALESCE(NULLIF(r.dimension_values ->> 'reference_label', ''), r.reference_period)
        || ' · monthly CWS, age 15+' AS reference_period,
    r.source_label,
    r.source_url,
    NULL::text AS as_of_date,
    'Published all-India monthly CWS rate for persons aged 15 years and above. Context only; not job demand, workforce supply, or an annual usual-status estimate.'::text AS interpretation_note,
    4 AS sort_order
FROM source_rows AS r
WHERE r.metric_code = 'CWS_LFPR'
  AND r.state_id IS NULL
  AND r.observation_grain = 'NATIONAL'
  AND r.reference_period = (SELECT reference_period FROM monthly_cws_releases)
  AND r.dimension_values ->> 'frequency' = 'monthly'
  AND r.dimension_values ->> 'survey_basis' = 'current_weekly_status'
  AND r.dimension_values ->> 'age_domain' = '15_years_and_above'
  AND r.dimension_values ->> 'area' = 'combined'
  AND r.dimension_values ->> 'sex' = 'person'
  AND r.dimension_values ->> 'metric_role' = 'PUBLISHED_CONTEXT'

UNION ALL

SELECT
    'CWS_WPR'::text AS metric_code,
    'Worker population ratio (monthly PLFS CWS, age 15+)'::text AS title,
    r.value_numeric,
    '%'::text AS unit,
    COALESCE(NULLIF(r.dimension_values ->> 'reference_label', ''), r.reference_period)
        || ' · monthly CWS, age 15+' AS reference_period,
    r.source_label,
    r.source_url,
    NULL::text AS as_of_date,
    'Published all-India monthly CWS rate for persons aged 15 years and above. Context only; not job demand, workforce supply, or an annual usual-status estimate.'::text AS interpretation_note,
    5 AS sort_order
FROM source_rows AS r
WHERE r.metric_code = 'CWS_WPR'
  AND r.state_id IS NULL
  AND r.observation_grain = 'NATIONAL'
  AND r.reference_period = (SELECT reference_period FROM monthly_cws_releases)
  AND r.dimension_values ->> 'frequency' = 'monthly'
  AND r.dimension_values ->> 'survey_basis' = 'current_weekly_status'
  AND r.dimension_values ->> 'age_domain' = '15_years_and_above'
  AND r.dimension_values ->> 'area' = 'combined'
  AND r.dimension_values ->> 'sex' = 'person'
  AND r.dimension_values ->> 'metric_role' = 'PUBLISHED_CONTEXT'

UNION ALL

SELECT
    'CWS_UR'::text AS metric_code,
    'Unemployment rate (monthly PLFS CWS, age 15+)'::text AS title,
    r.value_numeric,
    '%'::text AS unit,
    COALESCE(NULLIF(r.dimension_values ->> 'reference_label', ''), r.reference_period)
        || ' · monthly CWS, age 15+' AS reference_period,
    r.source_label,
    r.source_url,
    NULL::text AS as_of_date,
    'Published all-India monthly CWS rate for persons aged 15 years and above. Keep separate from the annual CY2025 PLFS benchmark; not a forecast.'::text AS interpretation_note,
    6 AS sort_order
FROM source_rows AS r
WHERE r.metric_code = 'CWS_UR'
  AND r.state_id IS NULL
  AND r.observation_grain = 'NATIONAL'
  AND r.reference_period = (SELECT reference_period FROM monthly_cws_releases)
  AND r.dimension_values ->> 'frequency' = 'monthly'
  AND r.dimension_values ->> 'survey_basis' = 'current_weekly_status'
  AND r.dimension_values ->> 'age_domain' = '15_years_and_above'
  AND r.dimension_values ->> 'area' = 'combined'
  AND r.dimension_values ->> 'sex' = 'person'
  AND r.dimension_values ->> 'metric_role' = 'PUBLISHED_CONTEXT'

UNION ALL

SELECT
    'UR'::text AS metric_code,
    'Unemployment rate (PLFS 2025 annual benchmark)'::text AS title,
    r.value_numeric,
    '%'::text AS unit,
    r.reference_period,
    r.source_label,
    r.source_url,
    NULLIF(r.dimension_values ->> 'source_value_review_date', '') AS as_of_date,
    'Published CY2025 benchmark for persons, all ages, combined rural/urban; differs from monthly CWS rates for persons aged 15+.'::text AS interpretation_note,
    7 AS sort_order
FROM source_rows AS r
WHERE r.metric_code = 'UR'
  AND r.state_id IS NULL
  AND r.reference_period = 'CY2025'
  AND r.dimension_values ->> 'sex' = 'person'
  AND r.dimension_values ->> 'area' = 'combined'
  AND r.dimension_values ->> 'age_domain' = 'all_ages';
