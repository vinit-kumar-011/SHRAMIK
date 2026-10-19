# Developer integration guide

## 1. Install and run

```bash
npm install
npm run dev
```

## 2. Mount into the existing SHRAMIK app

1. Copy `src/SHRAMIKDashboard.tsx`, `src/api/`, and `src/shramik-dashboard.css` into the frontend.
2. Copy `public/assets/` into the frontend public assets folder, or change the asset paths consistently.
3. Install `lucide-react` if the host application does not already use it.
4. Mount `<SHRAMIKDashboard dataAdapter={adapter} onNavigate={(path, label) => router.navigate(path)} />` in the approved dashboard route. The `dataAdapter` prop lets the host app inject its authenticated adapter; omit it to select the package adapter from `.env.local`. Adapt the router call to the app's routing library.
5. If the host application owns navigation, subscribe to `shramik:navigate` only if you are not already passing `onNavigate`; do not navigate twice.
6. Keep the global dotted canvas and design tokens centralized; avoid shipping multiple competing global resets.
7. Configure the REST adapter with `.env.local` and implement the endpoints in `docs/API_CONTRACT.md`.
8. Ensure the backend enforces authorization and only returns data the current user can access. UI affordances are not access control.

## 3. API base URL

Set `VITE_SHRAMIK_API_BASE_URL` to the backend origin, such as `http://localhost:8000`. The adapter adds `/api/v1`. If the URL already ends with `/api/v1`, it is used as-is. Cookies are included; auth token injection is available on `RestLabourMarketDataAdapter` constructor for an existing secure token provider.

## 4. No hidden mock fallback in API mode

When the API URL is configured, requests go to the REST adapter. A failing endpoint shows an error/retry state. Do not catch a REST failure and swap in plausible-looking sample values. This prevents illustrative data from masquerading as current evidence.

## 5. Map integration

The asset `india-map-illustrative.png` is decorative only. Before map shading is data-driven, integrate accurate state boundaries with stable official/state codes and join them to metric data from the same API response. Until that exists, the ranked state list is the real data component; do not communicate the map colours as values.

## 6. Verification

Run `npm run typecheck`, `npm run build`, and `npm run dev`. Test region + period changes, ranking metric changes, search selection, notification read mutation, item detail drawer, view-all drawer, keyboard navigation, reduced motion and breakpoints listed in `docs/QA_CHECKLIST.md`.
