from pathlib import Path
import re, json, os, shutil, zipfile, hashlib, subprocess, textwrap

ROOT = Path('/mnt/data')
base_html_path = ROOT / 'SHRAMIK_Supply_Insights.html'
body_path = ROOT / 'demand_page_body.jsx'
handoff_dir = ROOT / 'demand_handoff' / 'SHRAMIK_Demand_Insights_Handoff'

html = base_html_path.read_text(encoding='utf-8')
match = re.search(r'<script type="text/babel">(.*?)</script>', html, re.S)
assert match, 'Could not locate the source JSX script in supplied HTML'
base_js = match.group(1)
marker = '/* ============ SUPPLY INSIGHTS: extra icons ============ */'
assert marker in base_js, 'Could not locate the start of Supply-specific components'
shared_js = base_js.split(marker, 1)[0].rstrip()

# Small debugging fixes to shared shell reused from the uploaded HTML.
shared_js = shared_js.replace(
    'const { useState, useEffect, useRef, useCallback, useId } = React;',
    'const { useState, useEffect, useRef, useCallback, useId, useMemo } = React;'
)
old_badge = '''const ProvenanceBadge = ({ meta: m }) => (
  <span className={`prov ${m?.provenance === 'source-backed' ? 'ok' : ''}`}>
    {m?.provenance === 'mock' ? 'Illustrative data' : m?.provenance === 'mixed' ? 'Mixed data' : 'Source-backed'}
  </span>
);'''
new_badge = '''const ProvenanceBadge = ({ meta: m }) => {
  const provenance = m?.provenance;
  const label = provenance === 'mock' ? 'Illustrative data'
    : ['synthetic', 'synthetic-demo'].includes(provenance) ? 'Synthetic evaluation data'
    : provenance === 'mixed' ? 'Mixed data'
    : provenance === 'derived' ? 'Derived data'
    : provenance === 'source-backed' ? 'Source-backed'
    : 'Provenance unavailable';
  return <span className={`prov ${['source-backed', 'derived'].includes(provenance) ? 'ok' : ''}`}>{label}</span>;
};'''
assert old_badge in shared_js, 'ProvenanceBadge source pattern missing'
shared_js = shared_js.replace(old_badge, new_badge)
# Add the generic filter icons used by Demand Insights while preserving the supplied shell.
icon_defs = '''\n\n/* Shared icon aliases used by the Demand filter bar. */
const Calendar = mkIcon('Calendar'), Globe = mkIcon('Globe'), Filter = mkIcon('Filter'), RotateCcw = mkIcon('RotateCcw');
'''
body = body_path.read_text(encoding='utf-8')

# Fix snapshot mismatch in mock mode: overview, regional data and insights must share one snapshot id.
old = """    const factorTotal = (filters.sectorId ? 0.38 : 1) * (filters.occupationCode ? 0.14 : 1) * (filters.skillId ? 0.22 : 1) * ({ '2024': 1, '2023': 26743000 / 28400000, '2022': 23000000 / 28400000 }[filters.period] || 1);
    const scopeTotal = (filters.stateCode ? (source[0]?.demand || 0) : 28400000) * factorTotal;"""
new = """    const factorTotal = (filters.sectorId ? 0.38 : 1) * (filters.occupationCode ? 0.14 : 1) * (filters.skillId ? 0.22 : 1) * ({ '2024': 1, '2023': 26743000 / 28400000, '2022': 23000000 / 28400000 }[filters.period] || 1);
    const snapshotId = `demo-${stableFilterKey(filters)}`.replace(/[^a-zA-Z0-9_-]/g, '-');
    const scopeTotal = (filters.stateCode ? (source[0]?.demand || 0) : 28400000) * factorTotal;"""
assert old in body or 'scopeDemandTotal = source.reduce' in body, 'Regional factor source pattern missing'
body = body.replace(old, new)
body = body.replace("meta: mockMeta(`demo-${stableFilterKey(filters)}`, 'Regional rows and values are illustrative demo fixtures.'), appliedFilters: { ...filters }", "meta: mockMeta(snapshotId, 'Regional rows and values are illustrative demo fixtures.'), appliedFilters: { ...filters }")
# Global header region selecting India (IN) should reset to national instead of being rejected as an unknown state code.
old = '''  const drillState = (code) => {
    if (!options || !applied) return;
    if (code && !(options.states || []).some((s) => s.value === code)) { setFilterError('This regional row is not in the API-supported state/UT options and cannot be applied as a filter.'); return; }
    const next = { ...applied, stateCode: code || '', geography: code ? stateGeography : nationalGeography };
    setDraft(next); setApplied(next); setFilterError('');
  };'''
