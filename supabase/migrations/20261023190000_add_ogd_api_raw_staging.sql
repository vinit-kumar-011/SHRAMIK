-- Source API pull layer for reviewed, public aggregate OGD resources.
-- Repository artifact only. This migration has NOT been applied to production.

INSERT INTO public.data_sources
    (id, name, source_type, publisher, url, coverage_start, coverage_end, notes)
SELECT
    '10000000-0000-4000-8000-000000000002'::uuid,
    'e-Shram district-wise registration resource',
    'DATASET',
    'Ministry of Labour and Employment / OGD India',
    'https://www.data.gov.in/catalog/demographic-data-unorganised-workers-registered-eshram-portal',
    NULL, NULL,
    'Daily district-wise cumulative registrations. Registration stock is not active jobseekers or available workforce.'
WHERE NOT EXISTS (
    SELECT 1 FROM public.data_sources WHERE id = '10000000-0000-4000-8000-000000000002'::uuid
);

INSERT INTO public.data_sources
    (id, name, source_type, publisher, url, coverage_start, coverage_end, notes)
SELECT
    '10000000-0000-4000-8000-000000000013'::uuid,
    'UDYAM district-wise enterprise registration resource (OGD API)',
    'DATASET',
    'Ministry of Micro, Small and Medium Enterprises / OGD India',
    'https://www.data.gov.in/catalog/udyam-registration-msme-registration',
    NULL, NULL,
    'District-level registered enterprise context. Not a direct vacancy or employment count. Exact OGD resource and response schema must be verified before ingestion.'
WHERE NOT EXISTS (
    SELECT 1 FROM public.data_sources WHERE id = '10000000-0000-4000-8000-000000000013'::uuid
);

INSERT INTO public.data_sources
    (id, name, source_type, publisher, url, coverage_start, coverage_end, notes)
SELECT
    '10000000-0000-4000-8000-000000000014'::uuid,
    'MGNREGA district-wise employment programme resource (OGD API)',
    'DATASET',
    'Ministry of Rural Development / OGD India',
    'https://www.data.gov.in/catalog/mahatma-gandhi-national-rural-employment-guarantee-act-mgnrega',
    NULL, NULL,
    'District-level public works programme signals. These are not a proxy for all labour demand or private-sector vacancies.'
WHERE NOT EXISTS (
    SELECT 1 FROM public.data_sources WHERE id = '10000000-0000-4000-8000-000000000014'::uuid
);

INSERT INTO public.data_sources
    (id, name, source_type, publisher, url, coverage_start, coverage_end, notes)
SELECT
    '10000000-0000-4000-8000-000000000015'::uuid,
    'Jan Shikshan Sansthan district enrolled and assessed snapshot (OGD API candidate)',
    'DATASET',
    'Ministry of Skill Development and Entrepreneurship / OGD India',
    'https://www.data.gov.in/catalog/msde-jan-shikshan-sansthan',
    2022, 2022,
    'Dated snapshot as of 2022-04-27. Do not schedule as a current feed or infer newer observations from metadata refreshes.'
WHERE NOT EXISTS (
    SELECT 1 FROM public.data_sources WHERE id = '10000000-0000-4000-8000-000000000015'::uuid
);

CREATE TABLE IF NOT EXISTS public.stg_ogd_api_fetch_runs (
    retrieval_id uuid PRIMARY KEY
        REFERENCES public.source_retrievals(id) ON DELETE RESTRICT,
    source_key text NOT NULL CHECK (length(btrim(source_key)) > 0),
    resource_id text NOT NULL CHECK (length(btrim(resource_id)) > 0),
    reported_total bigint CHECK (reported_total IS NULL OR reported_total >= 0),
    received_records integer NOT NULL CHECK (received_records >= 0),
    page_size integer NOT NULL CHECK (page_size BETWEEN 1 AND 500),
    truncated boolean NOT NULL,
    field_names jsonb NOT NULL DEFAULT '[]'::jsonb
        CHECK (jsonb_typeof(field_names) = 'array'),
    response_sha256 text NOT NULL CHECK (response_sha256 ~ '^[0-9a-f]{64}$'),
    fetched_at timestamptz NOT NULL DEFAULT now(),
    CHECK (NOT truncated OR reported_total IS NULL OR received_records <= reported_total)
);

CREATE TABLE IF NOT EXISTS public.stg_ogd_api_records (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    retrieval_id uuid NOT NULL
        REFERENCES public.stg_ogd_api_fetch_runs(retrieval_id) ON DELETE RESTRICT,
    record_ordinal integer NOT NULL CHECK (record_ordinal >= 0),
    record_sha256 text NOT NULL CHECK (record_sha256 ~ '^[0-9a-f]{64}$'),
    record_payload jsonb NOT NULL CHECK (jsonb_typeof(record_payload) = 'object'),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (retrieval_id, record_ordinal)
);

CREATE INDEX IF NOT EXISTS idx_stg_ogd_api_records_retrieval
    ON public.stg_ogd_api_records (retrieval_id, record_ordinal);
CREATE INDEX IF NOT EXISTS idx_stg_ogd_api_runs_source_fetched
    ON public.stg_ogd_api_fetch_runs (source_key, fetched_at DESC);

ALTER TABLE public.stg_ogd_api_fetch_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stg_ogd_api_records ENABLE ROW LEVEL SECURITY;

-- Staging is server-side ingestion only. No anon/authenticated Data API access.
REVOKE ALL ON TABLE public.stg_ogd_api_fetch_runs FROM anon, authenticated;
REVOKE ALL ON TABLE public.stg_ogd_api_records FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.stg_ogd_api_fetch_runs TO service_role;
GRANT SELECT, INSERT ON TABLE public.stg_ogd_api_records TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.stg_ogd_api_records_id_seq TO service_role;
