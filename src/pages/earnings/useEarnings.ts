import { useEffect, useState } from 'react';
import { getEarningsSummary, listTransactions, type EarningsSummary, type TransactionRow } from '../../api/billing';
import { getMyAppointments } from '../../api/appointmentsBackend';
import { getMyTherapistId } from '../../api/therapistMe';

const PAGE_SIZE = 10;

export function useEarnings() {
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [clientNames, setClientNames] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const myTherapistId = await getMyTherapistId();
        const [summaryRes, txRes, appointments] = await Promise.all([
          getEarningsSummary(),
          listTransactions({ types: ['session_earning'], page, pageSize: PAGE_SIZE }),
          getMyAppointments(myTherapistId).catch(() => []),
        ]);
        if (cancelled) return;

        setSummary(summaryRes);
        setTransactions(txRes.data);
        setTotalPages(txRes.pagination.totalPages);
        setTotal(txRes.pagination.total);

        const names = new Map<number, string>();
        for (const a of appointments) {
          if (a.client) names.set(a.id, `${a.client.firstName} ${a.client.lastName}`.trim());
        }
        setClientNames(names);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load earnings');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page]);

  return { summary, transactions, clientNames, loading, error, page, setPage, totalPages, total };
}
