# SHRAMIK Reports — Integration Contract

## Exported module

Recommended: `ReportsPage` default/named export. It should render **page content only**, assuming the host application provides the canonical topbar/sidebar and content frame. Avoid duplicate production shell markup.

Suggested integration:

```tsx
<Route
  path="/reports"
  element={<ReportsPage dataAdapter={reportsAdapter} onNavigate={navigate} />}
/>
```

Adjust names/routes to match the repository's router. Do not introduce a second router for this page.

## Props

```ts
type ReportsPageProps = {
  dataAdapter?: ReportsDataAdapter;
  onNavigate?: (path: string, label?: string) => void;
  initialView?: 'builder' | 'library' | 'preview';
  className?: string;
};
```

The page should work with its deterministic mock adapter during independent development. A separate optional `ReportsPageDevPreview` may render a mock shell for local screenshots, but is not the route component used by the integrated app.

## Shared components and tokens

Use canonical SHRAMIK tokens, typography, buttons, inputs, card/panel, icon and filter components if present in the host repo. The Dashboard reference controls topbar/sidebar dimensions and navigation labels/order. Reports reference controls only the Reports content composition and document-style preview.

Canonical navigation order:
Dashboard; Demand; Supply; Skill Gaps; Forecasts; Emerging Skills; Scenario Simulator; Reports (active); divider; Data Sources; Data Quality.

Do not add Settings, Data Explorer, Access Requests or User Management to the global sidebar based solely on generated images.

## State and error behaviour

- Separate builder draft config from generated snapshot config.
- Changing the config marks the current generated preview stale until regenerated.
- Pass abort/cancellation where adapter pattern supports it; stale responses must not overwrite latest selections.
- REST error never silently switches to mocks.
- If server PDF endpoint is absent, use the labelled browser print fallback. Do not call it a server-generated PDF.
- Never store API secrets or unrestricted source credentials in frontend code.
