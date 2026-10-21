# Forecasts — Integration Notes for the Host Application

This page is designed to be added later to the existing SHRAMIK app. The implementation agent should not register a route until the host app's routing strategy is inspected.

## Host app responsibility

- Register the agreed Forecasts route using existing route guards/auth conventions.
- Render the content module inside the existing authenticated application shell.
- Provide the existing shared topbar/sidebar; do not wrap the module in a second shell.
- Provide an authenticated API client/adapter or token provider using the app's current conventions.
- Keep the global sidebar active state tied to the `Forecasts` route.

## Page module responsibility

- Manage selected internal tab and page-level filter state.
- Fetch relevant data through `ForecastsDataAdapter`.
- Keep selection and filter parameters consistent across components and tabs.
- Render loading/empty/error/partial-data/provenance states.
- Avoid handling login, token storage or global navigation policy inside the page module.

## API routes

See `SHRAMIK_FORECASTS_EARLY_WARNINGS_API_CONTRACT.md`. Names are proposed and should be mapped to the existing backend API before implementation.
