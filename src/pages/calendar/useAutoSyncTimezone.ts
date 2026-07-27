import { useEffect, useRef } from 'react';
import { getTherapistTimezone, updateTherapistTimezone } from '../../api/availability';
import { getMyTherapistId } from '../../api/therapistMe';

/**
 * Keeps TherapistProfile.timezone in sync with wherever the therapist is
 * actually opening the calendar from — silently, no confirmation. This only
 * affects *future* availability (weekly-schedule → UTC slot conversion);
 * already-booked appointments are unaffected since their startTime/endTime
 * are absolute UTC instants that every viewer (therapist or client, whatever
 * app, whatever device) already converts correctly to their own local
 * display automatically — that part needs no stored timezone at all.
 */
export function useAutoSyncTimezone(enabled: boolean, onSynced?: () => void) {
  const synced = useRef(false);

  useEffect(() => {
    if (!enabled || synced.current) return;
    synced.current = true;
    const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    (async () => {
      try {
        const therapistId = await getMyTherapistId();
        const storedZone = await getTherapistTimezone(therapistId);
        if (storedZone !== browserZone) {
          await updateTherapistTimezone(therapistId, browserZone);
          onSynced?.();
        }
      } catch {
        // Best-effort — availability still works off whatever zone was last stored.
      }
    })();
  }, [enabled, onSynced]);
}
