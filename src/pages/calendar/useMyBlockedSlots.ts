import { useCallback, useEffect, useState } from 'react';
import { getBlockedSlots, type BlockedSlot } from '../../api/availability';
import { getMyTherapistId } from '../../api/therapistMe';
import { toDateKey } from './dateUtils';

export function useMyBlockedSlots(rangeStart: Date, rangeEnd: Date, enabled = true) {
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const startKey = toDateKey(rangeStart);
  const endKey = toDateKey(rangeEnd);

  const fetchBlockedSlots = useCallback(async () => {
    if (!enabled) {
      setBlockedSlots([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const therapistId = await getMyTherapistId();
      const rows = await getBlockedSlots(therapistId, startKey, endKey);
      setBlockedSlots(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load blocked slots');
    } finally {
      setLoading(false);
    }
  }, [enabled, startKey, endKey]);

  useEffect(() => {
    fetchBlockedSlots();
  }, [fetchBlockedSlots]);

  return { blockedSlots, loading, error, refetch: fetchBlockedSlots };
}
