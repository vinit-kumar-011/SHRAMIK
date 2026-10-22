#!/usr/bin/env python3
"""Safely install the SHRAMIK Demand Insights UI fix on an existing local checkout."""
from __future__ import annotations
from datetime import datetime
from pathlib import Path
import re
import shutil
import sys

APP_REL = Path('frontend/SHRAMIK_Dashboard_Reports_Integrated_Source/SHRAMIK_Dashboard_Reports_Integrated_Source')
ROUTE_BLOCK_NAME = 'demand-route-block.txt'
CSS_BLOCK_NAME = 'demand-css-block.txt'
TEST_NAME = 'demand-interactive-fix.test.cjs'
GEO_TYPES = '''type GeoPosition = [number, number];
type GeoRing = GeoPosition[];
type GeoPolygon = GeoRing[];
type IndiaFeature = {
  type: 'Feature';
  properties: { name: string; code: string };
  geometry: { type: 'Polygon'; coordinates: GeoPolygon } | { type: 'MultiPolygon'; coordinates: GeoPolygon[] };
};
type IndiaFeatureCollection = { type: 'FeatureCollection'; features: IndiaFeature[] };

'''
GEO_HELPERS = '''function indiaFeaturePath(feature: IndiaFeature, width = 260, height = 260): string {
  const polygons: GeoPolygon[] = feature.geometry.type === 'Polygon'
    ? [feature.geometry.coordinates]
    : feature.geometry.coordinates;
  const project = ([longitude, latitude]: GeoPosition) => [
    ((longitude - 68) / (98 - 68)) * width,
    ((38.5 - latitude) / (38.5 - 5)) * height,
  ] as const;
  return polygons.map(polygon => polygon.map(ring => ring.map((point, index) => {
    const [x, y] = project(point);
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ') + ' Z').join(' ')).join(' ');
}
function registrationColor(value: number, maxValue: number): string {
  const ratio = maxValue > 0 ? value / maxValue : 0;
  if (ratio >= 0.75) return '#b94a0e';
  if (ratio >= 0.5) return '#dc7117';
  if (ratio >= 0.25) return '#f2a83d';
  if (ratio > 0) return '#f8d783';
  return '#f3ead0';
}
function compactPeriodLabel(period: string): string {
  return period.replace('FY', '').replace('-', '–');
}

'''
DEMAND_PREDICATE = '''function isDemandModule(module: DatabaseModule): boolean {
  return module === 'demand';
}

'''
GEO_EFFECT = '''
  useEffect(() => {
    if (module !== 'demand') return;
    let active = true;
    fetch('/assets/india-states.geojson', { headers: { Accept: 'application/geo+json, application/json' } })
      .then(response => {
        if (!response.ok) throw new Error('Map boundaries are not available.');
        return response.json() as Promise<IndiaFeatureCollection>;
      })
      .then(data => { if (active && data?.type === 'FeatureCollection' && Array.isArray(data.features)) setIndiaMap(data); })
      .catch(() => { if (active) setIndiaMap(null); });
    return () => { active = false; };
  }, [module]);
'''
STATE_BLOCK = '''
  const [indiaMap, setIndiaMap] = useState<IndiaFeatureCollection | null>(null);
  const [sectorFilter, setSectorFilter] = useState('ALL');
  const [skillFilter, setSkillFilter] = useState('ALL');
  const [occupationScope, setOccupationScope] = useState('EXAMPLES');
  const [regionSort, setRegionSort] = useState<'registrations' | 'name'>('registrations');
  const [periodFilter, setPeriodFilter] = useState('LATEST');
'''

def find_root() -> Path:
    cwd = Path.cwd().resolve()
    for candidate in [cwd, *cwd.parents]:
        if candidate.joinpath(APP_REL, 'src/live-data/DatabaseInsightsPage.tsx').is_file():
            return candidate
    raise RuntimeError('Run this script from the SHRAMIK repository root (the folder that contains frontend/).')

