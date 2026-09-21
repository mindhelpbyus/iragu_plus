import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  getMyTherapistProfile,
  updateTherapistCore,
  updateTherapistProfile,
  type TherapistMe,
  type UpdateTherapistCoreRequest,
  type UpdateTherapistProfileRequest,
} from '../../api/therapistProfile';

/**
 * Backs Settings' Account, Services and Availability(buffer) tabs — all three
 * read from the one real GET /therapists/me call and write through the two
 * real PUT routes described in api/therapistProfile.ts.
 */
export function useSettingsProfile() {
  const [profile, setProfile] = useState<TherapistMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingCore, setSavingCore] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProfile(await getMyTherapistProfile());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load your profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveCore(patch: UpdateTherapistCoreRequest): Promise<boolean> {
    setSavingCore(true);
    try {
      const updated = await updateTherapistCore(patch);
      setProfile(updated);
      toast.success('Profile updated.');
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save your profile');
      return false;
    } finally {
      setSavingCore(false);
    }
  }

  async function saveProfileFields(patch: UpdateTherapistProfileRequest): Promise<boolean> {
    if (!profile) return false;
    setSavingProfile(true);
    try {
      await updateTherapistProfile(profile.id, patch);
      // The profile PUT doesn't echo the full record in a shape worth
      // re-parsing here — re-fetch so every tab reading `profile` sees the
      // real saved values, not an optimistic guess.
      await load();
      toast.success('Saved.');
      return true;
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === 'CREDENTIALS_LOCKED') {
        toast.error('Those fields are locked while your credentials are under review.');
      } else {
        toast.error(err instanceof Error ? err.message : 'Could not save');
      }
      return false;
    } finally {
      setSavingProfile(false);
    }
  }

  return { profile, loading, error, savingCore, savingProfile, saveCore, saveProfileFields, reload: load };
}
