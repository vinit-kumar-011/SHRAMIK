# SHRAMIK Login Page — Page Specification

**Document ID:** SHRAMIK-PAGE-LOGIN-001  
**Version:** 1.0  
**Route:** `/login`  
**Design system:** SHRAMIK Global Design System — Civic Intelligence  
**Implementation phase:** Frontend-first, backend-ready  
**Primary goal:** Provide a credible, accessible and responsive sign-in experience for authorized SHRAMIK users.

---

## 1. Purpose and design principles

The login page is a secure entry point to SHRAMIK's Labour Market Intelligence System. It should feel institutional, trustworthy, calm and modern, and be visually consistent with the approved SHRAMIK reference.

It is not a marketing landing page. The form must be easy to locate and use, and decorative imagery must not compete with sign-in.

Principles:
- Follow `SHRAMIK_GLOBAL_DESIGN_SYSTEM.md` for all global tokens, component variants, motion and accessibility behaviour.
- Reuse existing shared inputs, buttons, badges, cards, form validation and alert components.
- Use the same warm off-white canvas, subtle dots, bold condensed display headings, dark outlines, selective offset shadows and yellow primary action.
- Use a calm amount of documentary-style Indian workforce/city imagery only on larger screens.
- No fake official affiliation, fabricated endorsements, unsupported security claims or fake live indicators.
- Keep authentication and SSO as service integration boundaries; do not simulate real authentication success in production UI.

## 2. Visual composition

### Desktop: 1280 px and wider

Use a two-column layout inside a centered content frame:

**Brand/story panel — approximately 52–58% width**
- SHRAMIK wordmark and descriptor: “Labour Market Intelligence System”.
- Headline: **“Data for People. Opportunities for a Stronger India.”**
- Supporting paragraph: “A data-driven platform to understand, plan and strengthen India's workforce.”
- Three short value statements: “Evidence-based insights”, “Inclusive growth opportunities”, “Stronger workforce planning”.
- A documentary-style monochrome Indian city/workforce image, with restrained yellow/orange/blue graphic shapes. Keep the image decorative rather than a source of factual information.
- Subtle dotted texture and generous spacing.

**Sign-in panel — approximately 42–48% width**
- White surface, thin dark outline, 10–14 px corner radius and restrained offset shadow.
- Heading: **“Welcome back”**.
- Supporting text: “Sign in to access SHRAMIK.”
- Email/address field.
- Password field with accessible show/hide control.
- “Remember me” checkbox only if persistent sessions are allowed by the authentication policy.
- “Forgot password?” link when account recovery is supported.
- Primary button: **“Sign in”**.
- Optional divider and **institutional SSO** action only if an actual provider is approved and available.
- A short help line such as “Need access? Contact your administrator.” only if that support route is valid.

Do not add a top marketing navigation bar with many links to the login page. Use a compact “Back to home” link. Maintain a distinct visual hierarchy between brand panel and form panel.

### Tablet: approximately 768–1279 px

Use an adaptive layout rather than shrinking the desktop design indiscriminately.

- Reduce heading size and gutters.
- Keep a two-column layout only when both columns can fit comfortably; otherwise stack the brand panel above the form.
- Reduce or crop the hero image without obscuring the form.
- Keep the sign-in card at a readable width (roughly 440–560 px when stacked).
- No horizontal overflow, clipped labels or squeezed controls.

### Mobile: 320–767 px

Use a single-column layout.

- Compact brand row at the top with SHRAMIK wordmark and a “Back to home” link.
- Brand headline and supporting paragraph are short and left aligned.
- Hide large decorative city/workforce imagery or reduce it to a small, low-height visual. The form must not be pushed far below the fold.
- Form card should fit the viewport width with 16–20 px outer gutters.
- Full-width primary sign-in button.
- Password visibility button remains easy to tap.
- “Remember me” and “Forgot password?” share a row only if they fit comfortably; otherwise stack.
- Secondary institutional sign-in action, when supported, is full width.
- No horizontal scrolling at 320 px or above.

Do not force an unnecessarily tall full-screen hero on mobile. Form completion is the primary task.

## 3. Approved content

**Brand descriptor:** Labour Market Intelligence System  
**Heading:** Welcome back  
**Supporting text:** Sign in to access SHRAMIK.  
**Email label:** Email address  
**Email placeholder:** Enter your work email address  
**Password label:** Password  
**Password placeholder:** Enter your password  
**Primary action:** Sign in  
**Recovery link:** Forgot password?  
**Support line:** Need access? Contact your administrator.

Avoid forcing a `@gov.in` email format unless access policy explicitly restricts accounts to that domain. Do not invent signup availability, user groups, authentication requirements or institutional affiliations. If the project supports multiple user categories, present a role selector only after the product owner confirms the categories and access rules.

## 4. Form behaviour and interaction states

### Email field
- Persistent visible label.
- Use appropriate email input semantics and browser autofill hints.
- Validate required input and obvious email-format errors.
- Do not announce a valid email address as an authenticated user; email format validation is not identity verification.
- Use a visible focus border/ring and preserve text on error.

### Password field
- Mask by default.
- Provide an accessible “Show password” / “Hide password” toggle.
- Use password-manager/autofill-compatible autocomplete attributes.
- Do not clear the password field after an ordinary validation error unless security policy requires it.
- Never log or expose the password in client-side diagnostics.

### Sign-in button
- Primary yellow fill, dark border and restrained hard offset shadow.
- On hover, lift subtly; on press, return towards the surface.
- On submission, show a spinner and “Signing in…” state, disable duplicate submission and preserve form data.
- Only show success or navigate into the workspace after the real authentication service reports success.
- On failure, show a generic, actionable message that does not reveal whether a particular account exists.