def transform_component(path: Path, route_block: str) -> str:
    s = path.read_text(encoding='utf-8')
    # Import MapPin once; preserve other existing icons/imports.
    if 'MapPin' not in s.split("from 'lucide-react';", 1)[0]:
        pattern = re.compile(r"import \{([^}]+)\} from 'lucide-react';")
        match = pattern.search(s)
        if not match:
            raise RuntimeError('Could not locate lucide-react import; no files have been changed.')
        names = [part.strip() for part in match.group(1).split(',') if part.strip()]
        names.append('MapPin')
        names = sorted(set(names), key=str.casefold)
        s = s[:match.start()] + "import { " + ', '.join(names) + " } from 'lucide-react';" + s[match.end():]
    if 'type GeoPosition =' not in s:
        marker = 'type Snapshot = {'
        if marker not in s: raise RuntimeError('Could not find Snapshot type marker; source version differs.')
        s = s.replace(marker, GEO_TYPES + marker, 1)
    if 'function isDemandModule(' not in s:
        marker = 'function indiaFeaturePath(' if 'function indiaFeaturePath(' in s else 'function stateTotals(snapshot: Snapshot, rows: MetricRow[])'
        if marker not in s: raise RuntimeError('Could not find the helper insertion marker; source version differs.')
        s = s.replace(marker, DEMAND_PREDICATE + marker, 1)
    if 'function indiaFeaturePath(' not in s:
        marker = 'function stateTotals(snapshot: Snapshot, rows: MetricRow[])'
        if marker not in s: raise RuntimeError('Could not find stateTotals helper marker; source version differs.')
        s = s.replace(marker, GEO_HELPERS + marker, 1)
    # Extend the component props type and destructuring.
    fn = re.compile(r"export default function DatabaseInsightsPage\(\{([^}]*)\}: \{")
    m = fn.search(s)
    if not m: raise RuntimeError('Could not locate DatabaseInsightsPage prop declaration.')
    args = m.group(1)
    if 'onRegionChange' not in args:
        if 'onPreviewDemo' in args: args = args.replace('onPreviewDemo', 'onRegionChange, onPreviewDemo', 1)
        else: args = args.rstrip() + ', onRegionChange'
        s = s[:m.start(1)] + args + s[m.end(1):]
    if 'onRegionChange?: (value: string) => void;' not in s:
        marker = '  onNavigate?: (route: string) => void;'
        if marker not in s: raise RuntimeError('Could not locate component prop type; source version differs.')
        s = s.replace(marker, marker + '\n  onRegionChange?: (value: string) => void;', 1)
    # Hook state is added after the existing query state, only for missing hooks.
    marker = "  const [query, setQuery] = useState('');"
    if marker not in s: raise RuntimeError('Could not locate query state hook; source version differs.')
    state_lines = [
      "  const [indiaMap, setIndiaMap] = useState<IndiaFeatureCollection | null>(null);",
      "  const [sectorFilter, setSectorFilter] = useState('ALL');",
      "  const [skillFilter, setSkillFilter] = useState('ALL');",
      "  const [occupationScope, setOccupationScope] = useState('EXAMPLES');",
      "  const [regionSort, setRegionSort] = useState<'registrations' | 'name'>('registrations');",
      "  const [periodFilter, setPeriodFilter] = useState('LATEST');",
    ]
    missing = []
    for line in state_lines:
        variable = line.split('const [', 1)[1].split(',', 1)[0]
        if f'const [{variable},' not in s:
            missing.append(line)
    if missing:
        s = s.replace(marker, marker + '\n' + '\n'.join(missing), 1)
    # Add scroll-to-top and map loading effects once, ahead of the database snapshot read.
    map_read_marker = "  useEffect(() => {\n    let active = true;\n    setError('');\n    loadSnapshot().then"
    if "fetch('/assets/india-states.geojson'" not in s:
        if map_read_marker not in s: raise RuntimeError('Could not locate the database snapshot effect; source version differs.')
        effects = ''
        if "window.scrollTo({ top: 0, behavior: 'auto' })" not in s:
            effects += "  useEffect(() => {\n    if (module === 'demand') window.scrollTo({ top: 0, behavior: 'auto' });\n  }, [module]);\n\n"
        effects += GEO_EFFECT.lstrip('\n') + '\n'
        s = s.replace(map_read_marker, effects + map_read_marker, 1)
    # The repo branch uses a shared multi-module JSX return, not the early-return layout
    # used in the original patch. Insert a demand-only return immediately before that JSX;
    # the existing pages for every other module remain unchanged.
    if 'dbi-demand-demo-launch' not in s:
        scope_marker = '  const registrationSource = sourceFor(snapshot, registration?.source_id || null);'
        scope_start = s.find(scope_marker)
        if scope_start < 0: raise RuntimeError('Could not locate the source-backed demand context values; source version differs.')
        insertion = s.find('\n  return <section className="dbi-shell">', scope_start)
        if insertion < 0: raise RuntimeError('Could not locate the main module JSX return; refusing a broad replacement.')
        s = s[:insertion] + '\n' + route_block.rstrip() + s[insertion:]
    return s

