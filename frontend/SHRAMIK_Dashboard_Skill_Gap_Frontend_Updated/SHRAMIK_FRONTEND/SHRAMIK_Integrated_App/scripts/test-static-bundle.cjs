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
for (const file of ['index.html', 'skill-gap-analysis.html', 'shramik-dashboard.css', 'config.js', 'BUILD_REPORT.json']) {
  if (!fs.existsSync(path.join(dist, file))) throw new Error(`Missing generated file: ${file}`);
}
const index = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const alias = fs.readFileSync(path.join(dist, 'skill-gap-analysis.html'), 'utf8');
if (index !== alias) throw new Error('Direct Skill Gaps entry must use the exact same app shell entry.');
if (/text\/babel|babel\.min\.js|src\/main\.tsx/.test(index)) throw new Error('Production HTML still depends on dev-time transpilation/entry.');
console.log('PASS: production module-loader smoke test');
console.log('PASS: application root initialization');
console.log('PASS: dashboard and direct Skill Gaps entries share identical shell entry HTML');
