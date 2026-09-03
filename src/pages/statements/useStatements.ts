import { useEffect, useState } from 'react';
import { getEarningsSummary, listPayoutStatements, type EarningsSummary, type InvoiceRow } from '../../api/billing';

export function useStatements() {
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [statements, setStatements] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const [summaryRes, statementsRes] = await Promise.all([getEarningsSummary(), listPayoutStatements()]);
        if (cancelled) return;
        setSummary(summaryRes);
        setStatements(statementsRes);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load statements');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { summary, statements, loading, error };
}