new = '''  const drillState = (code) => {
    if (!options || !applied) return;
    const nextCode = !code || code === 'IN' ? '' : code;
    if (nextCode && !(options.states || []).some((s) => s.value === nextCode)) { setFilterError('This regional row is not in the API-supported state/UT options and cannot be applied as a filter.'); return; }
    const next = { ...applied, stateCode: nextCode, geography: nextCode ? stateGeography : nationalGeography };
    setDraft(next); setApplied(next); setFilterError('');
  };'''
assert old in body or "const nextCode = !code || code === 'IN' ? '' : code;" in body, 'drillState source pattern missing'
body = body.replace(old, new)
# Notification failures should be surfaced, not become unhandled promise rejections.
old = "  const markRead = (id) => A.markNotificationRead(id).then(() => setNotes((old) => old.map((n) => n.id === id ? { ...n, read: true } : n)));"
new = "  const markRead = (id) => A.markNotificationRead(id).then(() => setNotes((old) => old.map((n) => n.id === id ? { ...n, read: true } : n))).catch((e) => setShellError(`Notification could not be marked read: ${e.message || 'request failed'}`));"
assert old in body or 'Notification could not be marked read' in body, 'markRead source pattern missing'
body = body.replace(old, new)
# Use posting-related icon for either supported job metric variant.
body = body.replace("  if (id === 'posting-volume') return <FileText size={size} aria-hidden=\"true\" />;", "  if (id === 'posting-volume' || id === 'posting-index') return <FileText size={size} aria-hidden=\"true\" />;")
# Handle posting-index trend as posting data rather than mislabelling it as estimated demand.
body = body.replace("const seriesLabel = view === 'posting-count' ? 'Observed job postings' : 'Estimated labour demand';", "const seriesLabel = view === 'posting-count' ? 'Observed job postings' : view === 'posting-index' ? 'Job posting index' : 'Estimated labour demand';")
# Make skill panel label and column unit respond to its API-provided measurement type, and explicitly reject mixed measures.
old = '''function TopSkillsPanel({ overviewState, retry, filters, onDetail, onViewAll }) {
  return <section className="card" aria-labelledby="top-skills-title"><div className="ph"><div><h2 id="top-skills-title">Top Skills by Demand</h2><p>Skill demand index · baseline 100 · {filters?.period || '—'}</p></div></div>
    <Body s={overviewState} retry={retry} rows={5}>{(d) => {
      const rows = d.topSkills || [];
      return <><div className="tw"><table className="tbl demand-table"><caption>Skill demand index values are not posting counts. Growth appears only when a comparable baseline is supplied.</caption><thead><tr><th>#</th><th>Skill</th><th>Index</th><th>Growth</th><th>Trend</th></tr></thead><tbody>
        {rows.map((s, i) => <tr key={s.id || s.skillId}><td>{s.rank ?? i + 1}</td><td><button className="lk" onClick={() => onDetail({ type: 'skill', id: s.id || s.skillId, label: s.title || s.skillLabel })}>{s.title || s.skillLabel}<small>{s.taxonomyVersion || 'Taxonomy version not supplied'} · {s.measureType === 'posting-count' ? 'posting count' : 'index points'}</small></button></td><td>{s.formattedValue ?? (s.demandIndex == null ? '—' : Number(s.demandIndex).toFixed(0))}</td><td>{s.growthPct == null ? <span className="muted-val" title="Comparable baseline unavailable">—</span> : <span className="growth">{pct(s.growthPct)}</span>}</td><td className="spark-wrap">{s.sparkline?.length ? <Sparkline data={s.sparkline} color="var(--teal)" id={`skill-${s.id || i}`} /> : <span className="spark-na" title="No trend points supplied">—</span>}</td></tr>)}
        {!rows.length && <tr><td colSpan="5">No skill demand records match these filters.</td></tr>}</tbody></table></div>
      <div className="panel-footer"><span className="sel-note">Method and taxonomy are available in the detail drawer.</span><button className="view-all" onClick={onViewAll}>View all skills <ArrowRight size={14}/></button></div></>;
    }}</Body>
  </section>;
}'''
new = '''function TopSkillsPanel({ overviewState, retry, filters, onDetail, onViewAll }) {
  const currentRows = overviewState.data?.topSkills || [];
  const isPostingCount = (s) => s?.measureType === 'posting-count' || s?.postingCount != null;
  const countBased = currentRows.length > 0 && currentRows.every(isPostingCount);
  const indexBased = currentRows.every((s) => !isPostingCount(s));
  const mixedMeasure = currentRows.length > 0 && !countBased && !indexBased;
  return <section className="card" aria-labelledby="top-skills-title"><div className="ph"><div><h2 id="top-skills-title">Top Skills by Demand</h2><p>{countBased ? 'Observed posting count' : 'Skill demand index · baseline as defined by source'} · {filters?.period || '—'}</p></div></div>
    <Body s={overviewState} retry={retry} rows={5}>{(d) => {
      const rows = d.topSkills || [];
      if (mixedMeasure) return <div className="unavailable-status" role="alert">The API returned mixed skill measurement types (posting counts and index points). The rows are withheld until the payload uses one consistent measure and unit.</div>;
      return <><div className="tw"><table className="tbl demand-table"><caption>{countBased ? 'Skill demand values are posting counts. Growth appears only when a comparable baseline is supplied.' : 'Skill demand index values are index points, not posting counts. Growth appears only when a comparable baseline is supplied.'}</caption><thead><tr><th>#</th><th>Skill</th><th>{countBased ? 'Postings' : 'Index'}</th><th>Growth</th><th>Trend</th></tr></thead><tbody>
        {rows.map((s, i) => <tr key={s.id || s.skillId}><td>{s.rank ?? i + 1}</td><td><button className="lk" onClick={() => onDetail({ type: 'skill', id: s.id || s.skillId, label: s.title || s.skillLabel })}>{s.title || s.skillLabel}<small>{s.taxonomyVersion || 'Taxonomy version not supplied'} · {countBased ? 'posting count' : `index points${s.baseline != null ? ` · baseline ${s.baseline}` : ''}`}</small></button></td><td>{countBased ? (s.formattedValue ?? fmtCount(s.postingCount ?? s.value)) : (s.formattedValue ?? (s.demandIndex == null ? '—' : Number(s.demandIndex).toFixed(0)))}</td><td>{s.growthPct == null ? <span className="muted-val" title="Comparable baseline unavailable">—</span> : <span className="growth">{pct(s.growthPct)}</span>}</td><td className="spark-wrap">{s.sparkline?.length ? <Sparkline data={s.sparkline} color="var(--teal)" id={`skill-${s.id || i}`} /> : <span className="spark-na" title="No trend points supplied">—</span>}</td></tr>)}
        {!rows.length && <tr><td colSpan="5">No skill demand records match these filters.</td></tr>}</tbody></table></div>
      <div className="panel-footer"><span className="sel-note">Method and taxonomy are available in the detail drawer.</span><button className="view-all" onClick={onViewAll}>View all skills <ArrowRight size={14}/></button></div></>;
    }}</Body>
  </section>;
}'''
assert old in body or 'const isPostingCount = (s)' in body, 'TopSkillsPanel source pattern missing'
body = body.replace(old, new)
# Fix negative KPI deltas so the direction is not always shown as an upward arrow.
body = body.replace("{hasDelta ? <span className=\"delta\"><ArrowUpRight size={14} aria-hidden=\"true\" />{pct(k.deltaPct)}</span> : <span className=\"muted\">Comparison unavailable</span>}", "{hasDelta ? <span className={`delta ${Number(k.deltaPct) < 0 ? 'negative' : ''}`} aria-label={`${Number(k.deltaPct) < 0 ? 'Decreased' : Number(k.deltaPct) > 0 ? 'Increased' : 'Unchanged'} ${pct(k.deltaPct)}`}><span aria-hidden=\"true\">{Number(k.deltaPct) < 0 ? '↘' : Number(k.deltaPct) > 0 ? '↗' : '→'}</span>{pct(k.deltaPct)}</span> : <span className=\"muted\">Comparison unavailable</span>}")
body = body.replace(".demand-kpi .delta{font-size:12px;font-weight:800;color:var(--pos);display:inline-flex;align-items:center;gap:2px}", ".demand-kpi .delta{font-size:12px;font-weight:800;color:var(--pos);display:inline-flex;align-items:center;gap:2px}.demand-kpi .delta.negative{color:var(--orange)}")
# Limit the demo forecast to the latest complete snapshot that actually supplies forecast points.
old = """  const trend = {
    metric: trendMetric, unit: metricSeries.unit,
    actual: metricSeries.observations.map(([period, value]) => ({ period, value: value * unitFactor })),
    forecast: metricSeries.forecast.map(([period, value, lowerBound, upperBound]) => ({ period, value: value * unitFactor, lowerBound: lowerBound * unitFactor, upperBound: upperBound * unitFactor })),
    forecastMethod: metricSeries.method, meta: mockMeta(snapshotId, 'Trend figures are deterministic demo fixtures.')
  };"""
