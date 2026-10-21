import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DataSourcesPage } from './data-sources/DataSourcesPage';
import { mockDataSourcesAdapter } from './data-sources/mock-adapter';
import { createRestDataSourcesAdapter } from './data-sources/rest-adapter';
import './styles.css';

const apiBase = import.meta.env.VITE_DATA_SOURCES_API_BASE_URL?.trim();
const adapter = apiBase
  ? createRestDataSourcesAdapter(apiBase, {
      createSource: import.meta.env.VITE_DATA_SOURCES_ENABLE_CREATE === 'true',
      ingestion: import.meta.env.VITE_DATA_SOURCES_ENABLE_INGESTION === 'true',
    })
  : mockDataSourcesAdapter;

const navPrimary = ['Dashboard','Demand','Supply','Skill Gaps','Forecasts','Emerging Skills','Scenario Simulator','Reports'] as const;

function NavGlyph({ name }: { name: string }) {
  const common = { width: 19, height: 19, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const };
  switch (name) {
    case 'Dashboard': return <svg {...common}><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9M9 20v-7h6v7"/></svg>;
    case 'Demand': return <svg {...common}><path d="M4 19V5M4 19h17"/><path d="m7 15 4-4 3 2 5-7"/><circle cx="19" cy="6" r="1"/></svg>;
    case 'Supply': return <svg {...common}><rect x="3.5" y="4" width="7" height="6" rx="1"/><rect x="13.5" y="14" width="7" height="6" rx="1"/><path d="M10.5 7h3a3 3 0 0 1 3 3v4"/><path d="m13.5 11 3 3 3-3"/></svg>;
    case 'Skill Gaps': return <svg {...common}><circle cx="6" cy="6" r="2.2"/><circle cx="18" cy="6" r="2.2"/><circle cx="12" cy="18" r="2.2"/><path d="M8 7.5 10.5 15M16 7.5 13.5 15M8.5 6h7"/></svg>;
    case 'Forecasts': return <svg {...common}><path d="M4 20V11h4v9M10 20V7h4v13M16 20V3h4v17"/></svg>;
    case 'Emerging Skills': return <svg {...common}><path d="m12 3 2.6 5.4 6 .9-4.3 4.2 1 6-5.3-2.8-5.3 2.8 1-6-4.3-4.2 6-.9L12 3Z"/></svg>;
    case 'Scenario Simulator': return <svg {...common}><rect x="4" y="3.5" width="16" height="17" rx="1.8"/><path d="M8 8h8M8 12h5M8 16h7"/></svg>;
    case 'Reports': return <svg {...common}><path d="M6 3.5h8l4 4V20H6z"/><path d="M14 3.5V8h4M9 12h6M9 16h6"/></svg>;
    case 'Data Sources': return <svg {...common}><ellipse cx="12" cy="5" rx="8" ry="2.7"/><path d="M4 5v5c0 1.5 3.6 2.7 8 2.7s8-1.2 8-2.7V5M4 10v5c0 1.5 3.6 2.7 8 2.7s8-1.2 8-2.7v-5M4 15v4c0 1.5 3.6 2.7 8 2.7s8-1.2 8-2.7v-4"/></svg>;
    default: return <svg {...common}><circle cx="12" cy="12" r="8.5"/><path d="M12 8v4l3 2"/></svg>;
  }
}
function AppShell() {
  return <div className="app-shell">
    <header className="global-topbar">
      <a className="brand" href="#top" aria-label="SHRAMIK home">
        <span className="brand-mark">S</span>
        <span className="brand-copy"><strong>SHRAMIK</strong><small>LABOUR MARKET<br/>INTELLIGENCE<br/>SYSTEM</small></span>
      </a>
      <label className="global-search"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.5"/><path d="m16 16 4.3 4.3"/></svg><input placeholder="Search for skills, occupations, sectors or regions…" aria-label="Global search" /><kbd>Ctrl</kbd><kbd>K</kbd></label>
      <label className="geography-picker" aria-label="Current geography"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg><select aria-label="Current geography"><option>India (National)</option></select><span aria-hidden="true">⌄</span></label>
      <div className="global-actions">
        <button className="global-icon-button" aria-label="Notifications" title="Notifications"><svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg><i/></button>
        <button className="profile-button" aria-label="Signed-in profile"><span className="profile-avatar">A</span><span><strong>Arjun Mehta</strong><small>Research Analyst</small></span><span className="profile-chevron">⌄</span></button>
      </div>
    </header>
    <aside className="global-sidebar" aria-label="Main navigation">
      <nav className="nav-list" aria-label="Primary">
        {navPrimary.map(label => <a href="#" key={label} className="nav-link"><NavGlyph name={label}/>{label}</a>)}
        <div className="nav-divider"/>
        <a href="#" className="nav-link active" aria-current="page"><NavGlyph name="Data Sources"/>Data Sources</a>
        <a href="#" className="nav-link"><NavGlyph name="Data Quality"/>Data Quality</a>
      </nav>
      <div className="sidebar-art">
        <div className="sidebar-worker-photo" role="img" aria-label="Workers at an Indian construction site"/>
        <div className="sidebar-message"><span aria-hidden="true">💡</span><p>Data for people.<br/>Opportunities for<br/>a stronger India.</p></div>
      </div>
    </aside>
    <div className="workspace-main"><DataSourcesPage adapter={adapter}/><footer className="shell-footer"><span>SHRAMIK · LABOUR MARKET INTELLIGENCE SYSTEM</span><span>{apiBase?'Configured API adapter':'Local preview · SYNTHETIC_DEMO'}</span></footer></div>
  </div>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><AppShell/></StrictMode>);
