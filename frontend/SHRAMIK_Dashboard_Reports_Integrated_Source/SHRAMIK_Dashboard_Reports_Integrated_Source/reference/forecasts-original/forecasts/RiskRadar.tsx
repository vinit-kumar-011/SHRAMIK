import React from 'react';

export const RiskRadar: React.FC = () => {
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
        <strong>Mock Mode:</strong> Risk matrix and map data are illustrative
      </div>
      
      <h2>Risk Radar</h2>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr',
        gap: 'var(--space-4)'
      }}>
        <div style={{
          backgroundColor: 'var(--shramik-surface)',
          border: 'var(--border-default)',
          borderRadius: 'var(--radius-card)',
          padding: 'var(--space-5)',
          boxShadow: 'var(--shadow-subtle)'
        }}>
          <h3 style={{ marginBottom: 'var(--space-4)' }}>State/Region Risk Matrix</h3>
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
            Risk matrix visualization (mock)
          </div>
        </div>
        <div style={{
          backgroundColor: 'var(--shramik-surface)',
          border: 'var(--border-default)',
          borderRadius: 'var(--radius-card)',
          padding: 'var(--space-5)',
          boxShadow: 'var(--shadow-subtle)'
        }}>
          <h3 style={{ marginBottom: 'var(--space-4)' }}>Regional Map</h3>
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
            Map visualization (mock)
            <br />
            <small>Uses canonical state codes when real data available</small>
          </div>
        </div>
      </div>
    </div>
  );
};
