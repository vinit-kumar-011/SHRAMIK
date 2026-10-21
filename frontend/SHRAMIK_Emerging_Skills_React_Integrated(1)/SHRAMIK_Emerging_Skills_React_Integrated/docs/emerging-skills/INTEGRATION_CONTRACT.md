# Emerging Skills page module — integration contract

## Component contract

Recommended export:

```ts
export interface EmergingSkillsPageProps {
  dataAdapter: EmergingSkillsDataAdapter;
  initialFilters?: Partial<EmergingSkillsFilters>;
  initialView?: 'overview' | 'momentum' | 'connections' | 'regional' | 'profile';
  onNavigate?: (path: string, label?: string) => void;
  onOpenSource?: (sourceRef: string) => void;
}

export function EmergingSkillsPage(props: EmergingSkillsPageProps): JSX.Element;
```

Adapt names to the repository's React/TS versions and current patterns. Do not create a second app or router in the reusable module.

## Host responsibilities

- Render shared topbar/sidebar/shell once.
- Provide authentication context, global route navigation, permissions, API client and shared notification/error handling.
- Register `/emerging-skills` (or the approved route) when integrating all pages.
- Supply the canonical `EmergingSkillsDataAdapter`, configured for mock or REST mode.
- Provide/approve the state/UT geometry asset and establish common geography IDs/codes.

## Page responsibilities

- Manage its own five-view selection, filter state, selected skill/node, compare selection and local panel state.
- Call only adapter methods; no URLs/fetch calls inside visual components.
- Never persist a watchlist in local storage and claim backend persistence. Local temporary selection is allowed but must be labelled preview-only if persistence is unavailable.
- Preserve relevant state between views. Reset clears filters and comparison according to documented behaviour.
- Export reusable content without owning the host shell.

## Adapter lifecycle

- All async adapter reads accept an AbortSignal or equivalent cancellation. Prevent older responses replacing newer filter results.
- Mock adapter is deterministic and returns `SYNTHETIC_DEMO` metadata. Mock fixtures must cover empty, partial coverage, unavailable source, no graph relationships, and service error states.
- REST adapter validates response shape before presentation and propagates safe errors.
- A failed REST request must not silently use demo values. Offer retry and retain last-good values only with an explicit stale indicator if consistent with app behaviour.

## Dependencies

Inspect the existing app before selecting chart/map/network libraries. Reuse current dependencies if possible. If a new library is necessary, explain why, verify bundle/license/accessibility suitability and isolate it behind a thin chart/graph adapter.
