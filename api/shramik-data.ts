type Request = {
  method?: string;
  query: Record<string, string | string[] | undefined>;
};
type Response = {
  setHeader(name: string, value: string): Response;
  status(code: number): Response;
  json(body: unknown): void;
};

type TableRule = {
  columns: ReadonlySet<string>;
  filters: ReadonlySet<string>;
  forcedFilters?: Record<string, string>;
};

const TABLES: Record<string, TableRule> = {
  source_metric_observations: {
    columns: new Set([
      'id', 'source_id', 'metric_code', 'value_numeric', 'unit',
      'observation_grain', 'state_id', 'reference_period', 'as_of_date',
      'dimension_values', 'provenance_state', 'is_synthetic',
    ]),
    filters: new Set([
      'metric_code', 'provenance_state', 'is_synthetic', 'reference_period',
      'state_id', 'observation_grain', 'order', 'limit', 'offset', 'select',
    ]),
    forcedFilters: { provenance_state: 'eq.SOURCE_BACKED', is_synthetic: 'eq.false' },
  },
  states: {
    columns: new Set(['id', 'name', 'code']),
    filters: new Set(['select', 'order', 'limit', 'offset']),
  },
  districts: {
    columns: new Set(['id', 'state_id', 'name']),
    filters: new Set(['select', 'state_id', 'order', 'limit', 'offset']),
  },
  sectors: {
    columns: new Set(['id', 'code', 'name', 'description']),
    filters: new Set(['select', 'is_active', 'order', 'limit', 'offset']),
  },
  skills: {
    columns: new Set([
      'id', 'code', 'name', 'sector_id', 'sector_mapping_method',
      'sector_mapping_confidence', 'description',
    ]),
    filters: new Set(['select', 'is_active', 'order', 'limit', 'offset']),
  },
  data_sources: {
    columns: new Set([
      'id', 'name', 'publisher', 'source_type', 'url', 'publication_date',
      'accessed_at', 'coverage_start', 'coverage_end', 'notes',
    ]),
    filters: new Set(['select', 'order', 'limit', 'offset']),
  },
  sh_public_dashboard_kpis: {
    columns: new Set([
      'metric_code', 'title', 'value_numeric', 'unit', 'reference_period',
      'source_label', 'source_url', 'as_of_date', 'interpretation_note', 'sort_order',
    ]),
    filters: new Set(['select', 'order', 'limit', 'offset']),
  },
  sh_public_dashboard_regions: {
    columns: new Set([
      'metric_key', 'metric_label', 'state_id', 'state_name', 'value_numeric',
      'unit', 'reference_period', 'source_label', 'source_url', 'as_of_date',
      'interpretation_note',
    ]),
    filters: new Set(['select', 'metric_key', 'state_id', 'order', 'limit', 'offset']),
  },
};

const DEFAULT_URL = 'https://vnmvejubmypbpiaxtrgc.supabase.co';
const DEFAULT_KEY = 'sb_publishable_bhVdjEavYKf91v2w1M2BTg_luThC1-d';
const processEnv = (globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env || {};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
function errorMessage(value: unknown): string {
  if (value instanceof Error && value.message) return value.message;
  return 'The SHRAMIK data service could not complete the request.';
}

export function createPublicSupabaseDataHandler(
  runtimeEnv: Record<string, string | undefined> = processEnv,
) {
  return async function handler(req: Request, res: Response): Promise<void> {
  res.setHeader('Cache-Control', 'public, max-age=20, stale-while-revalidate=60')
    .setHeader('X-Content-Type-Options', 'nosniff')
    .setHeader('Vary', 'Accept');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET').status(405).json({ error: 'Only GET requests are allowed.' });
    return;
  }

  const table = first(req.query.table) || '';
  const rule = TABLES[table];
  if (!rule) {
    res.status(400).json({ error: 'This data resource is not available through the public SHRAMIK reader.' });
    return;
  }

  const requestedColumnText = first(req.query.select);
  const requestedColumns = (requestedColumnText || '').split(',').map(c => c.trim());
  if (!requestedColumnText || requestedColumns.length === 0
    || requestedColumns.some(c => !/^[a-z_][a-z0-9_]*$/i.test(c) || !rule.columns.has(c))) {
    res.status(400).json({ error: 'An explicit allow-listed column set is required for this resource.' });
    return;
  }

  const params = new URLSearchParams();
  params.set('select', requestedColumns.join(','));
  for (const key of rule.filters) {
    if (key === 'select' || key === 'limit' || key === 'offset' || key === 'order') continue;
    const requested = first(req.query[key]);
    const forced = rule.forcedFilters?.[key];
    if (forced) {
      params.set(key, forced);
    } else if (requested !== undefined) {
      // The request is constrained by the table-specific filter allow-list.
      if (!/^[A-Za-z0-9_,().:*+-]+$/.test(requested)) {
        res.status(400).json({ error: 'The requested filter contains unsupported characters.' });
        return;
      }
      params.set(key, requested);
    }
  }

  const order = first(req.query.order);
  if (order) {
    if (!/^[a-z_][a-z0-9_]*(\.(asc|desc))?(,[a-z_][a-z0-9_]*(\.(asc|desc))?)*$/i.test(order)) {
      res.status(400).json({ error: 'The requested ordering is invalid.' });
      return;
    }
    const orderColumns = order.split(',').map(item => item.split('.')[0]);
    if (orderColumns.some(column => !rule.columns.has(column))) {
      res.status(400).json({ error: 'The requested ordering uses a non-allow-listed column.' });
      return;
    }
    params.set('order', order);
  }

  const limitValue = Number(first(req.query.limit) || '500');
  const offsetValue = Number(first(req.query.offset) || '0');
  const limit = Number.isInteger(limitValue) ? Math.max(1, Math.min(limitValue, 1000)) : 500;
  const offset = Number.isInteger(offsetValue) ? Math.max(0, Math.min(offsetValue, 50000)) : 0;
  params.set('limit', String(limit));
  if (offset > 0) params.set('offset', String(offset));

  const baseUrl = (runtimeEnv.VITE_SUPABASE_URL || DEFAULT_URL).replace(/\/+$/, '');
  const publishableKey = runtimeEnv.VITE_SUPABASE_PUBLISHABLE_KEY || DEFAULT_KEY;

  try {
    const upstream = await fetch(baseUrl + '/rest/v1/' + encodeURIComponent(table) + '?' + params.toString(), {
      method: 'GET',
      headers: {
        apikey: publishableKey,
        Authorization: 'Bearer ' + publishableKey,
        Accept: 'application/json',
      },
    });
    const text = await upstream.text();
    let body: unknown;
    try { body = JSON.parse(text); }
    catch { body = { error: 'The database returned an unreadable response.' }; }

    if (!upstream.ok) {
      const detail = body && typeof body === 'object'
        ? (body as Record<string, unknown>).message || (body as Record<string, unknown>).details || (body as Record<string, unknown>).hint
        : null;
      res.status(upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502).json({
        error: typeof detail === 'string' ? detail : 'The SHRAMIK database rejected the read request.',
        upstreamStatus: upstream.status,
        table,
      });
      return;
    }
    if (!Array.isArray(body)) {
      res.status(502).json({ error: 'The SHRAMIK database returned an unexpected response shape.', table });
      return;
    }
    res.setHeader('X-SHRAMIK-Data-Source', 'supabase-public-read')
      .status(200).json(body);
  } catch (error) {
    res.status(502).json({ error: errorMessage(error), table, source: 'supabase-upstream' });
  }
  };
}

export default createPublicSupabaseDataHandler();
