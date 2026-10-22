SHRAMIK Demand Insights — Recovery Installer
============================================

This is a replacement for the previous .patch file, which was generated against a different version of DatabaseInsightsPage.tsx and therefore did not apply cleanly. Do NOT run git apply on the old patch again.

INSTALL
-------
1. Download this ZIP and extract ALL of its files directly into the SHRAMIK repository root (the directory shown in your PowerShell prompt as C:\Users\pc\Desktop\SHRAMIK). Do not extract it inside the frontend subfolder.
2. Keep your current working tree. The installer detects the existing source by markers and creates timestamped .bak copies of any existing source files it edits.
3. From the repository root, run:

   python .\install_demand_insights_fix.py

4. Then run the verification commands:

   cd .\frontend\SHRAMIK_Dashboard_Reports_Integrated_Source\SHRAMIK_Dashboard_Reports_Integrated_Source
   npm run typecheck
   npm test
   npm run build

The installer is designed for the unified app's shared multi-module page structure: it adds a Demand-only render path before the existing JSX, so it leaves Supply, Forecasts, Emerging Skills, Reports and other module markup in place. It also wires the State/UT filter to the global region selector, adds the source-backed map/trend context and live canonical skills catalogue, appends the interactive styles only if missing, and adds a uniquely named regression test (it does not overwrite your existing demand-reference-layout.test.cjs).

DATA LIMITS
-----------
The live Supabase database currently has zero demand_observations rows. This fix intentionally does not fabricate a total demand number or true occupation/skill demand rankings. It shows PLFS/e-Shram context and NAPS apprentice engagement only with explicit context labels. The occupation examples are illustrative, not ranked estimates.

SAFETY
------
No deployment, GitHub push, merge, migration or production database write is performed by this installer. It changes only the local files it reports, with backups created first. Review `git status --short` and `git diff` after it runs.
