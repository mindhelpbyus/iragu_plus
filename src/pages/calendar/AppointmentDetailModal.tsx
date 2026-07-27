import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import {
  rescheduleAppointment,
  updateAppointmentStatus,
  updateAppointmentColor,
  cancelAppointment,
  type AppointmentType,
} from '../../api/appointmentsBackend';
import { ApiFetchError } from '../../api/client';
import { type CalEvent } from './calendarConstants';
import { addDays, formatDayShort, toDateKey } from './dateUtils';

const APPOINTMENT_TYPES: { value: AppointmentType; label: string }[] = [
  { value: 'individual', label: 'Individual' },
  { value: 'couples', label: 'Couples' },
  { value: 'family', label: 'Family' },
  { value: 'group', label: 'Group' },
];

const DURATIONS = [30, 45, 50, 60, 75, 90];

/** Quick-pick swatches for the priority color override — a free color-picker input covers everything else. */
const PRIORITY_SWATCHES = ['#B06060', '#C49840', '#1E7048', '#3D6FA8', '#9A90B8', '#48382E'];

interface AppointmentDetailModalProps {
  event: CalEvent;
  onClose: () => void;
  onChanged: () => void;
}

export function AppointmentDetailModal({ event, onClose, onChanged }: AppointmentDetailModalProps) {
  const initialStart = event.startTimeIso ? new Date(event.startTimeIso) : new Date();

  const [day, setDay] = useState(initialStart);
  const [startTime, setStartTime] = useState(
    `${String(initialStart.getHours()).padStart(2, '0')}:${String(initialStart.getMinutes()).padStart(2, '0')}`,
  );
  const [duration, setDuration] = useState(event.durationMin || 50);
  const [type, setType] = useState<AppointmentType>(event.rawType ?? 'individual');
  const [colorOverride, setColorOverride] = useState<string | null>(event.colorOverride ?? null);

  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dayOptions = Array.from({ length: 10 }, (_, i) => addDays(initialStart, i - 2));
  const isCancelled = event.status === 'cancelled' || event.status === 'no-show';
  const colorChanged = (colorOverride ?? null) !== (event.colorOverride ?? null);
  const dirty =
    toDateKey(day) !== toDateKey(initialStart) ||
    startTime !== `${String(initialStart.getHours()).padStart(2, '0')}:${String(initialStart.getMinutes()).padStart(2, '0')}` ||
    duration !== event.durationMin ||
    colorChanged;

  const handleSave = async () => {
    if (!event.id) return;
    setSaving(true);
    setError(null);
    try {
      const timeChanged =
        toDateKey(day) !== toDateKey(initialStart) ||
        startTime !== `${String(initialStart.getHours()).padStart(2, '0')}:${String(initialStart.getMinutes()).padStart(2, '0')}` ||
        duration !== event.durationMin;
      if (timeChanged) {
        const [h, m] = startTime.split(':').map(Number);
        const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m, 0, 0);
        const end = new Date(start.getTime() + duration * 60000);
        await rescheduleAppointment(String(event.id), start.toISOString(), end.toISOString());
      }
      if (colorChanged) {
        await updateAppointmentColor(String(event.id), colorOverride);
      }
      if (type !== event.rawType) {
        // Type isn't part of PUT /appointments/:id's status/time contract on
        // backend-initial today — status is the only mutable field besides
        // time. Surface this instead of silently dropping the change.
        toast.error('Appointment type can’t be changed after booking yet.');
      }
      toast.success('Appointment updated');
      onChanged();
      onClose();
    } catch (err) {
      if (err instanceof ApiFetchError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to update appointment.');
      }
      toast.error('Could not update the appointment');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!event.id) return;
    setCancelling(true);
    setError(null);
    try {
      await cancelAppointment(String(event.id));
      toast.success('Appointment cancelled');
      onChanged();
      onClose();
    } catch (err) {
      if (err instanceof ApiFetchError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to cancel appointment.');
      }
      toast.error('Could not cancel the appointment');
      setCancelling(false);
    }
  };

  const handleMarkComplete = async () => {
    if (!event.id) return;
    setSaving(true);
    setError(null);
    try {
      await updateAppointmentStatus(String(event.id), 'completed');
      toast.success('Marked as completed');
      onChanged();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[3px]"
      onClick={onClose}
    >
      <div
        className="box-border max-h-[calc(100vh-64px)] w-[640px] max-w-[calc(100vw-48px)] overflow-y-auto rounded-[18px] bg-surface p-7 shadow-[0_24px_60px_-12px_rgba(28,24,18,.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-ink">{event.name}</h3>
            <p className="mt-0.5 text-[13px] text-muted-text">
              {event.type}
              {isCancelled && <span className="ml-2 rounded-full bg-[#FBEFEF] px-2 py-0.5 text-[11px] font-semibold text-[#8E4848]">Cancelled</span>}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full text-muted-text hover:bg-action-light/60"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isCancelled ? (
          <div className="mt-6 rounded-[14px] bg-canvas px-4 py-3 text-sm text-muted-text">
            This appointment was {event.status === 'no-show' ? 'marked as a no-show' : 'cancelled'} — {event.time}.
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-5">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-text">Date</label>
              <div className="flex flex-wrap gap-1.5">
                {dayOptions.map((d) => {
                  const active = toDateKey(d) === toDateKey(day);
                  return (
                    <button
                      key={toDateKey(d)}
                      type="button"
                      onClick={() => setDay(d)}
                      className="h-9 rounded-lg border px-3 text-[13px] font-medium transition-colors"
                      style={
                        active
                          ? { borderColor: '#1E7048', background: '#E8F2EB', color: '#175C3B' }
                          : { borderColor: 'var(--rule)', background: 'transparent', color: 'var(--body-text)' }
                      }
                    >
                      {formatDayShort(d)} {d.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-text">
                  Start time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-11 w-full rounded-[10px] border border-rule bg-canvas/50 px-3.5 text-sm text-ink outline-none focus:border-action"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-text">
                  Duration
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="h-11 w-full rounded-[10px] border border-rule bg-canvas/50 px-3.5 text-sm text-ink outline-none focus:border-action"
                >
                  {DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d} min
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-text">
                Appointment type
              </label>
              <div className="flex flex-wrap gap-1.5">
                {APPOINTMENT_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className="flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors"
                    style={
                      type === t.value
                        ? { borderColor: '#1E7048', background: '#F2F6F3', color: 'var(--ink)' }
                        : { borderColor: 'var(--rule)', background: 'transparent', color: 'var(--body-text)' }
                    }
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#1E7048' }} />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-text">
                Priority color <span className="normal-case text-muted-text/70">· overrides the type color on the calendar</span>
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setColorOverride(null)}
                  title="Default (use appointment type color)"
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 text-[10px] font-semibold"
                  style={{
                    borderColor: colorOverride === null ? '#1E7048' : 'var(--rule)',
                    background: 'repeating-conic-gradient(#F2EAE0 0% 25%, transparent 0% 50%)',
                    color: 'var(--body-text)',
                  }}
                >
                  ✕
                </button>
                {PRIORITY_SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColorOverride(c)}
                    title={c}
                    className="h-8 w-8 rounded-full border-2 transition-transform"
                    style={{
                      background: c,
                      borderColor: colorOverride === c ? 'var(--ink)' : 'transparent',
                      transform: colorOverride === c ? 'scale(1.1)' : 'scale(1)',
                    }}
                  />
                ))}
                <label className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-rule text-muted-text">
                  <span className="pointer-events-none text-sm leading-none">+</span>
                  <input
                    type="color"
                    value={colorOverride ?? '#1E7048'}
                    onChange={(e) => setColorOverride(e.target.value)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    title="Pick a custom color"
                  />
                </label>
                {colorOverride && !PRIORITY_SWATCHES.includes(colorOverride) && (
                  <span
                    className="h-8 w-8 rounded-full border-2"
                    style={{ background: colorOverride, borderColor: 'var(--ink)' }}
                    title={colorOverride}
                  />
                )}
              </div>
            </div>

            {event.notes && (
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-text">
                  Notes
                </label>
                <p className="rounded-[10px] border border-rule bg-canvas/50 px-3.5 py-2.5 text-sm text-ink">{event.notes}</p>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-[#E5C6C6] bg-[#FBEFEF] px-3.5 py-2.5 text-sm text-[#8E4848]">
                {error}
              </div>
            )}

            {confirmCancel ? (
              <div className="flex items-center justify-between gap-3 rounded-[12px] border border-[#E5C6C6] bg-[#FBEFEF] px-4 py-3">
                <span className="text-sm text-[#8E4848]">Cancel this appointment? This can't be undone.</span>
                <div className="flex flex-shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmCancel(false)}
                    className="h-8 rounded-lg border border-rule px-3 text-xs font-semibold text-ink hover:bg-canvas"
                  >
                    Keep it
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="h-8 rounded-lg bg-[#8E4848] px-3 text-xs font-semibold text-white hover:bg-[#733838] disabled:opacity-50"
                  >
                    {cancelling ? 'Cancelling…' : 'Yes, cancel'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmCancel(true)}
                    className="h-10 rounded-[10px] border border-[#E5C6C6] px-4 text-sm font-semibold text-[#8E4848] hover:bg-[#FBEFEF]"
                  >
                    Cancel appointment
                  </button>
                  {event.status !== 'completed' && (
                    <button
                      type="button"
                      onClick={handleMarkComplete}
                      disabled={saving}
                      className="h-10 rounded-[10px] border border-rule px-4 text-sm font-semibold text-ink hover:bg-canvas disabled:opacity-50"
                    >
                      Mark completed
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !dirty}
                  className="h-10 rounded-[10px] bg-action px-5 text-sm font-semibold text-white transition-colors hover:bg-action-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
