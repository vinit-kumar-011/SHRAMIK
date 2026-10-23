# LGD reference roster refresh and reconciliation

**Purpose:** retrieve a recent, checksum-verified Local Government Directory (LGD) snapshot for review before changing SHRAMIK's canonical district table.

## Source chain

- Publisher: Ministry of Panchayati Raj, Local Government Directory: https://lgdirectory.gov.in/
- Official OGD district catalogue: https://data.gov.in/resource/local-government-directory-lgd-districts
- Dated public mirror: https://github.com/ramSeraph/opendata/releases/tag/lgd-latest-extra1
- Release assets use dated filenames for states, districts, subdistricts and blocks. The refresh selects only a date for which all four assets and SHA-256 digests exist.

The mirror attributes the source data to the Ministry of Panchayati Raj and GODL-India. It is an independent mirror, not the official hosting platform itself. If a government source file is downloadable, archive that original file and its hash as the preferred evidence.

## Run locally (read-only)

Requirements: Python 3.10+ and 7-Zip (the 7z executable must be on PATH).

Command:

    python scripts/refresh_lgd_reference.py --output-dir artifacts/lgd-reference

The script discovers the newest complete four-level release, rejects snapshots older than 14 days, downloads each archive and verifies its SHA-256, extracts the real CSV, normalizes columns by named header, checks unique codes and parent relationships, and emits normalized CSVs with a provenance manifest.

## Output and safeguards

Files written:
- states.csv
- districts.csv
- subdistricts.csv
- blocks.csv
- manifest.json

This is a candidate reference snapshot, not permission to update public.districts. The script has no database connection and cannot write to Supabase. Before any canonical update, compare every LGD district code with the current SHRAMIK export and explicitly review new, missing, renamed or re-parented records. Keep historical/retired districts and effective dates where source evidence calls for it. Do not fuzzy-map district records merely to force a match.

The GitHub Actions workflow runs offline unit tests and creates a downloadable candidate artifact from the newest complete release. It does not commit the artifact, merge a PR, or change production data.
