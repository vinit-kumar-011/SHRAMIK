# SHRAMIK Login Page v3 — Visual Refinement

This package contains the revised standalone sign-in page and a companion landing page wired to it for local preview.

## Run locally

Keep both HTML files in the same folder and run:

```powershell
py -m http.server 8000
```

Open `http://localhost:8000/SHRAMIK_Login_v3.html`.

## What changed

- Smaller SHRAMIK logo/wordmark.
- Fixed the oversized prototype notice SVG (18×18px), removing the main source of misalignment.
- Starts the two-column composition at 980px.
- Corrected headline wrapping on phone and tablet widths.
- Measured layout at 320, 390, 600, 768, 900, 1024 and 1440px; no horizontal overflow found.

Authentication remains intentionally mocked; this UI does not send or persist credentials. See `SHRAMIK_Login_v3.md` for integration and validation details.
