export const SHRAMIK_ROUTES = [
  { id: 'dashboard', path: '/', label: 'Dashboard' },
  { id: 'demand', path: '/demand', label: 'Demand' },
  { id: 'supply', path: '/supply', label: 'Supply' },
  { id: 'skill-gaps', path: '/skill-gaps', label: 'Skill Gaps' },
  { id: 'forecasts', path: '/forecasts', label: 'Forecasts' },
  { id: 'emerging-skills', path: '/emerging-skills', label: 'Emerging Skills' },
  { id: 'scenario-simulator', path: '/scenario-simulator', label: 'Scenario Simulator' },
  { id: 'reports', path: '/reports', label: 'Reports' },
  { id: 'data-sources', path: '/data-sources', label: 'Data Sources' },
  { id: 'data-quality', path: '/data-quality', label: 'Data Quality' },
  { id: 'administration', path: '/administration', label: 'Administration' },
  { id: 'login', path: '/login', label: 'Sign in' },
  { id: 'request-access', path: '/request-access', label: 'Request access' },
] as const;

export type ShramikRouteId = typeof SHRAMIK_ROUTES[number]['id'] | 'not-found';
type LocationSnapshot = Pick<Location, 'pathname' | 'search' | 'hash'>;

const routeById = new Map<string, ShramikRouteId>(
  SHRAMIK_ROUTES.map((route) => [route.id, route.id]),
);

const legacyAliases: Record<string, ShramikRouteId> = {
  '/index.html': 'dashboard',
  '/dashboard': 'dashboard',
  '/skill-gap-analysis.html': 'skill-gaps',
  '/skill-gaps.html': 'skill-gaps',
  '/forecasts.html': 'forecasts',
  '/reports.html': 'reports',
  '/emerging-skills.html': 'emerging-skills',
  '/scenario-simulator.html': 'scenario-simulator',
  '/data-sources.html': 'data-sources',
  '/data-quality.html': 'data-quality',
  '/administration.html': 'administration',
  '/grant-access': 'request-access',
  '/access-request': 'request-access',
};

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizePath(pathname: string): string {
  let path = safeDecode(pathname || '/').split('?')[0].toLowerCase();
  if (!path.startsWith('/')) path = `/${path}`;
  if (path.length > 1) path = path.replace(/\/+$/, '');
  return path || '/';
}

/** Resolve a direct URL, refresh, back/forward navigation, and legacy demo links. */
export function getRouteFromLocation(location: LocationSnapshot, basePath = '/'): ShramikRouteId {
  const queryPage = new URLSearchParams(location.search || '').get('page');
  if (queryPage && routeById.has(queryPage)) return routeById.get(queryPage)!;

  const hash = (location.hash || '').replace(/^#/, '').toLowerCase();
  if (hash && routeById.has(hash)) return routeById.get(hash)!;

  let path = normalizePath(location.pathname);
  const normalizedBase = normalizePath(basePath);
  if (normalizedBase !== '/') {
    if (path === normalizedBase) path = '/';
    else if (path.startsWith(`${normalizedBase}/`)) path = path.slice(normalizedBase.length) || '/';
  }
  if (path === '/') return 'dashboard';

  const direct = SHRAMIK_ROUTES.find((route) => route.path === path);
  if (direct) return direct.id;

  // Keep detail routes inside their owning module instead of sending them to a 404.
  const nested = SHRAMIK_ROUTES.find((route) => route.path !== '/' && path.startsWith(`${route.path}/`));
  if (nested) return nested.id;

  return legacyAliases[path] ?? 'not-found';
}

export function getPathForRoute(route: Exclude<ShramikRouteId, 'not-found'>, basePath = '/'): string {
  const routePath = SHRAMIK_ROUTES.find((item) => item.id === route)?.path ?? '/';
  const normalizedBase = normalizePath(basePath);
  if (normalizedBase === '/') return routePath;
  return routePath === '/' ? `${normalizedBase}/` : `${normalizedBase}${routePath}`;
}

export function getRouteLabel(route: ShramikRouteId): string {
  if (route === 'not-found') return 'Page not found';
  return SHRAMIK_ROUTES.find((item) => item.id === route)?.label ?? 'Dashboard';
}
