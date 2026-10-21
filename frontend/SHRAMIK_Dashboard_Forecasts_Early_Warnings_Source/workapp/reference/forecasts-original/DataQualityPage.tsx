import { useState, useEffect } from 'react';
import type { DataQualitySummary, IssueFilters, ValidationIssue } from '../lib/types/data-quality';
import { createDataQualityAdapter } from '../lib/adapters/data-quality/factory';
import { SummaryCards } from '../components/data-quality/SummaryCards';
import { IssuesTable } from '../components/data-quality/IssuesTable';
import { IssueDrawer } from '../components/data-quality/IssueDrawer';
import { ValidationRuns } from '../components/data-quality/ValidationRuns';
import { RulesList } from '../components/data-quality/RulesList';

const adapter = createDataQualityAdapter();

type View = 'issues' | 'runs' | 'rules';

export const DataQualityPage: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('issues');
  const [summary, setSummary] = useState<DataQualitySummary | null>(null);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [filters, setFilters] = useState<IssueFilters>({ severity: 'all', status: 'all' });
  const [selectedIssue, setSelectedIssue] = useState<ValidationIssue | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [summaryRes, issuesRes] = await Promise.all([
          adapter.getSummary(),
          adapter.listIssues(filters)
        ]);
        if (summaryRes.state === 'available') {
          setSummary(summaryRes.data);
        }
        if (issuesRes.state === 'available') {
          setIssues(issuesRes.data.items);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [filters]);

  const views: { key: View; label: string }[] = [
    { key: 'issues', label: 'Validation Issues' },
    { key: 'runs', label: 'Validation Runs' },
    { key: 'rules', label: 'Rules & Checks' }
  ];

  return (
    <div style={{ backgroundColor: 'var(--shramik-canvas)', minHeight: '100vh', padding: 'var(--space-6)' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', marginBottom: 'var(--space-2)' }}>
            DATA QUALITY & VALIDATION
          </h1>
          <p style={{ color: 'var(--shramik-ink-muted)' }}>
            Investigate validation findings and understand the reliability, completeness and consistency of data used in SHRAMIK.
          </p>
          <div style={{ 
            marginTop: 'var(--space-4)',
            padding: 'var(--space-3) var(--space-4)', 
            backgroundColor: 'var(--shramik-surface-muted)',
            border: 'var(--border-default)',
            borderRadius: 'var(--radius-control)',
            fontSize: '0.75rem',
            color: 'var(--shramik-ink-muted)'
          }}>
            <strong>Prototype preview · Synthetic demo data · No live validation run is represented.</strong>
          </div>
        </div>

        <SummaryCards summary={summary} />

        <div style={{ 
          backgroundColor: 'var(--shramik-surface)',
          border: 'var(--border-default)',
          borderRadius: 'var(--radius-card)',
          padding: 'var(--space-4)',
          marginBottom: 'var(--space-6)',
          boxShadow: 'var(--shadow-subtle)'
        }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {views.map((view) => (
              <button
                key={view.key}
                onClick={() => setActiveView(view.key)}
                style={{
                  padding: 'var(--space-3) var(--space-6)',
                  backgroundColor: activeView === view.key ? 'var(--shramik-yellow)' : 'var(--shramik-surface)',
                  border: 'var(--border-default)',
                  borderRadius: 'var(--radius-control)',
                  fontWeight: activeView === view.key ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                  boxShadow: activeView === view.key ? 'var(--shadow-offset)' : 'none'
                }}
              >
                {view.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          {activeView === 'issues' && (
            loading ? (
              <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--shramik-ink-muted)' }}>Loading issues...</div>
            ) : (
              <IssuesTable
                issues={issues}
                filters={filters}
                onFiltersChange={setFilters}
                onSelectIssue={setSelectedIssue}
              />
            )
          )}
          {activeView === 'runs' && <ValidationRuns />}
          {activeView === 'rules' && <RulesList />}
        </div>

        <IssueDrawer issue={selectedIssue} onClose={() => setSelectedIssue(null)} />
      </div>
    </div>
  );
};

export default DataQualityPage;
