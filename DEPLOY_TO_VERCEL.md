# SHRAMIK React app — Vercel handoff

## Deploy from this repository

1. Import `vinit-kumar-011/SHRAMIK` into Vercel.
2. Leave the Vercel project **Root Directory** at the repository root. The root `vercel.json` installs the nested canonical app, builds its Vite production bundle, and publishes its `dist/` directory.
3. Keep the framework preset as Vite.
4. Add these Environment Variables for Production (the same-project public fallback works without these, but setting them explicitly is recommended):
   - `VITE_SUPABASE_URL=https://vnmvejubmypbpiaxtrgc.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_bhVdjEavYKf91v2w1M2BTg_luThC1-d`
5. Deploy `feature/frontend-unified-app` for the SIH demo. Do not merge to `main` while verifying.
6. When Vercel reports **Ready**, smoke-test `/`, `/login`, `/request-access`, `/demand`, `/supply`, and `/administration` directly and refresh each route.

## Data truth / known gaps

- Browser reads use the project's publishable key with RLS and column-level grants. Never put a service-role or secret key in Vite.
- Published source-backed cards/region ranks read from `sh_public_dashboard_kpis` and `sh_public_dashboard_regions`, plus published PLFS benchmark rows from `source_metric_observations`.
- Demand, supply, forecast-result and emerging-skill-result tables do not yet have validated rows. Those modules intentionally show unavailability rather than borrowing fictional demo totals.
- Login authenticates provisioned accounts through Supabase Auth. A grant-access request is saved with pending status and does not create an account or assign a role.
- Administration stays read-only/mock-labelled until a backend review API exists. Do not use it to approve requests or change permissions.

## Current security boundaries

- Browser roles can read only approved reference/source columns and source-backed observation rows.
- Browser roles can submit a validated pending access request, but cannot select or update the access-request queue.
- Approval and account provisioning need an authorized server-side workflow with authorization and audit logging.

## Authentication verification

Use an account already provisioned and confirmed in Supabase Auth. Expected result: successful sign-in redirects to `/`; invalid credentials show the Auth error. Do not store test passwords in source control.
