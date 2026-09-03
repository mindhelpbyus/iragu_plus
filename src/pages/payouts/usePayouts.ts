import { useEffect, useState } from 'react';
import {
  getEarningsSummary,
  listPayouts,
  getBankDetails,
  type EarningsSummary,
  type PayoutRow,
  type BankDetails,
} from '../../api/billing';

const PAGE_SIZE = 10;

export function usePayouts() {
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
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
        const [summaryRes, payoutsRes, bankRes] = await Promise.all([
          getEarningsSummary(),
          listPayouts({ page, pageSize: PAGE_SIZE }),
          getBankDetails().catch(() => null),
        ]);
        if (cancelled) return;

        setSummary(summaryRes);
        setPayouts(payoutsRes.data);
        setTotalPages(payoutsRes.pagination.totalPages);
        setTotal(payoutsRes.pagination.total);
        setBankDetails(bankRes);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load payouts');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page]);

  return { summary, bankDetails, payouts, loading, error, page, setPage, totalPages, total };
}
