import type { DataQualitySummary } from '../../lib/types/data-quality';

interface Props {
  summary: DataQualitySummary | null;
}

export const SummaryCards: React.FC<Props> = ({ summary }) => {
  const formatNumber = (n: number | null | undefined) => {
    if (n === null || n === undefined) return '—';
    return n.toLocaleString();
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: 'var(--space-4)',
      marginBottom: 'var(--space-6)'
    }}>
      <div style={{
        backgroundColor: 'var(--shramik-surface)',
        border: 'var(--border-default)',
        borderRadius: 'var(--radius-card)',
        padding: 'var(--space-5)',
        boxShadow: 'var(--shadow-subtle)'
      }}>
        <h3 style={{ fontSize: '0.875rem', color: 'var(--shramik-ink-muted)', marginBottom: 'var(--space-2)' }}>
          Records checked
        </h3>
        <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'Barlow Condensed' }}>
          {formatNumber(summary?.records_checked)}
        </div>
      </div>

      <div style={{
        backgroundColor: 'var(--shramik-surface)',
        border: 'var(--border-default)',
        borderRadius: 'var(--radius-card)',
        padding: 'var(--space-5)',
        boxShadow: 'var(--shadow-subtle)'
      }}>
        <h3 style={{ fontSize: '0.875rem', color: 'var(--shramik-ink-muted)', marginBottom: 'var(--space-2)' }}>
          Valid records
        </h3>
        <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'Barlow Condensed' }}>
          {formatNumber(summary?.valid_records)}
        </div>
      </div>

      <div style={{
        backgroundColor: 'var(--shramik-surface)',
        border: 'var(--border-default)',
        borderRadius: 'var(--radius-card)',
        padding: 'var(--space-5)',
        boxShadow: 'var(--shadow-subtle)'
      }}>
        <h3 style={{ fontSize: '0.875rem', color: 'var(--shramik-ink-muted)', marginBottom: 'var(--space-2)' }}>
          Records with findings
        </h3>
        <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'Barlow Condensed' }}>
          {formatNumber(summary?.records_with_findings)}
        </div>
      </div>

      <div style={{
        backgroundColor: 'var(--shramik-surface)',
        border: 'var(--border-default)',
        borderRadius: 'var(--radius-card)',
        padding: 'var(--space-5)',
        boxShadow: 'var(--shadow-subtle)'
      }}>
        <h3 style={{ fontSize: '0.875rem', color: 'var(--shramik-ink-muted)', marginBottom: 'var(--space-2)' }}>
          Open critical issues
        </h3>
        <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'Barlow Condensed' }}>
          {formatNumber(summary?.open_critical_issue_count)}
        </div>
      </div>
    </div>
  );
};
