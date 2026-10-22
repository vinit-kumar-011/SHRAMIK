#!/usr/bin/env python3
r"""Safely remove the duplicate legacy Demand branch in SHRAMIK's live page.

Run from the repository root with: py .\SHRAMIK_fix_duplicate_demand_branch.py
The script backs up the file before any change, is idempotent, and only removes
an older static Demand branch if it appears before the interactive branch.
"""
from __future__ import annotations

from pathlib import Path
import re
import sys

ROOT = Path.cwd()
REL = Path(
    "frontend/SHRAMIK_Dashboard_Reports_Integrated_Source/"
    "SHRAMIK_Dashboard_Reports_Integrated_Source/src/live-data/DatabaseInsightsPage.tsx"
)
TEST_REL = Path(
    "frontend/SHRAMIK_Dashboard_Reports_Integrated_Source/"
    "SHRAMIK_Dashboard_Reports_Integrated_Source/tests/demand-reference-layout.test.cjs"
)
LEGACY = "  if (module === 'demand') {\n"
INTERACTIVE = "  if (isDemandModule(module)) {\n"


def main() -> int:
    target = ROOT / REL
    if not target.is_file():
        print("ERROR: Run this script from the SHRAMIK repository root.")
        print(f"Could not find: {REL}")
        return 2

    # TSX is UTF-8; normalize Windows line endings only in memory.
    raw = target.read_text(encoding="utf-8-sig")
    normalized = raw.replace("\r\n", "\n")
    legacy_count = normalized.count(LEGACY)
    interactive_count = normalized.count(INTERACTIVE)

    if legacy_count == 0 and interactive_count == 1:
        print("Already fixed: only the interactive Demand branch remains.")
        updated = normalized
    elif legacy_count == 1 and interactive_count == 1:
        start = normalized.index(LEGACY)
        end = normalized.index(INTERACTIVE, start + len(LEGACY))
        obsolete = normalized[start:end]
        # Guard against deleting an unexpected block.
        required_markers = (
            "No occupation-demand records",
            "No skill-demand records",
            "No published demand time series",
        )
        if not all(marker in obsolete for marker in required_markers):
            print("ERROR: The legacy block did not match the expected static markup.")
            print("No files were changed. Please send the current DatabaseInsightsPage.tsx.")
            return 3
        updated = normalized[:start] + normalized[end:]
        print("Found and removed the obsolete, non-interactive Demand branch.")
    else:
        print("ERROR: The source does not match the expected branch structure.")
        print(f"Legacy branch count: {legacy_count}; interactive branch count: {interactive_count}")
        print("No files were changed. This is a safety stop, not a failed patch.")
        return 4

    test_files = [ROOT / TEST_REL]
    test_files.append(ROOT / TEST_REL.with_name("demand-interactive-fix.test.cjs"))
    test_updates = []
    old_assertion = "assert.match(page, /if \\(module === 'demand'\\) \\{/);"
    new_assertion = "assert.match(page, /if \\(isDemandModule\\(module\\)\\) \\{/);\n  assert.doesNotMatch(page, /if \\(module === 'demand'\\) \\{/);"
    for test_file in test_files:
        if not test_file.is_file():
            continue
        test_src = test_file.read_text(encoding="utf-8-sig").replace("\r\n", "\n")
        if old_assertion in test_src:
            test_updates.append((test_file, test_src.replace(old_assertion, new_assertion, 1)))
            print(f"Updated regression test: {test_file.relative_to(ROOT)}")

    # Back up each file before writing; never overwrite an existing backup.
    if updated != normalized:
        backup = target.with_name(target.name + ".before-duplicate-branch-fix.bak")
        if backup.exists():
            backup = target.with_name(target.name + ".before-duplicate-branch-fix-2.bak")
        backup.write_bytes(target.read_bytes())
        target.write_bytes(updated.encode("utf-8"))
        print(f"Backup: {backup.relative_to(ROOT)}")
        print(f"Updated: {REL}")
    else:
        print("No source edit required.")

    for test_file, test_updated in test_updates:
        backup_test = test_file.with_name(test_file.name + ".before-duplicate-branch-fix.bak")
        if backup_test.exists():
            backup_test = test_file.with_name(test_file.name + ".before-duplicate-branch-fix-2.bak")
        backup_test.write_bytes(test_file.read_bytes())
        test_file.write_bytes(test_updated.encode("utf-8"))
        print(f"Test backup: {backup_test.relative_to(ROOT)}")

    # Confirm that the interactive branch is now the only demand render branch.
    final = target.read_text(encoding="utf-8-sig").replace("\r\n", "\n")
    if final.count(LEGACY) != 0 or final.count(INTERACTIVE) != 1:
        print("ERROR: Post-write verification failed. Restore the backup if necessary.")
        return 5
    print("Verified: no duplicate static Demand branch; interactive branch remains.")
    print("Next: run the frontend typecheck, tests, and build. No deployment was performed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