new = """  const usableObservations = metricSeries.observations.filter(([period]) => Number(period) <= year);
  const usableForecast = year === 2024 ? metricSeries.forecast : [];
  const trend = {
    metric: trendMetric, unit: metricSeries.unit,
    actual: usableObservations.map(([period, value]) => ({ period, value: value * unitFactor })),
    forecast: usableForecast.map(([period, value, lowerBound, upperBound]) => ({ period, value: value * unitFactor, lowerBound: lowerBound * unitFactor, upperBound: upperBound * unitFactor })),
    forecastMethod: usableForecast.length ? metricSeries.method : null, meta: mockMeta(snapshotId, 'Trend figures are deterministic demo fixtures; forecasts are included only for the 2024 demo snapshot.')
  };"""
assert old in body or 'const usableForecast = year === 2024 ? metricSeries.forecast : [];' in body, 'trend forecast filtering pattern missing'
body = body.replace(old, new)

# The new page depends on React hooks and uses the existing shared shell, not a second shell.
combined_js = shared_js + icon_defs + '\n\n' + body.strip() + '\n'
# Source HTML retains JSX as an editable standalone preview (uses Babel CDN, as the supplied file does).
head = '''<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="theme-color" content="#F7F6F0" />
<meta name="description" content="SHRAMIK Demand Insights: workforce demand trends, occupation and skill signals, and regional evidence." />
<title>SHRAMIK · Demand Insights</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&display=swap" />
<style>html,body{margin:0;background:#F7F6F0}</style>
</head>
<body>
<div id="root"><noscript>SHRAMIK Demand Insights requires JavaScript to run.</noscript></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/lucide/0.263.1/umd/lucide.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/echarts@5.6.0/dist/echarts.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.2/babel.min.js"></script>
<script type="text/babel">
'''
tail = '\n</script>\n</body>\n</html>\n'
source_out = ROOT / 'SHRAMIK_Demand_Insights_Updated.html'
source_out.write_text(head + combined_js + tail, encoding='utf-8')

