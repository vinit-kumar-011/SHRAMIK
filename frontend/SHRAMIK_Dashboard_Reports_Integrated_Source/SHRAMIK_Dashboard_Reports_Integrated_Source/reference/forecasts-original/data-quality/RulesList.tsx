import { useEffect, useState } from 'react';
import { createDataQualityAdapter } from '../../lib/adapters/data-quality/factory';

const adapter = createDataQualityAdapter();

export const RulesList: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRules = async () => {
      setLoading(true);
      try {
        const result = await adapter.listRules();
        if (result.state === 'not_available') {
          setError(result.reason);
        }
      } catch (e) {
        setError('Failed to load rules');
      } finally {
        setLoading(false);
      }
    };
    loadRules();
  }, []);

  if (loading) {
    return <div style={{ color: 'var(--shramik-ink-muted)', padding: 'var(--space-8)' }}>Loading rules...</div>;
  }

  if (error) {
    return <div style={{ padding: 'var(--space-8)', color: 'var(--shramik-ink-muted)' }}>{error}</div>;
  }

  return (
    <div style={{ padding: 'var(--space-8)', color: 'var(--shramik-ink-muted)' }}>
      Rule catalogue not provided in fixture
    </div>
  );
};
