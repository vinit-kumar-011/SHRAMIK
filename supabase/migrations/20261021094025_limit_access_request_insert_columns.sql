-- Keep public access-request submission column-scoped.
-- RLS still enforces PENDING status and validates all submitted form fields.
-- Clients must not choose IDs, statuses, or submission timestamps, and cannot read requests.
REVOKE INSERT ON TABLE public.access_requests FROM anon, authenticated;
REVOKE INSERT (id, status, submitted_at) ON TABLE public.access_requests FROM anon, authenticated;
GRANT INSERT (full_name, email, organization, requested_role, purpose)
  ON public.access_requests TO anon, authenticated;
