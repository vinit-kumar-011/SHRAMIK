# SHRAMIK Global UI/UX Design System

**Document ID:** SHRAMIK-DS-001\
**Version:** 1.0\
**Status:** Global design contract for frontend implementation\
**Applies to:** Public website, authentication, intelligence workspace,
data operations, reports, simulator, settings and administration\
**Visual direction:** Civic Intelligence --- editorial, evidence-led,
public-sector oriented

------------------------------------------------------------------------

## 0. How this document must be used

This is the single shared design contract for every person and AI agent
working on SHRAMIK's frontend.

**Rule:** Do not invent a new visual language for an individual page.
Compose pages from this system. If a component or behaviour is not
covered, propose an extension to the design system before creating a
one-off pattern.

Every AI coding prompt must include this document or the relevant
sections from it. A screenshot is inspiration; this document is the
implementation contract.

### Sources of truth

Use this order when instructions conflict:

1.  The approved SHRAMIK visual reference and explicit product
    decisions.
2.  This global design system.
3.  The page-specific specification.
4.  Existing shared components and tokens in the repository.
5.  Individual implementation preferences.

Do not silently override an approved shared component to make one page
look different.

### Repository handoff

Recommended location: - `docs/frontend/SHRAMIK_GLOBAL_DESIGN_SYSTEM.md`
--- this specification. - `docs/frontend/PAGE_SPEC_TEMPLATE.md` ---
template for page-specific requirements. -
`docs/frontend/COMPONENT_INVENTORY.md` --- components and their
implementation status. - `frontend/src/styles/tokens.css` ---
implementation tokens, if the chosen stack supports CSS variables. -
`frontend/src/components/ui/` --- shared UI primitives. -
`frontend/src/components/layout/` --- global shell, navigation and page
layout. - `frontend/src/components/data-viz/` --- reusable chart
wrappers and legends.

Adapt paths to the existing repository structure; do not create a second
frontend app or duplicate an existing component library.

------------------------------------------------------------------------

# 1. Product and design principles

SHRAMIK is a Labour Market Intelligence System (LMIS), not a job portal.
It helps users examine workforce demand, supply, skill gaps, emerging
skills, forecasts and possible skilling interventions.

Every screen must express these principles:

1.  **Institutional clarity:** professional, calm, legible and suitable
    for public-sector use.
2.  **Evidence before decoration:** data, definitions, provenance and
    limitations take priority over visual effects.
3.  **One system:** pages share layout rules, component behaviour and
    design tokens.
4.  **Interactive by intent:** interactions help users explore, compare,
    understand or act; motion is never filler.
5.  **Honest data presentation:** no invented live status, unsupported
    metrics, false confidence or fabricated official affiliation.
6.  **Accessible by default:** keyboard operation, visible focus,
    meaningful labels, adequate contrast and reduced-motion support.
7.  **Backend-ready frontend:** mock data and UI state are isolated from
    data services and forecasting logic.

The website should feel alive because it responds intelligently---not
because everything moves.

------------------------------------------------------------------------

# 2. Visual identity

## 2.1 Overall aesthetic

Use the agreed **Civic Intelligence / editorial neo-brutalist**
direction:

-   Warm off-white canvas.
-   Subtle dotted/grid texture.
-   Bold, condensed black display typography.
-   Thin dark outlines.
-   White or warm-white cards.
-   Moderately rounded rectangular surfaces.
-   Hard offset shadows used selectively.
-   Yellow as the primary action/highlight colour.
-   Restrained navy, orange and teal for information and data
    visualisation.
-   Documentary-style monochrome Indian workforce, industrial and urban
    imagery on selected public-facing sections.

Do not turn the design into a cyberpunk dashboard, generic SaaS gradient
template, glassmorphism interface or imitation of an official government
portal.

## 2.2 Colour tokens

