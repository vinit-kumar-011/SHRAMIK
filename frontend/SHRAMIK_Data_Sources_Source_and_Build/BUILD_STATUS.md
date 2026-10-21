# Build status

The production static release is `release/index.html` and is self-contained. The React/TypeScript source is provided for integration with the primary SHRAMIK app.

`npm ci` was attempted, but npm registry requests failed with DNS `EAI_AGAIN` in the build environment, leaving dependencies incomplete. Consequently the full `npm run typecheck`, `npm test` and Vite `npm run build` were not verified. The standalone page's JavaScript syntax and browser smoke tests passed; see `QA_REPORT.md`.

After npm access is restored, run:

```bash
npm ci
npm run typecheck
npm test
npm run build
```

Do not treat the pre-existing `dist` output from an earlier starter as current; it is intentionally omitted from this package.
