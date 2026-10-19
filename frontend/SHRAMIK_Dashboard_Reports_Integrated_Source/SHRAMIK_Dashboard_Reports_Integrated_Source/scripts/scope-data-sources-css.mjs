import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.resolve(scriptDir, '../../../SHRAMIK_Data_Sources_Source_and_Build/src/styles.css');
const outputPath = path.resolve(scriptDir, '../src/data-sources-scoped.css');
const prefix = '.data-sources-page';

function splitSelectorList(value) {
  const result = [];
  let start = 0, round = 0, square = 0, quote = '', escaped = false;
  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (escaped) { escaped = false; continue; }
    if (char === '\\') { escaped = true; continue; }
    if (quote) { if (char === quote) quote = ''; continue; }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === '(') round++;
    else if (char === ')') round = Math.max(0, round - 1);
    else if (char === '[') square++;
    else if (char === ']') square = Math.max(0, square - 1);
    else if (char === ',' && round === 0 && square === 0) {
      result.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  result.push(value.slice(start).trim());
  return result.filter(Boolean);
}

function prefixSelector(selector) {
  const value = selector.trim();
  if (!value) return value;
  // Page-root selectors already provide the isolation boundary.
  if (value === prefix || value.startsWith(prefix + ' ') || value.startsWith(prefix + '>') || value.startsWith(prefix + ':')) return value;
  if (value === ':root') return prefix;
  if (value.startsWith(':root')) return prefix + value.slice(5);
  if (/^(html|body)\b/.test(value)) return prefix + value.replace(/^(html|body)\b/, '');
  if (value.startsWith('#root')) return prefix + value.slice(5);
  return `${prefix} ${value}`;
}

function insideKeyframes(rule) {
  let node = rule.parent;
  while (node && node.type !== 'root') {
    if (node.type === 'atrule' && /keyframes$/i.test(node.name)) return true;
    node = node.parent;
  }
  return false;
}

const original = await readFile(sourcePath, 'utf8');
const root = postcss.parse(original, { from: sourcePath });
root.walkRules((rule) => {
  if (insideKeyframes(rule)) return;
  rule.selector = splitSelectorList(rule.selector).map(prefixSelector).join(', ');
});
const scoped = `${prefix}{box-sizing:border-box;width:100%;min-width:0;}\n${root.toString()}\n`;
await writeFile(outputPath, scoped, 'utf8');
console.log(`Scoped Data Sources styles: ${path.relative(process.cwd(), outputPath)}`);