Use semantic tokens, not arbitrary colours scattered throughout
components.

  ---------------------------------------------------------------------------
  Token                       Value                   Intended use
  --------------------------- ----------------------- -----------------------
  `--shramik-canvas`          `#F7F6F0`               Main page background

  `--shramik-surface`         `#FFFFFF`               Cards, panels and input
                                                      surfaces

  `--shramik-surface-muted`   `#F0EFE8`               Secondary panels and
                                                      hover surfaces

  `--shramik-ink`             `#171717`               Primary text

  `--shramik-ink-muted`       `#62625C`               Supporting text

  `--shramik-border`          `#292929`               Main outlines

  `--shramik-border-muted`    `#D8D6CD`               Quiet dividers and
                                                      secondary outlines

  `--shramik-yellow`          `#F2D34F`               Primary actions and
                                                      selected highlights

  `--shramik-yellow-hover`    `#E6C33C`               Hover/active yellow

  `--shramik-navy`            `#203A5B`               Analytical emphasis and
                                                      selected series

  `--shramik-orange`          `#EB791D`               Secondary chart series
                                                      or caution accent

  `--shramik-teal`            `#20A89C`               Secondary chart series

  `--shramik-success`         `#35745D`               Success/verified status
                                                      where semantically
                                                      valid

  `--shramik-warning`         `#B56732`               Caution/warning state

  `--shramik-danger`          `#B42318`               Errors or critical
                                                      state, only when
                                                      justified

  `--shramik-info`            `#315D8A`               Informational state
  ---------------------------------------------------------------------------

Rules: - Yellow is an accent, not the background for every section. - Do
not use green to imply a positive result unless the data supports that
interpretation. - Never communicate status through colour alone; pair it
with text, an icon or a pattern. - Chart colours must remain
distinguishable and consistent between pages. - Validate contrast in
actual combinations; the token table alone does not guarantee WCAG
compliance. - Do not add a new brand colour for a single page without
documenting and approving it.

## 2.3 Typography

Preferred direction: - **Display/headings:** a readable condensed
sans-serif such as `Barlow Condensed` or an approved equivalent. -
**Body/UI:** `IBM Plex Sans`, Inter or an existing well-supported
sans-serif already used in the project. - **Numerical data:** tabular
numerals where available.

Suggested scale: - Hero heading: `clamp(2.5rem, 5vw, 4.25rem)`,
approximately 40--68 px. - Page title: 36--48 px desktop; 30--36 px
mobile. - Section heading: 28--40 px. - Card title: 18--22 px. - Body:
16--18 px. - Controls and navigation: 14--16 px. - Metadata/eyebrows:
12--14 px.

Rules: - Use condensed display typography for prominent headings, not
dense body text. - Keep body copy readable and line lengths
controlled. - Use consistent heading levels; do not skip heading levels
for visual reasons. - Use tabular numerals for comparable metrics and
financial-like values. - Support Indian names and terminology. If
multilingual support is added, test the required scripts before choosing
final fonts.

## 2.4 Spacing and layout tokens

Use a 4 px base spacing rhythm.

  Token          Value
  ------------ -------
  `space-1`       4 px
  `space-2`       8 px
  `space-3`      12 px
  `space-4`      16 px
  `space-5`      20 px
  `space-6`      24 px
  `space-8`      32 px
  `space-10`     40 px
  `space-12`     48 px
  `space-16`     64 px
  `space-20`     80 px

Layout guidance: - Maximum public content width: 1200--1280 px. -
Desktop page gutters: 48--64 px. - Tablet gutters: 28--36 px. - Mobile
gutters: 20--24 px. - Keep a consistent grid and align page titles,
section headings, cards and content edges. - Do not use arbitrary
per-page margins to compensate for a poorly structured component.

## 2.5 Borders, radius and shadows

  --------------------------------------------------------------------------------
  Token                   Value                            Use
  ----------------------- -------------------------------- -----------------------
  `radius-control`        6--9 px                          Inputs and compact
                                                           controls

  `radius-card`           10--14 px                        Cards and panels

  `radius-pill`           999 px                           Small tags only where
                                                           appropriate

  `border-default`        1 px solid ink                   Standard outlined
                                                           card/control

  `border-emphasis`       1.5 px solid ink                 Primary card/action
                                                           emphasis

  `shadow-offset`         `3px 3px 0 #292929`              Primary buttons and
                                                           selected feature cards

  `shadow-subtle`         `0 2px 8px rgba(23,23,23,.06)`   Sticky header, popovers
                                                           and quiet elevation
  --------------------------------------------------------------------------------

