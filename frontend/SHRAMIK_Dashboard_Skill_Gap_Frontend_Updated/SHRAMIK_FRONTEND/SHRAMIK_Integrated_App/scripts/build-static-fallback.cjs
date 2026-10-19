/*
 * Offline fallback builder for this environment when npm registry DNS is unavailable.
 * Preferred build remains `npm run build` (Vite + TypeScript), which bundles React and Lucide locally.
 * This produces an unminified, precompiled static bundle that loads React/ReactDOM from cdnjs.
 */
const fs = require('node:fs');
const path = require('node:path');
const ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript');

const project = path.resolve(__dirname, '..');
const out = path.join(project, 'dist');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'assets'), { recursive: true });

const files = [
  ['main', 'src/main.tsx'],
  ['SHRAMIKDashboard', 'src/SHRAMIKDashboard.tsx'],
  ['api/adapter', 'src/api/adapter.ts'],
  ['api/mock-adapter', 'src/api/mock-adapter.ts'],
  ['api/rest-adapter', 'src/api/rest-adapter.ts'],
  ['skill-gaps/SkillGapAnalysisPage', 'src/skill-gaps/SkillGapAnalysisPage.tsx'],
  ['skill-gaps/adapter', 'src/skill-gaps/adapter.ts'],
  ['skill-gaps/mockAdapter', 'src/skill-gaps/mockAdapter.ts'],
  ['skill-gaps/restAdapter', 'src/skill-gaps/restAdapter.ts'],
];

const options = {
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.CommonJS,
  jsx: ts.JsxEmit.ReactJSX,
  esModuleInterop: true,
  useDefineForClassFields: true,
  sourceMap: false,
  inlineSourceMap: false,
  removeComments: true,
};
const modules = {};
const diagnostics = [];
for (const [id, relative] of files) {
  let source = fs.readFileSync(path.join(project, relative), 'utf8');
  source = source.replace(/import\s+['"][^'"]+\.css['"];?\s*/g, '');
  source = source.replace(/const env = \(import\.meta as ImportMeta & \{ env\?: Record<string, string \| undefined> \}\)\.env;\s*const baseUrl = env\?\.VITE_SHRAMIK_API_BASE_URL\?\.trim\(\);/g,
    "const baseUrl = (typeof window !== 'undefined' && window.SHRAMIK_CONFIG && window.SHRAMIK_CONFIG.apiBaseUrl || '').trim();");
  const compiled = ts.transpileModule(source, { compilerOptions: options, fileName: relative, reportDiagnostics: true });
  for (const diagnostic of compiled.diagnostics || []) {
    if (diagnostic.category === ts.DiagnosticCategory.Error) diagnostics.push(`${relative}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`);
  }
  modules[id] = compiled.outputText;
}
if (diagnostics.length) throw new Error(`Transpile failed:\n${diagnostics.join('\n')}`);

