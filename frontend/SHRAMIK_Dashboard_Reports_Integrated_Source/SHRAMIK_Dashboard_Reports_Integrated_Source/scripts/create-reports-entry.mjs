import { copyFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve('dist');
await access(resolve(root, 'index.html'));
await copyFile(resolve(root, 'index.html'), resolve(root, 'reports.html'));
console.log('Created dist/reports.html using the shared application shell entry.');
