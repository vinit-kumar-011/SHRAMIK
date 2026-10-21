import React from 'react';

export const AlertManagement: React.FC = () => {
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
        <strong>Mock Mode:</strong> Alert data is illustrative only
      </div>
      
      <h2>Alert Management</h2>
      <p style={{ color: 'var(--shramik-ink-muted)' }}>Manage and track forecast alerts and warnings</p>
      
      <div style={{
        backgroundColor: 'var(--shramik-surface)',
        border: 'var(--border-default)',
        borderRadius: 'var(--radius-card)',
        padding: 'var(--space-5)',
        boxShadow: 'var(--shadow-subtle)'
      }}>
        <h3 style={{ marginBottom: 'var(--space-4)' }}>Alerts Table</h3>
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
          Alert management table (mock)
        </div>
      </div>
    </div>
  );
};