# Create a buildable source JS/JSX file too.
source_dir = ROOT / 'SHRAMIK_Demand_Insights_Source_Package'
if source_dir.exists(): shutil.rmtree(source_dir)
source_dir.mkdir(parents=True)
(source_dir / 'src').mkdir()
(source_dir / 'src' / 'DemandInsightsApp.jsx').write_text(combined_js, encoding='utf-8')
(source_dir / 'src' / 'SHRAMIK_Supply_Insights.original.html').write_text(html, encoding='utf-8')
(source_dir / 'src' / 'demand_page_body.jsx').write_text(body, encoding='utf-8')

# Production compile with the already-installed TypeScript compiler; no npm install or browser Babel.
prod_dir = ROOT / 'SHRAMIK_Demand_Insights_Production'
if prod_dir.exists(): shutil.rmtree(prod_dir)
prod_dir.mkdir(parents=True)
compiler = '/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript'
# Build JS via a temporary Node script using TypeScript transpileModule.
tmp_js = ROOT / '_compile_demand.cjs'
tmp_js.write_text(textwrap.dedent(f'''\
const fs = require('fs');
const ts = require({json.dumps(compiler)});
const src = fs.readFileSync({json.dumps(str(source_dir / 'src' / 'DemandInsightsApp.jsx'))}, 'utf8');
const result = ts.transpileModule(src, {{
  compilerOptions: {{ target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None, jsx: ts.JsxEmit.React, removeComments: true, sourceMap: false, allowJs: true }},
  fileName: 'DemandInsightsApp.tsx', reportDiagnostics: true
}});
const errors = (result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
if (errors.length) {{ console.error(errors.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\\n')).join('\\n')); process.exit(1); }}
fs.writeFileSync({json.dumps(str(prod_dir / 'app.js'))}, result.outputText);
'''), encoding='utf-8')
subprocess.run(['node', str(tmp_js)], check=True, capture_output=True, text=True)
(tmp_js).unlink()

