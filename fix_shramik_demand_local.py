#!/usr/bin/env python3
"""Repair the already-modified local SHRAMIK Demand Insights source tree safely.

Run from the repository root: python fix_shramik_demand_local.py
The script backs up each file it changes and does not run Git reset/apply or touch the database.
"""
from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path.cwd()
FRONTEND = Path(
    "frontend/SHRAMIK_Dashboard_Reports_Integrated_Source/"
    "SHRAMIK_Dashboard_Reports_Integrated_Source"
)
PAGE = ROOT / FRONTEND / "src/live-data/DatabaseInsightsPage.tsx"
CSS = ROOT / FRONTEND / "src/live-data/database-insights.css"
TEST = ROOT / FRONTEND / "tests/demand-reference-layout.test.cjs"

if not PAGE.is_file():
    print("ERROR: Could not find the canonical frontend source.")
    print("Run this script from C:\\Users\\pc\\Desktop\\SHRAMIK (the repo root).")
    sys.exit(2)

page = PAGE.read_text(encoding="utf-8-sig")
old_start = "  if (module === 'demand') {\n    const rateValue = (code: string) => {"
new_start = "  if (isDemandModule(module)) {"

# The uploaded diff showed two early-return Demand screens. The first contains disabled
# buttons and the no-series placeholder; it shadows the later interactive screen.
start = page.find(old_start)
end = page.find(new_start, start + len(old_start)) if start >= 0 else -1
if start >= 0 and end < 0:
    print("ERROR: Found the legacy Demand branch, but not the interactive branch after it.")
    print("No files were changed. Please upload the requested recovery ZIP with full source files.")
    sys.exit(3)
if start < 0 and new_start not in page and "  if (module === 'demand') {\n    const showPlfs" not in page:
    print("ERROR: Neither expected Demand branch pattern was found. No files were changed.")
    sys.exit(4)

updated_page = page
removed_legacy = False
if start >= 0:
    updated_page = page[:start] + page[end:]
    removed_legacy = True

# Keep the project's existing test expectation and avoid an unused helper by using the direct condition.
updated_page = updated_page.replace(new_start, "  if (module === 'demand') {", 1)
helper = "function isDemandModule(module: DatabaseModule): boolean {\n  return module === 'demand';\n}\n\n"
updated_page = updated_page.replace(helper, "", 1)

# Repair visible mojibake introduced by encoding conversions in earlier recovery artifacts.
mojibake = {
    "ΓÇö": "—",
    "ΓÇô": "–",
    "ΓÇª": "…",
    "ΓÇ║": "›",
    "Γîä": "⌄",
    "ΓÇó": "•",
    "ΓÇ£": "“",
    "ΓÇ¥": "”",
    "┬╖": "·",
}

def repair_encoding(text: str) -> str:
    for broken, correct in mojibake.items():
        text = text.replace(broken, correct)
    return text

updated_page = repair_encoding(updated_page)
changes: list[tuple[Path, str]] = []
if updated_page != page:
    changes.append((PAGE, updated_page))

if CSS.is_file():
    css = CSS.read_text(encoding="utf-8-sig")
    updated_css = repair_encoding(css)
    if updated_css != css:
        changes.append((CSS, updated_css))

# Add/refresh a regression test that proves the live route does not render the legacy disabled branch.
if TEST.is_file():
    test_text = TEST.read_text(encoding="utf-8-sig")
    guard = "test('legacy disabled Demand branch does not shadow the interactive page', () => {"
    if guard not in test_text:
        test_text = test_text.rstrip() + "\n\n" + r'''test('legacy disabled Demand branch does not shadow the interactive page', () => {
  assert.doesNotMatch(page, /if \(module === 'demand'\) \{\s*const rateValue/);
  assert.match(page, /if \(module === 'demand'\) \{\s*const showPlfs/);
  assert.match(page, /value=\{periodFilter\} onChange=/);
  assert.match(page, /value=\{regionSort\} onChange=/);
});
'''
        changes.append((TEST, test_text))

if not changes:
    print("No changes needed: the legacy branch appears removed and encoding is already repaired.")
    sys.exit(0)

# Validate before writing: only the interactive branch should remain, and no old static marker.
final_page = next((content for path, content in changes if path == PAGE), page)
if "const rateValue = (code: string) => {" in final_page and "const showPlfs = periodFilter" in final_page:
    if final_page.find("const rateValue = (code: string) => {") < final_page.find("const showPlfs = periodFilter"):
        print("ERROR: Legacy and interactive branch markers remain in the wrong order; no files changed.")
        sys.exit(5)
if "  if (isDemandModule(module)) {" in final_page:
    print("ERROR: An isDemandModule branch remains after helper normalization; no files changed.")
    sys.exit(6)

# Write timestamp-independent backups once, then update. Existing backups are never overwritten.
for path, content in changes:
    backup = path.with_suffix(path.suffix + ".before-demand-repair.bak")
    if not backup.exists():
        backup.write_text(path.read_text(encoding="utf-8-sig"), encoding="utf-8", newline="\n")
    path.write_text(content, encoding="utf-8", newline="\n")

print("Repair complete.")
print(f"- Removed legacy disabled Demand branch: {'yes' if removed_legacy else 'already absent'}")
print("- Kept the interactive Demand branch and repaired common mojibake strings.")
print("- Backups were saved next to each changed file as *.before-demand-repair.bak")
print("- No Git reset/apply, commit, push, deployment, or database write was performed.")
print("Next run from the canonical frontend directory: npm run typecheck; npm test; npm run build")
