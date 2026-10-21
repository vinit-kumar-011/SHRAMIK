import type { ValidationIssue } from '../../lib/types/data-quality';

interface Props {
  issue: ValidationIssue | null;
  onClose: () => void;
}

export const IssueDrawer: React.FC<Props> = ({ issue, onClose }) => {
  if (!issue) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 1000,
      display: 'flex',
      justifyContent: 'flex-end'
    }}>
      <div style={{
        backgroundColor: 'var(--shramik-surface)',
        width: '100%',
        maxWidth: '600px',
        height: '100vh',
        overflowY: 'auto',
        padding: 'var(--space-6)',
        borderLeft: 'var(--border-default)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
          <h2>{issue.title}</h2>
          <button
            onClick={onClose}
            style={{
              padding: 'var(--space-2) var(--space-4)',
              backgroundColor: 'var(--shramik-surface)',
              border: 'var(--border-default)',
              borderRadius: 'var(--radius-control)',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <section>
            <h3 style={{ marginBottom: 'var(--space-2)', fontSize: '1.125rem' }}>Details</h3>
            <div style={{ backgroundColor: 'var(--shramik-surface-muted)', padding: 'var(--space-4)', borderRadius: 'var(--radius-card)' }}>
              <p style={{ marginBottom: 'var(--space-2)' }}><strong>Description:</strong> {issue.description || 'N/A'}</p>
              <p style={{ marginBottom: 'var(--space-2)' }}><strong>Dataset:</strong> {issue.dataset_label}</p>
              <p style={{ marginBottom: 'var(--space-2)' }}><strong>Rule:</strong> {issue.rule_id} {issue.rule_name ? `- ${issue.rule_name}` : ''}</p>
              <p style={{ marginBottom: 'var(--space-2)' }}><strong>Severity:</strong> {issue.severity}</p>
              <p style={{ marginBottom: 'var(--space-2)' }}><strong>Status:</strong> {issue.status}</p>
              <p style={{ marginBottom: 'var(--space-2)' }}><strong>Affected Records:</strong> {issue.affected_records?.toLocaleString() || '—'}</p>
              <p style={{ marginBottom: 'var(--space-2)' }}><strong>Fields:</strong> {issue.field_names?.join(', ') || 'N/A'}</p>
              <p style={{ marginBottom: 'var(--space-2)' }}><strong>Provenance:</strong> {issue.provenance_state}</p>
            </div>
          </section>

          <section>
            <h3 style={{ marginBottom: 'var(--space-2)', fontSize: '1.125rem' }}>Suggested Diagnostic Steps</h3>
            <div style={{ backgroundColor: 'var(--shramik-surface-muted)', padding: 'var(--space-4)', borderRadius: 'var(--radius-card)' }}>
              {issue.suggested_steps && issue.suggested_steps.length > 0 ? (
                <ul style={{ paddingLeft: 'var(--space-6)', margin: 0 }}>
                  {issue.suggested_steps.map((step, i) => (
                    <li key={i} style={{ marginBottom: 'var(--space-1)' }}>{step}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: 'var(--shramik-ink-muted)', margin: 0 }}>No suggested steps available.</p>
              )}
            </div>
          </section>

          <section>
            <h3 style={{ marginBottom: 'var(--space-2)', fontSize: '1.125rem' }}>Affected Records</h3>
            <div style={{ backgroundColor: 'var(--shramik-surface-muted)', padding: 'var(--space-4)', borderRadius: 'var(--radius-card)' }}>
              <p style={{ color: 'var(--shramik-ink-muted)', margin: 0 }}>
                Affected record samples not available in demo fixture
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
