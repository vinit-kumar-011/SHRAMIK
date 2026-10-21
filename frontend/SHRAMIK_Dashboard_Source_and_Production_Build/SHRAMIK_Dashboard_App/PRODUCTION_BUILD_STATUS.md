# Production Build Status

A deployable static bundle is available in `dist/`.

## Validated

- TypeScript/JSX transpiled to a precompiled browser bundle.
- CSS and all dashboard image assets packaged locally.
- Local icon SVG components generated into the bundle; no `lucide-react` runtime fetch.
- Production module-loader/root-initialization smoke test passed.
- Adapter tests: 4 passed, 0 failed.
- Static HTML and CSS parsing checks passed.

## Environment limitation

The standard Vite production build (`npm run build`, which runs `tsc -b && vite build`) could not be run here because the package archive has no `node_modules` or lockfile and the npm registry could not be resolved (`curl` returned `Could not resolve host: registry.npmjs.org`). The `dist/` directory is therefore a custom static production bundle, not output from Vite. See `dist/DEPLOYMENT_README.md` and `dist/BUILD_REPORT.json` before deployment.