# Static production wrapper: no browser-side JSX transpiler.
(prod_dir / 'config.js').write_text('''/* SHRAMIK Demand Insights configuration. Set apiBaseUrl to your backend host; leave blank for clearly labelled demo mode. */\nwindow.SHRAMIK_CONFIG = window.SHRAMIK_CONFIG || { apiBaseUrl: '' };\n''', encoding='utf-8')
(prod_dir / 'index.html').write_text('''<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#F7F6F0" />
  <meta name="description" content="SHRAMIK Demand Insights: workforce demand trends, occupation and skill signals, and regional evidence." />
  <title>SHRAMIK · Demand Insights</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>html,body{margin:0;background:#F7F6F0}</style>
  <script src="./config.js"></script>
  <script crossorigin src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>
  <script crossorigin src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>
  <script crossorigin src="https://cdnjs.cloudflare.com/ajax/libs/lucide/0.263.1/umd/lucide.min.js"></script>
  <script crossorigin src="https://cdn.jsdelivr.net/npm/echarts@5.6.0/dist/echarts.min.js"></script>
</head>
<body>
  <div id="root"><noscript>SHRAMIK Demand Insights requires JavaScript to run.</noscript></div>
  <script defer src="./app.js"></script>
</body>
</html>
''', encoding='utf-8')

# Bundle map metadata and a developer helper to vendor geometry locally.
assets_dir = prod_dir / 'assets'
assets_dir.mkdir(exist_ok=True)
crosswalk = [
  {'id':'IN-AN','name':'Andaman and Nicobar Islands','apiCodes':['AN','IN-AN']}, {'id':'IN-AP','name':'Andhra Pradesh','apiCodes':['AP','IN-AP']}, {'id':'IN-AR','name':'Arunachal Pradesh','apiCodes':['AR','IN-AR']}, {'id':'IN-AS','name':'Assam','apiCodes':['AS','IN-AS']}, {'id':'IN-BR','name':'Bihar','apiCodes':['BR','IN-BR']}, {'id':'IN-CH','name':'Chandigarh','apiCodes':['CH','IN-CH']}, {'id':'IN-CG','name':'Chhattisgarh','apiCodes':['CG','CT','IN-CG','IN-CT']}, {'id':'IN-DH','name':'Dadra and Nagar Haveli and Daman and Diu','apiCodes':['DH','DD','DN','IN-DH','IN-DD','IN-DN']}, {'id':'IN-DL','name':'Delhi','apiCodes':['DL','IN-DL','NCT']}, {'id':'IN-GA','name':'Goa','apiCodes':['GA','IN-GA']}, {'id':'IN-GJ','name':'Gujarat','apiCodes':['GJ','IN-GJ']}, {'id':'IN-HR','name':'Haryana','apiCodes':['HR','IN-HR']}, {'id':'IN-HP','name':'Himachal Pradesh','apiCodes':['HP','IN-HP']}, {'id':'IN-JK','name':'Jammu and Kashmir','apiCodes':['JK','IN-JK']}, {'id':'IN-JH','name':'Jharkhand','apiCodes':['JH','IN-JH']}, {'id':'IN-KA','name':'Karnataka','apiCodes':['KA','IN-KA']}, {'id':'IN-KL','name':'Kerala','apiCodes':['KL','IN-KL']}, {'id':'IN-LA','name':'Ladakh','apiCodes':['LA','IN-LA']}, {'id':'IN-LD','name':'Lakshadweep','apiCodes':['LD','IN-LD']}, {'id':'IN-MP','name':'Madhya Pradesh','apiCodes':['MP','IN-MP']}, {'id':'IN-MH','name':'Maharashtra','apiCodes':['MH','IN-MH']}, {'id':'IN-MN','name':'Manipur','apiCodes':['MN','IN-MN']}, {'id':'IN-ML','name':'Meghalaya','apiCodes':['ML','IN-ML']}, {'id':'IN-MZ','name':'Mizoram','apiCodes':['MZ','IN-MZ']}, {'id':'IN-NL','name':'Nagaland','apiCodes':['NL','IN-NL']}, {'id':'IN-OD','name':'Odisha','apiCodes':['OD','OR','IN-OD','IN-OR']}, {'id':'IN-PB','name':'Punjab','apiCodes':['PB','IN-PB']}, {'id':'IN-PY','name':'Puducherry','apiCodes':['PY','IN-PY']}, {'id':'IN-RJ','name':'Rajasthan','apiCodes':['RJ','IN-RJ']}, {'id':'IN-SK','name':'Sikkim','apiCodes':['SK','IN-SK']}, {'id':'IN-TN','name':'Tamil Nadu','apiCodes':['TN','IN-TN']}, {'id':'IN-TS','name':'Telangana','apiCodes':['TS','TG','IN-TS','IN-TG']}, {'id':'IN-TR','name':'Tripura','apiCodes':['TR','IN-TR']}, {'id':'IN-UP','name':'Uttar Pradesh','apiCodes':['UP','IN-UP']}, {'id':'IN-UK','name':'Uttarakhand','apiCodes':['UK','UT','IN-UK','IN-UT']}, {'id':'IN-WB','name':'West Bengal','apiCodes':['WB','IN-WB']}
]
(assets_dir / 'india-state-crosswalk.json').write_text(json.dumps({'schemaVersion':'SHRAMIK-GEO-V1-2026-10-18','geographyCount':36,'items':crosswalk}, indent=2, ensure_ascii=False), encoding='utf-8')
shutil.copyfile(ROOT / 'boundary_data_template.md', assets_dir / 'BOUNDARY_DATA.md')
shutil.copyfile(ROOT / 'fetch_india_boundaries_template.py', assets_dir / 'fetch_india_boundaries.py')

