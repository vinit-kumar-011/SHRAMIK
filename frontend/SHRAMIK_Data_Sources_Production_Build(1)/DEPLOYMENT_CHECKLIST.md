# Deployment checklist

- [ ] Serve `index.html` over HTTPS on the intended SHRAMIK route.
- [ ] Confirm actual API routes and response schemas match `API_INTEGRATION.md`.
- [ ] Configure authenticated session/CORS/reverse proxy. The static page makes requests only to the configured SHRAMIK API base.
- [ ] Test 401, 403, 404, 429, 5xx, malformed response, empty list, pagination, each details tab, and permission-disabled operations.
- [ ] Verify `SOURCE_BACKED` provenance only appears when supported by server metadata; synthetic data stays explicitly labelled.
- [ ] Keep create and ingestion actions disabled until routes and per-user authorization are tested.
- [ ] Run a final browser/accessibility pass in the deployed app.

**Important:** preview mode uses synthetic fixtures. The bundle does not claim live connectors or source retrieval have been implemented.
