# SHRAMIK Login Page v2 — Fixed Prototype

This package contains the revised standalone login prototype and its supporting files.

## Run locally

Keep `SHRAMIK_Login_v2.html` and `SHRAMIK_Landing_Page_v2.html` in the same folder so the brand and Back to home links work in the standalone package.

Option A: open `SHRAMIK_Login_v2.html` directly in a browser.

Option B: serve the folder using Python:

```powershell
py -m http.server 8000
```

Then open `http://localhost:8000/SHRAMIK_Login_v2.html`.

## Changes in this revision

- Aligns colour/typography tokens with SHRAMIK's global Civic Intelligence design system.
- Locks this public login prototype to the approved light theme.
- Removes duplicate safe-area padding and improves mobile/tablet breakpoints.
- Uses valid local home links and documents the production route adjustment.
- Adds semantic `required` attributes and improved accessible error/status states.
- Keeps an invalid email error visible until its value becomes valid.
- Provides a password visibility control with preserved value and accessible pressed/name state.
- Blocks duplicate submissions and communicates loading state.
- Replaces the hidden “offline email” testing trick with an explicit no-backend prototype response.
- The prototype does not send credentials to a server, log them, or persist them.
- Adds corrected Markdown notes and a dependency-free logic smoke test.

## Smoke test

Requires Node.js only:

```powershell
node tests/login-logic-smoke.test.cjs
```

This test uses a lightweight mocked DOM to exercise the form's JavaScript logic. It is not a substitute for browser-based visual, keyboard and screen-reader testing.

## Integration into the application

- Route: `/login`.
- Change both `./SHRAMIK_Landing_Page_v2.html` home hrefs to `/` or the app's registered landing route.
- Reuse the canonical token stylesheet and shared UI components. The standalone HTML includes matching canonical token names for preview; avoid duplicating them globally during integration.
- Replace `AuthService` with the approved authentication API/provider only when available. The mock is deliberately unable to authenticate users.
- Run the integrated app's production build and browser QA before merging.

## Validation summary

Static HTML parsing, duplicate-ID checks, ARIA reference checks, CSS parsing, token checks and JavaScript syntax checking passed in the authoring environment. The dependency-free interaction smoke test passed. Headless Chromium was blocked by the execution environment, so responsive visual QA must still be run in the developer's actual browser at the widths in `SHRAMIK_Login_v2.md`.
