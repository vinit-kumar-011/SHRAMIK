# SHRAMIK Landing Page — React Integration Guide

**Package version:** 2.0 · Civic Intelligence design system

## Included files

- `SHRAMIK_Landing_Page_v2.html` — standalone reference prototype with scoped CSS, local workflow/preview interactions and no backend calls.
- `SHRAMIK_Landing_Page_v2.md` — matching content, behaviour, accessibility and acceptance specification.
- `SHRAMIKLandingPage.tsx` — React component for the existing React + TypeScript application. Interactions use React state.
- `SHRAMIKLandingPage.module.css` — CSS Module; no `body` or `html` selectors. Local component tokens alias the existing `--sh-*` design tokens when available.
- `vite-env.d.ts` — Vite client type reference for CSS modules.

## Recommended integration

1. Copy `SHRAMIKLandingPage.tsx` and `SHRAMIKLandingPage.module.css` into the existing frontend source tree, for example `frontend/src/pages/`.
2. Ensure `frontend/src/vite-env.d.ts` contains `/// <reference types="vite/client" />` if it is not already present.
3. Add the component to the project's existing router at `/`. Do not create a second React app or replace the shared application shell.
4. Confirm `/login` resolves through the real route. The login link is still an integration boundary until the route is implemented.
5. The CSS Module uses scoped `.root` and page-local classes; it does not need to reset global `header`, `section`, `footer`, `h1` or `button` elements.
6. Review local `--sl-*` aliases against the current global tokens. They use `--sh-*` tokens with fallbacks so existing design-token changes can flow through.
7. Keep all demo disclosure labels until the platform preview is connected to real approved data.

## Why both HTML and React versions exist

The HTML file is a convenient standalone artifact to inspect and share. The TSX/CSS Module pair is the preferred form for integration into the SHRAMIK React app. Do not copy standalone body reset rules into global CSS, and do not embed the page as a string through `dangerouslySetInnerHTML`.

## What changed from the uploaded version

- Hero headline rebalanced to a deliberate three-line desktop composition with fluid wrapping on smaller screens.
- Removed automatic and manual dark-theme overrides to preserve the approved light Civic Intelligence direction.
- Removed hover-lift behaviour from informational capability cards that are not actionable.
- Added a five-stage selectable workflow with explanatory text.
- Added evidence/transparency cards for source traceability, methods, uncertainty and provenance.
- Added selectable overview/skill-gap/forecast preview tabs with clearly illustrative, local-only content.
- Replaced the rough placeholder SVG with a more finished original illustration, still clearly labelled as illustrative rather than a licensed documentary photo.
- Consolidated safe-area handling and added page-local anchor spacing.
- Corrected the Markdown headline and aligned the documentation with the implementation.
- Scoped standalone styles under `.shramik-landing`; the React version uses CSS Modules.

## Verification status

Static checks passed for HTML identifiers/anchor targets, component control targets, JavaScript syntax, TSX parsing syntax and CSS parser syntax. Browser-based visual QA and a full Vite/TypeScript build still need to run in the project environment. Test responsive widths including 320, 360, 375/390, 620, 768, 900, 1024, 1280, 1440 and 1920 px plus intermediate sizes; verify keyboard operation, reduced motion, navigation and console errors.