Hard offset shadows are a brand feature, not a universal default. Do not
put a strong black shadow on every card, input, menu and dialog.

## 2.6 Dotted texture and imagery

-   Treat the dotted/grid texture as a low-contrast decorative layer.
-   Use it most visibly on the landing page, hero, selected
    public-facing panels and occasional section backgrounds.
-   Reduce or remove texture behind dense charts, tables, forms, maps
    and administration screens.
-   The texture must never reduce text contrast or obscure focus
    indicators.
-   Use monochrome documentary-style imagery selectively on public
    pages.
-   Do not use decorative worker photography inside dense operational
    tables or as a substitute for evidence.
-   Use genuine, licensed or otherwise approved imagery. Do not
    fabricate partner logos, government seals or institutional
    endorsements.

------------------------------------------------------------------------

# 3. Global application shell

## 3.1 Public shell

For `/`, `/about` and public methodology content: - Header with SHRAMIK
wordmark and descriptor. - Clear navigation to relevant page sections. -
One primary action at most in the header. - Sticky behaviour may be used
after scrolling, with a subtle border/shadow. - Footer uses a consistent
column layout and responsive collapse. - Mobile navigation must be
keyboard-accessible and close after navigation.

Do not use unofficial government emblems or claim official government
affiliation without authorization.

## 3.2 Authenticated application shell

For dashboard, demand, supply, gaps, forecasts, simulator, reports, data
operations and administration: - Consistent sidebar. - Consistent top
bar. - Main content area with predictable max width and spacing. -
Breadcrumbs for nested/detail views. - Page title and one-sentence
context. - A predictable location for global search and relevant user
controls. - Shared filter placement on analytical pages. - Persistent
page state where practical when opening/closing a contextual drawer.

Recommended expanded sidebar width: 240--260 px. It may collapse to an
icon rail on smaller screens, but icons need accessible names and a
clear active state.

Active navigation must use more than colour alone: use a light yellow
surface plus a border/indicator and stronger text weight.

## 3.3 Page header pattern

Standard pattern: 1. Breadcrumbs, if applicable. 2. Small
eyebrow/category label, only when useful. 3. Page title. 4. Concise
description. 5. Primary action(s), if applicable. 6. Scope/date/context
strip on data pages.

Do not repeat the same title in a badge, a card and a large heading.
Keep the page's purpose immediately clear.

------------------------------------------------------------------------

# 4. Component contracts

All pages must use shared components or approved equivalents. Do not
create local versions with slightly different spacing, colours or
behaviours.

## 4.1 Buttons

Variants: - `primary`: yellow fill, dark border, restrained offset
shadow. - `secondary`: white/transparent fill, dark outline. -
`tertiary`: text/quiet action for low-emphasis tasks. - `danger`:
reserved for destructive/consequential actions. - `icon`: compact icon
action with accessible name and tooltip where needed.

States: - default - hover - pressed - keyboard focus-visible -
disabled - loading - success feedback where relevant

Behaviour: - Hover lifts/shifts subtly; press returns towards the
surface. - Suggested transition: 150--220 ms. - Loading state prevents
duplicate submissions. - Disabled controls look disabled and cannot be
activated. - Focus must remain visible. - Every button has a real
action. If a destination is not ready, provide a clear
placeholder/disabled state or route to useful explanatory content---not
a dead click. - Do not use primary yellow buttons for every action on a
page.

## 4.2 Cards

Shared types: - KPI/metric card. - Navigation/capability card. - Chart
card. - Alert/insight card. - Evidence/source card. - Report/simulation
card. - Form/configuration panel.

Rules: - Cards share border, radius, padding and title hierarchy. - A
card is clickable only when it has a meaningful action; clickable cards
must expose hover and focus states. - Keep card content hierarchy
predictable: label/title, key content, context, action if applicable. -
Use offset shadows selectively. - Do not nest multiple unrelated card
borders inside each other. - Avoid making the entire card clickable if
it contains conflicting interactive controls.

