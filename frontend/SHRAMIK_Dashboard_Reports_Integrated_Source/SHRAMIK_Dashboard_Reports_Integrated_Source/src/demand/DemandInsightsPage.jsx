import * as React from 'react';
import {
  LayoutDashboard, BarChart3, Users, Target, TrendingUp, Star, SlidersHorizontal,
  FileText, Database, ShieldCheck, Search, MapPin, Bell, ChevronDown, ArrowUpRight,
  ArrowRight, Lightbulb, Menu, X, Cpu, Leaf, Factory, HardHat, Building2,
  ShoppingCart, HeartPulse, Wheat, Truck, Wrench, Stethoscope, Zap, LineChart, Check, UserRound,
  Calendar, Globe, Filter, RotateCcw,
} from 'lucide-react';

const { useState, useEffect, useRef, useCallback, useId, useMemo } = React;


/* ============ ICON REGISTRY (safe: keys only, never API HTML) ============ */
const ICONS = {
  dashboard: LayoutDashboard, demand: BarChart3, supply: Users, gap: Target, forecasts: TrendingUp,
  emerging: Star, scenario: SlidersHorizontal, reports: FileText, sources: Database, quality: ShieldCheck,
  ai: Cpu, green: Leaf, data: LineChart, industrial: Zap, construction: Building2, factory: Factory,
  retail: ShoppingCart, health: HeartPulse, agri: Wheat, logistics: Truck, worker: HardHat,
  machine: Wrench, care: Stethoscope, user: UserRound,
};
const Icon = ({ k, size = 18, ...p }) => { const C = ICONS[k] || Star; return <C size={size} aria-hidden="true" {...p} />; };

/* ============ MOCK ADAPTER (all values illustrative) ============ */
const sleep = (ms, signal) => new Promise((res, rej) => {
  const t = setTimeout(res, ms);
  signal?.addEventListener('abort', () => { clearTimeout(t); rej(new DOMException('Aborted', 'AbortError')); });
});
const lat = (s) => sleep(250 + Math.random() * 250, s);
const meta = (notes) => ({ provenance: 'mock', sourceLabel: 'SHRAMIK demo dataset', updatedAt: '2026-10-14', notes });
const REGIONS = [
  { code: 'IN', name: 'India (National)', f: 1 }, { code: 'MH', name: 'Maharashtra', f: 0.12 },
  { code: 'UP', name: 'Uttar Pradesh', f: 0.1 }, { code: 'TN', name: 'Tamil Nadu', f: 0.08 },
  { code: 'KA', name: 'Karnataka', f: 0.07 }, { code: 'GJ', name: 'Gujarat', f: 0.063 },
];
const SECTIONS = {
  demand: 'Demand', supply: 'Supply', 'skill-gaps': 'Skill Gaps', forecasts: 'Forecasts', emerging: 'Emerging Skills',
  scenario: 'Scenario Simulator', reports: 'Reports', sources: 'Data Sources', quality: 'Data Quality',
  profile: 'Profile', states: 'All states', 'emerging-skills': 'Emerging Skills', 'sector-gaps': 'Skill Gaps by Sector',
  'occupation-forecasts': 'Occupation Forecasts',
};
const regionOf = (c) => REGIONS.find((r) => r.code === c) || REGIONS[0];
const M = (n) => `${n.toFixed(1)}M`;
const TREND = [[2020, 118, 98], [2021, 155, 118], [2022, 188, 148], [2023, 222, 178], [2024, 268, 240]];
const SKILLS = [['ai', 'Artificial Intelligence', 52, 'ai', 90, 'var(--navy)'], ['green', 'Green Energy Systems', 41, 'green', 72, 'var(--teal)'],
  ['data', 'Data Analysis', 37, 'data', 64, 'var(--orange)'], ['industrial', 'Industrial Automation', 33, 'industrial', 58, 'var(--navy)'],
  ['sust', 'Sustainable Construction', 29, 'construction', 50, 'var(--teal)']];
const SECTORS = [['manufacturing', 'Manufacturing', 2.8, 'factory', 88, 'var(--orange)'], ['construction', 'Construction', 1.9, 'construction', 60, 'var(--orange)'],
  ['retail', 'Retail & Trade', 1.1, 'retail', 35, 'var(--orange)'], ['healthcare', 'Healthcare', 0.8, 'health', 25, 'var(--navy)'],
  ['agriculture', 'Agriculture', 0.6, 'agri', 19, 'var(--teal)']];
const OCCS = [['construction-workers', 'Construction Workers', 22, 'worker', 60, 'var(--navy)'], ['machine-operators', 'Machine Operators', 18, 'machine', 50, 'var(--teal)'],
  ['healthcare-assistants', 'Healthcare Assistants', 16, 'care', 44, 'var(--orange)'], ['logistics', 'Logistics & Supply Chain', 15, 'logistics', 40, 'var(--navy)'],
  ['data-ai', 'Data & AI Specialists', 35, 'user', 85, 'var(--teal)']];
const RANK = { demand: [['Maharashtra', 28.4], ['Uttar Pradesh', 24.1], ['Tamil Nadu', 18.7], ['Karnataka', 16.3], ['Gujarat', 14.9]] };
const INDEX = [
  ...REGIONS.slice(1).map((r) => ({ id: r.code, type: 'region', label: r.name })),
  { id: 'ai', type: 'skill', label: 'Artificial Intelligence' }, { id: 'data', type: 'skill', label: 'Data Analysis' },
  { id: 'construction-workers', type: 'occupation', label: 'Construction Workers' },
  { id: 'manufacturing', type: 'sector', label: 'Manufacturing' }, { id: 'healthcare', type: 'sector', label: 'Healthcare' },
];
const NOTES = [{ id: 'n1', text: 'Demo data refreshed', read: false }, { id: 'n2', text: 'Skill gap view updated', read: false }, { id: 'n3', text: 'Welcome to SHRAMIK', read: true }];

const MockAdapter = {
  async getRegions(s) { await lat(s); return REGIONS.map(({ code, name }) => ({ code, name })); },
  async getProfile(s) { await lat(s); return { name: 'Arjun Mehta', role: 'Research Analyst', email: 'arjun.mehta@example.org', initial: 'A' }; },
  async getDashboard({ regionCode, periodYears, signal }) {
    await lat(signal); const f = regionOf(regionCode).f; const t = TREND.slice(-periodYears);
    const sp = (a) => a.map((v) => v * f);
    const gap = (268 - 240) * 0.2748 * f; // illustrative
    return {
      kpis: [
        { id: 'demand', iconKey: 'supply', label: 'Total Labour Demand', sub: 'Estimated workforce demand', value: 236.8 * f, formatted: M(236.8 * f), delta: '+4.2%', ctx: 'vs. last year', color: 'var(--navy)', spark: sp([10, 12, 11, 15, 14, 18, 22]) },
        { id: 'supply', iconKey: 'supply', label: 'Total Labour Supply', sub: 'Estimated workforce supply', value: 229.1 * f, formatted: M(229.1 * f), delta: '+3.1%', ctx: 'vs. last year', color: 'var(--teal)', spark: sp([9, 11, 12, 13, 15, 17, 20]) },
        { id: 'gap', iconKey: 'gap', label: 'Overall Skill Gap', sub: 'Demand — Supply', value: 7.7 * f, formatted: M(7.7 * f), delta: '+12.6%', ctx: 'vs. last year', color: 'var(--orange)', spark: sp([6, 5, 8, 7, 10, 9, 13]), valueColor: 'var(--orange)' },
        { id: 'emerging', iconKey: 'emerging', label: 'Emerging Skills', sub: 'High-growth opportunities', value: Math.round(312 * Math.max(f, 0.2)), formatted: String(Math.round(312 * Math.max(f, 0.2))), delta: '+28%', ctx: 'new this year', color: 'var(--teal)', spark: [3, 4, 4, 6, 7, 9, 12], valueColor: 'var(--teal)' },
      ].map((k) => (k.id === 'gap' ? { ...k, gapCheck: gap } : k)),
      trend: t.map(([year, demand, supply]) => ({ year, demand: demand * (f > 0.5 ? 1 : 1), supply })),
      emergingSkills: SKILLS.map(([id, label, v, iconKey, displayScore, color]) => ({ id, label, iconKey, formatted: `+${v}%`, displayScore, color })),
      sectorGaps: SECTORS.map(([id, label, v, iconKey, displayScore, color]) => ({ id, label, iconKey, formatted: M(v * f).replace(/^0\.0M$/, '<0.1M'), displayScore, color })),
      occupationForecasts: OCCS.map(([id, label, v, iconKey, displayScore, color]) => ({ id, label, iconKey, formatted: `+${v}%`, displayScore, color })),
      meta: meta('All figures are placeholders for layout and interaction testing.'),
    };
  },
  async getRegionRankings({ metric, signal }) {
    await lat(signal); const k = metric === 'supply' ? 0.96 : metric === 'skill-gap' ? 0.034 : 1;
    return { items: RANK.demand.map(([label, v], i) => ({ id: `r${i}`, label, formatted: M(v * k) })), meta: meta('Ranking values are illustrative.') };
  },
  async search({ query, signal }) {
    await lat(signal); const q = query.trim().toLowerCase();
    return q ? INDEX.filter((i) => i.label.toLowerCase().includes(q)) : [];
  },
  async getNotifications(s) { await lat(s); return NOTES.map((n) => ({ ...n })); },
  async markNotificationRead(id) { await lat(); const n = NOTES.find((x) => x.id === id); if (n) n.read = true; return { id, read: true }; },
  async getIndicatorDetail(id, { regionCode, signal } = {}) {
    await lat(signal);
    return { title: `Indicator: ${id}`, facts: [{ label: 'Region', value: regionOf(regionCode).name }, { label: 'Status', value: 'Placeholder indicator' }], table: null, meta: meta('Replace with source-backed indicator detail.') };
  },
  async getSectionDetail(section, { regionCode, signal } = {}) {
    await lat(signal);
    return {
      title: SECTIONS[section] || section,
      facts: [{ label: 'Region', value: regionOf(regionCode).name }, { label: 'Coverage', value: 'Demo only' }],
      table: { columns: ['Item', 'Illustrative value'], rows: [['Sample A', '—'], ['Sample B', '—']] },
      meta: meta('Detail view for layout testing.'),
    };
  },
};

