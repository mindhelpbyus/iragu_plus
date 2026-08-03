import { useCallback, useEffect, useState } from 'react';
import { getOrgAppointments, type RawOrgAppointment } from '../../api/appointmentsBackend';
import { toDateKey } from './dateUtils';

/**
 * Practice-wide appointments across the caller's org, from GET /org/appointments
 * (the `org` Lambda) — mirrors useMyAppointments.ts's shape/range handling but
 * scoped by therapistIds instead of the caller's own id. `enabled` gates the
 * fetch for callers not currently in Practice mode (see CalendarPage.tsx).
 */
export function useOrgAppointments(
  rangeStart: Date,
  rangeEnd: Date,
  therapistIds: number[] | undefined,
  enabled = true,
) {
  const [appointments, setAppointments] = useState<RawOrgAppointment[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const startKey = toDateKey(rangeStart);
  // Same +1-day upper-bound reasoning as useMyAppointments.ts: the backend's
  // `lte: new Date(endDate)` parses a bare YYYY-MM-DD as UTC midnight, which
  // would exclude nearly all of the range end's own day.
  const endKey = toDateKey(new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate() + 1));
  const therapistIdsKey = therapistIds?.join(',') ?? '';

  const fetchAppointments = useCallback(async () => {
    if (!enabled) {
      setAppointments([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await getOrgAppointments({ dateFrom: startKey, dateTo: endKey, therapistIds });
      setAppointments(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load practice appointments');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, startKey, endKey, therapistIdsKey]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  return { appointments, loading, error, refetch: fetchAppointments };
}