def main() -> int:
    root = find_root()
    app = root / APP_REL
    component = app / 'src/live-data/DatabaseInsightsPage.tsx'
    css = app / 'src/live-data/database-insights.css'
    shell = app / 'src/SHRAMIKDashboard.tsx'
    route_file = Path(__file__).resolve().parent / ROUTE_BLOCK_NAME
    css_file = Path(__file__).resolve().parent / CSS_BLOCK_NAME
    test_file = Path(__file__).resolve().parent / TEST_NAME
    for p in (component, css, shell, route_file, css_file, test_file):
        if not p.is_file(): raise RuntimeError(f'Required file is missing: {p}')
    route_block = route_file.read_text(encoding='utf-8')
    new_component = transform_component(component, route_block)
    old_css = css.read_text(encoding='utf-8')
    css_block = css_file.read_text(encoding='utf-8')
    new_css = old_css if '.dbi-demand-demo-launch' in old_css else old_css.rstrip() + '\n\n' + css_block.rstrip() + '\n'
    old_shell = shell.read_text(encoding='utf-8')
    new_shell = old_shell
    if 'module="demand"' not in new_shell:
        raise RuntimeError('Could not find the live Demand route in SHRAMIKDashboard.tsx.')
    demand_tag = re.search(r'<DatabaseInsightsPage module="demand"[^>]*>', new_shell)
    if not demand_tag: raise RuntimeError('Could not locate the DemandInsights page tag in SHRAMIKDashboard.tsx.')
    if 'onRegionChange=' not in demand_tag.group(0):
        updated_tag = demand_tag.group(0).replace('regionCode={region}', 'regionCode={region} onRegionChange={handleRegionChange}', 1)
        new_shell = new_shell[:demand_tag.start()] + updated_tag + new_shell[demand_tag.end():]
    if 'handleRegionChange' not in new_shell:
        raise RuntimeError('Shared handleRegionChange function was not found.')
    # Verify structural requirements before writing anything.
    required = ['Total Estimated Demand', 'Apprentices engaged (NAPS)', 'dbi-demand-india-map', 'Skills Explorer', 'onRegionChange']
    absent = [item for item in required if item not in new_component]
    if absent: raise RuntimeError('Generated component is missing required markers: ' + ', '.join(absent))
    # Back up the exact local files once, preserving any edits made by the user.
    stamp = datetime.now().strftime('%Y%m%d-%H%M%S')
    changes = [(component, new_component), (css, new_css), (shell, new_shell)]
    changed = [(p, value) for p, value in changes if p.read_text(encoding='utf-8') != value]
    for path, _ in changed:
        backup = path.with_name(path.name + f'.pre-demand-fix-{stamp}.bak')
        shutil.copy2(path, backup)
        print(f'Backup: {backup.relative_to(root)}')
    for path, value in changed:
        path.write_text(value, encoding='utf-8', newline='\n')
        print(f'Updated: {path.relative_to(root)}')
    test_dest = app / 'tests' / TEST_NAME
    if not test_dest.exists():
        test_dest.write_text(test_file.read_text(encoding='utf-8'), encoding='utf-8', newline='\n')
        print(f'Added test: {test_dest.relative_to(root)}')
    else:
        print(f'Kept existing test file: {test_dest.relative_to(root)}')
    print('\nInstaller finished. No deployment, Git push, or database write was performed.')
    return 0

if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f'ERROR: {exc}', file=sys.stderr)
        print('No source files were changed unless backups/Updated lines were already printed.', file=sys.stderr)
        raise SystemExit(1)