/* ============ STYLES ============ */
const CSS = `
.sh{--canvas:#F7F6F0;--surface:#FFFEFA;--muted:#F0EFE8;--ink:#171717;--out:#292929;--tm:#62625C;--bm:#D8D6CD;--yellow:#F2D34F;--navy:#203A5B;--orange:#EB791D;--teal:#20A89C;--pos:#0E8A5F;
--disp:'Anton','Bebas Neue','Oswald','Arial Narrow',Impact,sans-serif;--body:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;
font-family:var(--body);color:var(--ink);min-height:100vh;background-color:var(--canvas);background-image:radial-gradient(rgba(41,41,41,.28) 1px,transparent 1.2px);background-size:22px 22px;background-attachment:fixed;font-size:14px;line-height:1.4}
.sh *{box-sizing:border-box}.sh button,.sh input,.sh select{font:inherit;color:inherit}
.sh :focus-visible{outline:3px solid var(--yellow);outline-offset:2px;box-shadow:0 0 0 5px var(--out)}
.sh h1,.sh h2,.sh h3{margin:0;font-family:var(--disp);font-weight:400;text-transform:uppercase;letter-spacing:.01em}
.vh{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.top{position:sticky;top:0;z-index:30;display:flex;align-items:center;gap:14px;padding:10px 20px;background:var(--canvas);border-bottom:1px solid var(--bm)}
.logo{display:flex;align-items:center;gap:10px}.logo-mark{width:38px;height:38px;border:2px solid var(--out);border-radius:8px;background:var(--yellow);display:grid;place-items:center;font:400 26px var(--disp);box-shadow:2px 2px 0 var(--out)}
.logo-word{font:400 32px/1 var(--disp);letter-spacing:.01em}.logo-desc{font-size:10px;font-weight:700;line-height:1.2;letter-spacing:.04em;border-left:1px solid var(--out);padding-left:10px}
.spacer{flex:1}.search{position:relative;flex:0 1 460px}.box{display:flex;align-items:center;gap:8px;background:var(--surface);border:1.5px solid var(--out);border-radius:10px;padding:0 10px;height:42px;box-shadow:2px 2px 0 var(--out)}
.box input{border:0;background:none;outline:0;flex:1;min-width:0;height:100%}.box:focus-within{outline:3px solid var(--yellow);box-shadow:0 0 0 5px var(--out)}
.kbd{font-size:11px;border:1px solid var(--out);border-radius:4px;padding:0 5px;background:var(--muted)}
.pop{position:absolute;top:calc(100% + 6px);right:0;min-width:240px;max-width:90vw;background:var(--surface);border:1.5px solid var(--out);border-radius:10px;box-shadow:3px 3px 0 var(--out);z-index:40;padding:6px}
.search .pop{left:0;right:auto;width:100%}.opt{display:flex;justify-content:space-between;gap:8px;width:100%;text-align:left;background:none;border:0;padding:8px 10px;border-radius:6px;cursor:pointer}
.opt:hover,.opt[aria-selected=true]{background:var(--yellow)}.opt small{color:var(--tm)}
.sel{position:relative;display:flex;align-items:center;gap:6px;background:var(--surface);border:1.5px solid var(--out);border-radius:8px;padding:0 8px;height:38px}
.sel select{appearance:none;background:none;border:0;padding:0 18px 0 0;font-weight:600;cursor:pointer;height:100%}.sel .chev{position:absolute;right:8px;pointer-events:none}
.sel.sm{height:32px;font-size:13px}.sel:focus-within{outline:3px solid var(--yellow);box-shadow:0 0 0 5px var(--out)}
.ibtn{position:relative;background:none;border:0;cursor:pointer;width:40px;height:40px;display:grid;place-items:center;border-radius:8px}
.dot{position:absolute;top:7px;right:9px;width:9px;height:9px;border-radius:50%;background:#D93025;border:1.5px solid var(--canvas)}
.user{display:flex;align-items:center;gap:10px;background:none;border:0;cursor:pointer;text-align:left;border-radius:8px}
.av{width:42px;height:42px;border-radius:50%;background:var(--yellow);border:2px solid var(--out);display:grid;place-items:center;font:400 20px var(--disp)}
.user b{display:block;font-size:12px}.user span{font-size:11px;color:var(--tm)}.hamb{display:none}
.shell{display:grid;grid-template-columns:210px minmax(0,1fr);gap:16px;padding:14px 20px 28px;align-items:start}
.side{position:sticky;top:76px;display:flex;flex-direction:column;gap:12px;background:rgba(255,254,250,.7);border:1px solid var(--bm);border-radius:12px;padding:12px;max-height:calc(100vh - 90px);overflow:auto}
.nav{display:flex;flex-direction:column;gap:2px}.nav button{display:flex;align-items:center;gap:12px;background:none;border:1.5px solid transparent;border-radius:9px;padding:10px 12px;cursor:pointer;text-align:left;font-weight:600}
.nav button:hover{background:var(--muted)}.nav button[aria-current=page]{background:var(--yellow);border-color:var(--out);box-shadow:1px 2px 0 var(--out)}
.nav hr{border:0;border-top:1px solid var(--bm);margin:8px 6px;width:calc(100% - 12px)}.side-art{border:1.5px solid var(--out);border-radius:8px;overflow:hidden;background:#fff;line-height:0}
.note{display:flex;gap:10px;align-items:center;border:1.5px solid var(--out);border-radius:10px;padding:10px;background:var(--surface);font-size:12px;font-weight:600}
.scrim{display:none}.main{display:flex;flex-direction:column;gap:14px;min-width:0}
.hero{position:relative;display:flex;justify-content:space-between;gap:16px;min-height:200px;overflow:hidden}
.crumb{font-size:12px;font-weight:700;letter-spacing:.03em;text-transform:uppercase}.hero h1{font-size:clamp(40px,5.4vw,70px);line-height:.95;margin:8px 0 12px;max-width:9em}
.under{width:min(180px,40%);height:12px;background:var(--yellow);margin-bottom:12px}.hero p{max-width:34em;margin:0;font-size:15px}
.hero-art{position:absolute;right:0;top:-6px;width:min(58%,640px);will-change:transform;pointer-events:none}.hero-copy{position:relative;z-index:1}
.sticky{fill:var(--yellow)}.card{background:var(--surface);border:1.5px solid var(--out);border-radius:12px;box-shadow:3px 3px 0 var(--out);padding:14px 16px;min-width:0}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.kpi{position:relative;cursor:pointer;text-align:left;width:100%}.kpi:hover{background:#fff}
.kpi-h{display:flex;gap:12px}.kpi-h h3{font-size:17px}.kpi-h small{color:var(--tm);font-size:13px;display:block}
.kpi-b{display:flex;align-items:flex-end;justify-content:space-between;gap:8px;margin-top:6px}.val{font:400 clamp(34px,3.3vw,46px)/1 var(--disp)}
.delta{display:flex;align-items:center;gap:4px;font-weight:700;color:var(--pos);font-size:13px}.delta small{color:var(--tm);font-weight:500}.kpi .open{position:absolute;top:10px;right:10px;color:var(--tm)}
.mid{display:grid;grid-template-columns:1.65fr 1fr;gap:14px}.low{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.ph{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:8px}.ph h2{font-size:22px}.ph p{margin:2px 0 0;color:var(--tm);font-size:13px}
.legend{display:flex;gap:16px;font-size:12px;align-items:center;margin-bottom:2px}.legend i{display:inline-block;width:26px;border-top:3px solid var(--navy);vertical-align:middle;margin-right:6px}.legend i.d{border-top:3px dashed var(--teal)}
.chart{position:relative}.chart svg{width:100%;height:auto;display:block}.tip{position:absolute;pointer-events:none;background:var(--ink);color:#fff;border-radius:6px;padding:4px 8px;font-size:12px;transform:translate(-50%,-120%);white-space:nowrap}
.round{position:absolute;right:4px;bottom:4px;width:32px;height:32px;border-radius:50%;border:1.5px solid var(--out);background:var(--surface);cursor:pointer;display:grid;place-items:center}
.reg{display:grid;grid-template-columns:1fr 1fr;gap:8px;align-items:center}.lg{font-size:12px;display:grid;gap:6px}.lg i{display:inline-block;width:14px;height:14px;border-radius:50%;margin-right:6px;vertical-align:-2px}
.rank{list-style:none;margin:0;padding:0;font-size:13px}.rank li{display:flex;gap:10px;padding:5px 0;border-bottom:1px solid var(--bm)}.rank b:first-child{width:14px}.rank span{flex:1}.rank h3{font:700 12px var(--body);text-transform:none;margin-bottom:4px}
.cta{display:flex;justify-content:center;align-items:center;gap:8px;width:100%;margin-top:10px;background:var(--yellow);border:1.5px solid var(--out);border-radius:8px;padding:8px;font-weight:700;cursor:pointer;box-shadow:2px 2px 0 var(--out)}
.va{display:flex;align-items:center;gap:6px;background:var(--surface);border:1.5px solid var(--out);border-radius:8px;padding:5px 10px;font-weight:600;font-size:13px;cursor:pointer;white-space:nowrap}
.rows{list-style:none;margin:0;padding:0}.row{display:grid;grid-template-columns:24px minmax(0,1.3fr) auto minmax(60px,1fr);gap:10px;align-items:center;width:100%;background:none;border:0;border-bottom:1px solid var(--bm);padding:7px 2px;cursor:pointer;text-align:left}
.row:hover{background:var(--muted)}.row span{overflow:hidden;text-overflow:ellipsis}.row b{font-size:13px}.pos{color:var(--pos)}.track{height:12px;background:var(--bm);border-radius:3px;overflow:hidden}.track i{display:block;height:100%}
.skel{background:linear-gradient(90deg,var(--muted),#fff,var(--muted));background-size:200% 100%;animation:sk 1.2s linear infinite;border-radius:6px;height:18px;margin:8px 0}@keyframes sk{to{background-position:-200% 0}}
.err{border:1.5px dashed #B3261E;background:#fff4f2;border-radius:8px;padding:12px;display:flex;gap:10px;align-items:center;justify-content:space-between;font-size:13px}.err button{background:var(--yellow);border:1.5px solid var(--out);border-radius:6px;padding:4px 10px;font-weight:700;cursor:pointer}
.empty{color:var(--tm);padding:12px 0;font-size:13px}.prov{display:inline-block;font-size:11px;font-weight:700;background:var(--yellow);border:1px solid var(--out);border-radius:20px;padding:1px 8px}.prov.ok{background:#CFEBDD}
.foot{display:flex;flex-wrap:wrap;gap:10px;align-items:center;font-size:12px;color:var(--tm);padding:0 4px}.spin{font-size:12px;font-weight:700}
.drawer{position:fixed;inset:0;z-index:60;display:flex;justify-content:flex-end;background:rgba(23,23,23,.35)}.dp{width:min(440px,100%);height:100%;background:var(--surface);border-left:2px solid var(--out);padding:18px;overflow:auto;display:flex;flex-direction:column;gap:12px}
.dp h2{font-size:28px}.dp dl{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;margin:0}.dp dt{color:var(--tm)}.dp dd{margin:0;font-weight:600}.dp table{border-collapse:collapse;width:100%}.dp th{background:var(--muted);text-align:left}.dp th,.dp td{border:1px solid var(--bm);padding:6px 8px}
.pad{padding:8px}.pad .opt{cursor:default}.pad .opt:hover{background:none}
@media(max-width:1199px){.shell{grid-template-columns:minmax(0,1fr)}.hamb{display:grid}.side{position:fixed;left:0;top:0;bottom:0;z-index:50;width:240px;max-height:none;border-radius:0;background:var(--surface);transform:translateX(-105%);transition:transform .18s}.side.open{transform:none}
.scrim.on{display:block;position:fixed;inset:0;z-index:45;background:rgba(23,23,23,.35)}.kpis{grid-template-columns:1fr 1fr}.mid{grid-template-columns:1fr}.low{grid-template-columns:1fr 1fr}.low>:last-child{grid-column:1/-1}.logo-desc{display:none}}
@media(max-width:620px){.top{padding:8px 12px;gap:6px}.search{flex:0 0 auto}.search .box{width:42px;padding:0;justify-content:center}.search .box input,.search .kbd{display:none}.search.exp{position:static}.search.exp .box{position:absolute;left:8px;right:8px;top:8px;width:auto;padding:0 10px;z-index:3}.search.exp .box input{display:block}.search.exp .pop{left:8px;right:8px;width:auto;top:56px;position:fixed}
.user div,.top .sel span{display:none}.logo-word{font-size:26px}.shell{padding:10px 12px 24px}.hero{min-height:0;flex-direction:column}.hero-art{position:relative;width:100%;top:0;margin-top:-10px}.hero h1{max-width:none}.kpis{gap:10px}.card{padding:10px}.kpi-b{flex-direction:column;align-items:flex-start}.low{grid-template-columns:1fr}.reg{grid-template-columns:1fr}
.row{grid-template-columns:22px 1fr auto}.row .track{grid-column:2/-1}.ph{flex-wrap:wrap}}
@media(prefers-reduced-motion:reduce){.sh *{animation:none!important;transition:none!important}}
`;

/* ============ SMALL PARTS ============ */
const ProvenanceBadge = ({ meta: m }) => {
  const provenance = m?.provenance;
  const label = provenance === 'mock' ? 'Illustrative data'
    : provenance === 'mixed' ? 'Mixed data'
    : provenance === 'derived' ? 'Derived data'
    : provenance === 'source-backed' ? 'Source-backed'
    : 'Provenance unavailable';
  return <span className={`prov ${['source-backed', 'derived'].includes(provenance) ? 'ok' : ''}`}>{label}</span>;
};

const SelectControl = ({ label, value, onChange, options, icon, small }) => {
  const id = useId();
  return (
    <label className={`sel ${small ? 'sm' : ''}`} htmlFor={id}>
      {icon}<span className="vh">{label}</span>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={15} className="chev" aria-hidden="true" />
    </label>
  );
};

const Sparkline = ({ data, color, id }) => {
  if (!data?.length) return null;
  const w = 130, h = 46, mx = Math.max(...data), mn = Math.min(...data), r = mx - mn || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1 || 1)) * w, h - 4 - ((v - mn) / r) * (h - 10)]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="120" height="42" aria-hidden="true" style={{ flexShrink: 0 }}>
      <defs><linearGradient id={`g-${id}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".25" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={`${line} L${w},${h} L0,${h} Z`} fill={`url(#g-${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};

const Skeleton = ({ n = 5 }) => <div aria-busy="true" aria-label="Loading">{Array.from({ length: n }, (_, i) => <div className="skel" key={i} />)}</div>;
const ErrorBox = ({ msg, onRetry }) => <div className="err" role="alert"><span>{msg}</span><button onClick={onRetry}>Retry</button></div>;

/* ============ ARTWORK (decorative inline SVG) ============ */
const HeroArt = () => (
  <svg viewBox="0 0 640 230" aria-hidden="true" focusable="false">
    <defs>
      <pattern id="ht" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" fill="#171717" /></pattern>
      <clipPath id="sunclip"><rect x="250" y="0" width="300" height="200" /></clipPath>
    </defs>
    <g clipPath="url(#sunclip)"><circle cx="400" cy="200" r="130" fill="#F2D34F" opacity=".95" /></g>
    <g stroke="#292929" strokeWidth="1.2" fill="none">
      <path d="M130 215V70M110 70h120M120 70l50-35 50 35M130 60l30-20M225 70v40" />
      <path d="M270 215V90M255 90h60M262 90l30-28 30 28" />
      <path d="M560 215V40M545 40h50M552 40l20-25 20 25" /><path d="M520 215v-110h30v110M520 140h30M520 170h30" />
      <path d="M170 215V120h40v95M170 150h40M170 180h40" />
    </g>
    <path d="M330 215c0-50 22-62 58-70h30c36 8 58 20 58 70z" fill="#4a4a46" />
    <path d="M330 215c0-50 22-62 58-70h30c36 8 58 20 58 70z" fill="url(#ht)" opacity=".55" />
    <path d="M360 215l22-60 14 60M450 215l-22-60-14 60" fill="#F2D34F" opacity=".85" />
    <ellipse cx="404" cy="108" rx="30" ry="36" fill="#cfcac0" /><ellipse cx="404" cy="108" rx="30" ry="36" fill="url(#ht)" opacity=".35" />
    <path d="M370 100c0-30 18-44 36-44s34 14 34 44z" fill="#f5f4ee" stroke="#292929" strokeWidth="2" /><rect x="364" y="98" width="86" height="8" rx="4" fill="#f5f4ee" stroke="#292929" strokeWidth="2" />
    <g transform="rotate(7 590 80)"><rect x="520" y="10" width="110" height="110" className="sticky" stroke="#171717" strokeWidth="2" />
      {['EVIDENCE', 'INSIGHTS', 'PLANNING', 'IMPACT ↗'].map((t, i) => <text key={t} x="530" y={42 + i * 22} fontFamily="Anton,Impact,sans-serif" fontSize="18" fill="#171717">{t}</text>)}</g>
    <rect x="590" y="200" width="30" height="24" fill="#EB791D" opacity=".9" />
  </svg>
);
const SideArt = () => (
  <svg viewBox="0 0 180 230" role="img" aria-label="Decorative illustration of two construction workers facing a building site" width="100%">
    <defs><pattern id="ht2" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#171717" /></pattern></defs>
    <rect width="180" height="230" fill="#ebe9e1" /><circle cx="120" cy="60" r="22" fill="#F2D34F" opacity=".8" />
    <path d="M130 120V20M115 20h50M125 20l20-14 20 14" stroke="#555" strokeWidth="1.3" fill="none" /><path d="M20 120h30v-40H20zM60 120h30V60H60z" fill="#9a9a94" />
    <path d="M10 230c0-40 12-62 36-66h8c24 4 36 26 36 66z" fill="#5b5b57" /><path d="M96 230c0-36 10-56 30-60h8c22 4 34 24 34 60z" fill="#77776f" />
    <path d="M10 230c0-40 12-62 36-66h8c24 4 36 26 36 66z" fill="url(#ht2)" opacity=".4" />
    <circle cx="50" cy="150" r="16" fill="#3d3d3a" /><path d="M32 148c0-14 8-20 18-20s18 6 18 20z" fill="#d8d6cd" stroke="#171717" strokeWidth="1.5" />
    <circle cx="130" cy="156" r="15" fill="#3d3d3a" /><path d="M113 154c0-13 8-19 17-19s17 6 17 19z" fill="#d8d6cd" stroke="#171717" strokeWidth="1.5" />
    <path d="M24 200l12-30M76 200l-12-30M110 205l10-30M156 205l-10-30" stroke="#F2D34F" strokeWidth="5" opacity=".8" />
  </svg>
);
const REGION_SHADE = ['#0F3F78', '#1F5CA8', '#5C8FCB', '#A9C5E6'];
const IndiaMap = () => (
  <svg viewBox="0 0 160 190" role="img" aria-label="Decorative stylised map of India. It does not show data; see the ranked list." width="100%" style={{ maxWidth: 190 }}>
    <path d="M60 8l22 6 8 18 22 6 4 16-12 8 20 12-4 10-24 2-10 24-14 44-12 46-12-30-14-50-26-24 4-16 20-4 6-20 12-8z" fill="#A9C5E6" stroke="#fff" strokeWidth="1.5" />
    <path d="M36 82l24-4 10 22-14 24-22-14z" fill={REGION_SHADE[2]} stroke="#fff" /><path d="M70 100l24-8 4 22-18 22-14-16z" fill={REGION_SHADE[0]} stroke="#fff" />
    <path d="M52 124l30 4-8 30-14 22-14-34z" fill={REGION_SHADE[1]} stroke="#fff" /><path d="M64 36l18 4 6 20-22 8-10-18z" fill={REGION_SHADE[1]} stroke="#fff" />
    <path d="M94 66l24 4-4 14-24 2z" fill={REGION_SHADE[0]} stroke="#fff" />
  </svg>
);

/* ============ SHELL ============ */
function Header({ adapter, regions, regionCode, onRegion, profile, notes, onRead, onMenu, onPick }) {
  const [q, setQ] = useState(''); const [res, setRes] = useState([]); const [hi, setHi] = useState(-1);
  const [exp, setExp] = useState(false); const [pop, setPop] = useState(null); const [sErr, setSErr] = useState('');
  const inp = useRef(null);
  useEffect(() => {
    const k = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setExp(true); inp.current?.focus(); } };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, []);
  useEffect(() => {
    if (!q.trim()) { setRes([]); setSErr(''); return undefined; }
    const ac = new AbortController();
    const t = setTimeout(() => {
      adapter.search({ query: q, regionCode, signal: ac.signal }).then((r) => { setRes(r); setHi(-1); setSErr(''); })
        .catch((e) => { if (e.name !== 'AbortError') setSErr('Search failed. Try again.'); });
    }, 250);
    return () => { clearTimeout(t); ac.abort(); };
  }, [q, regionCode, adapter]);
  const choose = (r) => { setQ(''); setRes([]); setExp(false); onPick(r); };
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, res.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter' && res[hi]) choose(res[hi]);
    else if (e.key === 'Escape') { setQ(''); setRes([]); setExp(false); }
  };
  const unread = notes.filter((n) => !n.read).length;
  return (
    <header className="top">
      <button className="ibtn hamb" aria-label="Open navigation menu" onClick={onMenu}><Menu /></button>
      <div className="logo"><div className="logo-mark" aria-hidden="true">S</div><span className="logo-word">SHRAMIK</span><div className="logo-desc">LABOUR MARKET<br />INTELLIGENCE<br />SYSTEM</div></div>
      <div className="spacer" />
      <div className={`search ${exp ? 'exp' : ''}`}>
        <div className="box" onClick={() => { setExp(true); inp.current?.focus(); }}>
          <Search size={18} aria-hidden="true" />
          <input ref={inp} aria-label="Search skills, occupations, sectors or regions" placeholder="Search for skills, occupations, sectors or regions…" value={q}
            onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} role="combobox" aria-expanded={res.length > 0} aria-controls="sres" aria-autocomplete="list" />
          <span className="kbd">Ctrl</span><span className="kbd">K</span>
        </div>
        {(res.length > 0 || sErr || (q.trim() && !res.length)) && q.trim() && (
          <div className="pop" id="sres" role="listbox" aria-label="Search results">
            {sErr ? <div className="empty">{sErr}</div> : res.length ? res.map((r, i) => (
              <button key={`${r.type}-${r.id}`} role="option" aria-selected={i === hi} className="opt" onClick={() => choose(r)}><span>{r.label}</span><small>{r.type}</small></button>
            )) : <div className="empty">No results yet. Try a skill, sector or state.</div>}
          </div>
        )}
      </div>
      <SelectControl label="Region" value={regionCode} onChange={onRegion} icon={<MapPin size={16} aria-hidden="true" />} options={regions.map((r) => ({ value: r.code, label: r.name }))} />
      <div style={{ position: 'relative' }}>
        <button className="ibtn" aria-label={`Notifications, ${unread} unread`} aria-expanded={pop === 'n'} onClick={() => setPop(pop === 'n' ? null : 'n')}><Bell />{unread > 0 && <span className="dot" />}</button>
        {pop === 'n' && <div className="pop" role="dialog" aria-label="Notifications" onKeyDown={(e) => e.key === 'Escape' && setPop(null)}>
          {notes.map((n) => <div className="opt" key={n.id}><span style={{ fontWeight: n.read ? 400 : 700 }}>{n.text}</span>
            {!n.read && <button className="va" onClick={() => onRead(n.id)}><Check size={14} />Mark read</button>}</div>)}
        </div>}
      </div>
      <div style={{ position: 'relative' }}>
        <button className="user" aria-expanded={pop === 'p'} aria-label="Open profile" onClick={() => setPop(pop === 'p' ? null : 'p')}>
          <span className="av" aria-hidden="true">{profile?.initial || 'A'}</span>
          <div><b>{profile?.name || '…'}</b><span>{profile?.role || ''}</span></div><ChevronDown size={16} aria-hidden="true" />
        </button>
        {pop === 'p' && <div className="pop pad" role="dialog" aria-label="Profile" onKeyDown={(e) => e.key === 'Escape' && setPop(null)}>
          <b>{profile?.name}</b><div>{profile?.role}</div><div style={{ color: 'var(--tm)' }}>{profile?.email}</div>
        </div>}
      </div>
    </header>
  );
}

