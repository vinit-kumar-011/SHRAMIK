import { AlertTriangle, Database, ShieldCheck, Workflow } from 'lucide-react';
import './live-module-notice.css';

export interface LiveModuleNoticeProps {
  title: string;
  eyebrow?: string;
  explanation: string;
  requiredSetting: string;
  neededOutput: string;
  onPreviewDemo?: () => void;
}

export default function LiveModuleNotice({
  title,
  eyebrow = 'SHRAMIK / LIVE DATA CONNECTION',
  explanation,
  requiredSetting,
  neededOutput,
  onPreviewDemo,
}: LiveModuleNoticeProps) {
  return <section className="live-module-notice" aria-labelledby="live-module-title">
    <header className="live-module-heading">
      <div>
        <p className="live-module-eyebrow">{eyebrow}</p>
        <h1 id="live-module-title">{title}<span>.</span></h1>
        <p className="live-module-lede">{explanation}</p>
      </div>
      <div className="live-module-status" role="status"><span aria-hidden="true" /> LIVE MODE · API NOT CONNECTED</div>
    </header>

    <div className="live-module-cards">
      <article className="live-module-card">
        <span className="live-module-icon"><Database size={20}/></span>
        <p className="live-module-card-kicker">DATA BOUNDARY</p>
        <h2>No fabricated outputs</h2>
        <p>The dashboard is connected to published Supabase source data. This module stays empty until a validated backend result is available; fixture values are not substituted.</p>
      </article>
      <article className="live-module-card">
        <span className="live-module-icon"><Workflow size={20}/></span>
        <p className="live-module-card-kicker">REQUIRED CONNECTION</p>
        <h2>Connect the module API</h2>
        <p>{neededOutput}</p>
        <code>{requiredSetting}</code>
      </article>
      <article className="live-module-card">
        <span className="live-module-icon"><ShieldCheck size={20}/></span>
        <p className="live-module-card-kicker">READY WHEN CONNECTED</p>
        <h2>Shared shell is active</h2>
        <p>Navigation, route refresh, and the SHRAMIK civic-intelligence UI remain available. Configure the endpoint for this module to replace this status page with live results.</p>
      </article>
    </div>

    {onPreviewDemo ? <section className="live-module-preview" aria-label="Synthetic module preview"><div><strong>Need to demonstrate the workflow before the API is ready?</strong><p>Open a clearly labelled synthetic preview. Sample identities and decisions are fictional; this does not approve real requests, create accounts or change permissions.</p></div><button type="button" onClick={onPreviewDemo}>Open synthetic Administration preview</button></section> : null}

    <footer className="live-module-footnote">
      <AlertTriangle size={17}/>
      <p><strong>Why this matters:</strong> {title} is an analytical view, not a raw-source registry. A registered data source alone does not prove a demand estimate, supply estimate, skill-gap calculation, or forecast has been validated.</p>
    </footer>
  </section>;
}
