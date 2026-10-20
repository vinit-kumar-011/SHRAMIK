import { SUPABASE_URL, supabaseHeaders } from '../supabase/config';

export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}
export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: AuthUser;
}
export interface AccessRequestInput {
  fullName: string;
  email: string;
  organization: string;
  requestedRole: 'Read-only Viewer' | 'Research Analyst' | 'Data Steward';
  purpose: string;
}

const SESSION_KEY = 'shramik.auth.session.v1';
type AuthResponse = Partial<AuthSession> & { expires_in?: number; error?: string; error_description?: string; message?: string };

function storage(): Storage | null {
  try { return typeof window !== 'undefined' ? window.sessionStorage : null; } catch { return null; }
}
function readSession(): AuthSession | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(SESSION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as AuthSession;
    if (!value.access_token || !value.refresh_token || !value.user?.id || !Number.isFinite(value.expires_at)) return null;
    return value;
  } catch { return null; }
}
function saveSession(session: AuthSession | null): void {
  const store = storage();
  if (!store) return;
  try {
    if (session) store.setItem(SESSION_KEY, JSON.stringify(session));
    else store.removeItem(SESSION_KEY);
  } catch {
    throw new Error('Your browser could not store a tab-scoped sign-in session. Check browser privacy settings and retry.');
  }
}
export function getStoredAuthSession(): AuthSession | null { return readSession(); }

function messageFrom(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const data = payload as Record<string, unknown>;
  for (const key of ['msg', 'message', 'error_description', 'error']) {
    if (typeof data[key] === 'string' && data[key]) return data[key] as string;
  }
  return fallback;
}
async function readPayload(response: Response): Promise<AuthResponse> {
  return await response.json().catch(() => ({})) as AuthResponse;
}
function normalizeSession(response: AuthResponse): AuthSession {
  if (!response.access_token || !response.refresh_token || !response.user?.id) {
    throw new Error('Supabase Auth did not return a complete session. Check whether email confirmation is required for this account.');
  }
  const expiresAt = typeof response.expires_at === 'number'
    ? response.expires_at
    : Math.floor(Date.now() / 1000) + (typeof response.expires_in === 'number' ? response.expires_in : 3600);
  return {
    access_token: response.access_token,
    refresh_token: response.refresh_token,
    expires_at: expiresAt,
    user: response.user as AuthUser,
  };
}
export async function signInWithPassword(email: string, password: string): Promise<AuthSession> {
  let response: Response;
  try {
    response = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: supabaseHeaders(null, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ email: email.trim(), password }),
    });
  } catch {
    throw new Error('Could not reach SHRAMIK authentication. Check your internet connection and try again.');
  }
  const payload = await readPayload(response);
  if (!response.ok) throw new Error(messageFrom(payload, 'Sign-in failed. Check the email/password and try again.'));
  const session = normalizeSession(payload);
  saveSession(session);
  return session;
}
async function refreshSession(session: AuthSession): Promise<AuthSession | null> {
  try {
    const response = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: supabaseHeaders(null, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });
    const payload = await readPayload(response);
    if (!response.ok) return null;
    const refreshed = normalizeSession(payload);
    saveSession(refreshed);
    return refreshed;
  } catch { return null; }
}
export async function restoreAuthSession(): Promise<AuthSession | null> {
  const session = readSession();
  if (!session) return null;
  if (session.expires_at <= Math.floor(Date.now() / 1000) + 30) {
    const refreshed = await refreshSession(session);
    if (refreshed) return refreshed;
    saveSession(null);
    return null;
  }
  return session;
}
export async function signOut(session: AuthSession | null): Promise<void> {
  try {
    if (session?.access_token) {
      try {
        await fetch(SUPABASE_URL + '/auth/v1/logout', {
          method: 'POST',
          headers: supabaseHeaders(session.access_token),
        });
      } catch { /* Local session is still cleared when the service is unreachable. */ }
    }
  } finally {
    saveSession(null);
  }
}
export async function submitAccessRequest(input: AccessRequestInput): Promise<void> {
  const response = await fetch(SUPABASE_URL + '/rest/v1/access_requests', {
    method: 'POST',
    headers: supabaseHeaders(null, {
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    }),
    body: JSON.stringify({
      full_name: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      organization: input.organization.trim(),
      requested_role: input.requestedRole,
      purpose: input.purpose.trim(),
    }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(messageFrom(payload, 'Your access request could not be saved. Please try again.'));
  }
}
