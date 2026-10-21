type ViteEnv = { VITE_SUPABASE_URL?: string; VITE_SUPABASE_PUBLISHABLE_KEY?: string };
const env = (import.meta as ImportMeta & { env?: ViteEnv }).env;

// The publishable key is intended for browser use. It is safe only with the
// matching least-privilege SQL grants and RLS policies; never put service_role here.
export const SUPABASE_URL = (env?.VITE_SUPABASE_URL?.trim() || 'https://vnmvejubmypbpiaxtrgc.supabase.co').replace(/\/+$/, '');
export const SUPABASE_PUBLISHABLE_KEY = env?.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || 'sb_publishable_bhVdjEavYKf91v2w1M2BTg_luThC1-d';

export function supabaseHeaders(accessToken?: string | null, extras?: HeadersInit): Headers {
  const headers = new Headers(extras);
  headers.set('apikey', SUPABASE_PUBLISHABLE_KEY);
  headers.set('Authorization', 'Bearer ' + (accessToken || SUPABASE_PUBLISHABLE_KEY));
  headers.set('Accept', 'application/json');
  return headers;
}
