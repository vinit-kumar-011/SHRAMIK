import React, { useState } from 'react';
import type { ForecastFilters } from '../lib/types/forecasts';
import { ForecastOverview } from '../components/forecasts/ForecastOverview';
import { RiskRadar } from '../components/forecasts/RiskRadar';
import { ScenarioAnalysis } from '../components/forecasts/ScenarioAnalysis';
import { ModelPerformance } from '../components/forecasts/ModelPerformance';
import { AlertManagement } from '../components/forecasts/AlertManagement';

type View = 'overview' | 'risk-radar' | 'scenario-analysis' | 'model-performance' | 'alert-management';

export const ForecastsPage: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('overview');
  const [filters] = useState<ForecastFilters>({
    horizonYears: 5,
    geographyCode: 'IN'
  });

  const views: { key: View; label: string }[] = [
    { key: 'overview', label: 'Forecast Overview' },
    { key: 'risk-radar', label: 'Risk Radar' },
    { key: 'scenario-analysis', label: 'Scenario Analysis' },
    { key: 'model-performance', label: 'Model Performance' },
    { key: 'alert-management', label: 'Alert Management' }
  ];

  return (
    <div style={{ backgroundColor: 'var(--shramik-canvas)', minHeight: '100vh', padding: 'var(--space-6)' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', marginBottom: 'var(--space-2)' }}>
            FORECASTS & EARLY WARNINGS
          </h1>
          <p style={{ color: 'var(--shramik-ink-muted)' }}>
            Detect → Explain → Investigate → Compare → Act
          </p>
        </div>

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

        <div style={{ 
          backgroundColor: 'var(--shramik-surface)',
          border: 'var(--border-default)',
          borderRadius: 'var(--radius-card)',
          padding: 'var(--space-6)',
          minHeight: '400px'
        }}>
          {activeView === 'overview' && <ForecastOverview filters={filters} />}
          {activeView === 'risk-radar' && <RiskRadar />}
          {activeView === 'scenario-analysis' && <ScenarioAnalysis />}
          {activeView === 'model-performance' && <ModelPerformance />}
          {activeView === 'alert-management' && <AlertManagement />}
        </div>
      </div>
    </div>
  );
};

export default ForecastsPage;
