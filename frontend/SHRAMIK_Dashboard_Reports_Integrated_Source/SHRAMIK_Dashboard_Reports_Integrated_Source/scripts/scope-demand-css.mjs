import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const sourcePath = path.join(appRoot, 'src/demand/DemandInsightsPage.jsx');
const scope = '.sh.embedded';
const keyframeNames = /keyframes$/i;

function splitSelectorList(value) {
  const selectors = [];
  let start = 0, round = 0, square = 0, quote = '', escaped = false;
  for (let index = 0; index < value.length; index++) {
    const char = value[index];
    if (escaped) { escaped = false; continue; }
    if (char === '\\') { escaped = true; continue; }
    if (quote) { if (char === quote) quote = ''; continue; }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === '(') round++;
    else if (char === ')') round = Math.max(0, round - 1);
    else if (char === '[') square++;
    else if (char === ']') square = Math.max(0, square - 1);
    else if (char === ',' && round === 0 && square === 0) {
      selectors.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  selectors.push(value.slice(start).trim());
  return selectors.filter(Boolean);
}

function prefixSelector(selector) {
  const value = selector.trim();
  if (!value) return value;
  if (value === scope || value.startsWith(scope + ' ') || value.startsWith(scope + '>') || value.startsWith(scope + ':')) return value;
  if (value === '.sh') return scope;
  if (value.startsWith('.sh ') || value.startsWith('.sh>') || value.startsWith('.sh:')) return scope + value.slice(3);
  if (value === ':root') return scope;
  if (value.startsWith(':root')) return scope + value.slice(5);
  return `${scope} ${value}`;
}

function isInsideKeyframes(rule) {
  let parent = rule.parent;
  while (parent && parent.type !== 'root') {
    if (parent.type === 'atrule' && keyframeNames.test(parent.name)) return true;
    parent = parent.parent;
  }
  return false;
}

function scopeCss(css, label) {
  const root = postcss.parse(css, { from: label });
  root.walkRules((rule) => {
    if (isInsideKeyframes(rule)) return;
    rule.selector = splitSelectorList(rule.selector).map(prefixSelector).join(', ');
  });
  return root.toString();
}

let source = await readFile(sourcePath, 'utf8');
const constants = [...source.matchAll(/const CSS2? = `([\s\S]*?)`;/g)];
if (constants.length !== 2) {
  throw new Error(`Expected exactly two Demand CSS template constants; found ${constants.length}.`);
}
for (const match of constants) {
  if (match[1].includes('${')) throw new Error('Refusing to scope a Demand CSS template with JavaScript interpolation.');
}
source = source.replace(/(const CSS2? = `)([\s\S]*?)(`\s*;)/g, (_match, before, css, after) =>
  `${before}${scopeCss(css, sourcePath)}${after}`,
);
await writeFile(sourcePath, source, 'utf8');
console.log(`Scoped Demand Insights CSS to ${scope}: ${path.relative(process.cwd(), sourcePath)}`);
