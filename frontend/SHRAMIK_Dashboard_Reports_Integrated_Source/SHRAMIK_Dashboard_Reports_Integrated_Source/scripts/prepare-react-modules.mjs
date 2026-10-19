import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const frontendRoot = path.resolve(appRoot, '../..');
const compilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  jsx: ts.JsxEmit.ReactJSX,
  esModuleInterop: true,
  allowSyntheticDefaultImports: true,
  resolveJsonModule: true,
  isolatedModules: true,
  verbatimModuleSyntax: false,
  sourceMap: false,
  inlineSourceMap: false,
  removeComments: false,
};
const transpiled = [];

async function ensureParent(filePath) {
  await mkdir(path.dirname(filePath), { recursive: true });
}

async function copy(sourceRelative, targetRelative) {
  const sourcePath = path.resolve(frontendRoot, sourceRelative);
  const targetPath = path.resolve(appRoot, targetRelative);
  await ensureParent(targetPath);
  await copyFile(sourcePath, targetPath);
  return { sourceRelative, targetRelative, kind: 'copy' };
}

async function transpile(sourceRelative, targetRelative) {
  const sourcePath = path.resolve(frontendRoot, sourceRelative);
  const targetPath = path.resolve(appRoot, targetRelative);
  const sourceText = await readFile(sourcePath, 'utf8');
  const result = ts.transpileModule(sourceText, {
    compilerOptions,
    fileName: sourcePath,
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error);
  if (errors.length) {
    const detail = errors.map((item) => ts.flattenDiagnosticMessageText(item.messageText, '\\n')).join('\\n');
    throw new Error(`Could not prepare ${sourceRelative}:\\n${detail}`);
  }
  await ensureParent(targetPath);
  await writeFile(targetPath, result.outputText, 'utf8');
  transpiled.push({ source: sourceRelative, target: targetRelative, diagnostics: errors.length });
  return { sourceRelative, targetRelative, kind: 'transpile' };
}

// Bring independently authored React page modules into this app package before
// TypeScript/Vite run. This prevents the app compiler from resolving sibling
// handoff sources against their own missing node_modules directories. Their
// data contracts are still adapter-driven; this script only prepares source.
const moduleFiles = [
  // Emerging Skills page
  {
    kind: 'transpile',
    source: 'SHRAMIK_Dashboard_Reports_Integrated_Source/SHRAMIK_Dashboard_Reports_Integrated_Source/src/emerging-skills/EmergingSkillsPage.tsx',
    target: 'src/emerging-skills/EmergingSkillsPage.jsx',
  },
  // Scenario Simulator page, adapters and fixture
  {
    kind: 'transpile',
    source: 'SHRAMIK_Dashboard_Reports_Integrated_Source/SHRAMIK_Dashboard_Reports_Integrated_Source/src/scenario-simulator/ScenarioSimulatorPage.tsx',
    target: 'src/scenario-simulator/ScenarioSimulatorPage.jsx',
  },
  {
    kind: 'transpile',
    source: 'SHRAMIK_Dashboard_Reports_Integrated_Source/SHRAMIK_Dashboard_Reports_Integrated_Source/src/scenario-simulator/adapters/MockScenarioSimulatorAdapter.ts',
    target: 'src/scenario-simulator/adapters/MockScenarioSimulatorAdapter.js',
  },
  {
    kind: 'transpile',
    source: 'SHRAMIK_Dashboard_Reports_Integrated_Source/SHRAMIK_Dashboard_Reports_Integrated_Source/src/scenario-simulator/adapters/RestScenarioSimulatorAdapter.ts',
    target: 'src/scenario-simulator/adapters/RestScenarioSimulatorAdapter.js',
  },
  {
    kind: 'copy',
    source: 'SHRAMIK_Dashboard_Reports_Integrated_Source/SHRAMIK_Dashboard_Reports_Integrated_Source/src/scenario-simulator/contracts/example-synthetic-run.json',
    target: 'src/scenario-simulator/contracts/example-synthetic-run.json',
  },
  {
    kind: 'copy',
    source: 'SHRAMIK_Dashboard_Reports_Integrated_Source/SHRAMIK_Dashboard_Reports_Integrated_Source/src/scenario-simulator/scenario-simulator.css',
    target: 'src/scenario-simulator/scenario-simulator.css',
  },
  // Data Sources page, adapters, types and JSON fixture
  {
    kind: 'transpile',
    source: 'SHRAMIK_Dashboard_Reports_Integrated_Source/SHRAMIK_Dashboard_Reports_Integrated_Source/src/data-sources/DataSourcesPage.tsx',
    target: 'src/data-sources/DataSourcesPage.jsx',
  },
  {
    kind: 'transpile',
    source: 'SHRAMIK_Dashboard_Reports_Integrated_Source/SHRAMIK_Dashboard_Reports_Integrated_Source/src/data-sources/DataSourcesDataAdapter.ts',
    target: 'src/data-sources/DataSourcesDataAdapter.js',
  },
  {
    kind: 'transpile',
    source: 'SHRAMIK_Dashboard_Reports_Integrated_Source/SHRAMIK_Dashboard_Reports_Integrated_Source/src/data-sources/mock-adapter.ts',
    target: 'src/data-sources/mock-adapter.js',
  },
  {
    kind: 'transpile',
    source: 'SHRAMIK_Dashboard_Reports_Integrated_Source/SHRAMIK_Dashboard_Reports_Integrated_Source/src/data-sources/rest-adapter.ts',
    target: 'src/data-sources/rest-adapter.js',
  },
  {
    kind: 'transpile',
    source: 'SHRAMIK_Dashboard_Reports_Integrated_Source/SHRAMIK_Dashboard_Reports_Integrated_Source/src/data-sources/data-sources.types.ts',
    target: 'src/data-sources/data-sources.types.js',
  },
  {
    kind: 'copy',
    source: 'SHRAMIK_Dashboard_Reports_Integrated_Source/SHRAMIK_Dashboard_Reports_Integrated_Source/src/data-sources/mock-data-sources.json',
    target: 'src/data-sources/mock-data-sources.json',
  },
];

for (const file of moduleFiles) {
  if (file.kind === 'copy') {
    await copy(file.source, file.target);
  } else {
    await transpile(file.source, file.target);
  }
}

console.log(`Prepared ${transpiled.length} React/TypeScript modules for the unified SHRAMIK app.`);
for (const item of transpiled) console.log(`  ${item.source} -> ${item.target}`);
