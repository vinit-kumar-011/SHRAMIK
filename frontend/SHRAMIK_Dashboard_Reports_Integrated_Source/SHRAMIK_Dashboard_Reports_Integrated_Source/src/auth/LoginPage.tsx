import { useState, type FormEvent } from 'react';
import { ArrowRight, KeyRound, ShieldCheck } from 'lucide-react';
import type { AuthSession } from './session';
import { signInWithPassword } from './session';

export default function LoginPage({ onAuthenticated, onNavigate }: {
  onAuthenticated: (session: AuthSession) => void;
  onNavigate: (route: 'landing' | 'request-access') => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setPending(true);
    try {
      const session = await signInWithPassword(email, password);
      onAuthenticated(session);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Sign-in failed. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return <section className="sh-auth-page" aria-labelledby="login-heading">
    <div className="sh-auth-copy">
      <div className="sh-auth-eyebrow"><ShieldCheck size={16}/> SECURE WORKSPACE ACCESS</div>
      <h1 id="login-heading">A clearer view<br/>of India’s workforce.</h1>
      <p>Sign in to continue to SHRAMIK Labour Market Intelligence. Your account is authenticated by Supabase Auth.</p>
      <div className="sh-auth-trust"><span>01</span><div><strong>Authenticated sign-in</strong><small>Credentials are sent directly to the configured authentication service.</small></div></div>
      <div className="sh-auth-trust"><span>02</span><div><strong>Least-privilege data access</strong><small>Published public data is read-only. Privileged actions remain server-controlled.</small></div></div>
    </div>
    <div className="sh-auth-card">
      <span className="sh-auth-icon"><KeyRound size={22}/></span>
      <p className="sh-auth-kicker">WELCOME BACK</p>
      <h2>Sign in to SHRAMIK</h2>
      <p className="sh-auth-intro">Use an existing SHRAMIK account.</p>
      {error && <div className="sh-auth-error" role="alert">{error}</div>}
      <form onSubmit={submit} aria-busy={pending}>
        <label>Email address<input autoComplete="username" type="email" value={email} disabled={pending} onChange={event => setEmail(event.target.value)} required maxLength={254} placeholder="you@organisation.gov.in"/></label>
        <label>Password<input autoComplete="current-password" type="password" value={password} disabled={pending} onChange={event => setPassword(event.target.value)} required minLength={1} maxLength={256} placeholder="Enter your password"/></label>
        <button className="sh-auth-primary" type="submit" disabled={pending}>{pending ? 'Signing in…' : 'Sign in'} <ArrowRight size={17}/></button>
      </form>
      <p className="sh-auth-footer">Need workspace access? <button type="button" onClick={() => onNavigate('request-access')}>Request access</button></p>
      <button className="sh-auth-text-link" type="button" onClick={() => onNavigate('landing')}>Return to public home</button>
      <p className="sh-auth-disclaimer">Only accounts already provisioned in Supabase Auth can sign in. An access request does not automatically create an account or assign a role.</p>
    </div>
  </section>;
}
