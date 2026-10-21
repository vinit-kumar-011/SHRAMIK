import React, { useEffect, useState } from 'react';
import type { ForecastFilters, MetricValue, ForecastSeriesResponse, EarlyWarning } from '../../lib/types/forecasts';
import { createForecastsAdapter } from '../../lib/adapters/forecastAdapterFactory';

const adapter = createForecastsAdapter();

interface Props {
  filters: ForecastFilters;
}

export const ForecastOverview: React.FC<Props> = ({ filters }) => {
  const [overview, setOverview] = useState<{ kpis: MetricValue[] } | null>(null);
  const [series, setSeries] = useState<ForecastSeriesResponse | null>(null);
  const [warnings, setWarnings] = useState<{ items: EarlyWarning[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [overviewRes, seriesRes, warningsRes] = await Promise.all([
          adapter.getOverview(filters),
          adapter.getSeries(filters, 'total'),
          adapter.getWarnings(filters)
        ]);
        setOverview(overviewRes);
        setSeries(seriesRes);
        setWarnings(warningsRes);
      } catch (error) {
        console.error('Error loading overview data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [filters]);

  const getGapLabel = (gap: number | null) => {
    if (gap === null) return 'N/A';
    return gap >= 0 ? `Shortage: ${Math.abs(gap).toLocaleString()}` : `Surplus: ${Math.abs(gap).toLocaleString()}`;
  };

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--shramik-ink-muted)' }}>
        Loading forecast data...
      </div>
    );
  }

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
        <strong>Mock Mode:</strong> Data is illustrative only and labeled with provenance
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: 'var(--space-4)'
      }}>
        {overview?.kpis.map((kpi) => (
          <div key={kpi.key} style={{
            backgroundColor: 'var(--shramik-surface)',
            border: 'var(--border-default)',
            borderRadius: 'var(--radius-card)',
            padding: 'var(--space-5)',
            boxShadow: 'var(--shadow-subtle)'
          }}>
            <h3 style={{ fontSize: '0.875rem', color: 'var(--shramik-ink-muted)', marginBottom: 'var(--space-2)' }}>
              {kpi.label}
            </h3>
            <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'Barlow Condensed', marginBottom: 'var(--space-2)' }}>
              {kpi.formattedValue || kpi.value?.toLocaleString() || 'N/A'}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--shramik-ink-muted)' }}>
              {kpi.unit} • {kpi.period}
              {kpi.key === 'projectedGap' && kpi.value !== null && (
                <div style={{ marginTop: 'var(--space-1)', color: kpi.value >= 0 ? 'var(--shramik-orange)' : 'var(--shramik-teal)' }}>
                  {getGapLabel(kpi.value)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '2fr 1fr',
        gap: 'var(--space-4)'
      }}>
        <div style={{
          backgroundColor: 'var(--shramik-surface)',
          border: 'var(--border-default)',
          borderRadius: 'var(--radius-card)',
          padding: 'var(--space-5)',
          boxShadow: 'var(--shadow-subtle)'
        }}>
          <h3 style={{ marginBottom: 'var(--space-4)' }}>Demand & Supply Forecast</h3>
          <div style={{ 
            height: '300px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--shramik-surface-muted)',
            borderRadius: 'var(--radius-control)',
            color: 'var(--shramik-ink-muted)',
            fontSize: '0.875rem',
            textAlign: 'center'
          }}>
            Historical vs Forecast Chart ({series?.points.length || 0} data points)
            <br />
            <small>Historical segments solid, forecast segments dashed (mock data)</small>
          </div>
        </div>

        <div style={{
          backgroundColor: 'var(--shramik-surface)',
          border: 'var(--border-default)',
          borderRadius: 'var(--radius-card)',
          padding: 'var(--space-5)',
          boxShadow: 'var(--shadow-subtle)'
        }}>
          <h3 style={{ marginBottom: 'var(--space-4)' }}>Early Warning Alerts</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {warnings?.items.map((warning) => (
              <div key={warning.id} style={{
                padding: 'var(--space-3)',
                backgroundColor: 'var(--shramik-surface-muted)',
                border: 'var(--border-default)',
                borderRadius: 'var(--radius-control)',
                borderLeft: `3px solid var(--shramik-orange)`
              }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 'var(--space-1)' }}>
                  {warning.title}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--shramik-ink-muted)' }}>
                  Severity: {warning.severity} • Status: {warning.status}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--shramik-ink-muted)' }}>
                  Expected: {warning.expectedHorizon.startYear}-{warning.expectedHorizon.endYear}
                </div>
              </div>
            ))}
            {(!warnings?.items || warnings.items.length === 0) && (
              <div style={{ color: 'var(--shramik-ink-muted)', fontSize: '0.875rem', textAlign: 'center', padding: 'var(--space-4)' }}>
                No active warnings
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
