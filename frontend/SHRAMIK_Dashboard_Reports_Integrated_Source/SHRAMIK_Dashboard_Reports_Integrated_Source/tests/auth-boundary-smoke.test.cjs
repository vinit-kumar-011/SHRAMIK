const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../src/SHRAMIKDashboard.tsx'),
  'utf8',
);
const workspaceStart = source.indexOf('function SHRAMIKWorkspace(');
const publicWrapperStart = source.indexOf('function PublicAuthRoute(');
const appStart = source.indexOf('export default function SHRAMIKDashboard(');
assert.ok(workspaceStart > 0 && publicWrapperStart > workspaceStart && appStart > publicWrapperStart);

const workspace = source.slice(workspaceStart, publicWrapperStart);
const app = source.slice(appStart);
const loginPage = fs.readFileSync(path.resolve(__dirname, '../src/auth/LoginPage.tsx'), 'utf8');
const accessPage = fs.readFileSync(path.resolve(__dirname, '../src/auth/RequestAccessPage.tsx'), 'utf8');

test('public login and access request routes render outside the workspace shell', () => {
  assert.match(source, /if \(route === 'login' \|\| route === 'request-access'\)\s*\{\s*return <PublicAuthRoute/s);
  assert.match(source, /if \(route === 'landing'\) return <SHRAMIKLandingPage \/>/);
  assert.match(workspace, /if \(activePage === 'login' \|\| activePage === 'request-access'\) return null;/);
  assert.doesNotMatch(workspace, /<LoginPage\b|<RequestAccessPage\b/);
});

test('the outer route guard owns the single authenticated session', () => {
  assert.match(app, /const \[authSession, setAuthSession\] = useState<AuthSession \| null>\(null\)/);
  assert.match(app, /restoreAuthSession\(\)/);
  assert.match(app, /if \(!sessionChecked \|\| isPublicRoute \|\| authSession\) return/);
  assert.match(app, /if \(!authSession\) return <div className="sh-auth-loading"/);
  assert.match(workspace, /function SHRAMIKWorkspace\(\{ onNavigate, dataAdapter, authSession, onAuthSessionChange \}: SHRAMIKWorkspaceProps\)/);
  assert.doesNotMatch(workspace, /const \[authSession,\s*setAuthSession\]/);
  assert.doesNotMatch(workspace, /restoreAuthSession\(\)/);
  assert.match(app, /<SHRAMIKWorkspace \{\.\.\.props\} authSession=\{authSession\} onAuthSessionChange=\{setAuthSession\} \/>/);
});

test('sign-out clears the shared session and replaces the URL with public sign-in', () => {
  assert.match(workspace, /onAuthSessionChange\(null\)/);
  assert.match(workspace, /getPathForRoute\('login', import\.meta\.env\.BASE_URL\)/);
  assert.match(workspace, /window\.history\.replaceState\(null, '', path\)/);
  assert.match(workspace, /label: getRouteLabel\('login'\)/);
  assert.match(app, /setAuthSession\(session\)/);
});

test('public auth back links return to the public landing page, not the protected dashboard', () => {
  assert.match(loginPage, /onNavigate\('landing'\)/);
  assert.doesNotMatch(loginPage, /onNavigate\('dashboard'\)/);
  assert.match(accessPage, /onNavigate\('landing'\)/);
  assert.doesNotMatch(accessPage, /onNavigate\('dashboard'\)/);
  assert.match(source, /const navigate = useCallback\(\(target: 'landing' \| 'dashboard' \| 'login' \| 'request-access'\)/);
});
