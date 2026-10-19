import React from 'react';

export const ScenarioAnalysis: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ 
        padding: 'var(--space-3) var(--space-4)', 
        backgroundColor: 'var(--shramik-surface-muted)',
        border: 'var(--border-default)',
        borderRadius: 'var(--radius-control)',
        fontSize: '0.75rem',
        color: 'var(--shramik-ink-muted)'
      }}>
        <strong>Mock Mode:</strong> Scenarios are conditional, not predictions
      </div>
      
      <h2>Scenario Analysis</h2>
      <p style={{ color: 'var(--shramik-ink-muted)' }}>Compare Baseline, Higher Growth, and Lower Growth scenarios</p>
      
      <div style={{
        backgroundColor: 'var(--shramik-surface)',
        border: 'var(--border-default)',
        borderRadius: 'var(--radius-card)',
        padding: 'var(--space-5)',
        boxShadow: 'var(--shadow-subtle)'
      }}>
        <h3 style={{ marginBottom: 'var(--space-4)' }}>Scenario Comparison</h3>
        <div style={{ 
          height: '250px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--shramik-surface-muted)',
          borderRadius: 'var(--radius-control)',
          color: 'var(--shramik-ink-muted)',
          fontSize: '0.875rem'
        }}>
          Scenario comparison chart (mock)
          <br />
          <small>Conditional scenarios - not guaranteed predictions</small>
        </div>
      </div>
    </div>
  );
};
