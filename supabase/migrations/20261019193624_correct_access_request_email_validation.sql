-- Correct email validation so the local migration chain matches the deployed policy/constraint.
ALTER TABLE public.access_requests DROP CONSTRAINT IF EXISTS access_requests_email_shape;
ALTER TABLE public.access_requests
  ADD CONSTRAINT access_requests_email_shape
  CHECK (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+[.][A-Z]{2,}$');

DROP POLICY IF EXISTS shramik_access_requests_insert_pending ON public.access_requests;
CREATE POLICY shramik_access_requests_insert_pending ON public.access_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    status = 'PENDING'
    AND char_length(btrim(full_name)) BETWEEN 2 AND 100
    AND email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+[.][A-Z]{2,}$'
    AND char_length(btrim(organization)) BETWEEN 2 AND 160
    AND requested_role IN ('Read-only Viewer', 'Research Analyst', 'Data Steward')
    AND char_length(btrim(purpose)) BETWEEN 20 AND 1200
  );