## 4.3 Form controls

Applies to text inputs, numeric inputs, select/combobox, date/period
pickers, checkboxes, radio groups, toggles and sliders.

Rules: - Labels remain visible; placeholders do not replace labels. -
Inputs share height, border, radius, typography and focus treatment. -
Numeric controls show units and accepted ranges when relevant. - Slider
and numeric field stay synchronized when they represent the same
value. - Validation appears beside the affected control, in plain
language. - Preserve user input when validation or a service request
fails. - Do not silently clamp, round or change a user's value. -
Dependent controls must explain why they are unavailable. - Provide
reset/clear controls where useful.

## 4.4 Badges and statuses

Use compact badges for meaningful states, not decoration.

Every status must have: - A stable label. - A semantic meaning. -
Consistent colour and icon/text treatment. - A documented source of
truth where the status comes from data.

Do not invent statuses such as "Live", "Verified", "High confidence" or
"Official" to fill empty space.

## 4.5 Tooltips, popovers and drawers

-   Tooltips explain a short term or control; they are not a place for
    essential instructions.
-   Tooltips must work for keyboard focus as well as pointer hover.
-   Popovers are for compact contextual actions or information.
-   Right-side drawers are appropriate for chart details, evidence,
    filters and contextual inspection.
-   Drawers must have a visible close control, meaningful heading and
    correct keyboard focus handling.
-   Closing a drawer should preserve the user's current page and filter
    context.
-   Use modal dialogs for important confirmation or focused tasks, not
    for every detail.

## 4.6 Tables

-   Use consistent row height, padding, separators and header treatment.
-   Sorting must show direction and work with keyboard interaction.
-   Row hover is subtle; selected rows have a distinct, persistent
    state.
-   Long tables need predictable pagination or virtualization when
    justified.
-   Keep row actions in a consistent location.
-   Use sticky headers only when useful.
-   Provide a clear empty state and loading state.
-   Avoid forcing horizontal scrolling on common laptop widths; when a
    wide data table requires it, make the scroll area obvious and
    preserve key identifiers.

## 4.7 Charts and data visualizations

Use shared chart wrappers and common conventions: - Navy for a primary
analytical series. - Neutral blue-grey for a baseline or reference
series. - Yellow or teal for a scenario/secondary series, subject to
contrast and chart context. - Orange for a distinct series or caution
accent, not automatic "bad news". - Historical and forecast values must
be distinguishable by line style, background region or explicit
labels. - Units, periods and series names must be clear. - Tooltips
expose exact values and dates. - Legends are interactive only when
toggling series is useful. - Missing data must remain visibly missing;
do not invent interpolated observations. - Every important chart needs a
textual summary or accessible data-table alternative. - Chart colours
must be consistent across pages and exports. - Do not encode a
shortage/surplus or risk status using colour alone.

## 4.8 Maps

-   Maps are analytical components, not decorative wallpaper.
-   Hover/focus should expose the region name and the metric being
    displayed.
-   Click opens a region detail view or applies a documented selection.
-   Provide a list/table alternative to map interaction.
-   Include legend, units, date and provenance when available.
-   Do not imply complete geographic coverage when regions have missing
    data.

## 4.9 Notifications and feedback

Use: - Inline messages for field-level validation. - Toast/snackbar for
brief success or failure feedback. - Persistent banners for
consequential data limitations or unresolved issues. - Confirmation
dialogs for destructive actions.

Avoid a toast for every minor interaction. Notifications should not
cover important chart data or controls.

------------------------------------------------------------------------

# 5. Interaction and motion system

## 5.1 Motion principles

Motion should clarify state, hierarchy or cause-and-effect. It must not
delay work or make the application feel playful in the wrong context.

Approved motion: - Hover/press feedback: 150--220 ms. - Section entrance
on public pages: 250--400 ms, subtle fade and 8--12 px rise. - Drawer
transition: 200--280 ms. - Chart transition: brief, non-disruptive, and
not replayed unnecessarily. - Small directional icon shift: 2--4 px. -
Sticky header shadow after scrolling.

