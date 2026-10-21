# SHRAMIK Login Page — Revised Implementation Notes

**Status:** Revised standalone prototype; backend authentication intentionally not connected.  
**Design contract:** SHRAMIK Global Design System (Civic Intelligence)  
**Route when integrated:** `/login`

## What's implemented

- Canonical SHRAMIK design tokens: warm off-white canvas, white surface, black ink/outlines, yellow primary CTA, navy focus colour, restrained orange and teal.
- Forced light theme for the public institutional UI; system dark-mode preference does not alter this page.
- Responsive composition: single-column flow for narrow and mid-sized viewports; split layout on wide desktop; value propositions stack on mobile and use three columns only when there's enough room.
- Safe-area insets are applied once through the body/page frame.
- Real home links for the local package target `SHRAMIK_Landing_Page_v2.html`; change these to `/` when integrated into the app router.
- Email and password use persistent labels, `required`, autocomplete, accessible error descriptions and focus management.
- Email errors remain until the value becomes valid; password missing-value errors clear after a value is entered.
- Password show/hide toggle updates its accessible name and pressed state.
- Submitting valid fields shows a loading state and a clear prototype-mode result.
- Forgot-password action communicates that recovery isn't connected yet.
- No credentials are sent to a server, logged, or persisted by this standalone prototype.
- Reduced-motion preference is respected. Focus indicators, touch-sized actions and responsive breakpoints are included.

## Authentication boundary

The local `AuthService` is deliberately a mock. It does not accept or transmit credentials and cannot authenticate a user. Replace it with the approved authentication service when the backend/provider contract is ready. Keep generic error messages and never expose secrets, raw server errors or account-enumeration details.

## Local testing

Open this HTML beside `SHRAMIK_Landing_Page_v2.html`, or serve the directory locally:

```powershell
py -m http.server 8000
```

Then open `http://localhost:8000/SHRAMIK_Login_v2.html`.

## Validation checklist

- [ ] Test widths 320, 360, 375, 390, 600, 768, 900, 1024, 1099, 1100, 1280, 1440 and 1920 px.
- [ ] Verify no horizontal page overflow.
- [ ] Submit both fields empty; focus should move to email and both field errors should be announced.
- [ ] Submit an invalid email and a filled password; the email error should remain until the value is valid.
- [ ] Type into an invalid password field; the error should clear only after a non-empty password is entered.
- [ ] Toggle password visibility; value should remain intact and control label/state should change.
- [ ] Submit syntactically valid fields; loading state appears and then a prototype-mode notice appears. No credentials are transmitted or stored.
- [ ] Select Forgot password; a clear not-configured message appears.
- [ ] Use Tab/Shift+Tab and confirm visible focus. Test reduced-motion setting.
- [ ] Check the home links; local package targets the revised landing page, while app integration should route to `/`.
- [ ] In the target app, map tokens to the shared `tokens.css`, convert to the app's component conventions if needed, and run the production build.

## Known limits

- This is a standalone HTML prototype, not a production authentication implementation.
- The external Google Fonts stylesheet needs network access; system fallbacks remain available.
- A dependency-free mock-DOM logic smoke test was run. Full browser rendering/responsive verification could not be performed because headless Chromium was blocked in the authoring environment. Repeat visual, keyboard and responsive checks in the target browser and integrated application before release.
