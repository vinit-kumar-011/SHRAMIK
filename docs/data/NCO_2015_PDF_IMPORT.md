# NCO-2015 PDF-derived catalogue and staging import

**Status:** source-reviewed CSV prepared; live staging import has not yet run.

## Snapshot

The merged catalogue contains **3,451 unique NCO-2015 codes**:

- 3,447 records transcribed from Volume I's concordance table.
- Four additional, explicitly listed occupations from Volume II-B whose codes do not appear in Volume I's concordance: 7321.1100 Router, 7322.0100 Job Printer, 7323.0500 Book Binding Operatives, and 7421.0200 Electronics Fitters, Other.
- Zero malformed occupation codes and zero blank occupation titles.
- 774 blank NCO-2004 mappings. These are intentionally left blank; no mapping is guessed.
- No NIC sector or CTS-trade equivalence is inferred.

The official source landing page is https://dge.gov.in/nco-2015. Source PDF hashes, the catalogue snapshot hash, and the reconciliation decisions are recorded in NCO_2015_SOURCE_IMPORT_MANIFEST.json and NCO_2015_SOURCE_DISCREPANCY_REVIEW.csv.

## Seven cross-volume findings

| Code | Finding | Disposition |
|---|---|---|
| 3127.9900 | Volume II-A prints this code beneath ISCO unit group 3123, while Volume I lists the same occupation title as 3123.9900 and provides NCO-2004 code 7148.90. | Do not create 3127.9900 as a separate canonical row; treat it as a likely Volume II-A code typo pending official correction. |
| 7321.1100 Router | Explicitly present in Volume II-B, absent from Volume I concordance. | Included from Volume II-B; NCO-2004 mapping remains null. |
| 7322.0100 Job Printer | Explicitly present in Volume II-B, absent from Volume I concordance. | Included from Volume II-B; NCO-2004 mapping remains null. |
| 7323.0500 Book Binding Operatives | Explicitly present in Volume II-B, absent from Volume I concordance. | Included from Volume II-B; NCO-2004 mapping remains null. |
| 7421.0200 Electronics Fitters, Other | Explicitly present in Volume II-B, absent from Volume I concordance. | Included from Volume II-B; NCO-2004 mapping remains null. |
| 3123.9900 | Volume I concordance record conflicts with the likely typo in Volume II-A. | Retained under the Volume I code and NCO-2004 concordance. |
| 8190.0100 Saw Grinder, Machine | Listed in Volume I with NCO-2004 code 8290.40; exact code not found in extracted text from Volumes II-A/B. | Retained as source-backed from Volume I; detailed-description match remains a review note. |

These are transparent source reconciliation decisions, not silent alterations to the official books.

## Import workflow

The importer validates the complete CSV before opening a database transaction. It checks the exact expected row count (3,451 by default), unique/formatted codes, nonblank titles, source metadata, and that the computed canonical SHA-256 matches the hash recorded in every row.

The importer is **dry-run by default**. Only pass --sync-db after the dry run reports the expected 3,451 rows and snapshot hash.

From the repository root in PowerShell:

```powershell
git pull origin develop
python -m pip install -r backend/requirements.txt
python scripts/import_nco_2015_csv.py --csv "C:\Users\pc\Downloads\nco_2015_occupations_validated.csv"
```

Adjust the CSV path to wherever the downloaded file was saved. The dry run must report **3,451 unique rows** and snapshot SHA-256:

2ec0571104b4a68e8e65491c4eb84c2f973bba41a223b3eb804f3b128f67de71

### Perform the staging import

Use the direct database connection URI from Supabase's database settings. Do not paste it into chat or commit it to the repository. The following PowerShell pattern prompts for the URI without placing it in the command history:

```powershell
$previousDatabaseUrl = $env:DATABASE_URL
if (-not $env:DATABASE_URL) {
    $secureUrl = Read-Host -AsSecureString "Supabase DATABASE_URL"
    $env:DATABASE_URL = [System.Net.NetworkCredential]::new("", $secureUrl).Password
}
try {
    python scripts/import_nco_2015_csv.py --csv "C:\Users\pc\Downloads\nco_2015_occupations_validated.csv" --sync-db
} finally {
    if ($null -ne $previousDatabaseUrl) {
        $env:DATABASE_URL = $previousDatabaseUrl
    } else {
        Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
    }
}
```

The import upserts only public.stg_nco_2015_occupations. It does not update public.skills, taxonomy mappings, forecasts, or any NIC/CTS crosswalk. The staging refresh is transactional: existing is_current flags roll back if insertion or verification fails. After the import, it verifies 3,451 current rows, 3,451 unique codes, and the expected snapshot hash before commit.

A read-only preflight check found zero existing staging rows and exactly one matching data_sources registry entry. The import script will confirm the registry entry again on execution.

## Post-import verification

Run this read-only SQL in Supabase:

```sql
select
  count(*) as total_rows,
  count(*) filter (where is_current) as current_rows,
  count(distinct nco_code) filter (where is_current) as unique_current_codes,
  count(*) filter (where is_current and nco_2004_code is null) as current_without_nco_2004,
  count(distinct source_snapshot_sha256) filter (where is_current) as current_snapshot_hashes
from public.stg_nco_2015_occupations;
```

Expected results: total_rows >= 3451 (older inactive versions may remain after future refreshes), current_rows = 3451, unique_current_codes = 3451, current_without_nco_2004 = 774, and current_snapshot_hashes = 1.

Do not activate the original seven pilot skills or build NIC/CTS links merely because the source-native catalogue has been loaded. Those are separate, reviewable mapping decisions.