const NAV = [['dashboard', 'Dashboard'], ['demand', 'Demand'], ['supply', 'Supply'], ['gap', 'Skill Gaps', 'skill-gaps'], ['forecasts', 'Forecasts'],
  ['emerging', 'Emerging Skills'], ['scenario', 'Scenario Simulator'], ['reports', 'Reports'], ['---'], ['sources', 'Data Sources'], ['quality', 'Data Quality']];
function Sidebar({ active, onNav, open, onClose }) {
  return (
    <>
      <div className={`scrim ${open ? 'on' : ''}`} onClick={onClose} />
      <aside className={`side ${open ? 'open' : ''}`}>
        <nav className="nav" aria-label="Primary">
          {NAV.map((n, i) => n[0] === '---' ? <hr key={i} /> : (
            <button key={n[0]} aria-current={active === n[0] ? 'page' : undefined} onClick={() => onNav(n[0], n[2] || n[0], n[1])}><Icon k={n[0]} />{n[1]}</button>))}
        </nav>
        <div className="side-art"><SideArt /></div>
        <div className="note"><Lightbulb size={22} color="#C79A00" aria-hidden="true" /><span>Data for people. Opportunities for a stronger India.</span></div>
      </aside>
    </>
  );
}

/* ============ DETAIL DRAWER ============ */
function DetailDrawer({ d, onClose }) {
  const ref = useRef(null); const prev = useRef(null);
  useEffect(() => {
    prev.current = document.activeElement; ref.current?.querySelector('button')?.focus();
    return () => prev.current?.focus?.();
  }, []);
  const key = (e) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key !== 'Tab') return;
    const f = ref.current.querySelectorAll('button,[href],input,select,[tabindex]:not([tabindex="-1"])');
    if (!f.length) return;
    const a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  };
  return (
    <div className="drawer" onClick={onClose}>
      <div className="dp" role="dialog" aria-modal="true" aria-labelledby="dp-h" ref={ref} onKeyDown={key} onClick={(e) => e.stopPropagation()}>
        <div className="ph"><h2 id="dp-h">{d.title}</h2><button className="ibtn" aria-label="Close details" onClick={onClose}><X /></button></div>
        {d.status === 'loading' && <Skeleton n={4} />}
        {d.status === 'error' && <ErrorBox msg={d.error} onRetry={d.retry} />}
        {d.status === 'ready' && <>
          <dl>{d.data.facts.map((f) => <><dt key={`${f.label}-t`}>{f.label}</dt><dd key={`${f.label}-d`}>{f.value}</dd></>)}</dl>
          {d.data.table && <table><thead><tr>{d.data.table.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>{d.data.table.rows.map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody></table>}
          <div><ProvenanceBadge meta={d.data.meta} /></div>
          <div style={{ fontSize: 12, color: 'var(--tm)' }}>Source: {d.data.meta.sourceLabel} · Updated {d.data.meta.updatedAt}<br />{d.data.meta.notes}</div>
        </>}
      </div>
    </div>
  );
}



/* ============ DEMAND INSIGHTS DATA ADAPTERS ============ */
const UPDATED_DEMO_AT = '2026-10-18T09:00:00.000Z';
const MOCK_META = {
  provenance: 'mock', sourceLabel: 'Illustrative demo data', updatedAt: UPDATED_DEMO_AT,
  coverage: 'Mock interaction preview only; not official labour-market statistics.',
  notes: ['Every value and filter response in this standalone preview is illustrative.', 'Connect the Demand Insights API for validated source-backed values.']
};
const DEMO_STATES = [
  { code: 'MH', name: 'Maharashtra', demand: 4800000, growth: 7.8 },
  { code: 'UP', name: 'Uttar Pradesh', demand: 4100000, growth: 6.9 },
  { code: 'TN', name: 'Tamil Nadu', demand: 2900000, growth: 5.9 },
  { code: 'KA', name: 'Karnataka', demand: 2600000, growth: 5.4 },
  { code: 'GJ', name: 'Gujarat', demand: 2100000, growth: 6.1 },
  { code: 'WB', name: 'West Bengal', demand: 1900000, growth: 4.2 },
  { code: 'RJ', name: 'Rajasthan', demand: 1600000, growth: 5.0 },
  { code: 'MP', name: 'Madhya Pradesh', demand: 1500000, growth: 3.6 },
  { code: 'BR', name: 'Bihar', demand: 1200000, growth: 5.3 },
  { code: 'OD', name: 'Odisha', demand: 999000, growth: 4.7 },
  { code: 'AP', name: 'Andhra Pradesh', demand: 440000, growth: 5.2 },
  { code: 'AR', name: 'Arunachal Pradesh', demand: 34000, growth: 3.2 },
  { code: 'AS', name: 'Assam', demand: 290000, growth: 4.1 },
  { code: 'CG', name: 'Chhattisgarh', demand: 248000, growth: 4.0 },
  { code: 'GA', name: 'Goa', demand: 96000, growth: 4.6 },
  { code: 'HR', name: 'Haryana', demand: 454000, growth: 6.4 },
  { code: 'HP', name: 'Himachal Pradesh', demand: 138000, growth: 3.8 },
  { code: 'JH', name: 'Jharkhand', demand: 316000, growth: 4.4 },
  { code: 'KL', name: 'Kerala', demand: 385000, growth: 4.6 },
  { code: 'MN', name: 'Manipur', demand: 34000, growth: 3.0 },
  { code: 'ML', name: 'Meghalaya', demand: 41000, growth: 3.4 },
  { code: 'MZ', name: 'Mizoram', demand: 21000, growth: 3.3 },
  { code: 'NL', name: 'Nagaland', demand: 28000, growth: 3.1 },
  { code: 'PB', name: 'Punjab', demand: 303000, growth: 4.9 },
  { code: 'SK', name: 'Sikkim', demand: 21000, growth: 3.6 },
  { code: 'TS', name: 'Telangana', demand: 688000, growth: 6.8 },
  { code: 'TR', name: 'Tripura', demand: 41000, growth: 3.3 },
  { code: 'UK', name: 'Uttarakhand', demand: 179000, growth: 4.5 },
  { code: 'AN', name: 'Andaman and Nicobar Islands', demand: 14000, growth: 2.7 },
  { code: 'CH', name: 'Chandigarh', demand: 48000, growth: 4.1 },
  { code: 'DH', name: 'Dadra and Nagar Haveli and Daman and Diu', demand: 55000, growth: 4.0 },
  { code: 'DL', name: 'Delhi', demand: 413000, growth: 6.7 },
  { code: 'JK', name: 'Jammu and Kashmir', demand: 303000, growth: 4.2 },
  { code: 'LA', name: 'Ladakh', demand: 28000, growth: 2.8 },
  { code: 'LD', name: 'Lakshadweep', demand: 7000, growth: 2.2 },
  { code: 'PY', name: 'Puducherry', demand: 76000, growth: 4.3 }
].map((s) => ({ ...s, postings: Math.round(s.demand * 12100000 / 28400000) }));
const DEMO_OCCUPATIONS = [
  { id: 'occ-retail-sales', occupationCode: 'DEMO-001', title: 'Retail Salespersons', value: 3200000, growthPct: 8.4, sparkline: [2.1, 2.3, 2.5, 2.8, 3.2], definition: 'Illustrative occupation grouping. Official NCO code and taxonomy version must be supplied by the API.', relatedSkills: ['COMMS', 'TEAM'] },
  { id: 'occ-construction', occupationCode: 'DEMO-002', title: 'Construction Labourers', value: 2900000, growthPct: 6.1, sparkline: [2.1, 2.3, 2.4, 2.6, 2.9], definition: 'Illustrative occupation grouping. Official NCO code and taxonomy version must be supplied by the API.', relatedSkills: ['PROJECT', 'TEAM'] },
  { id: 'occ-software', occupationCode: 'DEMO-003', title: 'Software Developers', value: 1800000, growthPct: 14.6, sparkline: [1.0, 1.1, 1.3, 1.5, 1.8], definition: 'Illustrative occupation grouping. Official NCO code and taxonomy version must be supplied by the API.', relatedSkills: ['DATA', 'COMPUTER'] },
  { id: 'occ-drivers', occupationCode: 'DEMO-004', title: 'Drivers and Mobile Plant Operators', value: 1500000, growthPct: 7.9, sparkline: [1.1, 1.2, 1.2, 1.4, 1.5], definition: 'Illustrative occupation grouping. Official NCO code and taxonomy version must be supplied by the API.', relatedSkills: ['TEAM', 'COMMUNICATION'] },
  { id: 'occ-teaching', occupationCode: 'DEMO-005', title: 'Teaching Professionals', value: 1300000, growthPct: 6.8, sparkline: [0.9, 1.0, 1.1, 1.2, 1.3], definition: 'Illustrative occupation grouping. Official NCO code and taxonomy version must be supplied by the API.', relatedSkills: ['COMMS', 'TEAM'] },
  { id: 'occ-machine', occupationCode: 'DEMO-006', title: 'Machine Operators', value: 1150000, growthPct: 5.5, sparkline: [0.8, 0.9, 1.0, 1.0, 1.15], definition: 'Illustrative occupation grouping. Official NCO code and taxonomy version must be supplied by the API.', relatedSkills: ['TECHNICAL', 'TEAM'] },
  { id: 'occ-care', occupationCode: 'DEMO-007', title: 'Healthcare Assistants', value: 980000, growthPct: 9.1, sparkline: [0.6, 0.7, 0.8, 0.9, 0.98], definition: 'Illustrative occupation grouping. Official NCO code and taxonomy version must be supplied by the API.', relatedSkills: ['COMMS', 'TEAM'] },
  { id: 'occ-logistics', occupationCode: 'DEMO-008', title: 'Logistics Coordinators', value: 870000, growthPct: 10.2, sparkline: [0.5, 0.6, 0.7, 0.78, 0.87], definition: 'Illustrative occupation grouping. Official NCO code and taxonomy version must be supplied by the API.', relatedSkills: ['DATA', 'PROJECT'] }
];
const DEMO_SKILLS = [
  { id: 'COMMS', title: 'Communication', demandIndex: 100, growthPct: 18.2, sparkline: [61, 69, 74, 82, 100], taxonomyVersion: 'DEMO-1.0', basis: 'Combined job-posting and industry-signal index; baseline = 100.', meta: MOCK_META },
  { id: 'COMPUTER', title: 'Computer Literacy', demandIndex: 92, growthPct: 16.5, sparkline: [60, 64, 72, 82, 92], taxonomyVersion: 'DEMO-1.0', basis: 'Combined job-posting and industry-signal index; baseline = 100.', meta: MOCK_META },
  { id: 'TEAM', title: 'Team Management', demandIndex: 85, growthPct: 14.6, sparkline: [58, 63, 69, 78, 85], taxonomyVersion: 'DEMO-1.0', basis: 'Combined job-posting and industry-signal index; baseline = 100.', meta: MOCK_META },
  { id: 'PROJECT', title: 'Project Management', demandIndex: 78, growthPct: 13.1, sparkline: [52, 58, 65, 70, 78], taxonomyVersion: 'DEMO-1.0', basis: 'Combined job-posting and industry-signal index; baseline = 100.', meta: MOCK_META },
  { id: 'DATA', title: 'Data Analysis', demandIndex: 74, growthPct: 21.3, sparkline: [42, 49, 55, 63, 74], taxonomyVersion: 'DEMO-1.0', basis: 'Combined job-posting and industry-signal index; baseline = 100.', meta: MOCK_META },
  { id: 'TECHNICAL', title: 'Technical Troubleshooting', demandIndex: 69, growthPct: 11.8, sparkline: [48, 52, 58, 64, 69], taxonomyVersion: 'DEMO-1.0', basis: 'Combined job-posting and industry-signal index; baseline = 100.', meta: MOCK_META },
  { id: 'GREEN', title: 'Green Energy Systems', demandIndex: 62, growthPct: 19.4, sparkline: [32, 40, 45, 54, 62], taxonomyVersion: 'DEMO-1.0', basis: 'Combined job-posting and industry-signal index; baseline = 100.', meta: MOCK_META },
  { id: 'AI', title: 'AI and Automation', demandIndex: 59, growthPct: 26.0, sparkline: [24, 33, 38, 49, 59], taxonomyVersion: 'DEMO-1.0', basis: 'Combined job-posting and industry-signal index; baseline = 100.', meta: MOCK_META }
];
const DEMO_YEARS = {
  'estimated-demand': { unit: 'positions', observations: [['2019',18700000],['2020',19600000],['2021',22800000],['2022',23000000],['2023',26743000],['2024',28400000]], forecast: [['2025',30200000,28300000,32200000],['2026',32000000,29200000,35300000]], method: 'Illustrative trend projection; not a production forecast.' },
  'posting-count': { unit: 'postings', observations: [['2019',6200000],['2020',6400000],['2021',7100000],['2022',8000000],['2023',11163000],['2024',12100000]], forecast: [['2025',13300000,12000000,14800000],['2026',14600000,12800000,16500000]], method: 'Illustrative trend projection; not a production forecast.' }
};
const DEMO_FILTER_OPTIONS = {
  periods: [{ value: '2024', label: '2024 (Latest complete)', complete: true }, { value: '2023', label: '2023' }, { value: '2022', label: '2022' }],
  geographies: [{ value: 'IN', label: 'All India' }, { value: 'STATE', label: 'State / UT' }],
  states: DEMO_STATES.filter((s) => !s.aggregate).map((s) => ({ value: s.code, label: s.name })),
  sectors: [{ value: '', label: 'All Sectors' }, { value: 'manufacturing', label: 'Manufacturing' }, { value: 'construction', label: 'Construction' }, { value: 'it-ites', label: 'IT-ITES' }, { value: 'healthcare', label: 'Healthcare' }, { value: 'agriculture', label: 'Agriculture and Allied' }],
  occupations: [{ value: '', label: 'All Occupations' }, ...DEMO_OCCUPATIONS.map((o) => ({ value: o.occupationCode, label: o.title }))],
  skills: [{ value: '', label: 'All Skills' }, ...DEMO_SKILLS.map((s) => ({ value: s.id, label: s.title }))],
  regionalMetrics: [{ value: 'estimated-demand', label: 'Estimated demand' }, { value: 'posting-count', label: 'Observed postings' }, { value: 'demand-growth', label: 'Demand growth (%)' }],
  trendMetrics: [{ value: 'estimated-demand', label: 'Estimated demand' }, { value: 'posting-count', label: 'Observed postings' }],
  defaults: { period: '2024', geography: 'IN', stateCode: '', sectorId: '', occupationCode: '', skillId: '' }
};
const cleanNotes = (meta) => Array.isArray(meta?.notes) ? meta.notes.join(' ') : (meta?.notes || '');
const fmtCount = (n, suffix = '') => {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  const x = Number(n);
  if (Math.abs(x) >= 1000000) return `${(x / 1000000).toFixed(1)}M${suffix}`;
  if (Math.abs(x) >= 1000) return `${(x / 1000).toFixed(1)}K${suffix}`;
  return `${Math.round(x).toLocaleString('en-IN')}${suffix}`;
};
const pct = (v) => v == null || !Number.isFinite(Number(v)) ? '—' : `${Number(v) > 0 ? '+' : ''}${Number(v).toFixed(1)}%`;
const abortablePause = (ms, signal) => new Promise((resolve, reject) => {
  if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
  const id = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, ms);
  const abort = () => { clearTimeout(id); reject(new DOMException('Aborted', 'AbortError')); };
  signal?.addEventListener('abort', abort, { once: true });
});
const stableFilterKey = (f) => [f?.period, f?.geography, f?.stateCode, f?.sectorId, f?.occupationCode, f?.skillId].join('|');
const mockScopeFactor = (f) => {
  let k = 1;
  if (f?.stateCode) k *= (DEMO_STATES.find((s) => s.code === f.stateCode)?.demand || 1000000) / 28400000;
  if (f?.sectorId) k *= 0.38;
  if (f?.occupationCode) k *= 0.14;
  if (f?.skillId) k *= 0.22;
  if (f?.period) k *= ({ '2024': 1, '2023': 26743000 / 28400000, '2022': 23000000 / 28400000 }[f.period] || 1);
  return k;
};
const mockMeta = (snapshotId, note) => ({ ...MOCK_META, snapshotId, notes: [...MOCK_META.notes, ...(note ? [note] : [])] });
const mockOverview = (filters, trendMetric = 'estimated-demand') => {
  const factor = mockScopeFactor(filters);
  const year = Number(filters.period || '2024');
  const demandMap = { 2022: 23000000, 2023: 26743000, 2024: 28400000 };
  const postingMap = { 2022: 8000000, 2023: 11163000, 2024: 12100000 };
  const demand = (demandMap[year] || 28400000) * factor;
  const postings = (postingMap[year] || 12100000) * factor;
  const prevDemand = demandMap[year - 1];
  const prevPosts = postingMap[year - 1];
  const demandDelta = prevDemand ? ((demandMap[year] / prevDemand) - 1) * 100 : null;
  const postingDelta = prevPosts ? ((postingMap[year] / prevPosts) - 1) * 100 : null;
  const snapshotId = `demo-${stableFilterKey(filters)}`.replace(/[^a-zA-Z0-9_-]/g, '-');
  const metricSeries = DEMO_YEARS[trendMetric] || DEMO_YEARS['estimated-demand'];
  const unitFactor = factor;
  const usableObservations = metricSeries.observations.filter(([period]) => Number(period) <= year);
  const usableForecast = year === 2024 ? metricSeries.forecast : [];
  const trend = {
    metric: trendMetric, unit: metricSeries.unit,
    actual: usableObservations.map(([period, value]) => ({ period, value: value * unitFactor })),
    forecast: usableForecast.map(([period, value, lowerBound, upperBound]) => ({ period, value: value * unitFactor, lowerBound: lowerBound * unitFactor, upperBound: upperBound * unitFactor })),
    forecastMethod: usableForecast.length ? metricSeries.method : null, meta: mockMeta(snapshotId, 'Trend figures are deterministic demo fixtures; forecasts are included only for the 2024 demo snapshot.')
  };
  const occupations = DEMO_OCCUPATIONS.filter((o) => !filters.occupationCode || o.occupationCode === filters.occupationCode).map((o) => ({
    ...o, formattedDemand: fmtCount(o.value * factor), value: o.value * factor, unit: 'positions', taxonomyVersion: 'DEMO-1.0 (not an official NCO mapping)', rank: null,
    growthPct: year === 2024 ? o.growthPct : null, meta: mockMeta(snapshotId, 'Occupation IDs and values are demo fixtures, not verified NCO records.')
  })).slice(0, 5).map((o, i) => ({ ...o, rank: i + 1 }));
  const skills = DEMO_SKILLS.filter((s) => !filters.skillId || s.id === filters.skillId).slice(0, 5).map((s, i) => ({
    ...s, rank: i + 1, measureType: 'demand-index', unit: 'index points', baseline: 100,
    growthPct: year === 2024 ? s.growthPct : null, meta: mockMeta(snapshotId, 'Skill IDs, index values and growth are demo fixtures.')
  }));
  const occupationCount = Math.max(1, Math.round(342 * Math.max(factor, 0.1)));
  const skillCount = Math.max(1, Math.round(1028 * Math.max(factor, 0.1)));
  const kpis = [
    { id: 'estimated-demand', title: 'Total Estimated Demand', value: demand, formattedValue: fmtCount(demand), unit: 'estimated positions', period: String(year), deltaPct: demandDelta, comparisonPeriod: prevDemand ? String(year - 1) : null, definition: 'Illustrative estimate of labour demand for the selected period and filters. The production definition must identify the unit of analysis and distinguish postings, vacancies, people and projected need.', iconKey: 'demand', color: 'var(--navy)', sparkline: [18.7, 19.6, 22.8, 23.0, 26.743, 28.4].slice(-5).map((v) => v * factor * 1000000), meta: mockMeta(snapshotId) },
    { id: 'posting-volume', title: 'Observed Job Postings', value: postings, formattedValue: fmtCount(postings), unit: 'postings', period: String(year), deltaPct: postingDelta, comparisonPeriod: prevPosts ? String(year - 1) : null, definition: 'Illustrative count of de-duplicated job postings in the demo sample. A production payload must document the covered portals, time window, de-duplication method and known source bias.', iconKey: 'posts', color: 'var(--orange)', sparkline: [6.2, 6.4, 7.1, 8.0, 11.163, 12.1].slice(-5).map((v) => v * factor * 1000000), meta: mockMeta(snapshotId) },
    { id: 'high-demand-occupations', title: 'High-Demand Occupations', value: occupationCount, formattedValue: occupationCount.toLocaleString('en-IN'), unit: 'distinct occupation groups', period: String(year), deltaPct: year === 2024 ? 12.6 : null, comparisonPeriod: year === 2024 ? '2023' : null, definition: 'Demo count of distinct occupation groups meeting the configured high-demand rule. In production, the API must return the rule, threshold, eligible universe, NCO taxonomy version and comparison basis.', iconKey: 'occupations', color: 'var(--teal)', sparkline: [258, 276, 293, 304, 342].map((v) => v * Math.max(factor, 0.1)), meta: mockMeta(snapshotId) },
    { id: 'high-demand-skills', title: 'High-Demand Skills', value: skillCount, formattedValue: skillCount.toLocaleString('en-IN'), unit: 'distinct skills', period: String(year), deltaPct: year === 2024 ? 15.3 : null, comparisonPeriod: year === 2024 ? '2023' : null, definition: 'Demo count of distinct skill taxonomy entries meeting the configured threshold. A production payload must include taxonomy version, signal basis and threshold details.', iconKey: 'skills', color: 'var(--yellow)', sparkline: [740, 802, 850, 891, 1028].map((v) => v * Math.max(factor, 0.1)), meta: mockMeta(snapshotId) }
  ];
  return {
    appliedFilters: { ...filters }, heroComparison: demandDelta == null ? null : { metricLabel: 'Estimated demand change', value: demandDelta, formattedValue: pct(demandDelta), unit: '%', comparisonPeriod: String(year - 1), definition: 'Year-over-year change in the illustrative estimated demand measure.' },
    kpis, trend, topOccupations: occupations, topSkills: skills, meta: mockMeta(snapshotId)
  };
};
const MockDemandAdapter = {
  async getDemandFilterOptions(signal) { await abortablePause(160, signal); return { ...DEMO_FILTER_OPTIONS, meta: mockMeta('demo-options') }; },
  async getDemandOverview(filters, trendMetric, signal) { await abortablePause(240, signal); return mockOverview(filters, trendMetric); },
  async getDemandRegions(filters, metric, signal) {
    await abortablePause(200, signal);
    const chosen = DEMO_FILTER_OPTIONS.regionalMetrics.some((m) => m.value === metric) ? metric : 'estimated-demand';
    let source = DEMO_STATES;
    if (filters.stateCode) source = DEMO_STATES.filter((s) => s.code === filters.stateCode);
    const factor = (filters.sectorId ? 0.38 : 1) * (filters.occupationCode ? 0.14 : 1) * (filters.skillId ? 0.22 : 1) * ({ '2024': 1, '2023': 26743000 / 28400000, '2022': 23000000 / 28400000 }[filters.period] || 1);
    const factorTotal = (filters.sectorId ? 0.38 : 1) * (filters.occupationCode ? 0.14 : 1) * (filters.skillId ? 0.22 : 1) * ({ '2024': 1, '2023': 26743000 / 28400000, '2022': 23000000 / 28400000 }[filters.period] || 1);
    const snapshotId = `demo-${stableFilterKey(filters)}`.replace(/[^a-zA-Z0-9_-]/g, '-');
    const scopeTotal = (filters.stateCode ? (source[0]?.demand || 0) : 28400000) * factorTotal;
    const items = source.map((s) => {
      const value = chosen === 'estimated-demand' ? s.demand * factor : chosen === 'posting-count' ? s.postings * factor : s.growth;
      const denominator = chosen === 'estimated-demand' ? scopeTotal : chosen === 'posting-count' ? ((filters.stateCode ? (source[0]?.demand || 0) : 28400000) * factorTotal * 12100000 / 28400000) : null;
      return { stateCode: s.aggregate ? null : s.code, stateName: s.name, value: s.aggregate ? null : value, formattedValue: s.aggregate ? 'Included in aggregate' : chosen === 'demand-growth' ? `${value.toFixed(1)}%` : fmtCount(value), unit: chosen === 'estimated-demand' ? 'positions' : chosen === 'posting-count' ? 'postings' : '%', rank: null, sharePct: denominator && !s.aggregate ? (value / denominator) * 100 : null, growthPct: s.growth, status: s.aggregate ? 'aggregate' : 'available', meta: mockMeta(`regional-${stableFilterKey(filters)}-${chosen}`) };
    }).filter((x) => x.status === 'available' || x.status === 'aggregate');
    const available = items.filter((x) => x.status === 'available').sort((a, b) => (b.value || 0) - (a.value || 0)).map((r, i) => ({ ...r, rank: i + 1 }));
    const all = available;
    const max = Math.max(1, ...available.map((x) => x.value || 0));
    return { metric: chosen, period: filters.period, unit: chosen === 'estimated-demand' ? 'positions' : chosen === 'posting-count' ? 'postings' : '%', metrics: DEMO_FILTER_OPTIONS.regionalMetrics,
      items: all.map((r) => ({ ...r, displayScore: r.value == null ? null : (r.value / max) * 100 })),
      legend: { min: 0, max, breaks: [0, max * .25, max * .5, max * .75, max], labels: ['Lowest', 'Low–medium', 'Medium–high', 'Highest'] },
      meta: mockMeta(snapshotId, 'Regional rows and values are illustrative demo fixtures.'), appliedFilters: { ...filters } };
  },
  async getDemandOccupationList(filters, { sort = 'demand', direction = 'desc', page = 1, limit = 100, signal } = {}) {
    await abortablePause(160, signal);
    let list = mockOverview(filters, 'estimated-demand').topOccupations.length ? DEMO_OCCUPATIONS.map((o) => ({ ...o, value: o.value * mockScopeFactor(filters), formattedDemand: fmtCount(o.value * mockScopeFactor(filters)), taxonomyVersion: 'DEMO-1.0 (not an official NCO mapping)', unit: 'positions', meta: mockMeta('demo-occupations') })) : [];
    if (filters.occupationCode) list = list.filter((o) => o.occupationCode === filters.occupationCode);
    list.sort((a, b) => sort === 'growth' ? ((b.growthPct || -Infinity) - (a.growthPct || -Infinity)) : (b.value - a.value));
    if (direction === 'asc') list.reverse();
    const start = (page - 1) * limit;
    return { items: list.slice(start, start + limit).map((o, i) => ({ ...o, rank: start + i + 1 })), page, limit, total: list.length, sort, direction, meta: mockMeta(`demo-occupations-${stableFilterKey(filters)}`) };
  },
  async getDemandSkillList(filters, { sort = 'demand', direction = 'desc', page = 1, limit = 100, signal } = {}) {
    await abortablePause(160, signal);
    let list = DEMO_SKILLS.filter((s) => !filters.skillId || s.id === filters.skillId).map((s) => ({ ...s, value: s.demandIndex, formattedValue: String(s.demandIndex), measureType: 'demand-index', unit: 'index points', baseline: 100, meta: mockMeta('demo-skills') }));
    list.sort((a, b) => sort === 'growth' ? ((b.growthPct || -Infinity) - (a.growthPct || -Infinity)) : (b.demandIndex - a.demandIndex));
    if (direction === 'asc') list.reverse();
    const start = (page - 1) * limit;
    return { items: list.slice(start, start + limit).map((s, i) => ({ ...s, rank: start + i + 1 })), page, limit, total: list.length, sort, direction, meta: mockMeta(`demo-skills-${stableFilterKey(filters)}`) };
  },
  async getDemandInsights(filters, signal) {
    await abortablePause(220, signal);
    const overview = mockOverview(filters, 'estimated-demand');
    const demand = overview.kpis.find((k) => k.id === 'estimated-demand');
    const jobs = overview.kpis.find((k) => k.id === 'posting-volume');
    const occ = overview.topOccupations[0];
    const skill = overview.topSkills.slice().sort((a, b) => (b.growthPct || 0) - (a.growthPct || 0))[0];
    const generatedAt = new Date().toISOString();
    return { method: 'rule-based', generatedAt, snapshotId: overview.meta.snapshotId, appliedFilters: { ...filters }, meta: mockMeta(overview.meta.snapshotId, 'These summaries are constructed from the current mock adapter payload; no AI service ran.'), items: [
      { id: 'ins-demand', title: 'Demand snapshot', statement: `Illustrative estimated demand is ${demand.formattedValue} in ${filters.period}.`, explanation: demand.deltaPct == null ? 'A comparable prior period is not available in this demo response, so no growth claim is made.' : `The mock adapter compares this with ${demand.comparisonPeriod} and reports ${pct(demand.deltaPct)} year over year.`, evidenceRefs: [{ id: 'estimated-demand', type: 'kpi', label: 'Estimated demand' }, { id: 'demand-trend', type: 'chart', label: 'Demand trend' }], severity: 'info' },
      { id: 'ins-occupation', title: 'Occupation signal', statement: occ ? `${occ.title} ranks first in this illustrative occupation sample at ${occ.formattedDemand}.` : 'No occupation demand records match these filters.', explanation: 'The occupation values are demo fixtures and use demonstration IDs, not an official NCO crosswalk.', evidenceRefs: occ ? [{ id: occ.id, type: 'occupation', label: occ.title }] : [], severity: 'info' },
      { id: 'ins-skill', title: 'Skills signal', statement: skill ? `${skill.title} has the strongest growth signal in the displayed demo skill sample (${pct(skill.growthPct)}).` : 'No skill records match these filters.', explanation: 'The skill score is an index with baseline 100; it is not a posting count or a number of people.', evidenceRefs: skill ? [{ id: skill.id, type: 'skill', label: skill.title }] : [], severity: 'info' },
      { id: 'ins-postings', title: 'Posting coverage', statement: `The mock posting measure is ${jobs.formattedValue}; source coverage is not verified in this preview.`, explanation: 'Production interpretation requires de-duplication rules, portal coverage, period coverage and source metadata from the API.', evidenceRefs: [{ id: 'posting-volume', type: 'kpi', label: 'Observed job postings' }], severity: 'notice' }
    ] };
  },
  async getDemandDetail(target, filters, signal) {
    await abortablePause(100, signal);
    const kpis = mockOverview(filters, 'estimated-demand').kpis;
    let title = target.label || target.id; let facts = [];
    if (target.type === 'kpi') {
      const k = kpis.find((x) => x.id === target.id);
      if (k) { title = k.title; facts = [{ label: 'Value', value: `${k.formattedValue} ${k.unit}` }, { label: 'Period', value: k.period }, { label: 'Definition', value: k.definition }, { label: 'Comparison', value: k.comparisonPeriod ? `${pct(k.deltaPct)} vs ${k.comparisonPeriod}` : 'Not available' }, { label: 'Coverage', value: MOCK_META.coverage }]; }
    } else if (target.type === 'occupation') {
      const o = DEMO_OCCUPATIONS.find((x) => x.id === target.id || x.occupationCode === target.id);
      if (o) { title = o.title; facts = [{ label: 'Demo occupation code', value: o.occupationCode }, { label: 'Taxonomy version', value: 'DEMO-1.0 — not an official NCO mapping' }, { label: 'Estimated demand', value: fmtCount(o.value * mockScopeFactor(filters)) }, { label: 'Growth', value: filters.period === '2024' ? pct(o.growthPct) : 'No comparable demo period supplied' }, { label: 'Definition', value: o.definition }, { label: 'Coverage', value: MOCK_META.coverage }]; }
    } else if (target.type === 'skill') {
      const s = DEMO_SKILLS.find((x) => x.id === target.id);
      if (s) { title = s.title; facts = [{ label: 'Skill ID', value: s.id }, { label: 'Taxonomy version', value: s.taxonomyVersion }, { label: 'Demand index', value: `${s.demandIndex} points (baseline 100)` }, { label: 'Growth', value: filters.period === '2024' ? pct(s.growthPct) : 'No comparable demo period supplied' }, { label: 'Signal basis', value: s.basis }]; }
    } else if (target.type === 'state' || target.type === 'region') {
      const s = DEMO_STATES.find((x) => x.code === target.id);
      if (s) { title = s.name; facts = [{ label: 'Demo state code', value: s.code }, { label: 'Estimated demand', value: fmtCount(s.demand * mockScopeFactor(filters)) }, { label: 'Growth signal', value: pct(s.growth) }, { label: 'Geometry', value: 'Not configured: no verified, versioned state/UT GeoJSON is included in the handoff.' }]; }
    } else if (target.type === 'sector') {
      const sector = DEMO_FILTER_OPTIONS.sectors.find((x) => x.value === target.id);
      if (sector) { title = sector.label; facts = [{ label: 'Sector ID', value: sector.value }, { label: 'Applied period', value: filters.period }, { label: 'Status', value: 'Illustrative sector filter; source-backed sector mapping must come from the API.' }, { label: 'Coverage', value: MOCK_META.coverage }]; }
    } else if (target.type === 'chart') {
      const d = mockOverview(filters, 'estimated-demand'); title = 'Demand trend methodology'; facts = [{ label: 'Selected period', value: filters.period }, { label: 'Observed points', value: String(d.trend.actual.length) }, { label: 'Forecast points', value: String(d.trend.forecast.length) }, { label: 'Forecast method', value: d.trend.forecastMethod }, { label: 'Provenance', value: 'Illustrative mock values; not a production forecast.' }];
    }
    return { title, facts: facts.length ? facts : [{ label: 'Status', value: 'No detail supplied by the mock adapter.' }], table: null, meta: mockMeta(`detail-${target.id}-${stableFilterKey(filters)}`) };
  },
  async getProfile(signal) { await abortablePause(100, signal); return { name: 'Demo Analyst', role: 'Preview mode', email: 'Not connected to an authenticated session', initial: 'D' }; },
  async getNotifications(signal) { await abortablePause(100, signal); return [{ id: 'n1', text: 'Illustrative demo data is active', read: false }, { id: 'n2', text: 'Verified map geometry is not configured', read: false }, { id: 'n3', text: 'Connect the /api/v1 Demand Insights endpoints for live data', read: true }]; },
  async markNotificationRead(id, signal) { await abortablePause(60, signal); return { id, read: true }; },
  async search({ query, regionCode, signal }) {
    await abortablePause(100, signal); const q = query.trim().toLowerCase();
    if (!q) return [];
    const items = [
      ...DEMO_OCCUPATIONS.map((x) => ({ id: x.id, type: 'occupation', label: x.title })),
      ...DEMO_SKILLS.map((x) => ({ id: x.id, type: 'skill', label: x.title })),
      ...DEMO_FILTER_OPTIONS.sectors.filter((x) => x.value).map((x) => ({ id: x.value, type: 'sector', label: x.label })),
      ...DEMO_STATES.filter((x) => !x.aggregate).map((x) => ({ id: x.code, type: 'region', label: x.name }))
    ];
    return items.filter((x) => x.label.toLowerCase().includes(q)).slice(0, 8);
  }
};
const makeRestAdapter = (base) => {
  const root = String(base || '').replace(/\/+$/, '').endsWith('/api/v1') ? String(base).replace(/\/+$/, '') : `${String(base || '').replace(/\/+$/, '')}/api/v1`;
  const queryString = (filters = {}, extras = {}) => {
    const q = new URLSearchParams();
    ['period', 'geography', 'stateCode', 'sectorId', 'occupationCode', 'skillId'].forEach((k) => { const v = filters[k]; if (v != null && v !== '') q.set(k, v); });
    Object.entries(extras).forEach(([k, v]) => { if (v != null && v !== '') q.set(k, String(v)); });
    return q.toString();
  };
  const request = async (path, { params = '', signal, method = 'GET', body } = {}) => {
    const url = `${root}${path}${params ? `?${params}` : ''}`;
    let response;
    try { response = await fetch(url, { method, signal, credentials: 'include', headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); }
    catch (e) { if (e.name === 'AbortError') throw e; throw new Error(`Network request failed for ${path}. Check the API base URL and CORS configuration.`); }
    if (!response.ok) { let message = `Request failed (${response.status}) for ${path}.`; try { const err = await response.json(); message = err.message || err.error || message; } catch (_) {} throw new Error(message); }
    if (response.status === 204) return null;
    return response.json();
  };
  return {
    mode: 'rest',
    getDemandFilterOptions: (signal) => request('/demand/filter-options', { signal }),
    getDemandOverview: (filters, trendMetric, signal) => request('/demand/overview', { params: queryString(filters, { trendMetric }), signal }),
    getDemandRegions: (filters, metric, signal) => request('/demand/regions', { params: queryString(filters, { metric }), signal }),
    getDemandOccupationList: (filters, options = {}) => request('/demand/occupations', { params: queryString(filters, { sort: options.sort || 'demand', direction: options.direction || 'desc', page: options.page || 1, limit: options.limit || 50 }), signal: options.signal }),
    getDemandSkillList: (filters, options = {}) => request('/demand/skills', { params: queryString(filters, { sort: options.sort || 'demand', direction: options.direction || 'desc', page: options.page || 1, limit: options.limit || 50 }), signal: options.signal }),
    getDemandInsights: (filters, signal) => request('/demand/insights', { params: queryString(filters), signal }),
    getDemandDetail: (target, filters, signal) => request(`/demand/details/${encodeURIComponent(target.id)}`, { params: queryString(filters, { type: target.type }), signal }),
    getProfile: (signal) => request('/me', { signal }),
    getNotifications: (signal) => request('/notifications', { signal }),
    markNotificationRead: (id, signal) => request(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH', signal }),
    search: ({ query, regionCode, signal }) => request('/search', { params: new URLSearchParams({ q: query, region: regionCode || 'IN' }).toString(), signal })
  };
};
const getConfiguredApiBase = () => {
  const viteBase = import.meta.env?.VITE_DEMAND_API_BASE_URL;
  return String(viteBase || window.SHRAMIK_API_BASE_URL || window.SHRAMIK_CONFIG?.apiBaseUrl || '').trim();
};
const getDefaultAdapter = () => {
  const injected = window.SHRAMIK_DATA_ADAPTER;
  if (injected) return injected;
  const base = getConfiguredApiBase();
  return base ? makeRestAdapter(base) : MockDemandAdapter;
};
const normalizeOptionList = (list = [], labelKeys = ['label', 'name', 'title']) => (Array.isArray(list) ? list : []).map((x) => {
  if (typeof x === 'string' || typeof x === 'number') return { value: String(x), label: String(x) };
  const value = x.value ?? x.id ?? x.code ?? x.stateCode ?? x.occupationCode ?? x.skillId ?? '';
  const label = labelKeys.map((k) => x[k]).find((v) => v != null) ?? String(value);
  return { ...x, value: String(value), label: String(label) };
});
const normalizeFilterOptions = (raw) => {
  if (!raw) return null;
  const opts = raw.options || raw;
  const periods = normalizeOptionList(opts.periods || opts.period || []);
  const geographies = normalizeOptionList(opts.geographies || opts.geography || []);
  const states = normalizeOptionList(opts.states || opts.stateOptions || []);
  const sectors = [{ value: '', label: 'All Sectors' }, ...normalizeOptionList(opts.sectors || [])].filter((x, i, a) => a.findIndex((y) => y.value === x.value) === i);
  const occupations = [{ value: '', label: 'All Occupations' }, ...normalizeOptionList(opts.occupations || [])].filter((x, i, a) => a.findIndex((y) => y.value === x.value) === i);
  const skills = [{ value: '', label: 'All Skills' }, ...normalizeOptionList(opts.skills || [])].filter((x, i, a) => a.findIndex((y) => y.value === x.value) === i);
  const regionalMetrics = normalizeOptionList(opts.regionalMetrics || opts.metrics?.regional || (opts.metrics && !Array.isArray(opts.metrics) ? [] : []) || []);
  const trendMetrics = normalizeOptionList(opts.trendMetrics || []);
  const defaults = opts.defaults || raw.defaults || {};
  const firstPeriod = periods.find((p) => p.complete || p.isComplete || p.isDefault) || periods[0];
  const geographyDefault = geographies.find((g) => g.isDefault) || geographies.find((g) => g.value === 'IN') || geographies[0];
  return { periods, geographies: geographies.length ? geographies : [{ value: 'IN', label: 'All India' }, { value: 'STATE', label: 'State / UT' }], states, sectors, occupations, skills,
    regionalMetrics: regionalMetrics.length ? regionalMetrics : [{ value: 'estimated-demand', label: 'Estimated demand' }],
    trendMetrics: trendMetrics.length ? trendMetrics : [{ value: 'estimated-demand', label: 'Estimated demand' }],
    defaults: { period: String(defaults.period ?? firstPeriod?.value ?? ''), geography: String(defaults.geography ?? geographyDefault?.value ?? 'IN'), stateCode: String(defaults.stateCode ?? ''), sectorId: String(defaults.sectorId ?? ''), occupationCode: String(defaults.occupationCode ?? ''), skillId: String(defaults.skillId ?? '') },
    meta: raw.meta || opts.meta || MOCK_META
  };
};

/* ============ DEMAND PAGE STYLES ============ */
const CSS2 = `
.demand-intro{display:grid;grid-template-columns:minmax(260px,1fr) minmax(210px,265px) minmax(220px,330px);align-items:center;gap:14px;min-height:174px;position:relative;overflow:hidden}
.demand-intro .crumb{font-size:12px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:var(--tm)}
.demand-intro h1{font-size:clamp(40px,5vw,68px);line-height:.93;margin:8px 0 11px;max-width:8em}
.demand-intro p{max-width:39em;margin:0;font-size:14px;line-height:1.5}
.demand-intro .under{width:142px;height:10px;background:var(--yellow);margin:0 0 12px}
.demand-callout{align-self:center;background:var(--surface);border:1.5px solid var(--out);border-radius:10px;box-shadow:3px 3px 0 var(--out);padding:14px;display:flex;gap:12px;align-items:center;min-width:0}
.demand-callout .big{font:400 clamp(26px,2.6vw,38px)/1 var(--disp);white-space:nowrap}
.demand-callout .change{font-weight:800;color:var(--pos);font-size:14px;white-space:nowrap}.demand-callout small{display:block;color:var(--tm);font-size:11px;line-height:1.35;margin-top:4px}
.demand-intro-art{align-self:end;min-width:0;pointer-events:none}.demand-intro-art svg{width:100%;height:auto;display:block;max-height:174px}
.demand-filters{padding:13px 14px}.filters-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr)) auto;gap:10px;align-items:end}.field label{display:block;font-size:12px;font-weight:700;margin-bottom:4px}.field .sel{width:100%;height:40px;min-width:0}.field select{width:100%;min-width:0;overflow:hidden;text-overflow:ellipsis}.field select:disabled{opacity:.5;cursor:not-allowed}
.fbtn{display:flex;gap:8px}.apply{display:flex;align-items:center;justify-content:center;gap:7px;background:var(--yellow);border:1.5px solid var(--out);border-radius:8px;height:40px;padding:0 13px;font-weight:700;cursor:pointer;box-shadow:2px 2px 0 var(--out);white-space:nowrap}.apply:disabled{opacity:.58;cursor:wait}.reset{width:40px;height:40px;border:1.5px solid var(--out);border-radius:8px;background:var(--surface);cursor:pointer;display:grid;place-items:center}.dirty{font-size:12px;color:var(--tm);grid-column:1/-1;display:flex;align-items:center;gap:6px}.applied-row{display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:11px;color:var(--tm);padding:0 2px}.filter-chip{display:inline-flex;align-items:center;gap:4px;border:1px solid var(--bm);background:var(--surface);border-radius:5px;padding:3px 7px;color:var(--ink);font-weight:600}.mode-label{display:inline-flex;align-items:center;gap:6px;font-size:10px;letter-spacing:.06em;font-weight:800;text-transform:uppercase;border:1px solid var(--out);background:#FFF2C5;border-radius:4px;padding:4px 7px}.mode-label:before{content:'';width:6px;height:6px;background:#C87B00;border-radius:50%}
.demand-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px}.demand-kpi{display:flex;align-items:center;gap:11px;width:100%;min-width:0;cursor:pointer;text-align:left;padding:13px 12px;min-height:114px;transition:transform .12s ease,background .12s ease}.demand-kpi:hover{background:#fff;transform:translateY(-1px)}.demand-kpi:active{transform:translate(1px,1px)}.demand-kpi .badge{width:44px;height:44px;min-width:44px;border:1.5px solid var(--out);border-radius:50%;display:grid;place-items:center}.demand-kpi .content{min-width:0;flex:1}.demand-kpi h3{font:700 12px/1.25 var(--body);text-transform:none;letter-spacing:0;margin:0 0 5px}.demand-kpi .metric{font:400 clamp(24px,2.2vw,35px)/1 var(--disp);white-space:nowrap}.demand-kpi .metric-foot{display:flex;align-items:center;gap:6px;margin-top:6px;flex-wrap:wrap}.demand-kpi .delta{font-size:12px;font-weight:800;color:var(--pos);display:inline-flex;align-items:center;gap:2px}.demand-kpi .delta.negative{color:var(--orange)}.demand-kpi .muted{font-size:11px;color:var(--tm)}.demand-kpi .kpi-spark{margin-left:auto;min-width:52px;max-width:74px;opacity:.92;align-self:end}.demand-kpi:nth-child(1){background:#F7FAFC}.demand-kpi:nth-child(2){background:#FFFAF4}.demand-kpi:nth-child(3){background:#F5FBFA}.demand-kpi:nth-child(4){background:#FFFCF0}
.demand-mid{display:grid;grid-template-columns:minmax(0,1.28fr) minmax(0,1fr);gap:14px;align-items:stretch}.demand-bottom{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(0,.95fr);gap:14px;align-items:stretch}.ph{align-items:flex-start}.ph h2{font-size:22px;line-height:1.1}.ph p{font-size:12px;line-height:1.45}.panel-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}.tiny-label{color:var(--tm);font-size:11px;font-weight:600}.demand-select{max-width:200px}.chart-subtitle{font-size:12px;color:var(--tm);margin:4px 0 8px}.chart-legend{display:flex;align-items:center;gap:14px;flex-wrap:wrap;font-size:11px;color:var(--tm);margin-bottom:5px}.chart-legend span{display:inline-flex;align-items:center;gap:5px}.line-key{display:inline-block;width:24px;border-top:3px solid var(--navy)}.line-key.forecast{border-top-style:dashed;border-color:#66A9D8}.band-key{width:20px;height:9px;background:rgba(32,58,91,.14);border:1px solid rgba(32,58,91,.25)}
.demand-chart{position:relative;min-width:0}.demand-chart svg{display:block;width:100%;height:auto;overflow:visible}.demand-chart .tip{z-index:2;max-width:260px;white-space:normal;text-align:left}.chart-empty{padding:26px 12px;border:1px dashed var(--bm);border-radius:8px;color:var(--tm);font-size:13px}.dtog{font-size:12px;text-decoration:underline;background:none;border:0;cursor:pointer;margin-top:6px;font-weight:700}.tw{overflow-x:auto;max-width:100%}.tbl{width:100%;border-collapse:collapse;font-size:12px}.tbl th{text-align:left;font-size:11px;color:var(--tm);font-weight:700;padding:6px 5px;border-bottom:1px solid var(--out);white-space:nowrap}.tbl td{padding:7px 5px;border-bottom:1px solid var(--bm);vertical-align:middle}.tbl .lk{background:none;border:0;cursor:pointer;text-align:left;padding:0;font-weight:700;line-height:1.35}.tbl .lk:hover{text-decoration:underline}.tbl tr[aria-current=true] td{background:#FFF2BF}.tbl small{display:block;color:var(--tm);font-size:10px;line-height:1.3;margin-top:2px}.demand-table caption{text-align:left}.demand-table td:first-child,.demand-table th:first-child{width:22px}.growth{font-weight:800;color:var(--pos);white-space:nowrap}.muted-val{color:var(--tm)}.mini{display:flex;align-items:center;gap:6px;min-width:85px}.mini .track{flex:1;min-width:25px}.track{height:7px;background:var(--bm);border-radius:3px;overflow:hidden}.track i{display:block;height:100%;background:var(--orange)}.spark-wrap{min-width:58px}.spark-na{display:inline-block;color:var(--tm);font-size:14px}
.region-layout{display:grid;grid-template-columns:minmax(130px,.72fr) minmax(0,1.55fr);gap:10px;align-items:stretch}.map-unavailable{min-height:270px;border:1.5px dashed var(--bm);border-radius:9px;background:linear-gradient(135deg,#F7F6F0,#F1F0E8);padding:13px;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:8px;color:var(--tm);font-size:12px}.map-unavailable strong{font:400 20px var(--disp);color:var(--ink);text-transform:uppercase}.map-unavailable p{margin:0;line-height:1.45}.map-symbol{width:46px;height:46px;border:1.5px solid var(--out);border-radius:50%;display:grid;place-items:center;background:var(--yellow);color:var(--ink)}.region-footer{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;font-size:11px;color:var(--tm);margin-top:7px}.rank-number{color:var(--tm);width:18px}.region-value{white-space:nowrap;font-weight:700}.region-table th,.region-table td{padding:6px 4px}.region-table td:nth-child(3){min-width:105px}.region-table .select-state{background:none;border:0;text-align:left;padding:0;cursor:pointer;font-weight:700}.region-table .select-state:hover{text-decoration:underline}.region-table tr[aria-current=true] td{background:#FFF1B8}.region-status{font-size:10px;color:var(--tm);display:block}
.panel-footer{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:10px;flex-wrap:wrap}.view-all{display:inline-flex;align-items:center;gap:6px;background:var(--surface);border:1.5px solid var(--out);border-radius:7px;padding:7px 9px;font-size:12px;font-weight:700;cursor:pointer}.view-all:hover{background:var(--yellow)}.evidence-panel{display:flex;flex-direction:column}.insight-list{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:10px}.insight-item{border-left:3px solid var(--yellow);padding:2px 0 2px 10px;font-size:12px;line-height:1.45}.insight-item h3{font:700 12px var(--body);text-transform:none;margin:0 0 3px}.insight-item p{margin:0}.insight-explain{color:var(--tm);font-size:11px;margin-top:4px!important}.evidence-chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:5px}.chip{background:var(--muted);border:1px solid var(--bm);border-radius:4px;font-size:10px;padding:2px 6px;cursor:pointer;font-weight:700}.chip:hover{background:var(--yellow)}.method{font-size:11px;color:var(--tm);margin-top:auto;padding-top:10px}.no-insights{border:1px dashed var(--bm);border-radius:8px;padding:12px;color:var(--tm);font-size:12px}.inline-message{font-size:12px;border:1px solid var(--bm);background:var(--muted);padding:8px;border-radius:6px;margin-bottom:8px}.stale{font-size:11px;font-weight:700;color:#8a5a00;background:#FFF3CF;border:1px solid #E0B94A;border-radius:6px;padding:5px 8px;display:inline-flex;gap:8px;align-items:center;margin-bottom:6px}.stale button{background:none;border:0;text-decoration:underline;cursor:pointer;font-weight:700}.sel-note{font-size:11px;color:var(--tm);margin-top:7px;line-height:1.45}.provline{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:11px;color:var(--tm);padding:0 4px;line-height:1.5}.unavailable-status{border-left:3px solid #D69B17;padding:8px 10px;background:#FFF8E3;font-size:12px;line-height:1.4}.drawer-note{color:var(--tm);font-size:12px;line-height:1.5}.loading-surface{min-height:80px}
@media(max-width:1280px){.filters-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.fbtn{grid-column:1/-1}.demand-intro{grid-template-columns:minmax(0,1fr) minmax(210px,260px)}.demand-intro-art{display:none}.demand-kpi{flex-wrap:wrap}.demand-kpi .kpi-spark{display:none}.demand-bottom{grid-template-columns:repeat(2,minmax(0,1fr))}.demand-bottom>:last-child{grid-column:1/-1}}
@media(max-width:980px){.demand-mid{grid-template-columns:1fr}.region-layout{grid-template-columns:minmax(160px,.7fr) minmax(0,1.3fr)}.demand-intro{grid-template-columns:minmax(0,1fr) 240px}.demand-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:620px){.demand-intro{display:flex;flex-direction:column;align-items:stretch;gap:12px;min-height:0}.demand-intro h1{font-size:clamp(38px,12vw,56px);max-width:none}.demand-callout{width:100%;padding:10px}.demand-callout .big{font-size:30px}.demand-filters{padding:10px}.filters-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.fbtn{grid-column:1/-1}.fbtn .apply{flex:1}.demand-kpis{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.demand-kpi{flex-direction:column;align-items:flex-start;gap:8px;min-height:138px;padding:10px}.demand-kpi .badge{width:36px;height:36px;min-width:36px}.demand-kpi .metric{font-size:26px}.demand-kpi h3{min-height:30px}.demand-bottom{grid-template-columns:1fr}.demand-bottom>:last-child{grid-column:auto}.region-layout{grid-template-columns:1fr}.map-unavailable{min-height:165px}.demand-select{max-width:170px}.ph{flex-wrap:wrap}.panel-tools{justify-content:flex-start}.demand-table{min-width:440px}.region-table{min-width:350px}.intro-art{display:none}.provline{padding:0}.demand-callout .change{font-size:12px}}
@media(max-width:360px){.filters-grid{grid-template-columns:1fr}.demand-kpi .metric{font-size:24px}.demand-kpi{min-height:126px}.demand-kpi h3{min-height:0}}
@media(prefers-reduced-motion:reduce){.demand-kpi{transition:none}.demand-kpi:hover{transform:none}}
`;

/* ============ RESOURCE HOOKS AND DEMAND COMPONENTS ============ */
function useRes(load, deps, enabled = true) {
  const [s, set] = useState({ status: 'loading' });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!enabled) { set((p) => p.data ? p : { status: 'loading' }); return undefined; }
    const ac = new AbortController();
    set((p) => (p.data ? { ...p, status: 'refreshing', error: undefined } : { status: 'loading' }));
    Promise.resolve().then(() => load(ac.signal)).then((data) => {
      if (!ac.signal.aborted) set({ status: 'ready', data });
    }).catch((e) => {
      if (!ac.signal.aborted && e.name !== 'AbortError') set((p) => ({ ...p, status: 'error', error: e.message || 'Request failed' }));
    });
    return () => ac.abort();
  }, [...deps, n, enabled]);
  return [s, () => setN((x) => x + 1)];
}
const Body = ({ s, retry, rows = 4, children }) => {
  if (s.status === 'loading' && !s.data) return <Skeleton n={rows} />;
  if (!s.data) return <ErrorBox msg={`This panel could not load. ${s.error || ''}`} onRetry={retry} />;
  return <>{s.status === 'error' && <div className="stale" role="alert">Could not refresh — showing previous results. <button onClick={retry}>Retry</button></div>}{children(s.data)}</>;
};
const Field = ({ label, value, onChange, options, icon, disabled = false }) => {
  const id = useId();
  return (<div className="field"><label htmlFor={id}>{label}</label><div className="sel">{icon}
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>{options.map((o) => <option key={`${label}-${o.value}`} value={o.value}>{o.label}</option>)}</select>
    <ChevronDown size={15} className="chev" aria-hidden="true" /></div></div>);
};
const IconByKpi = ({ id, size = 21 }) => {
  if (id === 'estimated-demand') return <BarChart3 size={size} aria-hidden="true" />;
  if (id === 'posting-volume' || id === 'posting-index') return <FileText size={size} aria-hidden="true" />;
  if (id === 'high-demand-occupations') return <Users size={size} aria-hidden="true" />;
  return <Cpu size={size} aria-hidden="true" />;
};
function DemandKpiCard({ k, index, onOpen }) {
  const bg = ['#DCE8F5', '#FBD9BC', '#CDEDE9', '#F8EBB0'][index % 4];
  const hasDelta = k.deltaPct != null && k.comparisonPeriod;
  return <button className="card demand-kpi" onClick={() => onOpen(k)} aria-label={`${k.title}: ${k.formattedValue} ${k.unit}. ${hasDelta ? `${pct(k.deltaPct)} versus ${k.comparisonPeriod}` : 'Comparison not available'}. Open definition and provenance.`} title={k.definition}>
    <span className="badge" style={{ background: bg }}><IconByKpi id={k.id} /></span>
    <span className="content"><h3>{k.title}</h3><span className="metric">{k.formattedValue ?? '—'}</span><span className="metric-foot">
      {hasDelta ? <span className={`delta ${Number(k.deltaPct) < 0 ? 'negative' : ''}`} aria-label={`${Number(k.deltaPct) < 0 ? 'Decreased' : Number(k.deltaPct) > 0 ? 'Increased' : 'Unchanged'} ${pct(k.deltaPct)}`}><span aria-hidden="true">{Number(k.deltaPct) < 0 ? '↘' : Number(k.deltaPct) > 0 ? '↗' : '→'}</span>{pct(k.deltaPct)}</span> : <span className="muted">Comparison unavailable</span>}
      {hasDelta && <span className="muted">vs {k.comparisonPeriod}</span>}
    </span><span className="muted">{k.unit} · {k.period}</span></span>
    <span className="kpi-spark">{k.sparkline?.length ? <Sparkline data={k.sparkline} color={['var(--navy)','var(--orange)','var(--teal)','#C79A00'][index % 4]} id={`demand-${k.id}`} /> : <span className="spark-na" aria-label="No trend series supplied">—</span>}</span>
  </button>;
}
const uniqueSortedTrend = (trend) => {
  const entries = [
    ...(Array.isArray(trend?.actual) ? trend.actual.map((p) => ({ ...p, kind: 'observed' })) : []),
    ...(Array.isArray(trend?.forecast) ? trend.forecast.map((p) => ({ ...p, kind: 'forecast' })) : [])
  ].filter((p) => p.period != null && p.value != null && Number.isFinite(Number(p.value)));
  const dedup = new Map(); entries.forEach((p) => { const key = String(p.period); if (!dedup.has(key)) dedup.set(key, p); });
  return [...dedup.values()].sort((a, b) => String(a.period).localeCompare(String(b.period), undefined, { numeric: true }));
};
const axisLabel = (v, unit) => ['positions', 'postings'].includes(unit) ? `${(v / 1000000).toFixed(v / 1000000 >= 10 ? 0 : 1)}M` : `${Number(v).toFixed(0)}`;
const valueLabel = (v, unit) => ['positions', 'postings'].includes(unit) ? fmtCount(v) : `${Number(v).toFixed(1)} ${unit}`;
function DemandTrendPanel({ state, retry, view, onView, trendOptions, onDetail }) {
  const [tip, setTip] = useState(null); const [showTable, setShowTable] = useState(false);
  return <section className="card" aria-labelledby="demand-trend-title">
    <div className="ph"><div><h2 id="demand-trend-title">Demand Trend</h2><p>Observed history is solid; forecast is dashed where available.</p></div>
      <div className="panel-tools"><span className="tiny-label">View by</span><SelectControl small label="Demand trend metric" value={view} onChange={onView} options={trendOptions} /></div></div>
    <Body s={state} retry={retry} rows={7}>{(d) => {
      const t = d.trend || {}; const pts = uniqueSortedTrend(t); const actual = pts.filter((p) => p.kind === 'observed'); const forecast = pts.filter((p) => p.kind === 'forecast');
      if (!pts.length) return <div className="chart-empty">No trend observations are available for this metric and filter set.</div>;
      const W = 650, H = 286, L = 58, R = 20, T = 24, B = 36;
      const chartUnit = t.unit || 'positions'; const vals = pts.flatMap((p) => [Number(p.value), p.lowerBound != null ? Number(p.lowerBound) : Number(p.value), p.upperBound != null ? Number(p.upperBound) : Number(p.value)]);
      const rawMax = Math.max(...vals); const rawMin = Math.min(...vals.filter(Number.isFinite)); const range = (rawMax - rawMin) || (rawMax || 1);
      const minY = Math.max(0, rawMin - range * 0.16); const maxY = rawMax + range * 0.18; const yStep = (maxY - minY) / 4;
      const X = (i) => L + (i / Math.max(pts.length - 1, 1)) * (W - L - R); const Y = (v) => T + ((maxY - Number(v)) / (maxY - minY || 1)) * (H - T - B);
      const firstForecastIdx = pts.findIndex((p) => p.kind === 'forecast');
      const toPath = (list) => list.map((p, i) => `${i ? 'L' : 'M'}${X(pts.findIndex((x) => x.period === p.period)).toFixed(1)},${Y(p.value).toFixed(1)}`).join(' ');
      const bandPts = forecast.filter((p) => p.lowerBound != null && p.upperBound != null);
      const canBand = bandPts.length >= 2;
      const bandPoly = canBand ? [...bandPts.map((p) => `${X(pts.findIndex((x) => x.period === p.period))},${Y(p.upperBound)}`), ...bandPts.slice().reverse().map((p) => `${X(pts.findIndex((x) => x.period === p.period))},${Y(p.lowerBound)}`)].join(' ') : '';
      const seriesLabel = view === 'posting-count' ? 'Observed job postings' : view === 'posting-index' ? 'Job posting index' : 'Estimated labour demand';
      return <div className="demand-chart">
        <div className="chart-legend"><span><i className="line-key" />Observed history</span>{forecast.length > 0 && <span><i className="line-key forecast" />Forecast</span>}{canBand && <span><i className="band-key" />Forecast interval</span>}</div>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${seriesLabel} line chart from ${pts[0].period} to ${pts[pts.length - 1].period}. Observed and forecast points are distinguished by solid and dashed lines. A data table alternative is available.`}>
          {Array.from({ length: 5 }, (_, i) => { const v = maxY - i * yStep; return <g key={`y-${i}`}><line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--bm)" strokeWidth="1"/><text x={L - 9} y={Y(v) + 4} fontSize="11" textAnchor="end" fill="var(--tm)">{axisLabel(v, chartUnit)}</text></g>; })}
          {pts.map((p, i) => <text key={`x-${p.period}`} x={X(i)} y={H - 12} fontSize="11" textAnchor="middle" fill="var(--tm)">{p.period}</text>)}
          <text x="3" y="13" fontSize="10" fill="var(--tm)">{chartUnit === 'positions' ? 'Positions' : chartUnit === 'postings' ? 'Postings' : chartUnit}</text>
          {canBand && <polygon points={bandPoly} fill="var(--navy)" opacity=".13" />}
          {firstForecastIdx > -1 && <g><line x1={X(firstForecastIdx)} x2={X(firstForecastIdx)} y1={T} y2={H - B} stroke="var(--tm)" strokeDasharray="3 4"/><text x={Math.min(X(firstForecastIdx) + 5, W - 95)} y={T + 10} fontSize="10" fill="var(--tm)">Forecast →</text></g>}
          {actual.length > 0 && <path d={toPath(actual)} fill="none" stroke="var(--navy)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>}
          {forecast.length > 0 && <path d={toPath(forecast)} fill="none" stroke="#66A9D8" strokeWidth="3" strokeDasharray="7 5" strokeLinecap="round" strokeLinejoin="round"/>}
          {pts.map((p, i) => <circle key={`pt-${p.period}`} cx={X(i)} cy={Y(p.value)} r={tip?.point.period === p.period ? 6 : 4.5} tabIndex="0" role="img" fill={p.kind === 'observed' ? 'var(--navy)' : '#FFFEFA'} stroke={p.kind === 'observed' ? 'var(--navy)' : '#66A9D8'} strokeWidth="2" aria-label={`${p.period}: ${valueLabel(p.value, chartUnit)}, ${p.kind}; source ${t.meta?.sourceLabel || 'not supplied'}`} onMouseEnter={() => setTip({ xPct: (X(i) / W) * 100, yPct: (Y(p.value) / H) * 100, point: p, unit: chartUnit, source: t.meta?.sourceLabel, provenance: t.meta?.provenance })} onFocus={() => setTip({ xPct: (X(i) / W) * 100, yPct: (Y(p.value) / H) * 100, point: p, unit: chartUnit, source: t.meta?.sourceLabel, provenance: t.meta?.provenance })} onMouseLeave={() => setTip(null)} onBlur={() => setTip(null)} />)}
        </svg>
        {tip && <div className="tip" role="status" style={{ left: `${Math.max(8, Math.min(92, tip.xPct))}%`, top: `${Math.max(15, tip.yPct)}%` }}><strong>{tip.point.period}</strong> · {valueLabel(tip.point.value, tip.unit)} · {tip.point.kind}{tip.point.lowerBound != null && tip.point.upperBound != null ? ` (range ${valueLabel(tip.point.lowerBound, tip.unit)}–${valueLabel(tip.point.upperBound, tip.unit)})` : ''}<br/>{tip.source || 'Source not supplied'} · {tip.provenance || 'Provenance not supplied'}</div>}
        <button className="dtog" aria-expanded={showTable} onClick={() => setShowTable((x) => !x)}>{showTable ? 'Hide data table' : 'View accessible data table'}</button>
        {showTable && <div className="tw"><table className="tbl demand-table"><caption>Demand trend values; {chartUnit}; intervals only when supplied by the adapter.</caption><thead><tr><th>Period</th><th>Value</th><th>Type</th><th>Forecast interval</th></tr></thead><tbody>{pts.map((p) => <tr key={`table-${p.period}`}><td>{p.period}</td><td>{valueLabel(p.value, chartUnit)}</td><td>{p.kind === 'observed' ? 'Observed' : 'Forecast'}</td><td>{p.lowerBound != null && p.upperBound != null ? `${valueLabel(p.lowerBound, chartUnit)}–${valueLabel(p.upperBound, chartUnit)}` : 'Not supplied'}</td></tr>)}</tbody></table></div>}
        <div className="sel-note">{t.forecastMethod ? `Method: ${t.forecastMethod} ` : ''}{t.meta?.notes ? cleanNotes(t.meta) : ''}</div>
      </div>;
    }}</Body>
  </section>;
}
function DemandRegionPanel({ state, retry, metric, onMetric, metricOptions, selected, onState, onViewAll }) {
  return <section className="card" aria-labelledby="demand-region-title">
    <div className="ph"><div><h2 id="demand-region-title">Demand by Region</h2><p>{state.data ? `${state.data.period} · ${state.data.unit || 'unit not supplied'}` : 'Loading regional indicators…'}</p></div>
      <div className="panel-tools"><span className="tiny-label">Metric</span><SelectControl small label="Regional metric" value={metric} onChange={onMetric} options={metricOptions}/></div></div>
    <Body s={state} retry={retry} rows={7}>{(d) => {
      const allRows = d.items || [];
      const rows = selected ? allRows : allRows.slice(0, 10);
      return <><div className="region-layout">
        <div className="map-unavailable" role="status" aria-label="Choropleth unavailable">
          <span className="map-symbol"><MapPin size={22} aria-hidden="true"/></span><strong>Map unavailable</strong>
          <p>Verified, versioned state/UT GeoJSON and its canonical-code crosswalk are not included in this handoff.</p>
          <p>To prevent false geographic signals, no illustrative map is used as a data layer. Use the ranked table or select a state directly.</p>
          <span className="region-status">Geometry source: not configured</span>
        </div>
        <div className="tw"><table className="tbl region-table"><caption>State and Union Territory demand ranking; map geometry unavailable.</caption><thead><tr><th>#</th><th>State / UT</th><th>{metricOptions.find((x) => x.value === metric)?.label || 'Metric'}</th><th>Share</th></tr></thead>
          <tbody>{rows.map((r, i) => { const active = r.stateCode && r.stateCode === selected; const available = r.status === 'available' && r.value != null; return <tr key={r.stateCode || r.stateName || i} aria-current={active ? 'true' : undefined}>
            <td className="rank-number">{r.rank ?? (r.status === 'aggregate' ? '—' : i + 1)}</td><td>{r.stateCode ? <button className="select-state" onClick={() => onState(r.stateCode)} aria-label={`Select ${r.stateName} and refresh all panels`}>{r.stateName}</button> : <span>{r.stateName}</span>}{r.status !== 'available' && <span className="region-status">{r.status === 'aggregate' ? 'Aggregate' : r.status === 'suppressed' ? 'Suppressed' : 'Missing'}</span>}</td>
            <td>{available ? <div className="mini"><b className="region-value">{r.formattedValue ?? fmtCount(r.value)}</b><div className="track" aria-hidden="true"><i style={{ width: `${Math.max(0, Math.min(100, r.displayScore ?? 0))}%`, background: metric === 'demand-growth' ? 'var(--teal)' : 'var(--orange)' }}/></div></div> : <span className="muted-val" aria-label={`${r.status || 'missing'} data`}>—</span>}</td>
            <td>{r.sharePct == null ? '—' : `${Number(r.sharePct).toFixed(1)}%`}</td></tr>; })}{!rows.length && <tr><td colSpan="4">No regional values match these filters.</td></tr>}</tbody></table></div>
      </div><div className="region-footer"><span>{selected ? `Selected state scope · ${allRows.length} row${allRows.length === 1 ? "" : "s"}` : `Top ${Math.min(10, allRows.length)} of ${allRows.length} returned regions. Bars are relative within this response.`} Missing/suppressed values are not ranked as low.</span><button className="view-all" onClick={onViewAll}>View regional data <ArrowRight size={14}/></button></div></>;
    }}</Body>
  </section>;
}
function TopOccupationsPanel({ overviewState, retry, filters, onDetail, onViewAll, onNavigate }) {
  return <section className="card" aria-labelledby="top-occ-title"><div className="ph"><div><h2 id="top-occ-title">Top Occupations by Demand</h2><p>Estimated demand and comparable growth · {filters?.period || '—'}</p></div></div>
    <Body s={overviewState} retry={retry} rows={5}>{(d) => {
      const rows = d.topOccupations || [];
      return <><div className="tw"><table className="tbl demand-table"><caption>Top occupations by adapter-provided ranking; taxonomy version is shown for transparency.</caption><thead><tr><th>#</th><th>Occupation (NCO)</th><th>Estimated demand</th><th>Growth</th><th>Trend</th></tr></thead><tbody>
        {rows.map((o, i) => <tr key={o.id || o.occupationCode}><td>{o.rank ?? i + 1}</td><td><button className="lk" onClick={() => onDetail({ type: 'occupation', id: o.id, label: o.title || o.occupationLabel })}>{o.title || o.occupationLabel}<small>{o.occupationCode || o.code || 'Code not supplied'} · {o.taxonomyVersion || 'Taxonomy version not supplied'}</small></button></td><td>{o.formattedDemand || o.formattedValue || fmtCount(o.value)}</td><td>{o.growthPct == null ? <span className="muted-val" title="Comparable baseline unavailable">—</span> : <span className={`growth`}>{pct(o.growthPct)}</span>}</td><td className="spark-wrap">{o.sparkline?.length ? <Sparkline data={o.sparkline} color="var(--navy)" id={`occ-${o.id || i}`} /> : <span className="spark-na" title="No trend points supplied">—</span>}</td></tr>)}
        {!rows.length && <tr><td colSpan="5">No occupation demand records match these filters.</td></tr>}</tbody></table></div>
      <div className="panel-footer"><span className="sel-note">Top five shown · rankings supplied by the adapter.</span><button className="view-all" onClick={onViewAll}>View all occupations <ArrowRight size={14}/></button></div></>;
    }}</Body>
  </section>;
}
function TopSkillsPanel({ overviewState, retry, filters, onDetail, onViewAll }) {
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
}
function DemandInsightsPanel({ state, retry, onEvidence }) {
  return <section className="card evidence-panel" aria-labelledby="demand-insights-title"><div className="ph"><div><h2 id="demand-insights-title">Demand Insights</h2><p>Evidence-linked summary for the applied filters</p></div><button className="view-all" onClick={retry} aria-label="Refresh demand insights"><RotateCcw size={14}/> Refresh</button></div>
    <Body s={state} retry={retry} rows={4}>{(d) => <>
      {d.method === 'llm-assisted' && d.meta?.provenance !== 'mock' ? <span className="mode-label">Server-generated · LLM-assisted</span> : <span className="mode-label">Rule-based preview</span>}
      {(d.items || []).length ? <ul className="insight-list">{d.items.map((item) => <li className="insight-item" key={item.id}><h3>{item.title}</h3><p>{item.statement || item.text}</p>{item.explanation && <p className="insight-explain">{item.explanation}</p>}
        {item.evidenceRefs?.length > 0 && <div className="evidence-chips" aria-label="Evidence references">{item.evidenceRefs.map((ref) => { const r = typeof ref === 'string' ? { id: ref, label: ref, type: ref === 'demand-trend' ? 'chart' : 'kpi' } : ref; return <button className="chip" key={`${item.id}-${r.id}`} onClick={() => onEvidence(r)} title={`Open supporting evidence: ${r.label || r.id}`}>Evidence: {r.label || r.id}</button>; })}</div>}</li>)}</ul>
        : <div className="no-insights">Summary service is not configured or there is not enough evidence for this filter set. No narrative claim is being invented.</div>}
      <div className="method">Method: {d.method || 'not supplied'} · Generated {d.generatedAt ? new Date(d.generatedAt).toLocaleString() : 'timestamp not supplied'} · Current filter snapshot {d.snapshotId || d.meta?.snapshotId || 'not supplied'}.</div>
      {d.meta?.provenance === 'mock' && <div className="sel-note">Mock mode: each narrative item uses the current illustrative adapter payload. No AI service ran.</div>}
    </>}</Body>
  </section>;
}

/* ============ DEMAND INSIGHTS PAGE ============ */
const EMBEDDED_CSS = ".sh.embedded{min-height:0!important;height:auto!important;width:100%!important;background:transparent!important;color:var(--ink,#171717)}.sh.embedded .shell{display:block!important;grid-template-columns:minmax(0,1fr)!important;width:100%!important;max-width:none!important;min-height:0!important;height:auto!important;margin:0!important;padding:0!important}.sh.embedded .main{display:block!important;grid-column:1/-1!important;width:100%!important;max-width:none!important;min-width:0!important;min-height:0!important;margin:0!important;padding:24px!important;box-sizing:border-box!important}.sh.embedded .demand-intro{margin-top:0!important}.sh.embedded .sidebar{display:none!important}@media(max-width:700px){.sh.embedded .main{padding:16px!important}}";

function DemandInsightsPage({ dataAdapter, onNavigate: onRoute, embedded = true }) {
  const A = useMemo(() => dataAdapter || getDefaultAdapter(), [dataAdapter]);
  const [optionsState, retryOptions] = useRes((signal) => A.getDemandFilterOptions(signal), [A]);
  const options = useMemo(() => normalizeFilterOptions(optionsState.data), [optionsState.data]);
  const [draft, setDraft] = useState(null); const [applied, setApplied] = useState(null);
  const [trendMetric, setTrendMetric] = useState('estimated-demand'); const [regionalMetric, setRegionalMetric] = useState('estimated-demand');
  const [profile, setProfile] = useState(null); const [notes, setNotes] = useState([]); const [menu, setMenu] = useState(false); const [drawer, setDrawer] = useState(null); const [shellError, setShellError] = useState('');
  useEffect(() => {
    if (options && !applied) { setDraft({ ...options.defaults }); setApplied({ ...options.defaults }); }
  }, [options, applied]);
  const filterKey = stableFilterKey(applied);
  const initialized = Boolean(options && applied);
  const [overview, retryOverview] = useRes((signal) => A.getDemandOverview(applied, trendMetric, signal), [A, filterKey, trendMetric], initialized);
  const [regions, retryRegions] = useRes((signal) => A.getDemandRegions(applied, regionalMetric, signal), [A, filterKey, regionalMetric], initialized);
  const [insights, retryInsights] = useRes((signal) => A.getDemandInsights(applied, signal), [A, filterKey], initialized);
  const optionsKey = options?.meta?.snapshotId || options?.defaults?.period || 'loading';
  useEffect(() => {
    const ac = new AbortController();
    Promise.resolve().then(() => A.getProfile(ac.signal)).then((p) => { if (!ac.signal.aborted) setProfile(p); }).catch((e) => { if (!ac.signal.aborted) setShellError(`Profile could not load: ${e.message || 'request failed'}`); });
    Promise.resolve().then(() => A.getNotifications(ac.signal)).then((n) => { if (!ac.signal.aborted) setNotes(Array.isArray(n) ? n : (n?.items || [])); }).catch((e) => { if (!ac.signal.aborted) setShellError((old) => old ? `${old} Notifications also failed.` : `Notifications could not load: ${e.message || 'request failed'}`); });
    return () => ac.abort();
  }, [A]);
  const regionsForHeader = useMemo(() => [{ code: 'IN', name: 'India (National)' }, ...(options?.states || []).map((s) => ({ code: s.value, name: s.label }))], [options]);
  const draftDirty = Boolean(draft && applied && Object.keys(applied).some((k) => String(draft[k] ?? '') !== String(applied[k] ?? '')));
  const labels = useMemo(() => {
    if (!options || !applied) return [];
    const pick = (list, val, fallback) => list?.find((x) => String(x.value) === String(val))?.label || fallback;
    const region = applied.stateCode ? pick(options.states, applied.stateCode, applied.stateCode) : 'All India';
    return [pick(options.periods, applied.period, applied.period), region, pick(options.sectors, applied.sectorId, 'All Sectors'), pick(options.occupations, applied.occupationCode, 'All Occupations'), pick(options.skills, applied.skillId, 'All Skills')];
  }, [options, applied]);
  const labelForState = (code) => options?.states?.find((x) => x.value === code)?.label || code;
  const nationalGeography = options?.geographies?.find((g) => g.value === 'IN' || /all india|national/i.test(g.label))?.value || options?.defaults?.geography || 'IN';
  const stateGeography = options?.geographies?.find((g) => g.value === 'STATE' || /state|ut/i.test(g.label))?.value || nationalGeography;
  const updateDraft = (key, value) => setDraft((old) => {
    if (!old) return old;
    const next = { ...old, [key]: value };
    if (key === 'stateCode') next.geography = value ? stateGeography : (next.geography === stateGeography ? nationalGeography : next.geography);
    if (key === 'geography' && value === nationalGeography) next.stateCode = '';
    if (key === 'geography' && value === stateGeography && !next.stateCode) next.stateCode = options?.states?.[0]?.value || '';
    return next;
  });
  const validateFilters = (f) => {
    if (!f?.period) return 'Choose a supported period.';
    if (f.geography && !(options?.geographies || []).some((g) => g.value === f.geography)) return 'The selected geography is not supported by the current filter options.';
    if (f.stateCode && !(options?.states || []).some((s) => s.value === f.stateCode)) return 'The selected state/UT is not supported by the current filter options.';
    if (f.sectorId && !(options?.sectors || []).some((s) => s.value === f.sectorId)) return 'The selected sector is no longer available. Reset filters and try again.';
    if (f.occupationCode && !(options?.occupations || []).some((s) => s.value === f.occupationCode)) return 'The selected occupation is no longer available. Reset filters and try again.';
    if (f.skillId && !(options?.skills || []).some((s) => s.value === f.skillId)) return 'The selected skill is no longer available. Reset filters and try again.';
    return '';
  };
  const [filterError, setFilterError] = useState('');
  const applyDraft = () => {
    if (!draft) return;
    const error = validateFilters(draft); if (error) { setFilterError(error); return; }
    setFilterError(''); const next = { ...draft }; setApplied(next);
  };
  const resetFilters = () => {
    if (!options) return;
    setFilterError(''); setDraft({ ...options.defaults }); setApplied({ ...options.defaults });
    setTrendMetric(options.trendMetrics?.[0]?.value || 'estimated-demand'); setRegionalMetric(options.regionalMetrics?.[0]?.value || 'estimated-demand');
  };
  const drillState = (code) => {
    if (!options || !applied) return;
    const nextCode = !code || code === 'IN' ? '' : code;
    if (nextCode && !(options.states || []).some((s) => s.value === nextCode)) { setFilterError('This regional row is not in the API-supported state/UT options and cannot be applied as a filter.'); return; }
    const next = { ...applied, stateCode: nextCode, geography: nextCode ? stateGeography : nationalGeography };
    setDraft(next); setApplied(next); setFilterError('');
  };
  const openDetail = useCallback((target, loaderOverride) => {
    const title = target.label || target.id || 'Details';
    const run = () => {
      setDrawer({ title, status: 'loading', retry: run });
      const call = loaderOverride ? loaderOverride() : A.getDemandDetail(target, applied);
      Promise.resolve(call).then((data) => setDrawer({ title: data.title || title, status: 'ready', data })).catch((e) => setDrawer({ title, status: 'error', error: e.message || 'Details could not be loaded.', retry: run }));
    };
    run();
  }, [A, applied]);
  const detailKpi = (k) => openDetail({ type: 'kpi', id: k.id, label: k.title });
  const viewAllOccupations = () => {
    const filtersNow = applied;
    const load = () => A.getDemandOccupationList(filtersNow, { sort: 'demand', direction: 'desc', page: 1, limit: 100 }).then((res) => ({ title: 'All occupations by demand', facts: [{ label: 'Applied period', value: filtersNow.period }, { label: 'Returned rows', value: `${res.items?.length || 0} of ${res.total ?? res.items?.length ?? 0}` }, { label: 'Ranking source', value: 'Adapter response; taxonomy metadata is shown per row.' }], table: { columns: ['Rank', 'Occupation', 'Code / taxonomy', 'Demand', 'Growth'], rows: (res.items || []).map((o, i) => [o.rank ?? i + 1, o.title || o.occupationLabel, `${o.occupationCode || o.code || '—'} · ${o.taxonomyVersion || 'Version not supplied'}`, o.formattedDemand || o.formattedValue || fmtCount(o.value), o.growthPct == null ? '—' : pct(o.growthPct)]) }, meta: res.meta || MOCK_META }));
    openDetail({ id: 'all-occupations', label: 'All occupations by demand' }, load);
    window.dispatchEvent(new CustomEvent('shramik:navigate', { detail: { key: 'demand-occupations', path: '/demand/occupations', filters: filtersNow } }));
  };
  const viewAllSkills = () => {
    const filtersNow = applied;
    const load = () => A.getDemandSkillList(filtersNow, { sort: 'demand', direction: 'desc', page: 1, limit: 100 }).then((res) => ({ title: 'All skills by demand', facts: [{ label: 'Applied period', value: filtersNow.period }, { label: 'Returned rows', value: `${res.items?.length || 0} of ${res.total ?? res.items?.length ?? 0}` }, { label: 'Measure', value: 'Skill demand index points; baseline = 100. Not a posting count.' }], table: { columns: ['Rank', 'Skill', 'Taxonomy', 'Demand index', 'Growth'], rows: (res.items || []).map((s, i) => [s.rank ?? i + 1, s.title || s.skillLabel, s.taxonomyVersion || 'Version not supplied', s.formattedValue ?? s.demandIndex ?? s.postingCount ?? '—', s.growthPct == null ? '—' : pct(s.growthPct)]) }, meta: res.meta || MOCK_META }));
    openDetail({ id: 'all-skills', label: 'All skills by demand' }, load);
    window.dispatchEvent(new CustomEvent('shramik:navigate', { detail: { key: 'demand-skills', path: '/demand/skills', filters: filtersNow } }));
  };
  const viewAllRegions = () => {
    const d = regions.data;
    if (!d) return;
    const rows = d.items || [];
    openDetail({ id: 'all-regions', label: 'Regional demand data' }, () => Promise.resolve({ title: 'Regional demand data', facts: [{ label: 'Metric', value: options?.regionalMetrics?.find((x) => x.value === regionalMetric)?.label || regionalMetric }, { label: 'Period', value: d.period || applied.period }, { label: 'Geometry', value: 'Map unavailable: verified GeoJSON and a canonical code crosswalk are not included.' }], table: { columns: ['Rank', 'State / UT', 'Code', 'Value', 'Share', 'Status'], rows: rows.map((r, i) => [r.rank ?? i + 1, r.stateName, r.stateCode || 'Aggregate', r.formattedValue ?? '—', r.sharePct == null ? '—' : `${Number(r.sharePct).toFixed(1)}%`, r.status || 'unknown']) }, meta: d.meta || MOCK_META }));
  };
  const onEvidence = (ref) => {
    if (ref.type === 'chart' || ref.id === 'demand-trend') openDetail({ type: 'chart', id: 'demand-trend', label: 'Demand trend' });
    else if (ref.type === 'occupation') openDetail({ type: 'occupation', id: ref.id, label: ref.label });
    else if (ref.type === 'skill') openDetail({ type: 'skill', id: ref.id, label: ref.label });
    else if (ref.type === 'state') openDetail({ type: 'state', id: ref.id, label: ref.label });
    else openDetail({ type: 'kpi', id: ref.id, label: ref.label || ref.id });
  };
  const onNavigate = (key, sec, label) => {
    setMenu(false);
    window.dispatchEvent(new CustomEvent('shramik:navigate', { detail: { key, section: sec, label, path: `/${key}` } }));
    if (onRoute) onRoute(`/${key}`, label);
    if (key !== 'demand') openDetail({ id: `section-${key}`, label: `${label} · planned destination` }, () => Promise.resolve({ title: `${label} · planned destination`, facts: [{ label: 'Destination', value: `/${key}` }, { label: 'Status', value: 'Navigation event sent to the host application. This standalone preview does not create a second route.' }], table: null, meta: options?.meta || MOCK_META }));
  };
  const markRead = (id) => A.markNotificationRead(id).then(() => setNotes((old) => old.map((n) => n.id === id ? { ...n, read: true } : n))).catch((e) => setShellError(`Notification could not be marked read: ${e.message || 'request failed'}`));
  const headerRegionCode = applied?.stateCode || 'IN';
  const overviewData = overview.data; const pageMeta = overviewData?.meta || regions.data?.meta || options?.meta;
  const isUpdating = [overview, regions, insights].some((s) => s.status === 'refreshing');
  const overviewHasOldFilters = Boolean(overviewData?.appliedFilters && stableFilterKey(overviewData.appliedFilters) !== filterKey);
  const resourceSnapshotIds = [overviewData?.meta?.snapshotId, regions.data?.meta?.snapshotId, (insights.data?.snapshotId || insights.data?.meta?.snapshotId)].filter(Boolean);
  const snapshotMismatch = new Set(resourceSnapshotIds).size > 1;
  const restMode = A.mode === 'rest' || Boolean(getConfiguredApiBase());
  const injectedMode = !restMode && A !== MockDemandAdapter;
  const trendOptions = options?.trendMetrics || [{ value: 'estimated-demand', label: 'Estimated demand' }];
  const regionalMetricOptions = regions.data?.metrics || options?.regionalMetrics || [{ value: 'estimated-demand', label: 'Estimated demand' }];
  useEffect(() => { if (trendOptions.length && !trendOptions.some((x) => x.value === trendMetric)) setTrendMetric(trendOptions[0].value); }, [optionsKey, trendOptions.map((x) => x.value).join('|')]);
  useEffect(() => { if (regionalMetricOptions.length && !regionalMetricOptions.some((x) => x.value === regionalMetric)) setRegionalMetric(regionalMetricOptions[0].value); }, [optionsKey, regionalMetricOptions.map((x) => x.value).join('|')]);
  return <div className={embedded ? "sh embedded" : "sh"}>
    <style>{CSS}{CSS2}{embedded ? EMBEDDED_CSS : ""}</style>
    {!embedded && <Header adapter={A} regions={regionsForHeader} regionCode={headerRegionCode} onRegion={drillState} profile={profile} notes={notes} onRead={markRead} onMenu={() => setMenu(true)} onPick={(r) => r.type === 'region' ? drillState(r.id) : openDetail({ type: r.type, id: r.id, label: r.label })} />}
    <div className="shell">
      {!embedded && <Sidebar active="demand" onNav={onNavigate} open={menu} onClose={() => setMenu(false)} />}
      <main className="main">
        {shellError && <div className="inline-message" role="status">{shellError} · Some shared shell data may be unavailable.</div>}
        <section className="demand-intro" aria-labelledby="demand-page-title">
          <div><div className="crumb">Home / Demand Insights</div><h1 id="demand-page-title">Demand Insights</h1><div className="under"/><p>Explore where labour demand is concentrated, which occupations and skills are being requested, and how demand is changing across India.</p></div>
          <div className="demand-callout" title={overviewData?.heroComparison?.definition || 'No comparable demand period has been supplied.'}>
            <span className="map-symbol"><TrendingUp size={22} aria-hidden="true"/></span><div>
              {overviewData?.heroComparison ? <><strong className="big">{overviewData.heroComparison.formattedValue}</strong><small>{overviewData.heroComparison.metricLabel || 'Estimated demand change'} · vs {overviewData.heroComparison.comparisonPeriod}</small></> : <><strong className="big">—</strong><small>Comparable demand change is not available</small></>}
            </div>
          </div>
          <div className="demand-intro-art"><HeroArt/></div>
        </section>
        <section className="card demand-filters" aria-label="Demand filters">
          {optionsState.status === 'loading' && !options ? <Skeleton n={3}/> : !options ? <ErrorBox msg={`Filter options could not load. ${optionsState.error || ''}`} onRetry={retryOptions}/> : <>
            <div className="filters-grid">
              <Field label="Time Period" value={draft?.period ?? options.defaults.period} onChange={(v) => updateDraft('period', v)} options={options.periods} icon={<Calendar size={16} aria-hidden="true"/>} disabled={!draft}/>
              <Field label="Geography" value={draft?.geography ?? options.defaults.geography} onChange={(v) => updateDraft('geography', v)} options={options.geographies} icon={<Globe size={16} aria-hidden="true"/>} disabled={!draft}/>
              <Field label="State / UT" value={draft?.stateCode ?? ''} onChange={(v) => updateDraft('stateCode', v)} options={[{ value: '', label: 'All States / UTs' }, ...options.states]} icon={<MapPin size={16} aria-hidden="true"/>} disabled={!draft || !options.states.length}/>
              <Field label="Sector" value={draft?.sectorId ?? ''} onChange={(v) => updateDraft('sectorId', v)} options={options.sectors} icon={<Factory size={16} aria-hidden="true"/>} disabled={!draft}/>
              <Field label="Occupation (NCO)" value={draft?.occupationCode ?? ''} onChange={(v) => updateDraft('occupationCode', v)} options={options.occupations} icon={<Users size={16} aria-hidden="true"/>} disabled={!draft}/>
              <Field label="Skill" value={draft?.skillId ?? ''} onChange={(v) => updateDraft('skillId', v)} options={options.skills} icon={<Cpu size={16} aria-hidden="true"/>} disabled={!draft}/>
              <div className="fbtn"><button className="apply" onClick={applyDraft} disabled={!draft || !draftDirty || isUpdating}><Filter size={16} aria-hidden="true"/>{isUpdating ? 'Updating…' : 'Apply Filters'}</button><button className="reset" aria-label="Reset and apply default filters" onClick={resetFilters} disabled={!options} title="Reset filters"><RotateCcw size={16}/></button></div>
              {draftDirty && <div className="dirty" role="status">Filter edits are not applied yet. Existing panels still reflect the last applied snapshot.</div>}
              {filterError && <div className="dirty" role="alert" style={{ color: '#B3261E' }}>{filterError}</div>}
            </div>
          </>}
        </section>
        <div className="applied-row" aria-label="Applied filter snapshot"><strong>Applied:</strong>{labels.map((l, i) => <span className="filter-chip" key={`${i}-${l}`}>{l}</span>)}{pageMeta?.snapshotId && <span className="muted-val">Snapshot {pageMeta.snapshotId}</span>}</div>
        {overviewHasOldFilters && <div className="inline-message" role="status">Refreshing for the newly applied filters. Previous successful overview values remain visible until this request completes.</div>}
        {snapshotMismatch && <div className="unavailable-status" role="alert">Panel snapshot IDs differ. Do not compare these panels until the backend returns a consistent filter snapshot; retry affected panels after checking the API.</div>}
        <h2 className="vh">Key demand indicators</h2>
        <section className="demand-kpis" aria-label="Key demand indicators">
          {overview.status === 'loading' && !overviewData ? Array.from({ length: 4 }, (_, i) => <div className="card" key={i}><Skeleton n={3}/></div>) : !overviewData ? <div style={{ gridColumn: '1/-1' }}><ErrorBox msg={`Demand overview could not load. ${overview.error || ''}`} onRetry={retryOverview}/></div> : (overviewData.kpis?.length === 4 && overviewData.kpis[0]?.id === 'estimated-demand' && ['posting-volume', 'posting-index'].includes(overviewData.kpis[1]?.id) && overviewData.kpis[2]?.id === 'high-demand-occupations' && overviewData.kpis[3]?.id === 'high-demand-skills') ? overviewData.kpis.map((k, i) => <DemandKpiCard key={k.id} k={k} index={i} onOpen={detailKpi}/>) : <div className="inline-message" role="alert" style={{ gridColumn: '1/-1' }}>The Demand Insights API must return exactly four KPIs in the documented order. This response did not satisfy that contract.</div>}
        </section>
        <div className="demand-mid">
          <DemandTrendPanel state={overview} retry={retryOverview} view={trendMetric} onView={setTrendMetric} trendOptions={trendOptions} onDetail={(t) => openDetail(t)}/>
          <DemandRegionPanel state={regions} retry={retryRegions} metric={regionalMetric} onMetric={setRegionalMetric} metricOptions={regionalMetricOptions} selected={applied?.stateCode || ''} onState={drillState} onViewAll={viewAllRegions}/>
        </div>
        <div className="demand-bottom">
          <TopOccupationsPanel overviewState={overview} retry={retryOverview} filters={applied} onDetail={(t) => openDetail(t)} onViewAll={viewAllOccupations}/>
          <TopSkillsPanel overviewState={overview} retry={retryOverview} filters={applied} onDetail={(t) => openDetail(t)} onViewAll={viewAllSkills}/>
          <DemandInsightsPanel state={insights} retry={retryInsights} onEvidence={onEvidence}/>
        </div>
        <footer className="provline" role="contentinfo">
          {pageMeta && <ProvenanceBadge meta={pageMeta}/>}
          <span>{pageMeta ? `${pageMeta.sourceLabel || 'Source not supplied'} · Period ${applied?.period || '—'} · Coverage: ${pageMeta.coverage || 'not supplied'} · Updated ${pageMeta.updatedAt ? new Date(pageMeta.updatedAt).toLocaleString() : 'timestamp not supplied'}${pageMeta.snapshotId ? ` · Snapshot ${pageMeta.snapshotId}` : ''}.` : 'Loading provenance…'}</span>
          {restMode && <span className="mode-label">REST mode · no mock fallback</span>}
          {!restMode && !injectedMode && <span className="mode-label">Illustrative data · mock mode</span>}
          {injectedMode && <span className="mode-label">Injected data adapter</span>}
          {isUpdating && <span role="status">Refreshing applied snapshot…</span>}
          <span className="sel-note">Map blocked pending verified GeoJSON + documented canonical code crosswalk. All mock metrics are illustrative, not official statistics.</span>
        </footer>
      </main>
    </div>
    {drawer && <DetailDrawer d={drawer} onClose={() => setDrawer(null)}/>}
  </div>;
}

export default DemandInsightsPage;
