import { useCallback, useEffect, useState } from 'react';
import { listRequests } from '../../api/requests';

const POLL_INTERVAL_MS = 60_000;

/** Sidebar's Requests nav badge — same poll-based honesty as useUnreadMessagesCount. Silently stays 0 if requests_workflow is off (a real 404, not a bug) or any other fetch failure — a stale/missing badge beats a broken sidebar. */
export function usePendingRequestsCount() {
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const pending = await listRequests('pending');
      setCount(pending.length);
    } catch {
      // best-effort
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  return count;
}
