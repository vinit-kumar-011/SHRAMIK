import type { ReportBlock, ReportDocumentModel, ReportMetric, ReportSection } from './types';

const fmt = (metric: ReportMetric) => metric.value == null ? 'Not available' : metric.formattedValue ?? new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(metric.value);
const displayDate = (value?: string | null) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }).format(parsed);
};
const numberLabel = (value: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(value);

function MetricGrid({ metrics }: { metrics: ReportMetric[] }) {
  return <div className="rd-metric-grid">{metrics.map((metric) => <article className="rd-metric" key={metric.key}>
    <span className="rd-metric-label">{metric.label}</span>
    <strong>{fmt(metric)}</strong>
    <span className="rd-metric-unit">{metric.unit}{metric.period ? ` · ${metric.period}` : ''}</span>
    <span className={`rd-provenance rd-prov-${metric.provenance.toLowerCase()}`}>{metric.provenance.replaceAll('_', ' ')}</span>
    {metric.note && <p>{metric.note}</p>}
    {metric.value == null && <small className="rd-null-note">A missing value is not zero.</small>}
  </article>)}</div>;
}

function ChartBlock({ block }: { block: Extract<ReportBlock, { kind: 'chart' }> }) {
  const allValues = block.series.flatMap((series) => series.points.map((point) => point.y).filter((value): value is number => value != null));
  if (!allValues.length) return <div className="rd-unavailable"><strong>{block.title}</strong><p>No chart values are available for this report snapshot. Missing observations are not plotted as zero.</p></div>;
  const width = 720, height = 270, left = 56, right = 24, top = 18, bottom = 42;
  const min = Math.min(0, ...allValues), max = Math.max(1, ...allValues), range = max - min || 1;
  const colors = ['#203A5B', '#20A89C', '#EB791D', '#8B5E3C'];
  const longest = Math.max(...block.series.map((series) => series.points.length), 1);
  const xAt = (index: number) => left + (longest <= 1 ? 0 : (index / (longest - 1)) * (width - left - right));
  const yAt = (value: number) => top + ((max - value) / range) * (height - top - bottom);
  const ticks = Array.from({ length: 5 }, (_, index) => min + (range * index / 4));
  return <div className="rd-chart-wrap">
    <svg className="rd-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${block.title}. ${block.yLabel ?? 'Value'} measured in ${block.unit ?? 'units'}. Exact points are available in the accompanying data table.`}>
      {ticks.map((tick) => <g key={tick}><line x1={left} y1={yAt(tick)} x2={width - right} y2={yAt(tick)} stroke="#D8D6CD" strokeDasharray="3 4"/><text x={left - 9} y={yAt(tick) + 4} textAnchor="end" className="rd-axis-label">{numberLabel(tick)}</text></g>)}
      {block.series.map((series, seriesIndex) => {
        const segments: Array<Array<{ x: number; y: number }>> = [];
        let current: Array<{ x: number; y: number }> = [];
        series.points.forEach((point, index) => {
          if (point.y == null) { if (current.length) segments.push(current); current = []; return; }
          current.push({ x: xAt(index), y: yAt(point.y) });
        });
        if (current.length) segments.push(current);
        return <g key={series.name}>
          {segments.map((segment, segmentIndex) => <g key={segmentIndex}>
            {segment.length > 1 && <polyline points={segment.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke={colors[seriesIndex % colors.length]} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>}
            {segment.map((point, index) => <circle key={`${point.x}-${index}`} cx={point.x} cy={point.y} r="4" fill={colors[seriesIndex % colors.length]} stroke="#FFFEFA" strokeWidth="1.5"/>)}
          </g>)}
        </g>;
      })}
      {longest <= 9 && (block.series[0]?.points ?? []).map((point, index) => <text key={`${point.x}-${index}`} x={xAt(index)} y={height - 18} textAnchor="middle" className="rd-axis-label">{String(point.x).slice(0, 12)}</text>)}
      <text x={left} y={12} className="rd-axis-title">{block.yLabel ?? block.unit ?? 'Value'}</text>
      <text x={width - right} y={height - 2} textAnchor="end" className="rd-axis-title">{block.xLabel ?? 'Period'}</text>
    </svg>
    <div className="rd-legend">{block.series.map((series, index) => <span key={series.name}><i style={{ backgroundColor: colors[index % colors.length] }}/>{series.name}</span>)}</div>
    {block.caption && <p className="rd-caption">{block.caption}</p>}
    <details className="rd-chart-data"><summary>View exact chart values</summary><div className="rd-table-wrap"><table><thead><tr><th>Series</th><th>{block.xLabel ?? 'Period'}</th><th>{block.yLabel ?? 'Value'}{block.unit ? ` (${block.unit})` : ''}</th></tr></thead><tbody>{block.series.flatMap((series) => series.points.map((point, index) => <tr key={`${series.name}-${index}`}><td>{series.name}</td><td>{String(point.x)}</td><td>{point.y == null ? 'Not available' : numberLabel(point.y)}</td></tr>))}</tbody></table></div></details>
  </div>;
}

function TableBlock({ block }: { block: Extract<ReportBlock, { kind: 'table' }> }) {
  return <div className="rd-table-section"><h3>{block.title}</h3><div className="rd-table-wrap"><table><thead><tr>{block.columns.map((column) => <th key={column.key}>{column.label}{column.unit ? <small>({column.unit})</small> : null}</th>)}</tr></thead><tbody>
    {block.rows.length ? block.rows.map((row) => <tr key={row.id}>{block.columns.map((column) => <td key={column.key}>{row.cells[column.key] == null ? <span className="rd-null">Not available</span> : String(row.cells[column.key])}</td>)}</tr>) : <tr><td colSpan={block.columns.length}>No rows are available for this section.</td></tr>}
  </tbody></table></div>{block.caption && <p className="rd-caption">{block.caption}</p>}</div>;
}

function BlockRenderer({ block }: { block: ReportBlock }) {
  switch (block.kind) {
    case 'paragraph': return <p className="rd-paragraph">{block.text}</p>;
    case 'finding': return <article className="rd-finding"><span>FINDING</span><h3>{block.title}</h3><p>{block.text}</p>{block.evidenceRefs?.length ? <small>Evidence references: {block.evidenceRefs.join(', ')}</small> : null}</article>;
    case 'metric_grid': return <MetricGrid metrics={block.metrics}/>;
    case 'chart': return <><h3 className="rd-block-title">{block.title}</h3><ChartBlock block={block}/></>;
    case 'table': return <TableBlock block={block}/>;
    case 'map': return <div className="rd-unavailable"><strong>{block.title}</strong><p>A map is not rendered because this report does not include verified geography geometry for <code>{block.geometryKey}</code>. Values and missing records are kept separate; no decorative map is presented as measured data.</p><div className="rd-table-wrap"><table><thead><tr><th>Geography code</th><th>{block.metricLabel}</th></tr></thead><tbody>{Object.entries(block.valuesByGeographyId).map(([id, value]) => <tr key={id}><td>{id}</td><td>{value == null ? 'Not available' : numberLabel(value)}</td></tr>)}</tbody></table></div></div>;
    case 'callout': return <aside className={`rd-callout rd-callout-${block.tone}`}><strong>{block.title}</strong><p>{block.text}</p></aside>;
    case 'source_list': return <div className="rd-sources">{block.sources.length ? block.sources.map((source, index) => <article key={`${source.name}-${index}`}><strong>{source.name}</strong><span>{[source.datasetVersion, source.observationPeriod, source.asOfDate ? `As of ${source.asOfDate}` : undefined].filter(Boolean).join(' · ') || 'Version / observation period not supplied'}</span>{source.notes && <p>{source.notes}</p>}</article>) : <p>Source metadata has not been supplied for this report snapshot.</p>}</div>;
    case 'methodology': return <div className="rd-method"><h3>{block.title}</h3>{block.version && <span>Method version: {block.version}</span>}<p>{block.text}</p></div>;
    case 'unavailable': return <div className="rd-unavailable"><strong>Section data unavailable</strong><p>{block.reason}</p>{block.nextStep && <small>{block.nextStep}</small>}</div>;
    default: return null;
  }
}

function Section({ section, index, onSectionNav }: { section: ReportSection; index: number; onSectionNav?: (key: string) => void }) {
  return <section id={`report-section-${section.key}`} className="rd-section">
    <div className="rd-section-kicker">SECTION {String(index + 1).padStart(2, '0')} <span className={`rd-section-status status-${section.status.toLowerCase()}`}>{section.status}</span></div>
    <h2>{section.title}</h2>
    {section.blocks.length ? section.blocks.map((block, i) => <BlockRenderer key={`${section.key}-${block.kind}-${i}`} block={block}/>) : <div className="rd-unavailable"><strong>No section content supplied</strong><p>This section is included in the structure, but the snapshot contains no content blocks.</p></div>}
    {onSectionNav && <button className="rd-back-top no-print" onClick={() => onSectionNav('top')} type="button">Back to report top ↑</button>}
  </section>;
}

export function ReportDocument({ document, onSectionNav }: { document: ReportDocumentModel; onSectionNav?: (key: string) => void }) {
  const typeName: Record<ReportDocumentModel['reportType'], string> = { STATE: 'State Report', SECTOR: 'Sector Report', SKILL: 'Skill Report', POLICY_BRIEF: 'Policy Brief', CUSTOM: 'Custom Report' };
  const createdLabel = displayDate(document.createdAt);
  const provenanceLabel = document.provenance === 'SYNTHETIC_DEMO' ? 'ILLUSTRATIVE — SYNTHETIC DEMO DATA' : document.provenance.replaceAll('_', ' ');
  return <article className="report-document" aria-label={`Report document: ${document.title}`} id="report-document">
    <div className="rd-cover" id="report-top">
      <div className="rd-cover-brand"><span className="rd-cover-mark">SH</span><span>RAMIK <small>LABOUR MARKET INTELLIGENCE</small></span></div>
      <div className="rd-cover-rule"/>
      <p className="rd-cover-type">{typeName[document.reportType]} <span>•</span> REPORT SNAPSHOT v{document.version ?? 1}</p>
      <h1>{document.title}</h1>
      <div className="rd-cover-scope"><div><small>GEOGRAPHY / SCOPE</small><strong>{document.geographyLabels.join(', ') || 'Scope not supplied'}</strong></div><div><small>REPORTING PERIOD</small><strong>{document.period.label || `${document.period.start || 'Start not supplied'} – ${document.period.end || 'End not supplied'}`}</strong></div>{document.referenceYear !== undefined && <div><small>REFERENCE YEAR</small><strong>{document.referenceYear}</strong></div>}{createdLabel && <div><small>GENERATED</small><strong>{createdLabel}</strong></div>}</div>
      <div className="rd-cover-foot"><span>{provenanceLabel}</span><span>Template {document.templateVersion}</span></div>
      <p className="rd-cover-note">An evidence-oriented workforce intelligence document. No agency endorsement is implied.</p>
    </div>
    <div className="rd-document-meta"><span>REPORT ID <strong>{document.id}</strong></span><span>PROVENANCE <strong>{provenanceLabel}</strong></span><span>SOURCE SNAPSHOTS <strong>{document.metadata.sourceSnapshotIds.length ? document.metadata.sourceSnapshotIds.join(', ') : 'Not supplied'}</strong></span></div>
    <div className="rd-document-body">
      {document.sections.map((section, index) => <Section key={section.key} section={section} index={index} onSectionNav={onSectionNav}/>) }
      <section className="rd-limitations" id="report-limitations"><div className="rd-section-kicker">REPORT NOTES</div><h2>Sources, coverage & limitations</h2>
        <div className="rd-sources-summary"><strong>Source labels</strong><p>{document.metadata.sourceLabels.length ? document.metadata.sourceLabels.join(' · ') : 'No source labels supplied.'}</p>{document.metadata.methodologyVersion && <p><strong>Methodology version:</strong> {document.metadata.methodologyVersion}</p>}</div>
        <ul>{document.metadata.limitations.map((limitation, index) => <li key={`${limitation}-${index}`}>{limitation}</li>)}</ul>
        {document.metadata.generatedByLabel && <p className="rd-generated-label">{document.metadata.generatedByLabel}</p>}
      </section>
    </div>
  </article>;
}
