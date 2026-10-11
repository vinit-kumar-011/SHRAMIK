# SHRAMIK Global UI/UX Design System

Version 1.0 · Frontend implementation contract  
Visual direction: Civic Intelligence — editorial, evidence-led, public-sector oriented.

## Principles
1. Institutional clarity; analytical content over decoration.
2. Reuse tokens and shared components across pages.
3. Motion helps users understand state; it is not filler.
4. Honest data: no fabricated metrics, live states, confidence or affiliations.
5. Keyboard access, visible focus, readable contrast and reduced motion by default.
6. Keep mock data and UI state separate from services and forecasting logic.

## Visual identity
Warm off-white canvas, subtle dotted texture, bold condensed headings, thin dark outlines, white cards, moderate radii, selective hard-offset shadows, yellow primary actions, restrained navy/orange/teal data accents. Use monochrome documentary Indian workforce/city imagery selectively on public pages. Never imitate an official government portal or use official emblems without authorization.

## Colour tokens
| Token | Value | Usage |
|---|---|---|
| Canvas | #F7F6F0 | Page background |
| Surface | #FFFFFF | Cards and inputs |
| Muted surface | #F0EFE8 | Secondary panels |
| Ink | #171717 | Primary text |
| Muted text | #62625C | Supporting text |
| Border | #292929 | Main outlines |
| Muted border | #D8D6CD | Dividers |
| Yellow | #F2D34F | Primary action |
| Yellow hover | #E6C33C | Hover/active |
| Navy | #203A5B | Analytical emphasis |
| Orange | #EB791D | Secondary series/caution |
| Teal | #20A89C | Secondary series |
| Success | #35745D | Success |
| Warning | #B56732 | Warning |
| Danger | #B42318 | Error/critical |
| Info | #315D8A | Information |

Use semantic CSS variables from frontend/src/styles/tokens.css. Validate contrast in actual combinations; a palette token does not guarantee every pairing meets accessibility requirements.

## Typography and layout
- Display: Barlow Condensed or approved equivalent; body/UI: IBM Plex Sans, Inter or an existing equivalent.
- Hero approximately 40–68 px responsive; section headings 28–40 px; card headings 18–22 px; body 16–18 px; controls 14–16 px; metadata 12–14 px.
- Use a 4 px spacing rhythm.
- Public content max width: 1200–1280 px.
- Desktop gutters 48–64 px; tablet 28–36 px; mobile 20–24 px.
- Control radius 6–9 px; card radius 10–14 px.
- Use 3px 3px 0 #292929 shadows selectively, not on every surface.
- Dotted texture is for public/hero surfaces; reduce/remove it behind dense data, tables and forms.

## Global shell
- Public pages use a brand, compact navigation and accessible mobile menu.
- Authenticated pages use consistent sidebar, top bar, breadcrumbs and page context.
- Active navigation uses a surface/indicator and weight, not colour alone.
- Preserve page/filter context when opening and closing drawers where practical.

## Component contracts
- Buttons: primary yellow outlined with restrained offset shadow; secondary outlined; quiet low-emphasis; danger for consequential actions. Include hover, pressed, focus, disabled and loading states.
- Cards: KPI, navigation, chart, alert, evidence, report and form-panel types share padding, border/radius and title hierarchy.
- Forms: persistent labels, clear units, synchronized sliders/numeric fields, inline errors; preserve input on failure; never silently clamp values.
- Statuses: semantic label and colour; never colour alone; do not invent Live/Verified/Official.
- Tooltips/popovers/drawers: keyboard accessible. Essential instructions must not live only in tooltips.
- Tables: consistent padding, separators, sorting state, selection, loading and empty states.
- Charts: clear units, dates and labels; historical/forecast values distinguished by style and colour; exact-value tooltips; accessible textual/table alternative; no fabricated interpolation.
- Maps: include legend/units/date/provenance where available and a list/table alternative.
- Feedback: inline validation, short toasts, persistent banners for major limitations, dialogs for consequential confirmation.

## Motion
- Hover/press: 150–220 ms.
- Public section reveals: 250–400 ms, subtle fade and 8–12 px rise.
- Drawers: 200–280 ms.
- Avoid scroll hijacking, perpetual motion, cursor trails and excessive parallax.
- Respect prefers-reduced-motion. Content and functionality remain available without movement.

## Data honesty and service boundaries
- Keep mock fixtures/services dedicated.
- UI components do not query databases or implement forecast math.
- Show freshness/provenance only when supplied.
- Distinguish source-backed, derived, mixed and synthetic-demo data.
- Keep demo labels in previews and exports.
- No unsupported statistics, fake live updates, fabricated endorsements or unauthorized government affiliation.

## Responsive and accessibility
- Desktop: editorial layouts; authenticated pages use sidebar and content.
- Tablet: reduced gutters, collapsible sidebar, two-column cards when suitable.
- Mobile: one-column public layout, accessible navigation, compact filters, usable tables/charts and no accidental page overflow.
- Target WCAG 2.2 AA; semantic headings/landmarks, keyboard support, focus-visible, persistent labels, alt text, sufficient contrast, no colour-only status, dialog/drawer focus handling and reduced motion.
- Test at 320, 375/390, 768, 1024, 1280, 1440 and 1920 px and intermediate widths.

## Definition of done
- Shared tokens/components used.
- Every action works or has a clear unavailable state.
- Relevant focus, disabled, loading, empty, error, warning and success states exist.
- Mock data isolated and labelled.
- Responsive, keyboard and reduced-motion checks completed.
- No accidental overflow or major layout shifts.
- No fabricated metrics/live status/unauthorized official branding.
- Backend integration points are explicit.
