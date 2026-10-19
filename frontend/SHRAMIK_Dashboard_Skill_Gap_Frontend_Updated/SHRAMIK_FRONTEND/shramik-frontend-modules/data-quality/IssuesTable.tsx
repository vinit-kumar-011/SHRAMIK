import { useState } from 'react';
import type { ValidationIssue, IssueFilters } from '../../lib/types/data-quality';

interface Props {
  issues: ValidationIssue[];
  filters: IssueFilters;
  onFiltersChange: (filters: IssueFilters) => void;
  onSelectIssue: (issue: ValidationIssue) => void;
}

export const IssuesTable: React.FC<Props> = ({ issues, filters, onFiltersChange, onSelectIssue }) => {
  const [localQuery, setLocalQuery] = useState(filters.query || '');

  const handleSearch = () => {
    onFiltersChange({ ...filters, query: localQuery });
  };

  const resetFilters = () => {
    setLocalQuery('');
    onFiltersChange({ query: '', severity: 'all', status: 'all', dataset_id: '' });
  };

  const getSeverityColor = (sev: string) => {
    if (sev === 'critical') return 'var(--shramik-danger)';
    if (sev === 'high') return 'var(--shramik-orange)';
    if (sev === 'medium') return 'var(--shramik-warning)';
    return 'var(--shramik-ink-muted)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        <input
          type="text"
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          placeholder="Search issues..."
          style={{
            padding: 'var(--space-2) var(--space-3)',
            border: 'var(--border-default)',
            borderRadius: 'var(--radius-control)',
            minWidth: '200px',
            flex: 1
          }}
        />
        <select
          value={filters.severity || 'all'}
          onChange={(e) => onFiltersChange({ ...filters, severity: e.target.value as any })}
          style={{
            padding: 'var(--space-2) var(--space-3)',
            border: 'var(--border-default)',
            borderRadius: 'var(--radius-control)'
          }}
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
          <option value="info">Info</option>
        </select>
        <select
          value={filters.status || 'all'}
          onChange={(e) => onFiltersChange({ ...filters, status: e.target.value as any })}
          style={{
            padding: 'var(--space-2) var(--space-3)',
            border: 'var(--border-default)',
            borderRadius: 'var(--radius-control)'
          }}
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="in_review">In Review</option>
          <option value="resolved">Resolved</option>
          <option value="suppressed">Suppressed</option>
        </select>
        <button
          onClick={handleSearch}
          style={{
            padding: 'var(--space-2) var(--space-4)',
            backgroundColor: 'var(--shramik-yellow)',
            border: 'var(--border-default)',
            borderRadius: 'var(--radius-control)',
            boxShadow: 'var(--shadow-offset)',
            cursor: 'pointer'
          }}
        >
          Search
        </button>
        <button
          onClick={resetFilters}
          style={{
            padding: 'var(--space-2) var(--space-4)',
            backgroundColor: 'var(--shramik-surface)',
            border: 'var(--border-default)',
            borderRadius: 'var(--radius-control)',
            cursor: 'pointer'
          }}
        >
          Reset
        </button>
      </div>

      <div style={{
        backgroundColor: 'var(--shramik-surface)',
        border: 'var(--border-default)',
        borderRadius: 'var(--radius-card)',
        overflowX: 'auto'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--shramik-surface-muted)' }}>
              <th style={{ padding: 'var(--space-3)', textAlign: 'left', borderBottom: 'var(--border-default)', fontSize: '0.875rem' }}>Issue</th>
              <th style={{ padding: 'var(--space-3)', textAlign: 'left', borderBottom: 'var(--border-default)', fontSize: '0.875rem' }}>Dataset</th>
              <th style={{ padding: 'var(--space-3)', textAlign: 'left', borderBottom: 'var(--border-default)', fontSize: '0.875rem' }}>Rule</th>
              <th style={{ padding: 'var(--space-3)', textAlign: 'left', borderBottom: 'var(--border-default)', fontSize: '0.875rem' }}>Severity</th>
              <th style={{ padding: 'var(--space-3)', textAlign: 'left', borderBottom: 'var(--border-default)', fontSize: '0.875rem' }}>Affected</th>
              <th style={{ padding: 'var(--space-3)', textAlign: 'left', borderBottom: 'var(--border-default)', fontSize: '0.875rem' }}>Status</th>
              <th style={{ padding: 'var(--space-3)', textAlign: 'left', borderBottom: 'var(--border-default)', fontSize: '0.875rem' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {issues.map((issue) => (
              <tr key={issue.issue_id} style={{ borderBottom: 'var(--border-muted)' }}>
                <td style={{ padding: 'var(--space-3)', fontSize: '0.875rem' }}>
                  <div style={{ fontWeight: 600 }}>{issue.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--shramik-ink-muted)' }}>{issue.field_names?.join(', ')}</div>
                </td>
                <td style={{ padding: 'var(--space-3)', fontSize: '0.875rem' }}>{issue.dataset_label}</td>
                <td style={{ padding: 'var(--space-3)', fontSize: '0.875rem' }}>{issue.rule_id} {issue.rule_name ? `(${issue.rule_name})` : ''}</td>
                <td style={{ padding: 'var(--space-3)', fontSize: '0.875rem', color: getSeverityColor(issue.severity) }}>
                  {issue.severity.toUpperCase()}
                </td>
                <td style={{ padding: 'var(--space-3)', fontSize: '0.875rem' }}>{issue.affected_records?.toLocaleString() || '—'}</td>
                <td style={{ padding: 'var(--space-3)', fontSize: '0.875rem' }}>{issue.status}</td>
                <td style={{ padding: 'var(--space-3)' }}>
                  <button
                    onClick={() => onSelectIssue(issue)}
                    style={{
                      padding: 'var(--space-1) var(--space-3)',
                      backgroundColor: 'var(--shramik-surface)',
                      border: 'var(--border-default)',
                      borderRadius: 'var(--radius-control)',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
            {issues.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--shramik-ink-muted)' }}>
                  No issues found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