Use easing that feels natural and consistent. Avoid overshoot/bounce for
core enterprise interactions.

## 5.2 Motion by page type

**Public landing/about pages** - Scroll-aware navigation. - Subtle
section reveals. - Optional restrained hero illustration movement. -
Interactive capability cards. - Selectable workflow stages. -
Interactive platform preview tabs.

**Analytical workspace** - Quick filter updates with clear
loading/updated feedback. - Brief chart transitions. - Active sidebar
state. - Tooltips, selectable legends and contextual drawers. - No
parallax or decorative scroll-jacking.

**Simulator** - Inputs respond immediately. - Results update only
according to a defined run/state model. - Show the difference between
editing a draft and viewing completed results. - A changed configuration
marks prior results stale. - Never animate invented results or show
unvalidated model output as a valid forecast.

**Data operations/admin** - Prioritize fast feedback, clear status,
table usability and safe confirmation. - Minimal decorative motion.

## 5.3 Reduced motion

Respect `prefers-reduced-motion`. In reduced-motion mode: - Remove
parallax and nonessential movement. - Replace entrance movement with
immediate display or a simple fade. - Keep all content visible and all
controls functional. - Do not communicate state solely through
animation.

------------------------------------------------------------------------

# 6. Behaviour contracts for the whole application

## Navigation

-   All visible links and buttons have meaningful outcomes.
-   Active navigation is clear.
-   Breadcrumbs reflect the actual hierarchy.
-   Browser back/forward should behave predictably.
-   Opening/closing a drawer must not unexpectedly reset filters or
    scroll position.

## Filters

-   Shared filters have consistent names, placement and control styles.
-   Show active filter values and provide a reset action when useful.
-   Make clear whether changes apply immediately or after an Apply
    action.
-   Related charts and tables must use the same selected scope.
-   A change of scope invalidates or refreshes dependent results
    explicitly.

## Search

-   Searchable controls expose clear loading, no-result and error
    states.
-   A future global search/command palette can use `Ctrl+K`/`Cmd+K`,
    with the shortcut shown in the UI.
-   Do not ship a decorative search box that cannot search anything.

## Loading

-   Use skeletons only when content is genuinely loading.
-   Avoid layout shifts between loading and loaded states.
-   Keep the user's inputs visible while requests are pending.
-   Prevent duplicate submissions where appropriate.

## Empty states

Every empty state should explain: 1. What is absent. 2. Why it may be
absent, if known. 3. What the user can do next.

## Errors

-   Use plain language and an actionable next step.
-   Preserve user-entered data.
-   Offer retry only when retry is meaningful.
-   Do not reveal stack traces or internal service details to users.

## Data freshness and provenance

-   Show last-updated timestamps only when supplied by a real data
    source.
-   Distinguish source-backed observations, derived estimates,
    mixed-provenance outputs and synthetic demo data.
-   Synthetic data labels must remain visible in previews, saved results
    and exports.
-   Do not use fake live counters, fake real-time indicators or
    fabricated metrics.

------------------------------------------------------------------------

# 7. SHRAMIK Scenario Simulator contract

The simulator must use the same design tokens and components as the rest
of SHRAMIK.

## Layout

-   Page header and breadcrumb.
-   Scope/baseline strip.
-   Left configuration panel.
-   Right results panel.
-   Responsive stacking on tablet/mobile.

## Required controls

-   Region, sector, occupation/skill scope where supported.
-   Baseline reference.
-   Forecast horizon.
-   Training capacity adjustment, with percentage and/or absolute seat
    mode only when supported by the model.
-   Intervention start period.
-   Training lag with explicit unit.
-   Advanced assumptions only when supported by the backend model.

## Required results

-   Demand projection.
-   Baseline supply.
-   Scenario supply.
-   Signed skill-gap comparison using the approved methodology.
-   Intervention timeline where dates can be derived.
-   Data coverage, provenance, uncertainty and limitations.
-   Run status, model/data version and run timestamp where available.

## Required behaviour

-   Slider and numeric inputs remain synchronized.
-   Validate individual fields and cross-field constraints.
-   Do not silently clamp invalid values or modify related fields.
-   Running a simulation has clear idle/loading/success/warning/failure
    states.
