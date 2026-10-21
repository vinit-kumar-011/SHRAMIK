# SHRAMIK Login v2 — Local Test Bundle

## Preview

Keep all files together after extracting. Open `SHRAMIK_Login_v2.html` or run a local server:

```powershell
py -m http.server 8000
```

Open `http://localhost:8000/SHRAMIK_Login_v2.html`. The included landing page preview has its sign-in links adjusted to return to this local login file. This adjustment is for local preview only; use `/` and `/login` routes in the integrated application.

## Check interaction logic

Requires Node.js; no npm package install is needed:

```powershell
node tests/login-logic-smoke.test.cjs
```

The smoke test uses a lightweight mock DOM to test form logic. It does not replace browser visual QA, assistive-technology testing, or the integrated app build.

## What's included

- `SHRAMIK_Login_v2.html` — fixed standalone login page.
- `SHRAMIK_Login_v2.md` — implementation notes and manual QA checklist.
- `SHRAMIK_Landing_Page_v2.html` — local preview destination.
- `docs/SHRAMIK_GLOBAL_DESIGN_SYSTEM.md` — global UI contract.
- `docs/SHRAMIK_LOGIN_PAGE_SPEC.md` — login page design specification.
- `tests/login-logic-smoke.test.cjs` — dependency-free interaction smoke test.
- `SHRAMIK_Login_v2_validation_report.md` — passed checks and outstanding verification.

## Important

Authentication and password recovery remain deliberately unconnected. The prototype does not send credentials to a server or persist them. Before production, replace the mock service with the approved authentication provider and retest the app.
