import React from 'react';

export const ModelPerformance: React.FC = () => {
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
        <strong>Mock Mode:</strong> Performance metrics are historical evidence only
      </div>
      
      <h2>Model Performance</h2>
      <p style={{ color: 'var(--shramik-ink-muted)' }}>Backtesting and data history coverage</p>
      
      <div style={{
        backgroundColor: 'var(--shramik-surface)',
        border: 'var(--border-default)',
        borderRadius: 'var(--radius-card)',
        padding: 'var(--space-5)',
        boxShadow: 'var(--shadow-subtle)'
      }}>
        <h3 style={{ marginBottom: 'var(--space-4)' }}>Actual vs Predicted</h3>
        <div style={{ 
          height: '200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--shramik-surface-muted)',
          borderRadius: 'var(--radius-control)',
          color: 'var(--shramik-ink-muted)',
          fontSize: '0.875rem'
        }}>
          Actual vs Predicted chart (mock)
        </div>
      </div>
    </div>
  );
};
