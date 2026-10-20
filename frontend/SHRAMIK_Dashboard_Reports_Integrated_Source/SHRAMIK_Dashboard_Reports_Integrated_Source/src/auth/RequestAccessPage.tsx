import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, FileLock2 } from 'lucide-react';
import { submitAccessRequest } from './session';

type Role = 'Read-only Viewer' | 'Research Analyst' | 'Data Steward';

export default function RequestAccessPage({ onNavigate }: { onNavigate: (route: 'landing' | 'login') => void }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [requestedRole, setRequestedRole] = useState<Role>('Read-only Viewer');
  const [purpose, setPurpose] = useState('');
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setPending(true);
    try {
      await submitAccessRequest({ fullName, email, organization, requestedRole, purpose });
      setSubmitted(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The request could not be submitted. Please retry.');
    } finally {
      setPending(false);
    }
  }

  return <section className="sh-auth-page sh-access-page" aria-labelledby="access-heading">
    <div className="sh-auth-copy">
      <div className="sh-auth-eyebrow"><FileLock2 size={16}/> WORKSPACE / ACCESS REVIEW</div>
      <h1>Good data<br/>needs good governance.</h1>
      <p>Request an account for the SHRAMIK workspace. Access requests are recorded for review; they do not create accounts or grant permissions automatically.</p>
      <div className="sh-auth-trust"><span>01</span><div><strong>Request recorded</strong><small>Your submission is saved to the access-request queue with pending status.</small></div></div>
      <div className="sh-auth-trust"><span>02</span><div><strong>Human review required</strong><small>Workspace access must be approved through an authorized administrative workflow.</small></div></div>
    </div>
    <div className="sh-auth-card sh-access-card">
      {submitted ? <>
        <span className="sh-auth-icon sh-auth-success-icon"><CheckCircle2 size={23}/></span>
        <p className="sh-auth-kicker">REQUEST RECEIVED</p>
        <h2>Thanks, {fullName.trim().split(/\s+/)[0] || 'there'}.</h2>
        <p className="sh-auth-intro">Your access request was saved successfully with a pending status. A reviewer must approve it before an account or permissions are provisioned.</p>
        <div className="sh-auth-success" role="status"><CheckCircle2 size={18}/><span>Request submitted to SHRAMIK access review.</span></div>
        <button className="sh-auth-primary" type="button" onClick={() => onNavigate('login')}>Go to sign in <ArrowRight size={17}/></button>
        <button className="sh-auth-text-link" type="button" onClick={() => onNavigate('landing')}>Return to public home</button>
      </> : <>
        <p className="sh-auth-kicker">REQUEST WORKSPACE ACCESS</p>
        <h2 id="access-heading">Tell us about your work</h2>
        <p className="sh-auth-intro">Fields marked required are needed for review.</p>
        {error && <div className="sh-auth-error" role="alert">{error}</div>}
        <form onSubmit={submit} aria-busy={pending}>
          <label>Full name<input autoComplete="name" value={fullName} disabled={pending} onChange={event => setFullName(event.target.value)} required minLength={2} maxLength={100} placeholder="Your full name"/></label>
          <label>Work email<input autoComplete="email" type="email" value={email} disabled={pending} onChange={event => setEmail(event.target.value)} required maxLength={254} placeholder="you@organisation.gov.in"/></label>
          <label>Organisation<input autoComplete="organization" value={organization} disabled={pending} onChange={event => setOrganization(event.target.value)} required minLength={2} maxLength={160} placeholder="Department, institution or organisation"/></label>
          <label>Requested role<select value={requestedRole} disabled={pending} onChange={event => setRequestedRole(event.target.value as Role)}><option>Read-only Viewer</option><option>Research Analyst</option><option>Data Steward</option></select></label>
          <label>Purpose of access<textarea value={purpose} disabled={pending} onChange={event => setPurpose(event.target.value)} required minLength={20} maxLength={1200} rows={4} placeholder="Describe your work and how you expect to use SHRAMIK data."/></label>
          <button className="sh-auth-primary" type="submit" disabled={pending}>{pending ? 'Submitting request…' : 'Submit access request'} <ArrowRight size={17}/></button>
        </form>
        <p className="sh-auth-footer">Already have an account? <button type="button" onClick={() => onNavigate('login')}>Sign in</button></p>
        <button className="sh-auth-text-link" type="button" onClick={() => onNavigate('landing')}><ArrowLeft size={14}/> Return to public home</button>
        <p className="sh-auth-disclaimer">Your request is visible only to authorized server-side reviewers. This page cannot read the queue, approve itself, or grant a role.</p>
      </>}
    </div>
  </section>;
}
