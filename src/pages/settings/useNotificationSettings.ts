import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from '../../api/notificationPreferences';

export function useNotificationSettings() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPrefs(await getNotificationPreferences());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(field: keyof NotificationPreferences) {
    if (!prefs) return;
    const next = { ...prefs, [field]: !prefs[field] };
    setPrefs(next); // optimistic — this is a plain boolean toggle, not a PHI mutation
    setSaving(true);
    try {
      const saved = await updateNotificationPreferences({ [field]: next[field] });
      setPrefs(saved);
    } catch (err) {
      setPrefs(prefs); // revert
      toast.error(err instanceof Error ? err.message : 'Could not save that preference');
    } finally {
      setSaving(false);
    }
  }

  return { prefs, loading, error, saving, toggle };
}