# Build docs and QA report.
readme = '''# SHRAMIK Demand Insights — Updated Standalone Page

This package adapts the uploaded `SHRAMIK_Supply_Insights.html` shell instead of starting from a separate app. It reuses the existing SHRAMIK topbar, sidebar, detail drawer, SVG illustration pattern, typography, dotted background and colour tokens; the selected sidebar item is `Demand`.

## Files
- `index.html` — static production entry point (no browser-side Babel).
- `app.js` — page bundle compiled from the editable JSX using the TypeScript compiler already present in the build environment.
- `config.js` — configure `window.SHRAMIK_CONFIG.apiBaseUrl` for the REST adapter.
- `BUILD_REPORT.json` — actual checks and known limitations.
- `source/` in the source-and-build package contains the JSX page and uploaded Supply HTML used as the shell source.

## Run locally

You can open `index.html` directly for a preview in most browsers. For reliable relative-path and fetch behaviour, serve this folder over HTTP, for example:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Demo vs API mode

- Blank `apiBaseUrl` activates the visibly labelled illustrative demo adapter. None of those values are official labour-market statistics.
- When supplied evaluation data is synthetic, return `meta.provenance: \\`synthetic\\`` or `synthetic-demo` and a descriptive `sourceLabel`; the page labels it `Synthetic evaluation data`, not observed labour-market data.
- Setting `apiBaseUrl` activates REST mode against the `/api/v1/demand/...` contract. REST errors remain errors: the page does not silently fall back to mock data. This package is backend-ready, but no live SHRAMIK API was connected during this build.
- The following endpoints are expected by the current page: `GET /demand/filter-options`, `GET /demand/overview`, `GET /demand/regions?comparisonScope=all-states`, `GET /demand/occupations`, `GET /demand/skills`, `GET /demand/insights`, plus profile/search/notifications from the shared shell and a detail endpoint.

## Interactive state/UT choropleth

- Apache ECharts renders an interactive GeoJSON polygon layer with hover provenance tooltips, pan/zoom, metric-dependent colours and click-to-filter behavior.
- Regional values come from `/api/v1/demand/regions?comparisonScope=all-states`; the adapter removes `stateCode` and requests the state-level geography while preserving period/sector/occupation/skill filters. The map and regional ranking remain a 36-region comparison when a state is selected, while the other panels drill into that state.
- A versioned `SHRAMIK-GEO-V1-2026-10-18` crosswalk maps 36 state/UT polygons and recognizes legacy API codes. The map refuses to render mismatched or duplicate geometry.
- First tries a local `assets/india-states.geojson`, then a hosted simplified DataMeet-derived GeoJSON. Run `python assets/fetch_india_boundaries.py` on an internet-connected machine to vendor the hosted layer locally after validating 36 unique crosswalk matches. The publisher labels it CC BY 2.5 India and a 2011 boundary vintage; it is for the competition preview only, not current official geometry.
- Boundary attribution: DataMeet India community, hosted by GeoDataViewer, CC BY 2.5 India; source vintage stated as 2011 and community notes document known boundary issues. The National Water Data Portal lists a Survey of India boundary source updated October 1, 2026, but redistribution terms need confirmation before local vendoring. Keep the chosen source's attribution with the asset.
- Demo values are visibly labelled illustrative; synthetic benchmark/evaluation data has its own visible label. Missing and suppressed values are neutral grey, not zero.

## Important production integration note

The static bundle still loads React 18, ReactDOM 18, Lucide icons and Google Fonts from CDNs. The JSX is compiled and no browser Babel runtime is required, but this is not an offline/self-contained artifact. Before public production deployment, align endpoint shapes/authentication with the backend team and consider self-hosting runtime dependencies per your deployment policy.
'''
(prod_dir / 'README.md').write_text(readme, encoding='utf-8')
(source_dir / 'README.md').write_text(readme, encoding='utf-8')

