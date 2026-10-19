# Scenario Simulator — Module Integration Contract

## Module shape

Build the page as an exportable React + TypeScript feature module. Recommended interface (adapt naming to repository conventions):

```ts
export interface ScenarioSimulatorPageProps {
  dataAdapter?: ScenarioSimulatorDataAdapter;
  onNavigate?: (path: string, label?: string) => void;
  initialScope?: {
    geographyId?: string;
    sectorId?: string;
    skillId?: string;
    occupationCode?: string;
  };
}

export function ScenarioSimulatorPage(props: ScenarioSimulatorPageProps): JSX.Element;
```

If the host app owns the global shell, export the page content without rendering another topbar/sidebar. If this module is temporarily previewed in isolation, use a development-only shell wrapper that is not exported into production integration.

## Ownership boundaries

- Host application: authentication/session, route registration, global topbar/sidebar, global design tokens, permissions, navigation, API base URL, global notification/profile data.
- Scenario Simulator module: draft intervention inputs, validation presentation, run lifecycle UI, selected result tab/view, output rendering and local selection state.
- Adapter: fetch options and baseline metadata, submit a run, poll/read run state, retrieve results by result view, fetch supported sensitivity parameters.
- Backend/model service: resolve approved model version, validate eligibility and input semantics, run calculations, enforce data-quality gates, persist run/results, return uncertainty and provenance.

## Route integration later

The intended app route is `/simulator` (confirm against the host routing convention). This is one sidebar page with internal result tabs: Overview, Regional Impact, Sector Breakdown, Occupation Impact, Sensitivity Analysis. Do not create five sidebar entries or five separate top-level routes unless the product owner approves a change.

## Avoid tight coupling

- Use stable IDs/codes, not visible labels, in API payloads.
- No browser database credentials or upstream government API keys.
- No direct SQL access from page components.
- No simulation formulas embedded in React component code.
- Abort or ignore stale requests; filter/run changes must not allow older responses to overwrite current state.
- Keep adapter types and mock fixtures inside a feature boundary until the host app decides where shared types live.
