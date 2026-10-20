import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react';
import styles from './SHRAMIKLandingPage.module.css';
import { SUPABASE_URL, supabaseHeaders } from '../supabase/config';

type PublishedIndicator = {
  metric_code: string;
  title: string;
  value_numeric: number | string;
  unit: string;
  reference_period: string;
  source_label: string | null;
  source_url: string | null;
  as_of_date: string | null;
  interpretation_note: string | null;
  sort_order: number;
};

function formatPublishedValue(indicator: PublishedIndicator): string {
  const value = Number(indicator.value_numeric);
  if (!Number.isFinite(value)) return 'Unavailable';
  if (indicator.unit === '%' || indicator.unit.toLowerCase() === 'percent') return value.toFixed(1) + '%';
  return new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

type PreviewKey = 'overview' | 'gaps' | 'forecasts';

const capabilities = [
  { icon: '↗', title: 'Workforce demand', text: 'Understand demand signals across sectors, occupations, skills and locations.' },
  { icon: '◎', title: 'Workforce supply', text: 'Examine workforce and skilling-capacity indicators where reliable data is available.' },
  { icon: '⇄', title: 'Skill gap analysis', text: 'Compare demand and supply estimates to identify potential shortages, surpluses and mismatches.' },
  { icon: '✳', title: 'Emerging skills', text: 'Explore skills showing increased demand and their relationships to occupations and sectors.' },
  { icon: '⌁', title: 'Workforce forecasting', text: 'Explore future trends when enough usable historical data supports a forecast.' },
  { icon: '▤', title: 'Skilling intervention planning', text: 'Examine hypothetical skilling interventions and compare scenarios against a baseline.' },
];

const stages = [
  { title: 'Gather signals', short: 'Bring together relevant workforce and skilling observations.', detail: 'Collect relevant observations with their source references, time periods and coverage details where available.' },
  { title: 'Harmonise data', short: 'Organise data by geography, sector, occupation, skill and period.', detail: 'Organise records into a consistent framework for geography, sector, occupation, skill and time period. Uncertain mappings should remain reviewable.' },
  { title: 'Estimate demand and supply', short: 'Examine observations and forecast where supportable.', detail: 'Examine observed conditions and generate forecasts only when sufficient usable historical data and a supported method are available.' },
  { title: 'Identify gaps', short: 'Inspect potential shortages and emerging needs.', detail: 'Compare demand and supply estimates, then inspect potential shortages, surpluses and emerging skill signals alongside their evidence.' },
  { title: 'Evaluate interventions', short: 'Compare possible interventions and assumptions.', detail: 'Compare hypothetical scenarios against a defined baseline, while keeping assumptions, uncertainty and limitations visible.' },
];

const previews: Record<PreviewKey, { title: string; period: string; labels: [string, string, string]; values: [string, string, string]; note: string; demand: string; supply: string }> = {
  overview: {
    title: 'Workforce overview', period: 'Illustrative period', labels: ['Demand trend', 'Supply trend', 'Gap view'], values: ['Illustrative', 'Illustrative', 'Illustrative'],
    note: 'Sample interface only. No live service is connected and the values are not real labour-market statistics.',
    demand: 'M35 135 L110 120 L185 102 L260 88 L340 68 L420 49 L510 35', supply: 'M35 153 L110 145 L185 132 L260 117 L340 105 L420 87 L510 75',
  },
  gaps: {
    title: 'Potential skill gap view', period: 'Illustrative comparison', labels: ['Demand estimate', 'Supply estimate', 'Gap difference'], values: ['Example only', 'Example only', 'Not calculated'],
    note: 'This is a layout demonstration. No gap is calculated here; actual results require validated demand and supply estimates.',
    demand: 'M35 123 L110 112 L185 86 L260 101 L340 66 L420 58 L510 32', supply: 'M35 142 L110 139 L185 119 L260 125 L340 108 L420 95 L510 81',
  },
  forecasts: {
    title: 'Forecast trend preview', period: 'Illustrative projection', labels: ['Historical series', 'Projection series', 'Uncertainty'], values: ['Sample', 'Sample', 'Not shown'],
    note: 'Forecasts and uncertainty intervals are not computed in this mockup. A production view must use model-returned outputs and clearly defined intervals.',
    demand: 'M35 148 L110 125 L185 110 L260 94 L340 68 L420 51 L510 26', supply: 'M35 158 L110 148 L185 135 L260 126 L340 108 L420 95 L510 90',
  },
};

const navLinks = [
  ['Overview', '#sl-overview'], ['Published data', '#sl-live-indicators'], ['Capabilities', '#sl-capabilities'], ['How it works', '#sl-workflow'], ['Methodology', '#sl-transparency'], ['Workspace', '/dashboard'],
] as const;

export default function SHRAMIKLandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const [activeStage, setActiveStage] = useState(0);
  const [previewKey, setPreviewKey] = useState<PreviewKey>('overview');
  const [revealsReady, setRevealsReady] = useState(false);
  const [publishedIndicators, setPublishedIndicators] = useState<PublishedIndicator[]>([]);
  const [publishedState, setPublishedState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [publishedRetry, setPublishedRetry] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const preview = previews[previewKey];
  const reducedMotion = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);

  useEffect(() => {
    const handleScroll = () => setHeaderScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && menuOpen) {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    const handlePopState = () => {
      const currentHash = window.location.hash;
      if (!currentHash) return;
      const target = rootRef.current?.querySelector<HTMLElement>(currentHash);
      target?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    };
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [menuOpen]);

  useEffect(() => {
    const controller = new AbortController();
    setPublishedState('loading');
    const params = new URLSearchParams({
      select: 'metric_code,title,value_numeric,unit,reference_period,source_label,source_url,as_of_date,interpretation_note,sort_order',
      order: 'sort_order.asc',
    });
    void fetch(SUPABASE_URL + '/rest/v1/sh_public_dashboard_kpis?' + params.toString(), {
      method: 'GET',
      headers: supabaseHeaders(null),
      signal: controller.signal,
    }).then(async (response) => {
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error('Published indicators are unavailable (HTTP ' + response.status + ').');
      if (!Array.isArray(payload)) throw new Error('The published indicator response was not a list.');
      if (!controller.signal.aborted) {
        setPublishedIndicators(payload as PublishedIndicator[]);
        setPublishedState('loaded');
      }
    }).catch(() => {
      if (!controller.signal.aborted) setPublishedState('error');
    });
    return () => controller.abort();
  }, [publishedRetry]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || reducedMotion || !('IntersectionObserver' in window)) return;
    setRevealsReady(true);
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add(styles['is-visible']);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    root.querySelectorAll<HTMLElement>('[data-reveal]').forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [reducedMotion]);

  const closeMenu = () => setMenuOpen(false);
  const handleAnchorClick = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    const href = event.currentTarget.getAttribute('href');
    if (!href?.startsWith('#')) return;
    const target = rootRef.current?.querySelector<HTMLElement>(href);
    if (!target) return;
    event.preventDefault();
    closeMenu();
    target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    if (window.location.hash !== href) window.history.pushState(null, '', href);
  };

  const handleTabKey = (event: ReactKeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    const order: PreviewKey[] = ['overview', 'gaps', 'forecasts'];
    let nextIndex = currentIndex;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % order.length;
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex + order.length - 1) % order.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = order.length - 1;
    else return;
    event.preventDefault();
    setPreviewKey(order[nextIndex]);
    rootRef.current?.querySelector<HTMLButtonElement>(`#sl-tab-${order[nextIndex]}`)?.focus();
  };

  const c = (name: string) => styles[name] ?? name;
  const rootClasses = [styles.root, revealsReady ? c('sl-has-reveal') : ''].filter(Boolean).join(' ');

  return (
    <div ref={rootRef} className={rootClasses}>
      <a className={c('sl-skip')} href="#sl-main" onClick={handleAnchorClick}>Skip to main content</a>
      <header className={[c('sl-header'), headerScrolled ? c('is-scrolled') : ''].filter(Boolean).join(' ')}>
        <div className={c('sl-wrap') + ' ' + c('sl-bar')}>
          <a className={c('sl-brand')} href="#sl-top" aria-label="SHRAMIK home" onClick={handleAnchorClick}>
            <span className={c('sl-mark')} aria-hidden="true">S</span>
            <span><span className={c('sl-brand-name')}>SHRAMIK</span><span className={c('sl-brand-sub')}>Labour Market Intelligence System</span></span>
          </a>
          <button ref={menuButtonRef} className={c('sl-menu-btn')} type="button" aria-expanded={menuOpen} aria-controls="sl-nav" onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? 'Close' : 'Menu'}</button>
          <nav className={[c('sl-nav'), menuOpen ? c('is-open') : ''].filter(Boolean).join(' ')} id="sl-nav" aria-label="Primary navigation">
            {navLinks.map(([label, href]) => <a key={href} href={href} onClick={handleAnchorClick}>{label}</a>)}
            <a className={c('sl-btn') + ' ' + c('sl-btn--primary')} href="/login">Sign in <span aria-hidden="true">→</span></a>
          </nav>
        </div>
      </header>

      <main id="sl-main">
        <section className={c('sl-hero')} id="sl-top" aria-labelledby="sl-hero-title">
          <div className={c('sl-wrap') + ' ' + c('sl-hero-grid')}>
            <div className={[c('sl-hero-copy'), c('sl-reveal')].join(' ')} data-reveal>
              <p className={c('sl-eyebrow')}>Labour Market Intelligence System</p>
              <h1 id="sl-hero-title"><span className={c('sl-hero-line')}>Data for People.</span><span className={c('sl-hero-line')}>Opportunities for</span><span className={c('sl-hero-line')}>a Stronger <span className={c('sl-underline')}>India.</span></span></h1>
              <p className={c('sl-lede')}>A data-driven platform to understand, plan and strengthen India's workforce.</p>
              <div className={c('sl-ctas')}><a className={c('sl-btn') + ' ' + c('sl-btn--primary')} href="/dashboard">Open workspace <span aria-hidden="true">→</span></a><a className={c('sl-btn') + ' ' + c('sl-btn--secondary')} href="#sl-preview" onClick={handleAnchorClick}>View platform preview <span aria-hidden="true">↗</span></a></div>
              <div className={c('sl-promise')} aria-label="Platform principles"><span>Evidence-led insights</span><span>Traceable methods</span><span>Informed planning</span></div>
            </div>
            <figure className={[c('sl-art'), c('sl-reveal')].join(' ')} data-reveal aria-labelledby="sl-art-caption">
              <div className={c('sl-art-dots')} aria-hidden="true"/><span className={c('sl-art-orb') + ' ' + c('sl-art-orb--yellow')} aria-hidden="true"/><span className={c('sl-art-orb') + ' ' + c('sl-art-orb--orange')} aria-hidden="true"/><span className={c('sl-art-orb') + ' ' + c('sl-art-orb--navy')} aria-hidden="true"/>
              <div className={c('sl-art-frame')}><svg viewBox="0 0 420 420" role="img" aria-label="Original illustrative scene of Indian city buildings and workers; not a data map" xmlns="http://www.w3.org/2000/svg">
                <rect width="420" height="420" fill="#EAE8E0"/><g fill="#C6C4BB" stroke="#292929" strokeWidth="1.5"><rect x="18" y="168" width="55" height="252"/><rect x="80" y="125" width="58" height="295"/><rect x="286" y="145" width="48" height="275"/><rect x="341" y="188" width="61" height="232"/></g>
                <g stroke="#8C8A82" strokeWidth="2"><path d="M28 194h35M28 220h35M28 246h35M28 272h35M28 298h35M91 151h35M91 179h35M91 207h35M91 235h35M91 263h35M297 173h26M297 201h26M350 216h43M350 244h43M350 272h43"/></g>
                <path d="M145 420V222h130v198h-24V268a41 41 0 0 0-82 0v152z" fill="#575750" stroke="#292929" strokeWidth="2"/><path d="M136 216h148v16H136z" fill="#292929"/><path d="M0 365Q90 340 160 366T300 365T420 350V420H0z" fill="#B7B5AC"/>
                <g transform="translate(35 0)"><path d="M8 420c0-52 21-82 58-82s61 30 61 82z" fill="#203A5B" stroke="#292929" strokeWidth="2"/><path d="M42 348l24 23 23-24 15 73H29z" fill="#F7F6F0"/><circle cx="66" cy="313" r="26" fill="#C9956D" stroke="#292929" strokeWidth="2"/><path d="M39 309a28 24 0 0 1 54 0z" fill="#171717"/><path d="M36 297l30-20 31 20z" fill="#F2D34F" stroke="#292929" strokeWidth="2"/><path d="M44 300h44" stroke="#292929" strokeWidth="2"/></g>
                <g transform="translate(260 25)"><path d="M8 395c0-42 18-65 48-65s48 23 48 65z" fill="#575750" stroke="#292929" strokeWidth="2"/><circle cx="56" cy="302" r="21" fill="#B9815C" stroke="#292929" strokeWidth="2"/><path d="M34 296a23 19 0 0 1 44 0z" fill="#171717"/><path d="M29 290l27-18 28 18z" fill="#F2D34F" stroke="#292929" strokeWidth="2"/></g>
                <path d="M0 402h420" stroke="#292929" strokeWidth="3"/><g fill="#F2D34F"><rect x="18" y="381" width="13" height="20"/><rect x="389" y="381" width="13" height="20"/></g>
              </svg></div><figcaption className={c('sl-art-caption')} id="sl-art-caption">Illustrative workforce scene</figcaption>
            </figure>
          </div>
        </section>

        <section className={c('sl-section')} id="sl-live-indicators" aria-labelledby="sl-live-indicators-title">
          <div className={c('sl-wrap')}>
            <p className={c('sl-eyebrow')}>Published source data</p>
            <h2 className={c('sl-section-title')} id="sl-live-indicators-title">Start with the evidence.</h2>
            <p className={c('sl-section-intro')}>These indicators are fetched from SHRAMIK's read-only published data view. They are real source-backed context indicators, not demand/supply estimates or model forecasts.</p>
            {publishedState === 'loading' && <p className={c('sl-live-status')} role="status">Loading published indicators…</p>}
            {publishedState === 'error' && <div className={c('sl-live-error')} role="alert"><span>Published indicators could not be loaded just now.</span><button type="button" className={c('sl-live-retry')} onClick={() => setPublishedRetry(value => value + 1)}>Retry</button></div>}
            {publishedState === 'loaded' && publishedIndicators.length === 0 && <p className={c('sl-live-status')} role="status">No published indicators are available in the public view right now.</p>}
            {publishedState === 'loaded' && publishedIndicators.length > 0 && <div className={c('sl-live-indicators-grid')}>
              {publishedIndicators.map((indicator) => <article key={indicator.metric_code} className={c('sl-live-indicator')}>
                <span className={c('sl-live-indicator-label')}>{indicator.title}</span>
                <strong className={c('sl-live-indicator-value')}>{formatPublishedValue(indicator)}</strong>
                <span className={c('sl-live-indicator-unit')}>{indicator.unit === '%' ? 'Published rate' : indicator.unit}</span>
                <span className={c('sl-live-indicator-period')}>{indicator.reference_period}{indicator.as_of_date ? ' · as of ' + indicator.as_of_date : ''}</span>
                {indicator.interpretation_note && <p className={c('sl-live-indicator-note')}>{indicator.interpretation_note}</p>}
                <div className={c('sl-live-indicator-source')}>{indicator.source_label || 'Source label unavailable'}{indicator.source_url ? <> · <a href={indicator.source_url} target="_blank" rel="noreferrer">Source ↗</a></> : ''}</div>
              </article>)}
            </div>}
            <p className={c('sl-method-note')}>Coverage and definitions vary by source. Cumulative registrations and training capacity are not counts of active workers. Forecasts, demand, supply and skill-gap outputs remain unavailable until validated results are published.</p>
          </div>
        </section>

        <section className={c('sl-section')} id="sl-overview" aria-label="Core platform principles">
          <div className={c('sl-wrap') + ' ' + c('sl-value-grid')}>
            <article className={[c('sl-value'), c('sl-reveal')].join(' ')} data-reveal><span className={c('sl-icon')} aria-hidden="true">01</span><h3>Evidence-based insights</h3><p>Explore workforce-related information through a structured, evidence-led interface.</p></article>
            <article className={[c('sl-value'), c('sl-reveal')].join(' ')} data-reveal><span className={c('sl-icon')} aria-hidden="true">02</span><h3>Inclusive growth opportunities</h3><p>Build a broader understanding of workforce and skill-development opportunities.</p></article>
            <article className={[c('sl-value'), c('sl-reveal')].join(' ')} data-reveal><span className={c('sl-icon')} aria-hidden="true">03</span><h3>Stronger workforce planning</h3><p>Examine workforce requirements and support more informed planning decisions.</p></article>
          </div>
        </section>

        <section className={c('sl-section')} aria-labelledby="sl-connected-title"><div className={c('sl-wrap')}>
          <p className={c('sl-eyebrow')}>Why a connected view matters</p><h2 className={c('sl-section-title')} id="sl-connected-title">Better workforce decisions begin with better information.</h2><p className={c('sl-section-intro')}>When information about demand, skills, supply and emerging requirements sits in separate places, it is hard to interpret and harder to act on. SHRAMIK brings these threads into one intelligence workflow.</p>
          <div className={c('sl-contrast-grid')}><article className={[c('sl-contrast-panel'),c('sl-reveal')].join(' ')} data-reveal><h3>Fragmented information</h3><ul className={c('sl-chips')}><li>Demand</li><li>Supply</li><li>Skills</li><li>Emerging needs</li></ul><p>Each question may be answered in isolation, making the wider picture difficult to see.</p></article><article className={[c('sl-contrast-panel'),c('sl-contrast-panel--connected'),c('sl-reveal')].join(' ')} data-reveal><h3>One connected view</h3><ul className={c('sl-chips')}><li>Demand</li><li>Supply</li><li>Skills</li><li>Emerging needs</li></ul><p>Related information can be examined together, supporting clearer planning conversations.</p></article></div>
        </div></section>

        <section className={[c('sl-section'),c('sl-section--muted')].join(' ')} id="sl-capabilities" aria-labelledby="sl-capabilities-title"><div className={c('sl-wrap')}>
          <p className={c('sl-eyebrow')}>Areas of workforce analysis</p><h2 className={c('sl-section-title')} id="sl-capabilities-title">From labour-market signals to actionable intelligence.</h2><p className={c('sl-section-intro')}>The capabilities SHRAMIK is designed to support. Actual availability depends on implementation, data coverage and authorized access.</p>
          <div className={c('sl-card-grid')}>{capabilities.map((item) => <article key={item.title} className={[c('sl-cap-card'),c('sl-reveal')].join(' ')} data-reveal><span className={c('sl-icon')} aria-hidden="true">{item.icon}</span><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
        </div></section>

        <section className={c('sl-section')} id="sl-workflow" aria-labelledby="sl-workflow-title"><div className={c('sl-wrap')}>
          <p className={c('sl-eyebrow')}>The approach</p><h2 className={c('sl-section-title')} id="sl-workflow-title">One connected workflow. Five stages of intelligence.</h2><p className={c('sl-section-intro')}>Select a stage to learn what happens there. The descriptions explain the intended workflow; they do not imply every pipeline step is currently operational.</p>
          <div className={c('sl-workflow')} role="group" aria-label="Select a stage of the SHRAMIK workflow">{stages.map((stage,index)=><button type="button" key={stage.title} className={[c('sl-step'),c('sl-reveal')].join(' ')} data-reveal aria-pressed={activeStage===index} onClick={()=>setActiveStage(index)}><span className={c('sl-step-number')}>{String(index+1).padStart(2,'0')}</span><h3>{stage.title}</h3><p>{stage.short}</p></button>)}</div>
          <div className={c('sl-workflow-detail')} aria-live="polite"><strong>{String(activeStage+1).padStart(2,'0')} · {stages[activeStage].title}</strong><p>{stages[activeStage].detail}</p></div>
        </div></section>

        <section className={[c('sl-section'),c('sl-section--muted')].join(' ')} id="sl-transparency" aria-labelledby="sl-transparency-title"><div className={c('sl-wrap')}>
          <p className={c('sl-eyebrow')}>Trust through transparency</p><h2 className={c('sl-section-title')} id="sl-transparency-title">Understand the evidence behind every insight.</h2><p className={c('sl-section-intro')}>Labour-market intelligence is only as useful as the evidence and assumptions behind it. SHRAMIK's approach should make source coverage, mapping quality and forecast limitations understandable.</p>
          <div className={c('sl-transparency-grid')}>
            {[['↗','Traceable sources','Expose source references and observation periods where they are available and permitted.'],['≡','Transparent methods','Explain how mappings, estimates and skill-gap calculations are produced.'],['±','Visible uncertainty','Communicate forecast uncertainty and limitations without overstating precision.'],['◎','Clear provenance','Distinguish source-backed observations, derived estimates and synthetic demonstration data.']].map(([icon,title,text])=><article key={title} className={[c('sl-transparency-card'),c('sl-reveal')].join(' ')} data-reveal><span className={c('sl-icon')} aria-hidden="true">{icon}</span><h3>{title}</h3><p>{text}</p></article>)}
          </div>
          <p className={c('sl-method-note')}>Results depend on source coverage, data quality, occupation/skill mapping choices and forecasting assumptions. Projections should be interpreted alongside supporting evidence and limitations.</p>
          <div className={c('sl-ctas')}><a className={c('sl-btn')+' '+c('sl-btn--secondary')} href="#sl-preview" onClick={handleAnchorClick}>See platform preview <span aria-hidden="true">→</span></a></div>
        </div></section>

        <section className={c('sl-section')} id="sl-preview" aria-labelledby="sl-preview-title"><div className={c('sl-wrap')}>
          <p className={c('sl-eyebrow')}>Inside the workspace</p><h2 className={c('sl-section-title')} id="sl-preview-title">See the labour market from more than one angle.</h2><p className={c('sl-section-intro')}>Explore an illustrative interface showing how demand trends, supply indicators and skill-gap analysis could appear in a connected workspace.</p>
          <div className={[c('sl-preview'),c('sl-reveal')].join(' ')} data-reveal>
            <div className={c('sl-preview-top')}><i className={c('sl-window-dot')} aria-hidden="true"/><i className={c('sl-window-dot')} aria-hidden="true"/><i className={c('sl-window-dot')} aria-hidden="true"/><span>PLATFORM PREVIEW · ILLUSTRATIVE DATA</span></div>
            <div className={c('sl-preview-body')} id="sl-preview-panel" role="tabpanel" aria-labelledby={'sl-tab-'+previewKey} tabIndex={0}>
              <div className={c('sl-preview-chart')}><div className={c('sl-preview-chart-head')}><span>{preview.title}</span><span>{preview.period}</span></div>
                <svg className={c('sl-chart-svg')} viewBox="0 0 540 190" role="img" aria-label="Illustrative demand and supply trend; no official values" preserveAspectRatio="none"><path className={c('sl-chart-grid')} d="M35 30H520M35 70H520M35 110H520M35 150H520"/><path className={c('sl-chart-forecast')} d="M260 98 L340 72 L420 51 L510 37 L510 150 L260 150Z"/><path className={c('sl-chart-demand')} d={preview.demand}/><path className={c('sl-chart-supply')} d={preview.supply}/></svg>
                <div className={c('sl-chart-legend')}><span><i className={c('sl-legend-dot')+' '+c('sl-legend-dot--navy')}/>Demand</span><span><i className={c('sl-legend-dot')+' '+c('sl-legend-dot--teal')}/>Supply</span><span><i className={c('sl-legend-dash')}/>Illustrative projection</span></div>
              </div>
              <div className={c('sl-preview-metrics')}>{preview.labels.map((label,index)=><article className={c('sl-preview-metric')} key={label}><span>{label}</span><strong>{preview.values[index]}</strong></article>)}</div>
            </div>
            <div className={c('sl-preview-footer')}><div className={c('sl-tabs')} role="tablist" aria-label="Platform preview views">
              {(['overview','gaps','forecasts'] as PreviewKey[]).map((key,index)=><button type="button" role="tab" key={key} id={'sl-tab-'+key} aria-controls="sl-preview-panel" aria-selected={previewKey===key} tabIndex={previewKey===key?0:-1} onClick={()=>setPreviewKey(key)} onKeyDown={(event)=>handleTabKey(event,index)}>{['Overview','Skill gaps','Forecasts'][index]}</button>)}
            </div><p aria-live="polite">{preview.note}</p></div>
          </div>
        </div></section>

        <section className={c('sl-final')} aria-labelledby="sl-final-title"><div className={c('sl-wrap')+' '+c('sl-final-grid')}><div><p className={c('sl-eyebrow')}>SHRAMIK · Labour Market Intelligence System</p><h2 id="sl-final-title">Turn workforce information into informed decisions.</h2><p>Explore a clearer, more connected approach to understanding India's workforce.</p></div><div className={c('sl-final-actions')}><a className={c('sl-btn')+' '+c('sl-btn--primary')} href="/login">Sign in to SHRAMIK <span aria-hidden="true">→</span></a><a className={c('sl-btn')+' '+c('sl-btn--secondary')} href="#sl-transparency" onClick={handleAnchorClick}>Read about transparency</a></div></div></section>
      </main>

      <footer className={c('sl-footer')}><div className={c('sl-wrap')}><div className={c('sl-footer-grid')}><div><a className={c('sl-brand')} href="#sl-top" aria-label="Back to SHRAMIK home" onClick={handleAnchorClick}><span className={c('sl-mark')} aria-hidden="true">S</span><span><span className={c('sl-brand-name')}>SHRAMIK</span><span className={c('sl-brand-sub')}>Labour Market Intelligence System</span></span></a><p className={c('sl-footer-description')}>A decision-support platform concept for examining workforce demand, supply and skill requirements.</p></div><nav aria-label="Footer navigation">{navLinks.map(([label,href])=><a key={href} href={href} onClick={handleAnchorClick}>{label}</a>)}<a href="/login">Sign in</a></nav></div><p className={c('sl-footer-note')}>SHRAMIK is presented here as a platform concept. This page does not claim official government affiliation or display live labour-market data.</p></div></footer>
    </div>
  );
}
