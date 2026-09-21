import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import type { TherapistMe } from '../../api/therapistProfile';
import { parseBufferMinutes } from './settingsHelpers';
import { GapNotice, SettingsField, SettingsSectionHeader, settingsInputClass } from './settingsUi';

interface AvailabilityTabProps {
  profile: TherapistMe | null;
  loading: boolean;
  saving: boolean;
  onSave: (patch: { bufferBeforeMinutes?: number | null; bufferAfterMinutes?: number | null }) => Promise<boolean>;
}

export function AvailabilityTab({ profile, loading, saving, onSave }: AvailabilityTabProps) {
  const [before, setBefore] = useState('');
  const [after, setAfter] = useState('');

  useEffect(() => {
    const nested = profile?.therapist_profile;
    setBefore(nested?.buffer_before_minutes != null ? String(nested.buffer_before_minutes) : '');
    setAfter(nested?.buffer_after_minutes != null ? String(nested.buffer_after_minutes) : '');
  }, [profile]);

  async function handleSave() {
    const beforeVal = parseBufferMinutes(before);
    const afterVal = parseBufferMinutes(after);
    if (beforeVal === undefined || afterVal === undefined) {
      toast.error('Buffer minutes must be a whole number between 0 and 120.');
      return;
    }
    await onSave({ bufferBeforeMinutes: beforeVal, bufferAfterMinutes: afterVal });
  }

  if (loading) return <div className="py-10 text-center text-sm text-muted-text">Loading…</div>;

  return (
    <>
      <SettingsSectionHeader
        title="Calendar & availability"
        description="Gap between back-to-back sessions. Day-to-day blocking (leave, one-off blocked slots) lives on the Calendar page."
      />

      <div className="grid grid-cols-2 gap-4">
        <SettingsField label="Buffer before a session (minutes)" hint="Leave blank to use the platform default.">
          <input
            value={before}
            onChange={(e) => setBefore(e.target.value)}
            inputMode="numeric"
            placeholder="Platform default"
            className={settingsInputClass}
          />
        </SettingsField>
        <SettingsField label="Buffer after a session (minutes)" hint="Leave blank to use the platform default.">
          <input
            value={after}
            onChange={(e) => setAfter(e.target.value)}
            inputMode="numeric"
            placeholder="Platform default"
            className={settingsInputClass}
          />
        </SettingsField>
      </div>

      <div className="mt-6 flex justify-end">
        <Button size="sm" className="h-10 px-4 text-sm" disabled={saving} onClick={handleSave}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>

      <div className="mt-8 flex flex-col gap-3 border-t border-rule pt-6">
        <GapNotice title="Weekly working hours">
          Setting a recurring weekly schedule (which days you take sessions, and what hours) isn't wired to a save
          action here yet — backend-initial has a <code>weeklySchedule</code> column on the therapist profile, but no
          route writes it. Use the Calendar page's leave/blocked-slot tools for day-to-day availability in the
          meantime.
        </GapNotice>
        <GapNotice title="Google / Outlook calendar sync">
          Not available yet. There's no calendar-sync Lambda or OAuth integration anywhere in backend-initial today —
          this needs a new backend spec, not just a frontend toggle.
        </GapNotice>
      </div>
    </>
  );
}
