import { useCallback, useEffect, useState } from 'react';
import { getMyAppointments, type RawAppointment } from '../../api/appointmentsBackend';
import { getMyTherapistId } from '../../api/therapistMe';
import { toDateKey } from './dateUtils';

/**
 * Fetches the caller's own appointments for [rangeStart, rangeEnd] (inclusive),
 * refetching when the range moves. `enabled` gates the fetch for callers who
 * have no therapist identity to resolve (org_owner/org_admin/admin viewing
 * Calendar without a personal schedule) — GET /therapists/me would fail for
 * them, so skip it entirely rather than surface that as an error.
 *
 * Returns `refetch` so callers (e.g. after a successful booking) can force a
 * fresh read without waiting for the range to change.
 */
export function useMyAppointments(rangeStart: Date, rangeEnd: Date, enabled = true) {
  const [appointments, setAppointments] = useState<RawAppointment[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const startKey = toDateKey(rangeStart);
  // The backend does `endTime lte new Date(endDate)`, which parses a bare
  // YYYY-MM-DD as UTC midnight — passing the range end's own date would
  // exclude nearly all of that day's appointments. Pass the *next* day's
  // date instead so the filter's upper bound clears the whole end day.
  const endKey = toDateKey(new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate() + 1));

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
      const therapistId = await getMyTherapistId();
      const rows = await getMyAppointments(therapistId, { startDate: startKey, endDate: endKey });
      setAppointments(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }, [enabled, startKey, endKey]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  return { appointments, loading, error, refetch: fetchAppointments };
}
