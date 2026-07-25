import { useCallback, useEffect, useState } from 'react';
import { listLeave, type LeaveRecord } from '../../api/leave';
import { getMyTherapistId } from '../../api/therapistMe';
import { toDateKey } from './dateUtils';

export function useMyLeaves(rangeStart: Date, rangeEnd: Date, enabled = true) {
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const startKey = toDateKey(rangeStart);
  const endKey = toDateKey(rangeEnd);

  const fetchLeaves = useCallback(async () => {
    if (!enabled) {
      setLeaves([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const therapistId = await getMyTherapistId();
      const rows = await listLeave(therapistId, startKey, endKey);
      setLeaves(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaves');
    } finally {
      setLoading(false);
    }
  }, [enabled, startKey, endKey]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  return { leaves, loading, error, refetch: fetchLeaves };
}
