import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import type { TherapistMe } from '../../api/therapistProfile';
import { dayLabel, parseBufferMinutes, type DayScheduleRow } from './settingsHelpers';
import { useWeeklySchedule } from './useWeeklySchedule';
import { GapNotice, SettingsField, SettingsSectionHeader, settingsInputClass } from './settingsUi';

interface AvailabilityTabProps {
  profile: TherapistMe | null;
  loading: boolean;
  saving: boolean;
  onSave: (patch: { bufferBeforeMinutes?: number | null; bufferAfterMinutes?: number | null }) => Promise<boolean>;
}

const GRID_COLS = 'grid-cols-[110px_48px_1fr_1fr_1fr_1fr]';

const errorBannerClass = 'rounded-lg border border-danger bg-danger-light px-3.5 py-2.5 text-sm text-danger';

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

      <div className="mt-8 border-t border-rule pt-6">
        <WeeklyScheduleSection />
      </div>

      <div className="mt-8 flex flex-col gap-3 border-t border-rule pt-6">
        <GapNotice title="Google / Outlook calendar sync">
          Not available yet. There's no calendar-sync Lambda or OAuth integration anywhere in backend-initial today —
          this needs a new backend spec, not just a frontend toggle.
        </GapNotice>
      </div>
    </>
  );
}

/**
 * Real weekly working-hours grid, wired to `PUT /therapists/availability/{id}`
 * with `{ weeklySchedule }` (backend-initial's therapist-availability
 * handler.ts:297-327) — the same route therapistApp's schedule-settings
 * screen writes, so a schedule set here is what actually gates client
 * booking (AvailabilityService.generateTimeSlots reads this column).
 */
function WeeklyScheduleSection() {
  const { rows: savedRows, loading, saving, error, saveError, save } = useWeeklySchedule();
  const [rows, setRows] = useState<DayScheduleRow[]>(savedRows);
  const [dirty, setDirty] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Re-sync local edit buffer whenever the real saved schedule changes
  // (initial load, or a reload after a save) — never on every keystroke.
  useEffect(() => {
    setRows(savedRows);
    setDirty(false);
  }, [savedRows]);

  function updateRow(day: DayScheduleRow['day'], patch: Partial<DayScheduleRow>) {
    setRows((prev) => prev.map((r) => (r.day === day ? { ...r, ...patch } : r)));
    setDirty(true);
    setJustSaved(false);
  }

  async function handleSave() {
    const ok = await save(rows);
    if (ok) {
      setDirty(false);
      setJustSaved(true);
      toast.success('Weekly schedule saved.');
    } else {
      toast.error('Could not save your weekly schedule.');
    }
  }

  return (
    <>
      <SettingsSectionHeader
        title="Weekly working hours"
        description="Which days you take sessions, and what hours — clients can only book inside these windows. Add an optional lunch break to split a day into two segments."
      />

      {error && <div className={`mb-4 ${errorBannerClass}`}>{error}</div>}

      {loading ? (
        <div className="py-6 text-center text-sm text-muted-text">Loading…</div>
      ) : (
        <>
          <div
            className={`grid ${GRID_COLS} gap-3 px-3.5 pb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-text`}
          >
            <span>Day</span>
            <span>Open</span>
            <span>Start</span>
            <span>End</span>
            <span>Lunch from</span>
            <span>Lunch to</span>
          </div>

          <div className="flex flex-col gap-2">
            {rows.map((row) => (
              <div
                key={row.day}
                className={`grid ${GRID_COLS} items-center gap-3 rounded-[10px] border border-rule px-3.5 py-2.5 transition-colors ${
                  row.isAvailable ? 'bg-surface' : 'bg-canvas'
                }`}
              >
                <span className={`text-sm font-medium ${row.isAvailable ? 'text-ink' : 'text-muted-text'}`}>
                  {dayLabel(row.day)}
                </span>
                <Switch
                  checked={row.isAvailable}
                  onCheckedChange={(checked) => updateRow(row.day, { isAvailable: checked })}
                  aria-label={`${dayLabel(row.day)} available`}
                />
                <input
                  type="time"
                  aria-label={`${dayLabel(row.day)} start time`}
                  value={row.startTime}
                  disabled={!row.isAvailable}
                  onChange={(e) => updateRow(row.day, { startTime: e.target.value })}
                  className={settingsInputClass}
                />
                <input
                  type="time"
                  aria-label={`${dayLabel(row.day)} end time`}
                  value={row.endTime}
                  disabled={!row.isAvailable}
                  onChange={(e) => updateRow(row.day, { endTime: e.target.value })}
                  className={settingsInputClass}
                />
                <input
                  type="time"
                  aria-label={`${dayLabel(row.day)} lunch start`}
                  value={row.lunchStart}
                  disabled={!row.isAvailable}
                  onChange={(e) => updateRow(row.day, { lunchStart: e.target.value })}
                  className={settingsInputClass}
                />
                <input
                  type="time"
                  aria-label={`${dayLabel(row.day)} lunch end`}
                  value={row.lunchEnd}
                  disabled={!row.isAvailable}
                  onChange={(e) => updateRow(row.day, { lunchEnd: e.target.value })}
                  className={settingsInputClass}
                />
              </div>
            ))}
          </div>

          {saveError && <div className={`mt-4 ${errorBannerClass}`}>{saveError}</div>}

          <div className="mt-4 flex items-center justify-end gap-3">
            {justSaved && !dirty && <span className="text-xs text-muted-text">Saved.</span>}
            <Button size="sm" className="h-10 px-4 text-sm" disabled={saving || !dirty} onClick={handleSave}>
              {saving ? 'Saving…' : 'Save weekly schedule'}
            </Button>
          </div>
        </>
      )}
    </>
  );
}