-   Preserve configuration after failure.
-   A changed configuration marks old results stale.
-   Baseline and scenario must be comparable in scope, units and period.
-   Forecast uncertainty must only be shown when supplied and defined by
    the model.
-   Do not calculate forecasting outputs in UI components.
-   Keep mock simulation logic inside a mock service, not scattered
    across charts and controls.

## Simulation truthfulness

A training seat is not the same as a person trained, certified, entering
the workforce or employed. The UI must explain the model's assumptions
where available and never promise that an intervention guarantees an
outcome.

------------------------------------------------------------------------

# 8. Responsive behaviour

Use responsive layout rules rather than designing desktop-only screens
and shrinking them.

## Desktop

-   Public hero can use two columns.
-   Capability cards may use three columns.
-   Authenticated shell uses sidebar + content.
-   Simulator uses side-by-side configuration/results.

## Tablet

-   Reduce gutters and heading scale.
-   Capability cards use two columns.
-   Allow sidebar collapse.
-   Stack simulator panels when width is insufficient.

## Mobile

-   Public content becomes one column.
-   Navigation becomes an accessible menu.
-   Buttons stack or wrap without clipping.
-   Cards use one column.
-   Filters become a compact panel or drawer.
-   Simulator controls appear before results.
-   Charts remain readable; use responsive legends and horizontal
    scrolling only where necessary.
-   No page may have accidental horizontal overflow.

Test at approximately 360 px, 390 px, 768 px, 1024 px and 1440 px
widths, plus intermediate widths where layouts change.

------------------------------------------------------------------------

# 9. Accessibility and usability

Target WCAG 2.2 AA as the baseline.

Required: - Semantic landmarks and correct heading order. - Keyboard
access to every interactive control. - Visible focus indicators. -
Accessible names for icon-only buttons. - Persistent form labels and
understandable errors. - Meaningful alt text for informative imagery. -
Text or table alternatives for important charts. - Status is not
indicated by colour alone. - Adequate contrast for text, borders and
focus states. - Reduced-motion support. - Focus management for dialogs
and drawers. - Touch targets large enough for reliable mobile
interaction. - No essential information available only on hover.

------------------------------------------------------------------------

# 10. Frontend/backend boundaries

The frontend may use mock data, but it must not become an alternative
source of business truth.

Rules: 1. Keep mock fixtures in a dedicated mock-data/service module. 2.
Keep UI components presentational and driven by props/state contracts.
3. Keep API/service calls outside reusable visual primitives. 4. Do not
embed database queries, forecast formulas or provenance rules inside
components. 5. Define loading, success, warning, empty and failure
response states. 6. Use explicit TypeScript types for core domain data
where TypeScript is used. 7. Preserve backend-provided units, status,
timestamps, model versions and provenance. 8. Do not fabricate defaults
for unavailable data. 9. Use configuration metadata for supported input
ranges and options; do not hard-code model rules into sliders. 10. Keep
authentication/permissions as integration boundaries until the real
service is available, but design the states now.

Mock data must be deterministic and visibly labelled as illustrative
anywhere a visitor could mistake it for real data.

------------------------------------------------------------------------

# 11. Page-specific variation is allowed---but controlled

Global consistency does not mean every page should look identical.

**Public pages** can use more whitespace, large editorial headings,
documentary imagery, section reveals and expressive feature previews.

**Analytical pages** should use compact headers, clear filters, KPI
cards, charts, tables and contextual details.

**Simulator pages** should prioritize input/output comparison,
assumptions, validation and uncertainty.

**Data operations/admin pages** should prioritize dense but readable
tables, status visibility, filters, safe actions and minimal animation.

All four share the same typography, tokens, borders, controls, motion
language, status semantics and responsive rules.

------------------------------------------------------------------------

# 12. Definition of done for every page

A page is not complete just because it looks good in one screenshot.

Before marking a page complete, verify:

-   [ ] It uses global design tokens and shared components.
-   [ ] Header, sidebar, breadcrumbs and page spacing align with other
    pages.