const paths = {
  Activity: [['polyline',{points:'22 12 18 12 15 21 9 3 6 12 2 12'}]],
  AlertCircle: [['circle',{cx:12,cy:12,r:10}],['line',{x1:12,y1:8,x2:12,y2:12}],['circle',{cx:12,cy:16,r:0.7,fill:'currentColor'}]],
  ArrowRight: [['line',{x1:5,y1:12,x2:19,y2:12}],['polyline',{points:'12 5 19 12 12 19'}]],
  ArrowUpRight: [['line',{x1:7,y1:17,x2:17,y2:7}],['polyline',{points:'7 7 17 7 17 17'}]],
  BarChart3: [['line',{x1:3,y1:3,x2:3,y2:21}],['line',{x1:3,y1:21,x2:21,y2:21}],['rect',{x:6,y:12,width:4,height:7}],['rect',{x:13,y:8,width:4,height:11}],['rect',{x:19,y:4,width:2,height:15}]],
  Bell: [['path',{d:'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9'}],['path',{d:'M10 21h4'}]],
  BrainCircuit: [['path',{d:'M12 18V5a3 3 0 1 0-5.8-1A4 4 0 0 0 4 11a4 4 0 0 0 3 7'}],['path',{d:'M12 8a3 3 0 1 1 6 0 4 4 0 0 1 1 8 3 3 0 1 1-6 2'}],['path',{d:'M8 13h4m-2-2v4m4-7h2m-2 6h2'}]],
  Building2: [['path',{d:'M6 22V3h12v19M3 22h18'}],['path',{d:'M9 7h1m4 0h1M9 11h1m4 0h1M9 15h1m4 0h1'}],['path',{d:'M10 22v-3h4v3'}]],
  CalendarDays: [['rect',{x:3,y:4,width:18,height:17,rx:2}],['line',{x1:16,y1:2,x2:16,y2:6}],['line',{x1:8,y1:2,x2:8,y2:6}],['line',{x1:3,y1:10,x2:21,y2:10}],['path',{d:'M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01'}]],
  ChartColumn: [['path',{d:'M3 3v18h18'}],['rect',{x:7,y:12,width:3,height:6,rx:.5}],['rect',{x:13,y:8,width:3,height:10,rx:.5}],['rect',{x:19,y:4,width:2,height:14,rx:.5}]],
  Check: [['polyline',{points:'20 6 9 17 4 12'}]],
  ChevronDown: [['polyline',{points:'6 9 12 15 18 9'}]],
  ChevronLeft: [['polyline',{points:'15 18 9 12 15 6'}]],
  ChevronRight: [['polyline',{points:'9 18 15 12 9 6'}]],
  CircleHelp: [['circle',{cx:12,cy:12,r:10}],['path',{d:'M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3'}],['path',{d:'M12 17h.01'}]],
  Database: [['ellipse',{cx:12,cy:5,r:9}],['path',{d:'M3 5v14c0 2 4 3 9 3s9-1 9-3V5'}],['path',{d:'M3 12c0 2 4 3 9 3s9-1 9-3'}]],
  Factory: [['path',{d:'M2 21V10l7 4V9l7 5V4h4v17z'}],['path',{d:'M5 18h2m3 0h2m3 0h2m3 0h1'}]],
  FileText: [['path',{d:'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'}],['polyline',{points:'14 2 14 8 20 8'}],['line',{x1:8,y1:13,x2:16,y2:13}],['line',{x1:8,y1:17,x2:16,y2:17}]],
  HeartPulse: [['path',{d:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8'}],['path',{d:'M3 12h4l2-3 3 6 2-3h7'}]],
  Info: [['circle',{cx:12,cy:12,r:10}],['line',{x1:12,y1:11,x2:12,y2:16}],['circle',{cx:12,cy:7,r:.7,fill:'currentColor'}]],
  Leaf: [['path',{d:'M20 4c-8 0-14 3-14 10a6 6 0 0 0 6 6c7 0 10-6 8-16z'}],['path',{d:'M4 21c3-5 7-8 13-12'}]],
  Lightbulb: [['path',{d:'M9 18h6m-5 4h4'}],['path',{d:'M8 14a7 7 0 1 1 8 0c-1 1-1 2-1 4h-6c0-2 0-3-1-4z'}]],
  MapPin: [['path',{d:'M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0z'}],['circle',{cx:12,cy:10,r:2.5}]],
  Menu: [['line',{x1:4,y1:6,x2:20,y2:6}],['line',{x1:4,y1:12,x2:20,y2:12}],['line',{x1:4,y1:18,x2:20,y2:18}]],
  RefreshCw: [['path',{d:'M20 7v5h-5M4 17v-5h5'}],['path',{d:'M5.5 9A7 7 0 0 1 17 5l3 2M4 17l3 2a7 7 0 0 0 11.5-4'}]],
  Search: [['circle',{cx:11,cy:11,r:7}],['line',{x1:16.5,y1:16.5,x2:21,y2:21}]],
  Settings: [['circle',{cx:12,cy:12,r:3}],['path',{d:'M19 13.5a7.5 7.5 0 0 0 0-3l2-1.5-2-3.5-2.4 1a7.5 7.5 0 0 0-2.6-1.5L13.5 2h-4L9 5a7.5 7.5 0 0 0-2.6 1.5L4 5.5 2 9l2 1.5a7.5 7.5 0 0 0 0 3L2 15l2 3.5 2.4-1A7.5 7.5 0 0 0 9 19l.5 3h4l.5-3a7.5 7.5 0 0 0 2.6-1.5l2.4 1L21 15z'}]],
  SlidersHorizontal: [['line',{x1:4,y1:21,x2:4,y2:14}],['line',{x1:4,y1:10,x2:4,y2:3}],['line',{x1:12,y1:21,x2:12,y2:12}],['line',{x1:12,y1:8,x2:12,y2:3}],['line',{x1:20,y1:21,x2:20,y2:16}],['line',{x1:20,y1:12,x2:20,y2:3}],['line',{x1:2,y1:14,x2:6,y2:14}],['line',{x1:10,y1:8,x2:14,y2:8}],['line',{x1:18,y1:16,x2:22,y2:16}]],
  Star: [['polygon',{points:'12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.7 5.8 21 7 14.1 2 9.3 8.9 8.3 12 2'}]],
  Table2: [['rect',{x:3,y:3,width:18,height:18,rx:1}],['line',{x1:3,y1:9,x2:21,y2:9}],['line',{x1:3,y1:15,x2:21,y2:15}],['line',{x1:9,y1:3,x2:9,y2:21}],['line',{x1:15,y1:3,x2:15,y2:21}]],
  TrendingUp: [['polyline',{points:'22 7 13.5 15.5 8.5 10.5 2 17'}],['polyline',{points:'16 7 22 7 22 13'}]],
  Truck: [['path',{d:'M1 3h14v13H1zM15 8h4l4 4v4h-8z'}],['circle',{cx:5.5,cy:18.5,r:2.5}],['circle',{cx:18.5,cy:18.5,r:2.5}]],
  Users: [['path',{d:'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'}],['circle',{cx:10,cy:7,r:4}],['path',{d:'M20 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8'}]],
  Wrench: [['path',{d:'M14.7 6.3a5 5 0 0 0-6.4 6.4L3 18l3 3 5.3-5.3a5 5 0 0 0 6.4-6.4L14 12l-3-3z'}]],
  X: [['line',{x1:18,y1:6,x2:6,y2:18}],['line',{x1:6,y1:6,x2:18,y2:18}]],
};
const iconNames = Object.keys(paths);
const iconModule = `const iconPaths=${JSON.stringify(paths)};\nfunction makeIcon(name){return function Icon(props){const {size=24,color='currentColor',strokeWidth=2,...rest}=props||{}; const nodes=(iconPaths[name]||iconPaths.Info).map((entry,index)=>React.createElement(entry[0],{key:index,...entry[1]}));return React.createElement('svg',{xmlns:'http://www.w3.org/2000/svg',width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:color,strokeWidth,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':rest['aria-label']?undefined:true,...rest},...nodes);};}\nmodule.exports={${iconNames.map(name => `${name}:makeIcon(${JSON.stringify(name)})`).join(',')}};\n`;
modules['lucide-runtime'] = iconModule;

const jsxRuntime = `exports.jsx=(type,props,key)=>React.createElement(type,{...(props||{}),...(key!==undefined?{key}: {})});\nexports.jsxs=exports.jsx;\nexports.Fragment=React.Fragment;\n`;
modules['react-jsx-runtime-shim'] = jsxRuntime;

const entries = Object.entries(modules).map(([id, code]) => `${JSON.stringify(id)}: function(module, exports, require) {\n${code}\n}`).join(',\n');
const bundle = `(function(){\n'use strict';\nconst __modules={\n${entries}\n};\nconst __cache={};\nfunction __normalize(id,from){if(!id.startsWith('.'))return id;const base=(from.split('/').slice(0,-1)).concat(id.split('/'));const out=[];for(const part of base){if(!part||part==='.')continue;if(part==='..')out.pop();else out.push(part);}return out.join('/').replace(/\\.(tsx?|jsx?)$/,'');}\nfunction __require(id,from){if(id==='react')return window.React;if(id==='react-dom/client')return {createRoot:window.ReactDOM.createRoot.bind(window.ReactDOM)};if(id==='lucide-react')return __require('lucide-runtime','entry');if(id==='react/jsx-runtime')return __require('react-jsx-runtime-shim','entry');const key=from?__normalize(id,from):id;if(__cache[key])return __cache[key].exports;const factory=__modules[key];if(!factory)throw new Error('Bundle module missing: '+key+' (imported from '+(from||'entry')+')');const module={exports:{}};__cache[key]=module;factory(module,module.exports,dep=>__require(dep,key));return module.exports;}\n__require('main');\n})();\n`;

fs.writeFileSync(path.join(out, 'app.js'), bundle);
let css = fs.readFileSync(path.join(project, 'src/shramik-dashboard.css'), 'utf8');
css = css.replace(/^@import url\([^\n]+\);\s*/m, '');
const gapCss = fs.readFileSync(path.join(project, 'src/skill-gaps/skill-gap-analysis.css'), 'utf8').replace(/^@import url\([^\n]+\);\s*/m, '');
fs.writeFileSync(path.join(out, 'shramik-dashboard.css'), `${css}\n\n/* Skill Gap Analysis page styles, sharing the same global tokens and shell. */\n${gapCss}`);
fs.cpSync(path.join(project, 'public/assets'), path.join(out, 'assets'), { recursive: true });
fs.writeFileSync(path.join(out, 'config.js'), `/* Leave apiBaseUrl blank for clearly-labelled interactive demo data. */\nwindow.SHRAMIK_CONFIG = window.SHRAMIK_CONFIG || { apiBaseUrl: '' };\n`);
const html = `<!doctype html>\n<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="theme-color" content="#F7F6F0"><meta name="description" content="SHRAMIK Labour Market Intelligence dashboard and Skill Gap Analysis."><title>SHRAMIK · Labour Market Intelligence</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800;900&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"><link rel="stylesheet" href="./shramik-dashboard.css"><script src="./config.js"></script><script crossorigin src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script><script crossorigin src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script></head><body><div id="root"><noscript>SHRAMIK Dashboard requires JavaScript to run.</noscript></div><script defer src="./app.js"></script></body></html>\n`;
fs.writeFileSync(path.join(out, 'index.html'), html);
// Alias entry copies the same app; pathname detection opens Skill Gap Analysis inside the shared shell.
fs.writeFileSync(path.join(out, 'skill-gap-analysis.html'), html);
const cp = require('node:child_process');
const syntax = cp.spawnSync(process.execPath, ['--check', path.join(out, 'app.js')], { encoding: 'utf8' });
if (syntax.status !== 0) throw new Error(`JavaScript syntax validation failed:\n${syntax.stderr}${syntax.stdout}`);
const report = {
  buildType: 'offline static fallback bundle',
  source: 'React + TypeScript SHRAMIK dashboard with SkillGapAnalysisPage integrated under the same Header and Sidebar',
  compiledSourceFiles: files.map(([, relative]) => relative),
  localStyles: ['shramik-dashboard.css includes the original shared design system plus Skill Gap Analysis page styles'],
  iconComponentsIncluded: iconNames,
  imageAssetCount: fs.readdirSync(path.join(out, 'assets')).length,
  directSkillGapEntry: 'skill-gap-analysis.html loads the same shell; route initialized from pathname; #dashboard still overrides it',
  dataMode: 'Mock by default, with visible illustrative provenance. Configure config.js to activate REST; errors do not switch to mock.',
  runtimeDependencies: ['React 18.3.1 from cdnjs', 'ReactDOM 18.3.1 from cdnjs', 'Google Fonts (Barlow Condensed, IBM Plex Sans)'],
  validation: { transpileErrors: diagnostics.length, javascriptSyntax: 'PASS' },
  limitation: 'Standard Vite production build not run: npm registry DNS unavailable. This is a custom precompiled static bundle and uses CDN React; preferred production build is npm install followed by npm run build.'
};
fs.writeFileSync(path.join(out, 'BUILD_REPORT.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
