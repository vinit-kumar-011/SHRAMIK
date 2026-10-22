-- Expose only the source-registry metadata required by the public, read-only Data Sources UI.
-- Keep notes and created_at unavailable to anon/authenticated; table-level SELECT is not granted.
-- The existing SELECT RLS policy still limits visible rows.
REVOKE SELECT (notes, created_at) ON TABLE public.data_sources FROM anon, authenticated;
GRANT SELECT (
    id,
    name,
    source_type,
    publisher,
    url,
    publication_date,
    accessed_at,
    coverage_start,
    coverage_end
) ON TABLE public.data_sources TO anon, authenticated;