-   [ ] Typography hierarchy and card spacing are consistent.
-   [ ] Every visible action has a defined outcome.
-   [ ] Hover, pressed, focus, disabled and loading states exist where
    applicable.
-   [ ] Empty, error and warning states are covered.
-   [ ] Forms validate and preserve user input.
-   [ ] Charts have units, labels, tooltips and accessible alternatives
    where relevant.
-   [ ] Mock data is identified and isolated.
-   [ ] No fabricated live status, official affiliation or unsupported
    claim appears.
-   [ ] Desktop, tablet and mobile layouts work.
-   [ ] Keyboard navigation and reduced-motion preferences work.
-   [ ] No accidental horizontal overflow or severe layout shift exists.
-   [ ] The page does not duplicate or fork an existing shared
    component.
-   [ ] Backend integration points are documented and UI code contains
    no business logic that belongs in the service/model.

------------------------------------------------------------------------

# 13. Team workflow for AI-assisted development

Because contributors may not all have repository access, use this
workflow.

## Before a page is generated

Give the AI: 1. This global design system. 2. The page-specific
specification. 3. The approved reference image or relevant crop. 4. The
expected route and integration boundaries. 5. The existing shared
component inventory, if available.

## During implementation

Require the AI to: - Reuse existing components and tokens. - List any
missing component it needs. - Avoid inventing new styles. - Keep mock
data separate. - Implement responsive and interaction states. - Identify
assumptions rather than silently making product decisions.

## During review

The integration owner checks: - Visual consistency against the
reference. - Reuse of the shared component library. - Behaviour at
common breakpoints. - Keyboard/focus/reduced-motion states. - Mock-data
and backend boundaries. - Console errors, dead links and incomplete
states.

## Change control

If a contributor believes a new design pattern is necessary: 1. Explain
the use case. 2. Propose the shared component or token change. 3. Review
it against existing patterns. 4. Approve it centrally. 5. Update this
document and the component inventory. 6. Only then apply it across
pages.

Do not let each AI agent independently reinterpret the brand.

------------------------------------------------------------------------

# 14. Recommended AI handoff prompt

Paste this prompt into every page-building task, together with the
relevant page specification and this design-system file:

> You are implementing a SHRAMIK frontend page. Treat
> `SHRAMIK_GLOBAL_DESIGN_SYSTEM.md` as the binding global UI/UX
> contract, not optional inspiration.
>
> Before coding, identify the existing shared components, tokens, layout
> and route conventions available in the supplied project. Reuse them.
> Do not create parallel versions of existing components.
>
> Follow the Civic Intelligence visual identity: warm off-white canvas,
> subtle dotted texture where appropriate, bold condensed editorial
> headings, dark outlined cards, restrained offset shadows, yellow
> primary actions, and disciplined navy/orange/teal data accents.
>
> Implement all relevant interaction states: hover, pressed, keyboard
> focus, disabled, loading, empty, error, validation and success. Use
> motion to clarify state, not as decoration. Respect reduced motion and
> accessibility requirements.
>
> Make the page responsive. Keep mock data isolated from presentation
> components. Do not invent live metrics, government affiliations,
> source coverage or forecast calculations. Keep service and backend
> integration boundaries explicit.
>
> Every visible control must have a meaningful outcome. If an
> integration is not available, provide a clear, labelled mock behaviour
> or a deliberately disabled state---never a dead button.
>
> Before finishing, report: components reused, components added,
> interaction states implemented, responsive checks performed,
> mock/backend boundaries, assumptions made, and any deviations from the
> global system.
>
> If a requirement conflicts with the design system or cannot be
> implemented with the supplied project context, explain the conflict
> instead of silently inventing a different pattern.

------------------------------------------------------------------------

## Final rule

**SHRAMIK's UI is a system, not a collection of individually generated
pages.**

The global design system defines the visual language and behaviour. Page
specifications define each page's purpose and content. Shared components
enforce consistency. The frontend service layer keeps interactions ready
for real data.

Use all four together. That is how we get a site that feels cohesive,
dynamic, professional and maintainable---even when several people and AI
agents are working on different pages.
