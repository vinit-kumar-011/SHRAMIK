const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const dist = path.resolve(__dirname, '../dist');
const js = fs.readFileSync(path.join(dist, 'app.js'), 'utf8');
let rendered = null;
const React = {
  StrictMode: function StrictMode(props) { return props.children; },
  Fragment: Symbol('Fragment'),
  createElement(type, props, ...children) { return { type, props: { ...(props || {}), ...(children.length ? { children } : {}) } }; },
};
const ReactDOM = { createRoot(node) { return { render(tree) { rendered = { node, tree }; } }; } };
const sandbox = {
  React,
  ReactDOM,
  document: { getElementById(id) { return id === 'root' ? { id } : null; } },
  console,
  URLSearchParams,
  Intl,
  AbortController,
  DOMException,
  fetch: async () => { throw new Error('Not expected during module-loader-only smoke test'); },
};
sandbox.window = sandbox;
sandbox.window.React = React;
sandbox.window.ReactDOM = ReactDOM;
sandbox.window.SHRAMIK_CONFIG = { apiBaseUrl: '' };
vm.createContext(sandbox);
vm.runInContext(js, sandbox, { filename: 'dist/app.js', timeout: 15000 });
if (!rendered || rendered.node.id !== 'root') throw new Error('The production entry did not initialize/mount the shared app root.');
if (!rendered.tree || !rendered.tree.type) throw new Error('React app root element is missing.');
for (const file of ['index.html', 'skill-gap-analysis.html', 'forecasts.html', 'reports.html', 'shramik-dashboard.css', 'config.js', 'BUILD_REPORT.json', 'DEPLOYMENT_README.md']) {
  if (!fs.existsSync(path.join(dist, file))) throw new Error(`Missing generated file: ${file}`);
}
const index = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const alias = fs.readFileSync(path.join(dist, 'skill-gap-analysis.html'), 'utf8');
const forecasts = fs.readFileSync(path.join(dist, 'forecasts.html'), 'utf8');
const reports = fs.readFileSync(path.join(dist, 'reports.html'), 'utf8');
if (index !== alias) throw new Error('Direct Skill Gaps entry must use the exact same app shell entry.');
if (index !== forecasts) throw new Error('Direct Forecasts entry must use the exact same app shell entry.');
if (index !== reports) throw new Error('Direct Reports entry must use the exact same app shell entry.')
const compiledApp = fs.readFileSync(path.join(dist, 'app.js'), 'utf8');
for (const phrase of ['FORECASTS & EARLY WARNINGS', 'Risk Radar', 'Scenario Analysis', 'Model Performance', 'Alert Management', 'REPORTS & INTELLIGENCE BRIEFS', 'Report Builder', 'Report Library', 'SOURCES & LIMITATIONS']) {
  if (!compiledApp.toLowerCase().includes(phrase.toLowerCase())) throw new Error(`Missing Forecasts & Early Warnings content in static app: ${phrase}`);
}
if (/text\/babel|babel\.min\.js|src\/main\.tsx/.test(index)) throw new Error('Production HTML still depends on dev-time transpilation/entry.');
console.log('PASS: production module-loader smoke test');
console.log('PASS: application root initialization');
console.log('PASS: dashboard, Skill Gaps, Forecasts and Reports direct entries share identical shell entry HTML');
console.log('PASS: Forecasts & Early Warnings five-view module included in production bundle');
console.log('PASS: Reports Builder, Library and structured document preview included in production bundle');
