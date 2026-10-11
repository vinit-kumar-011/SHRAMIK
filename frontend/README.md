# SHRAMIK Frontend Foundation

React + TypeScript + Vite starter for SHRAMIK's Civic Intelligence design system and shared component showcase.

## Run locally

Requires Node.js 20+ recommended.

    cd frontend
    npm install
    npm run dev

Production build:

    npm run build

## Contents
- frontend/src/styles/tokens.css — semantic design tokens.
- frontend/src/styles/global.css — global layout, component styles, responsive rules and motion.
- frontend/src/components/ui.tsx — reusable presentational primitives.
- frontend/src/App.tsx — interactive design-system showcase and local-only demo patterns.

## Integration boundaries
- This is the showcase, not the final production application shell.
- Interactions use local state and illustrative records; no backend calls are made.
- It does not implement authentication, real forecasts, or a database client.
- Replace local demo handlers with service-layer calls at page/application boundaries when backend services are available.
- Never present sample values as official or live labour-market statistics.
- See docs/frontend/SHRAMIK_GLOBAL_DESIGN_SYSTEM.md before adding pages.

Run npm install and npm run build in the development environment before merging. Browser-level verification is still required.