# Claude Free — Prompt 3: Review and harden the Reports page

Review the implemented Reports page against `SHRAMIK_REPORTS_QA_CHECKLIST.md`, `SHRAMIK_REPORTS_IMPLEMENTATION_SPEC.md`, `SHRAMIK_REPORTS_DATA_SEMANTICS.md`, and the reference images.

Do not redesign the approved structure unless a defect requires it. Check: Builder→Preview flow; selection persistence; section toggles/select-all; Builder filters; Library search/filter/sort/pagination if implemented; open/duplicate/retry actions; HTML report composition; print CSS; CSV export; provenance labels; and honest not-configured/error states. Check 320, 390, 768, 1024 and 1440 px sizes if tooling is available. Check keyboard/focus, labels, table semantics, empty/loading/error states, stale results, reduced motion and no accidental horizontal page overflow.

Run the repository's available lint, TypeScript, tests and build. Fix the findings rather than merely listing them. Do not claim tests or visual checks that weren't run. Provide a short report of fixed issues, remaining limitations, how to run the page, and how the full app can supply the shell/adapter later.
