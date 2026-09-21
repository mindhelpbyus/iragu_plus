import { useCallback, useEffect, useState } from 'react';
import { getMyTherapistId } from '../../api/therapistMe';
import { getWeeklySchedule, putWeeklySchedule } from '../../api/availability';
import {
  rowsToWeeklySchedule,
  validateScheduleRows,
  weeklyScheduleToRows,
  type DayScheduleRow,
} from './settingsHelpers';

/**
 * Real weekly working-hours grid for Availability — a different backend call
 * from `useSettingsProfile`'s buffer-minutes save: this hits the
 * `therapist-availability` Lambda's `GET`/`PUT /therapists/availability/{id}`
 * (handler.ts:277-327), not the therapist-profile PUT. Kept as its own hook
 * (own loading/saving/error state) for the same reason
 * `useComplianceStatus`/`useNotificationSettings` are separate from
 * `useSettingsProfile` — one unrelated backend call per hook.
 */
export function useWeeklySchedule() {
  const [rows, setRows] = useState<DayScheduleRow[]>(() => weeklyScheduleToRows(undefined));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const therapistId = await getMyTherapistId();
      const data = await getWeeklySchedule(therapistId);
      setRows(weeklyScheduleToRows(data.weeklySchedule));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load your weekly schedule');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Validates locally first (a real error, not a network round-trip to learn
   *  "start after end" is wrong) and only calls the real PUT once the rows
   *  make sense. Returns false on either failure — caller decides the toast. */
  async function save(nextRows: DayScheduleRow[]): Promise<boolean> {
    setSaveError(null);
    const validationError = validateScheduleRows(nextRows);
    if (validationError) {
      setSaveError(validationError);
      return false;
    }
    setSaving(true);
    try {
      const therapistId = await getMyTherapistId();
      await putWeeklySchedule(therapistId, rowsToWeeklySchedule(nextRows));
      setRows(nextRows);
      return true;
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save your weekly schedule');
      return false;
    } finally {
      setSaving(false);
    }
  }

  return { rows, loading, saving, error, saveError, save, reload: load };
}
