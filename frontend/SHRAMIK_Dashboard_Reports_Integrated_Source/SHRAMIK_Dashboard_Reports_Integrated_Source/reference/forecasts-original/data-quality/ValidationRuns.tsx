import { useEffect, useState } from 'react';
import { createDataQualityAdapter } from '../../lib/adapters/data-quality/factory';
import type { ValidationRun } from '../../lib/types/data-quality';

const adapter = createDataQualityAdapter();

export const ValidationRuns: React.FC = () => {
  const [runs, setRuns] = useState<ValidationRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRuns = async () => {
      setLoading(true);
      try {
        const result = await adapter.listRuns();
        if (result.state === 'available') {
          setRuns(result.data.items);
        }
      } catch (error) {
        console.error('Error loading runs:', error);
      } finally {
        setLoading(false);
      }
    };
    loadRuns();
  }, []);

  if (loading) {
    return <div style={{ color: 'var(--shramik-ink-muted)', padding: 'var(--space-8)' }}>Loading runs...</div>;
  }

  return (
    <div style={{
      backgroundColor: 'var(--shramik-surface)',
      border: 'var(--border-default)',
      borderRadius: 'var(--radius-card)',
      overflowX: 'auto'
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: 'var(--shramik-surface-muted)' }}>
            <th style={{ padding: 'var(--space-3)', textAlign: 'left', borderBottom: 'var(--border-default)', fontSize: '0.875rem' }}>Run ID</th>
            <th style={{ padding: 'var(--space-3)', textAlign: 'left', borderBottom: 'var(--border-default)', fontSize: '0.875rem' }}>Dataset</th>
            <th style={{ padding: 'var(--space-3)', textAlign: 'left', borderBottom: 'var(--border-default)', fontSize: '0.875rem' }}>Status</th>
            <th style={{ padding: 'var(--space-3)', textAlign: 'left', borderBottom: 'var(--border-default)', fontSize: '0.875rem' }}>Records Checked</th>
            <th style={{ padding: 'var(--space-3)', textAlign: 'left', borderBottom: 'var(--border-default)', fontSize: '0.875rem' }}>Completed</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.run_id} style={{ borderBottom: 'var(--border-muted)' }}>
              <td style={{ padding: 'var(--space-3)', fontSize: '0.875rem' }}>{run.run_id}</td>
              <td style={{ padding: 'var(--space-3)', fontSize: '0.875rem' }}>{run.dataset_label}</td>
              <td style={{ padding: 'var(--space-3)', fontSize: '0.875rem' }}>{run.status}</td>
              <td style={{ padding: 'var(--space-3)', fontSize: '0.875rem' }}>{run.records_checked?.toLocaleString() || '—'}</td>
              <td style={{ padding: 'var(--space-3)', fontSize: '0.875rem' }}>{run.completed_at || '—'}</td>
            </tr>
          ))}
          {runs.length === 0 && (
            <tr>
              <td colSpan={5} style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--shramik-ink-muted)' }}>
                No validation runs available.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
