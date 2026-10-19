#!/usr/bin/env python3
"""Fetch and validate the cited simplified India state/UT GeoJSON for preview use.

This source is a DataMeet community layer, distributed under CC BY 2.5 India.
The publisher describes its boundary vintage as 2011. Do not describe it as
current official geometry. The script refuses to save unless all 36 features
resolve uniquely to SHRAMIK's canonical geography crosswalk.
"""
from __future__ import annotations
import json
import re
import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

HERE = Path(__file__).resolve().parent
CROSSWALK = HERE / 'india-state-crosswalk.json'
OUT = HERE / 'india-states.geojson'
META_OUT = HERE / 'india-boundaries-source.json'
URL = 'https://static.geodataviewer.com/datasets/india-states.geojson'
USER_AGENT = 'SHRAMIK-Demand-Insights/1.0 (DataMeet community boundary attribution: CC BY 2.5 India)'


def norm(value: object) -> str:
    value = ''.join(c for c in unicodedata.normalize('NFD', str(value or '')) if unicodedata.category(c) != 'Mn')
    value = value.replace('&', ' and ').lower()
    return re.sub(r'[^a-z0-9]+', ' ', value).strip()


def main() -> int:
    crosswalk_doc = json.loads(CROSSWALK.read_text(encoding='utf-8'))
    entries = crosswalk_doc['items']
    by_code = {}
    by_name = {}
    for entry in entries:
        by_code[entry['id'].upper()] = entry
        for code in entry.get('apiCodes', []):
            by_code[code.upper()] = entry
        for name in [entry['name'], *entry.get('aliases', [])]:
            by_name[norm(name)] = entry

    request = Request(URL, headers={'User-Agent': USER_AGENT, 'Accept': 'application/geo+json, application/json, */*'})
    with urlopen(request, timeout=40) as response:
        raw = json.loads(response.read())
    if raw.get('type') != 'FeatureCollection' or not isinstance(raw.get('features'), list):
        raise RuntimeError('Expected a GeoJSON FeatureCollection. No output was written.')
    features = raw['features']
    if len(features) != 36:
        raise RuntimeError(f'Expected 36 state/UT features; got {len(features)}. No output was written.')

    normalized, matched_ids, unmatched = [], [], []
    for feature in features:
        props = feature.get('properties') or {}
        geometry = feature.get('geometry')
        if not geometry or geometry.get('type') not in ('Polygon', 'MultiPolygon'):
            unmatched.append(f"{props.get('shapeName') or props.get('name') or 'unnamed'} (missing/unsupported geometry)")
            continue
        entry = None
        for key in ('shapeISO', 'iso', 'isoCode', 'stateCode', 'ST_CODE', 'st_code'):
            value = str(props.get(key, '')).strip()
            if value and value.upper() in by_code:
                entry = by_code[value.upper()]
                break
        if entry is None:
            for key in ('shapeName', 'name', 'state_name', 'ST_NM', 'st_nm', 'State', 'state'):
                value = props.get(key)
                if value and norm(value) in by_name:
                    entry = by_name[norm(value)]
                    break
        if entry is None:
            unmatched.append(str(props.get('shapeName') or props.get('name') or 'unnamed feature'))
            continue
        matched_ids.append(entry['id'])
        normalized.append({**feature, 'properties': {**props, 'name': entry['name'], 'shramikGeographyId': entry['id']}})

    if unmatched or len(normalized) != 36 or len(set(matched_ids)) != 36:
        raise RuntimeError(f'Geometry validation failed: {len(normalized)}/36 matched, {len(set(matched_ids))} unique IDs; unmatched/invalid={unmatched[:5]}. No output was written.')

    metadata = {
        'source': 'DataMeet India community state boundaries, hosted by GeoDataViewer',
        'sourceUrl': 'https://projects.datameet.org/maps/states/',
        'downloadUrl': URL,
        'license': 'CC BY 2.5 India',
        'attribution': 'India state boundaries by the DataMeet India community; hosted by GeoDataViewer; CC BY 2.5 India.',
        'boundaryVintage': '2011 (as stated by publisher)',
        'useLimitation': 'Preview/competition prototype layer only; DataMeet documents boundary issues for some states. Review current official boundary coverage/licensing before official/public-sector use.',
        'retrievedAt': datetime.now(timezone.utc).isoformat(),
        'crosswalkVersion': crosswalk_doc.get('schemaVersion'),
        'matchedFeatureCount': 36,
    }
    output = {**raw, 'features': normalized, 'shramikBoundaryMetadata': metadata}
    tmp = OUT.with_suffix('.geojson.tmp')
    tmp.write_text(json.dumps(output, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    tmp.replace(OUT)
    META_OUT.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Validated and saved 36 unique state/UT geometries to {OUT} ({OUT.stat().st_size:,} bytes).')
    print(f"Attribution: {metadata['attribution']}")
    print('IMPORTANT: boundary vintage is stated as 2011; this is not current official geometry.')
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception as exc:
        print(f'Boundary fetch/validation failed safely: {exc}', file=sys.stderr)
        sys.exit(1)
