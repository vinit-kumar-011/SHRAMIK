import { copyFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(scriptDir, '../dist');
const source = path.join(dist, 'index.html');
const target = path.join(dist, 'forecasts.html');
await access(source);
await copyFile(source, target);
console.log('Created dist/forecasts.html. It loads the same application shell and opens Forecasts & Early Warnings based on the URL path.');
