# SHRAMIK Login Page — Visual Refinement v3

**Status:** Revised standalone prototype; backend authentication intentionally not connected.  
**Design contract:** SHRAMIK Global Design System (Civic Intelligence)  
**Route when integrated:** `/login`

## Visual fixes in v3

- Reduced the SHRAMIK mark to 36px on desktop and 34px on standard mobile; reduced the wordmark and descriptor so the brand no longer dominates the header.
- Fixed the prototype notice icon's missing dimensions. The browser's default SVG viewport had been expanding the notice and pushing the form out of alignment; the icon is now fixed at 18×18px.
- Changed the desktop split-layout breakpoint to 980px to avoid an oversized stacked layout on typical laptop widths.
- Adjusted hero type size and tracking for narrow phones and tablet widths so the three intended headline lines stay together at 320px, 390px and 768px.
- Kept form controls on a consistent grid and preserved the SHRAMIK Civic Intelligence visual language.
- Rendered Chromium viewport screenshots and measured layout at 320, 390, 600, 768, 900, 1024 and 1440px. The document does not overflow horizontally at those tested widths.

## What's implemented

- Canonical SHRAMIK design tokens: warm off-white canvas, white surface, black ink/outlines, yellow primary CTA, navy focus colour, restrained orange and teal.
- Forced light theme for this public institutional UI.
- Responsive composition: narrow and mid-size widths stack; the split layout begins at 980px; value propositions stack on mobile and use three columns when space permits.
- Email and password labels, `required`, autocomplete, accessible error descriptions and focus management.
- Password show/hide control with accessible name and pressed-state feedback.
- Submit loading state, validation messages and clear prototype-mode result.
- Forgot-password action communicates that recovery isn't connected yet.
- No credentials are sent to a server, logged, or persisted by this standalone prototype.
- Reduced-motion preference and visible focus indicators are included.

## Authentication boundary

`AuthService` is deliberately a mock. It does not accept or transmit credentials and cannot authenticate a user. Replace it with the approved authentication service when the backend/provider contract is ready.

## Local testing

Keep `SHRAMIK_Login_v3.html` and `SHRAMIK_Landing_Page_v2.html` in the same folder. Run:

```powershell
py -m http.server 8000
```

Then open `http://localhost:8000/SHRAMIK_Login_v3.html`.

## Integration

- Route: `/login`; production home links should point to `/` or the app's actual registered landing route.
- Reuse the canonical token stylesheet and shared UI components rather than duplicating global styles.
- Replace `AuthService` with the approved authentication API/provider only when available.
- Perform keyboard, screen-reader and responsive QA in the integrated app before release.

## Validation limits

The HTML was parsed and checked for duplicate IDs, missing ARIA references, CSS parse errors and JavaScript syntax. A dependency-free mock-DOM interaction smoke test passed. Chromium screenshots and layout measurements were captured after removing external web-font links from the screenshot-only in-memory copy to avoid network stalls; the deliverable HTML still references Google Fonts with system fallbacks. Verify final typography and appearance with network-enabled fonts in the target browser. The automated checks are not a substitute for testing real devices, keyboard navigation or screen readers.
