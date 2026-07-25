import { useCallback, useEffect, useState } from 'react';
import { getSlotsRange, type TimeSlot } from '../../api/availability';
import { getMyTherapistId } from '../../api/therapistMe';
import { toDateKey } from './dateUtils';

export interface DayAvailability {
  date: string;
  total: number;
  slots: TimeSlot[];
}

/** Real per-day open-slot counts for [rangeStart, rangeEnd], keyed by YYYY-MM-DD. Gated by `enabled` (non-therapist roles have nothing to fetch). */
export function useAvailabilityRange(rangeStart: Date, rangeEnd: Date, enabled = true) {
  const [byDate, setByDate] = useState<Record<string, DayAvailability>>({});
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const startKey = toDateKey(rangeStart);
  const endKey = toDateKey(rangeEnd);

  const fetchAvailability = useCallback(async () => {
    if (!enabled) {
      setByDate({});
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const therapistId = await getMyTherapistId();
      const entries = await getSlotsRange(therapistId, startKey, endKey);
      const map: Record<string, DayAvailability> = {};
      for (const entry of entries) {
        const available = entry.slots.filter((s) => s.isAvailable && !s.isBooked);
        map[entry.date] = { date: entry.date, total: available.length, slots: entry.slots };
      }
      setByDate(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load availability');
    } finally {
      setLoading(false);
    }
  }, [enabled, startKey, endKey]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  return { byDate, loading, error, refetch: fetchAvailability };
}
