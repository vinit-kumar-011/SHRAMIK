# SHRAMIK Landing Page — Revised Implementation Notes

**Version:** 2.0  
**Status:** Revised standalone prototype; ready for browser QA and React integration review  
**Route when integrated:** `/`  
**Design contract:** SHRAMIK Global Design System — Civic Intelligence

## Product intent

SHRAMIK is a labour-market intelligence and decision-support platform concept. The landing page introduces its intended capabilities and explains how connected workforce information can support planning. It is not a job portal and does not claim to be an official government portal.

## Section order

1. **Header:** wordmark, descriptor, Overview, Capabilities, How it works, Methodology, Sign in; accessible mobile menu.
2. **Hero:** “Data for People. Opportunities for a Stronger India.” explanatory copy, Explore SHRAMIK and View platform preview CTAs, illustrative original workforce/city scene.
3. **Core principles:** evidence-based insights, inclusive growth opportunities, stronger workforce planning.
4. **Connected information:** fragmented information versus one connected view.
5. **Capabilities:** workforce demand, workforce supply, skill gap analysis, emerging skills, workforce forecasting, skilling intervention planning.
6. **Five-stage workflow:** Gather signals, Harmonise data, Estimate demand and supply, Identify gaps and emerging needs, Evaluate possible interventions.
7. **Evidence & transparency:** traceable sources, transparent methods, visible uncertainty, clear provenance, limitations statement.
8. **Platform preview:** selectable Overview, Skill gaps and Forecasts states using illustrative local content.
9. **Closing CTA and footer:** sign in, navigation, and a clear statement that the page does not claim official affiliation or live-data display.

## Approved interaction behaviour

- Sticky header gains a subtle shadow after scrolling.
- Mobile menu toggles with `aria-expanded`, closes after link activation, and closes with Escape while returning focus to the menu button.
- Workflow stages are real buttons; selection changes the active state and explanatory copy. `aria-pressed` communicates the selected step.
- Platform preview tabs update local illustrative chart paths, labels and notes. Arrow keys, Home and End navigate the tab set.
- Hero and content sections reveal subtly once with IntersectionObserver when motion is allowed. If IntersectionObserver is unavailable or reduced motion is preferred, content remains visible without reveal animation.
- Capability cards are intentionally informational, not interactive; they do not lift on hover or imply dead navigation.
- No API call, authentication, forecasting model or database is used by the standalone prototype.

## Visual and responsive rules

- Light-mode Civic Intelligence theme only; no automatic dark-mode override.
- Scoped `.shramik-landing` styles and `--sl-*` tokens reduce CSS collisions when integrated with the larger app.
- Desktop hero uses a wider text column and a deliberate three-line headline.
- Hero stacks below 900 px; tablet cards and workflow use fewer columns; mobile becomes one column with stacked actions.
- Safe-area top padding is handled once on the header; bottom safe-area spacing is used by the footer, not the global root.
- Breakpoints currently cover wide desktop, tablet, mobile and narrow mobile. Browser testing is still required at 320, 360, 375/390, 620, 768, 900, 1024, 1280, 1440 and 1920 px and intermediate widths.

## Data honesty

- The hero artwork is an original illustrative SVG, not a documentary photograph and not a data map.
- Preview charts use illustrative paths, no numerical labour-market claims and no live services.
- Forecasting, confidence intervals, source coverage and actual data freshness are not calculated in the frontend demo.
- Capabilities are described as intended or designed capabilities where operational status has not been established.
- No government emblem, official department branding or SSO claim is used.

## Accessibility notes

- Skip link, semantic landmarks/headings, accessible navigation labels, visible focus, reduced-motion support and labelled interactive controls are included.
- Tabs support arrow navigation, Home and End.
- Dynamic workflow and preview text use polite live regions.
- The chart has a title and text description.
- Automated checks and manual keyboard/screen-reader checks remain required before production acceptance.

## React integration guidance

The HTML is a standalone prototype. Its CSS is scoped under `.shramik-landing` and its tokens are prefixed `--sl-*`, reducing global leakage. For production React integration:

1. Convert the document into a `LandingPage` component and split reusable parts where that matches the team's established architecture: `PublicHeader`, `HeroSection`, `CapabilityGrid`, `WorkflowSelector`, `TransparencySection`, `PlatformPreview`, `PublicFooter`.
2. Move styles into a CSS Module or keep consistent `.shramik-landing` scoping; do not paste generic `header`, `section`, `footer`, `h1`, or `button` selectors into global CSS.
3. Move workflow/preview interactions to React state and add stable typed data arrays instead of direct DOM mutation.
4. Reuse shared Button/tokens from the global UI library; map local `--sl-*` tokens to the approved system tokens or consolidate them after review.
5. Use the app router's real `/login` and `/methodology` routes; confirm route existence before shipping. The `/login` link is currently a destination placeholder.
6. Replace illustrative assets only with approved/licensed assets. Keep every sample-data disclosure attached to preview data.

## Remaining acceptance tests

- Validate HTML with an HTML checker and JS with browser console checks.
- Run keyboard-only tests for menu, workflow and tabs.
- Verify no horizontal overflow at required viewport sizes and zoom levels.
- Verify reduced-motion and safe-area handling on a mobile browser/simulator.
- Inspect actual contrast for small text and focus states.
- Test route destinations after integration.
- Check that the global site shell does not collide with landing-page styles.