# Copy the full handoff source docs/assets as the source package's spec reference.
shutil.copytree(handoff_dir, source_dir / 'handoff')
shutil.copytree(prod_dir, source_dir / 'production')
(source_dir / 'test_demand_map.js').write_text((ROOT / 'test_demand_map.js').read_text(encoding='utf-8'), encoding='utf-8')

# Execute syntax and focused map-contract regression checks before generating the report.
node_check = subprocess.run(['node', '--check', str(prod_dir / 'app.js')], capture_output=True, text=True)
map_test = subprocess.run(['node', str(source_dir / 'test_demand_map.js')], capture_output=True, text=True)
if node_check.returncode != 0:
    raise RuntimeError('Compiled bundle failed node --check: ' + node_check.stderr)
if map_test.returncode != 0:
    raise RuntimeError('Demand map regression test failed: ' + map_test.stdout + '\n' + map_test.stderr)
map_test_summary = json.loads(map_test.stdout)
print('MAP_TESTS', f"{map_test_summary['passed']}/{map_test_summary['total']} PASS")

# QA report: populated after static and browser checks.
qa = '''# Demand Insights QA / handoff notes

## Reused from the uploaded HTML
- Existing compact SHRAMIK header/topbar and search UI.
- Existing canonical sidebar order with `Demand` active.
- Existing shared detail drawer, icon construction pattern, sparkline, loading/error components, dotted canvas and palette.
- Existing inline worker/industrial SVG artwork style.

## Implemented interactions
- Draft vs applied filters, validation, atomic Apply and Reset.
- Period / geography / state / sector / occupation / skill filters.
- Global region selector and regional-ranking row both drill into the same state filter.
- Four clickable KPIs open metadata/definition details.
- Demand trend supports metric selection, observed-vs-forecast line styles, interval band only where returned, focusable chart points and an accessible data table.
- Regional metric selector, interactive India state/UT choropleth, accessible ranked state/UT table, full regional detail view and boundary attribution.
- Occupation and skill rows open details; View All opens a full result drawer and emits a host-navigation event with applied filters.
- Evidence-linked, clearly labelled rule-based preview; no false AI badge.
- Retry, stale-data handling, source/provenance and snapshot messaging.
- REST mode does not silently fall back to mock data after request failures.

## Fixes made while integrating
- Added the missing `useMemo` hook import needed by the demand controller.
- Made provenance labels distinguish `source-backed`, `derived`, `mixed`, `mock`, `synthetic` and unknown; synthetic evaluation data always keeps an explicit non-observed label.
- Normalized the mock regional snapshot ID to match overview/insight snapshot IDs.
- Fixed the topbar's `India (National)` selection so `IN` resets state scope rather than being rejected as an unknown state.
- Surfaces notification mutation failures instead of leaving an unhandled rejection.
- Uses non-positive-aware direction markers for KPI deltas.
- Ensures skill panel cannot silently mix posting counts and index points; its label follows the returned measure.
- Limits the demo forecast to the 2024 demo snapshot that actually contains forecast fixtures; earlier periods show history only.

## Explicit blockers / not claimed
- Compiled JavaScript syntax check and 15 focused crosswalk/REST regional-comparison tests pass. Full browser rendering and a live boundary download could not be verified in this network-restricted environment. Vendor `assets/india-states.geojson` on an internet-connected machine before a presentation for repeatable loading.
- The preview uses a simplified DataMeet-derived hosted boundary fallback; the publisher reports a 2011 vintage and CC BY 2.5 India, and community notes document known issues for some regions. The included helper vendors it locally only after fail-closed 36-feature/crosswalk checks. Do not describe the layer as current official geometry. Review the Survey of India/National Water Data Portal option and its terms before formal deployment.
- No SHRAMIK backend was connected here. REST endpoint shapes and session/auth are an integration seam, not validated against a live server. `/demand/regions` must implement `comparisonScope=all-states` and return all 36 region rows; the frontend intentionally omits `stateCode` on that call, while the other panels use the selected state.
- Full browser automation, backend contract tests and production auth verification remain to be run inside the main SHRAMIK repository.
'''
(source_dir / 'QA_REPORT.md').write_text(qa, encoding='utf-8')

