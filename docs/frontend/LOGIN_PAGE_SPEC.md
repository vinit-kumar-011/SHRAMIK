# SHRAMIK Login Page Specification

**Route:** /login  
**Purpose:** Provide an accessible and professional entry point to the SHRAMIK application.  
**Scope:** Frontend-first UI; real authentication is integrated later through a service boundary.

## Visual direction
Follow docs/frontend/SHRAMIK_GLOBAL_DESIGN_SYSTEM.md and the approved SHRAMIK login responsive visual reference. Maintain warm off-white background, restrained dotted texture, bold condensed editorial headings, thin dark outlines, selective hard shadows, yellow primary button, navy detail and selected monochrome Indian workforce/infrastructure imagery.

## Page composition

### Desktop (approximately 1200 px and above)
Use a split composition:
- Brand/context panel: SHRAMIK wordmark and descriptor, headline, explanatory copy, three short value statements, curated imagery.
- Login panel: clear form heading and description, email field, password field, remember-me checkbox, forgot-password link, primary sign-in action, separator, optional approved alternative sign-in and help/contact link.

Keep the form surface focused, with comfortable width and adequate whitespace. Avoid putting too much decorative content next to the form.

### Tablet (approximately 768–1199 px)
Use a tighter responsive composition. The brand/context area may sit above the form where two columns would become cramped. Keep all fields and the primary action full-width within the form panel.

### Mobile (below approximately 640–768 px)
Use a single-column layout:
- Compact brand row.
- Short headline and supporting copy.
- Optional reduced-height brand visual.
- Login form.
- Alternative sign-in and help link if available.

The form must take priority over decorative imagery. Do not make users scroll through a large illustration before reaching the inputs.

## Content
Brand descriptor: “Labour Market Intelligence System”

Suggested headline: “Welcome back”

Supporting copy: “Sign in to access SHRAMIK.”

Fields:
- Email address — persistent label; placeholder such as name@example.com.
- Password — persistent label; show/hide password control with accessible name.
- Remember me — checkbox, if supported by the authentication policy.
- Forgot password? — link to /forgot-password once implemented.
- Primary button: “Sign in”.

Optional alternative authentication:
Only show a Government SSO button if SHRAMIK is authorized to use the branding and the actual provider is configured. Otherwise omit it or show a generic approved organization sign-in option only when a real integration exists. Never imply affiliation or authentication availability that does not exist.

Help copy: “New to SHRAMIK? Contact your administrator.” Show a real contact destination only after it is approved/configured.

## Interaction requirements
- Email and password inputs have default, hover, focus-visible, invalid and disabled states.
- Password visibility toggles without clearing the value.
- Form submission validates required inputs and displays understandable inline errors.
- Preserve form values after a failed attempt, except where security policy requires otherwise.
- Show loading feedback and prevent duplicate submission.
- On authentication failure, use a generic safe error message; do not expose internal server details.
- Forgot-password and other links must lead to a real page or clear unavailable state; no dead buttons.
- If using demo mode, label it as a demonstration and never imply that a real user has authenticated.
- No backend calls or invented credentials in the frontend-only phase.

## Motion
- 150–220 ms input/button transitions.
- Primary button uses yellow fill, dark outline and restrained offset shadow; subtle hover lift and pressed state.
- Keep entrance animation subtle and optional.
- Respect prefers-reduced-motion; no decorative movement while users type.

## Responsive tests
Check widths: 320, 375, 390, 768, 1024, 1280, 1440 and 1920 px, plus intermediate widths and portrait/landscape.
Verify:
- No horizontal overflow.
- Form fields remain usable and readable.
- Buttons fit their container.
- Error text does not overlap or cause clipped content.
- Keyboard focus is visible and the logical tab order is preserved.
- Layout remains usable with zoom and reduced motion.

## Accessibility and security
- Use semantic form, label and button elements.
- Ensure labels are persistent and error text is announced/associated with its input.
- Icon-only password toggle requires an accessible name and state.
- Do not rely on colour alone for errors.
- Do not store passwords or authentication tokens in local demo state/local storage.
- Do not use official government symbols, emblems or SSO branding without authorization.

## Backend integration boundary
Keep the form UI separate from an authentication service interface. Define idle/submitting/success/failure states in the frontend, but replace the mock service with the actual authentication implementation only when the API/provider contract is approved.

## Acceptance criteria
- Matches SHRAMIK global tokens and shared control components.
- Desktop, tablet and mobile layouts work at the specified widths.
- Required states are implemented.
- Every visible action has a meaningful destination or an explicit unavailable state.
- No fake SSO, fabricated affiliation or false success state.
- Keyboard, screen-reader naming, contrast and reduced-motion behaviour checked.
- Developer reports files changed, states implemented, tests performed and unresolved dependencies.