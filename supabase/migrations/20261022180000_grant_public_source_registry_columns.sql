-- Expose only the source-registry metadata required by the public, read-only Data Sources UI.
-- Deliberately do not grant table-level SELECT: notes and created_at remain unavailable
-- through the public REST API. The existing SELECT RLS policy still limits visible rows.
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
