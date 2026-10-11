# SHRAMIK Component Inventory

| Component | Location | Purpose / behaviour |
|---|---|---|
| Button | frontend/src/components/ui.tsx | Primary, secondary, quiet, danger; hover, press, disabled, loading |
| IconButton | same | Accessible icon-only actions |
| Badge | same | Neutral/info/success/warning/danger semantic states |
| Panel | same | Shared outlined surface |
| Field | same | Labeled input, hint and error |
| SelectField | same | Labeled select control |
| Tabs | same | Local view selection with selected state |
| StatusBanner | same | Persistent semantic feedback |
| Drawer | same | Contextual panel with close and backdrop dismissal |
| Page shell | frontend/src/App.tsx + CSS | Responsive sidebar, top bar and showcase |
| Table pattern | frontend/src/App.tsx | Local search, region filtering and sort |
| Scenario controls | frontend/src/App.tsx | Local-only sliders and mock preview |

Rules:
- Extend a shared component before creating a page-specific duplicate.
- Keep API calls outside visual primitives.
- Do not put forecast mathematics or business rules in chart components.
- Define loading, error, empty, disabled and focus states.
- Keep mock data isolated and visibly labelled.