### Forgot password
- Navigate to the planned `/forgot-password` flow only if implemented or clearly wired as an integration route.
- If the recovery service is not ready, do not ship a dead link. Provide a deliberately disabled/labelled placeholder in the prototype or route to a clearly marked mock state.

### Institutional SSO
- Optional. Show only if the provider, design and authorization are approved.
- Use the provider's correct name and approved mark only when permitted.
- The prototype can demonstrate hover/focus/loading states, but must not claim a successful real SSO flow without integration.
- Do not use an Ashoka emblem, Government of India mark or ministry logo without explicit authorization.

### Errors and feedback
Design the following states:
1. Idle/default.
2. Focused field.
3. Required field missing.
4. Invalid email format.
5. Password missing.
6. Submitting/loading.
7. Invalid credentials or generic authentication failure.
8. Service/network failure.
9. Recovery link/flow state.
10. SSO unavailable or in progress, if the feature is included.

Errors must be concise, located near the relevant field or form summary, announced to assistive technology, and must not rely on colour alone.

## 5. Motion and visual effects

Approved:
- Subtle fade-and-rise entrance for the brand panel and form, approximately 250–350 ms.
- Button hover/press feedback, approximately 150–220 ms.
- Small graphic accent movement only on large screens and only if it does not distract.
- Gentle focus transitions for fields.

Avoid:
- Parallax behind the sign-in form.
- Moving/rotating background elements on mobile.
- Auto-playing video.
- Animated typing for the heading.
- Long transitions that delay access.

Respect `prefers-reduced-motion`; all content and controls must remain fully usable when nonessential animation is removed.

## 6. Accessibility and responsive acceptance

Target WCAG 2.2 AA.

- Semantic main and form landmarks.
- Correct labels and accessible names.
- Keyboard access to all fields, password toggle, links, checkboxes and actions.
- Strong visible keyboard focus.
- Correct focus management when validation errors appear.
- Screen-reader announcement for loading and authentication error status.
- Sufficient contrast for body text, muted text, borders and focus states.
- Do not use colour alone to indicate invalid fields.
- Tap targets should be comfortably usable on mobile (aim for approximately 44 × 44 CSS px for primary interactive targets).
- Support zoom and large text without clipping.
- Check portrait and landscape orientations.

Required manual viewport review at a minimum:
- 320 × 568 (small mobile)
- 375 × 667 (common mobile)
- 390 × 844 (larger mobile)
- 768 × 1024 (tablet portrait)
- 1024 × 768 (tablet/compact laptop landscape)
- 1280 × 800 (laptop)
- 1440 × 900 (desktop)
- 1920 × 1080 (wide desktop)

These are test checkpoints, not a claim that only these sizes must work. The layout should be fluid between them. Test at intermediate widths where the two-column layout changes to stacked layout.

## 7. Frontend/backend boundaries

For the frontend-first phase:
- Implement field state, show/hide password, form validation, loading and mocked failure states locally.
- Isolate authentication calls behind an `AuthService` abstraction or equivalent.
- Keep mock auth behaviour in a development-only mock service.
- Do not treat client-side validation as authentication or authorization.
- Do not store passwords in local storage, session storage, URLs or logs.
- Do not add third-party analytics or authentication providers before approval.
- Do not persist “Remember me” behaviour until the real auth/session policy is specified.
- Do not allow mocked success to be mistaken for a real authenticated session.
- When the real backend is added, use its actual error contract and preserve generic non-enumerating messages for authentication failures.

Suggested interface boundary (adapt to the established architecture):

```ts
interface AuthService {
  signIn(input: { email: string; password: string }): Promise<{
    success: boolean;
    redirectTo?: string;
    message?: string;
  }>;
  requestPasswordReset?(input: { email: string }): Promise<void>;
}
```

This is a frontend contract example, not a finalized backend API. Do not create authentication security logic in the UI component.

## 8. Definition of done

- [ ] Follows the global SHRAMIK design tokens and shared components.
- [ ] Desktop, tablet and mobile compositions are intentionally responsive.
- [ ] No horizontal overflow at the required viewport checkpoints.
- [ ] Form labels, placeholders, focus states and errors are consistent.
- [ ] Password visibility toggle works by keyboard and pointer.
- [ ] Loading blocks duplicate submission.
- [ ] Mock authentication is clearly isolated and never implies real access.
- [ ] No unauthorized government emblem, endorsement or SSO branding.
- [ ] No forced `@gov.in` address rule without product approval.
- [ ] Reduced-motion preferences are respected.
- [ ] Keyboard navigation and screen-reader feedback are checked.
- [ ] Forgot-password and SSO actions are either meaningfully wired, clearly mocked, or intentionally unavailable—not dead links.
- [ ] UI contains no backend secrets, password logging or authentication decisions.
- [ ] Changed files, tests performed and unresolved integration points are documented.

## 9. AI implementation handoff prompt

> Implement the SHRAMIK login page using `SHRAMIK_LOGIN_PAGE_SPEC.md` and `SHRAMIK_GLOBAL_DESIGN_SYSTEM.md` as binding requirements. Inspect the existing frontend, routes and shared component inventory before coding. Reuse existing UI primitives; do not create duplicate design tokens or a parallel theme. Preserve the Civic Intelligence identity and implement the specified responsive desktop/tablet/mobile compositions and all form states. Keep authentication behind an `AuthService` boundary and use only clearly labelled development mocks until the real provider is integrated. Do not add unauthorized government logos, fake SSO, forced government email domains, fake success states or dead links. Check keyboard access, focus, reduced motion, zoom, validation and all specified viewports. At completion, report files changed, shared components reused, responsive checks performed, mock/backend boundaries, and unresolved assumptions.
