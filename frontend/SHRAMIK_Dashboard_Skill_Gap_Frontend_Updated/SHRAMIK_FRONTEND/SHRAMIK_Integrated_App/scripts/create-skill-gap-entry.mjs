import { copyFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(scriptDir, '../dist');
const source = path.join(dist, 'index.html');
const target = path.join(dist, 'skill-gap-analysis.html');
await access(source);
await copyFile(source, target);
console.log('Created dist/skill-gap-analysis.html. It loads the same application shell and opens Skill Gaps based on the URL path.');