# Build report with deterministic checks. Runtime smoke will be appended by the shell script later.
bundle = (prod_dir / 'app.js').read_text(encoding='utf-8')
report = {
  'artifact': 'SHRAMIK Demand Insights standalone static bundle',
  'buildMode': 'static-production-bundle',
  'source': 'Derived from uploaded SHRAMIK_Supply_Insights.html shared shell plus Demand Insights handoff implementation requirements',
  'compiledAtBuildTime': True,
  'runtimeBabel': False,
  'runtime': 'React 18.3.1, ReactDOM 18.3.1, Lucide 0.263.1 and ECharts 5.6.0 from CDN; Google Fonts from CDN',
  'defaultMode': 'Clearly labelled mock adapter unless window.SHRAMIK_CONFIG.apiBaseUrl is configured',
  'apiMode': 'REST; errors do not silently fall back to mock data',
  'map': 'Interactive ECharts choropleth; 36-feature crosswalk validation; hosted DataMeet-derived boundary fallback (CC BY 2.5 India, publisher-stated 2011 vintage) with local-vendoring helper; not current official geometry',
  'sourceJsBytes': len(combined_js.encode('utf-8')),
  'compiledJsBytes': len(bundle.encode('utf-8')),
  'compiledJsSha256': hashlib.sha256(bundle.encode('utf-8')).hexdigest(),
  'checks': {'source_combination': 'PASS', 'JSX_compilation': 'PASS', 'compiled_JS_node_syntax': 'PASS', 'map_crosswalk_and_REST_contract_tests': f"{map_test_summary['passed']}/{map_test_summary['total']} PASS", 'synthetic_data_provenance': 'PASS' if ('Synthetic evaluation data' in bundle and 'not observed labour-market statistics' in bundle) else 'FAIL', 'archive_integrity': 'PENDING', 'browser_smoke': 'NOT_RUN_NETWORK_RESTRICTED', 'live_backend': 'NOT_CONNECTED', 'map_geometry': 'FETCH_ON_CLIENT_OR_VENDOR_LOCALLY'}
}
(prod_dir / 'BUILD_REPORT.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
(source_dir / 'production' / 'BUILD_REPORT.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
# save build inputs + script for reproducibility
(source_dir / 'BUILD_PAGE.py').write_text(Path(__file__).read_text(encoding='utf-8'), encoding='utf-8')
print('SOURCE_HTML', source_out, source_out.stat().st_size)
print('COMBINED_JS', source_dir / 'src' / 'DemandInsightsApp.jsx', len(combined_js))
print('PRODUCTION_JS', prod_dir / 'app.js', (prod_dir / 'app.js').stat().st_size)
print('PRODUCTION_DIR', prod_dir)
print('REPORT', report)
