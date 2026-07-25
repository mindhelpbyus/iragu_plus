import { useEffect, useMemo, useState } from 'react';
import { Video, MapPin, Flag, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { getMyClients, type BackendClient } from '../../api/clients';
import { createAppointment, type AppointmentType, type AppointmentMode } from '../../api/appointmentsBackend';
import { getMyTherapistId } from '../../api/therapistMe';
import { getDaySlots, type TimeSlot } from '../../api/availability';
import { ApiFetchError } from '../../api/client';
import { addDays, formatDayShort, toDateKey } from './dateUtils';

/** Mirrors the design's bookTypes exactly (Iragu+ CRM.dc.html ~line 2133) — dot color per type, not full-chip color. */
const APPOINTMENT_TYPES: { value: AppointmentType; label: string; dot: string; bg: string; border: string; text: string }[] = [
  { value: 'individual', label: 'Individual', dot: '#1E7048', bg: '#E8F2EB', border: '#1E7048', text: '#175C3B' },
  { value: 'couples', label: 'Couple', dot: '#9A90B8', bg: '#EFEDF5', border: '#9A90B8', text: '#6B6490' },
  { value: 'group', label: 'Group', dot: '#7A9E88', bg: '#F2F6F3', border: '#7A9E88', text: '#4A6F59' },
  { value: 'family', label: 'Family', dot: '#C49840', bg: '#FAF3E2', border: '#C49840', text: '#8A6A28' },
];

const DURATIONS = ['30 min', '50 min', '60 min', '75 min', '90 min'];

/** Curated working hours (08:00 - 17:00) */
const SUGGESTED_TIMES = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

function clientName(c: BackendClient): string {
  return `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || c.email;
}

interface BookAppointmentModalProps {
  initialDate: Date;
  onClose: () => void;
  onBooked: () => void;
}

export function BookAppointmentModal({ initialDate, onClose, onBooked }: BookAppointmentModalProps) {
  const [clients, setClients] = useState<BackendClient[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);

  const [day, setDay] = useState(initialDate);
  const [clientId, setClientId] = useState('');
  const [clientQuery, setClientQuery] = useState('');
  const [showClientList, setShowClientList] = useState(false);
  const [type, setType] = useState<AppointmentType>('individual');
  const [durationIdx, setDurationIdx] = useState(1); // '50 min'
  const [startTime, setStartTime] = useState('09:00');
  const [mode, setMode] = useState<AppointmentMode>('video');
  const [flagged, setFlagged] = useState(false);
  const [flagNote, setFlagNote] = useState('');

  const [daySlots, setDaySlots] = useState<TimeSlot[]>([]);
  const [onLeave, setOnLeave] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const duration = parseInt(DURATIONS[durationIdx], 10);

  useEffect(() => {
    getMyClients()
      .then(({ assignedClients, appointmentClients }) => {
        const merged = [...assignedClients, ...appointmentClients];
        const seen = new Set<number>();
        setClients(merged.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true))));
      })
      .catch(() => setClients([]))
      .finally(() => setClientsLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSlotsLoading(true);
    (async () => {
      try {
        const therapistId = await getMyTherapistId();
        const res = await getDaySlots(therapistId, toDateKey(day));
        if (!cancelled) {
          setDaySlots(res.slots);
          setOnLeave(!!res.onLeave);
        }
      } catch {
        if (!cancelled) {
          setDaySlots([]);
          setOnLeave(false);
        }
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toDateKey(day)]);

  const dayOptions = Array.from({ length: 7 }, (_, i) => addDays(initialDate, i));
  const selectedClient = clients.find((c) => String(c.id) === clientId);
  const filteredClients =
    clientQuery.trim().length === 0
      ? clients
      : clients.filter((c) => clientName(c).toLowerCase().includes(clientQuery.trim().toLowerCase()));
  const summary = `${formatDayShort(day)} ${day.getDate()}, ${startTime} · ${DURATIONS[durationIdx]}`;

  /**
   * A suggested time is "taken" if it falls inside any real, unavailable/booked
   * slot for the selected day. TimeSlot.startTime/endTime are full ISO
   * datetimes (UTC) — converted to the viewer's local hour/minute here, same
   * as the calendar grid, so "09:00" in the picker lines up with a slot that
   * displays as 09:00 on the grid.
   */
  const isTimeTaken = useMemo(() => {
    const takenRanges = daySlots
      .filter((s) => !s.isAvailable || s.isBooked)
      .map((s) => {
        const start = new Date(s.startTime);
        const end = new Date(s.endTime);
        return { startMins: start.getHours() * 60 + start.getMinutes(), endMins: end.getHours() * 60 + end.getMinutes() };
      });
    return (time: string) => {
      const [h, m] = time.split(':').map(Number);
      const startMinsOfDay = h * 60 + m;
      const endMinsOfDay = startMinsOfDay + duration;
      return takenRanges.some((r) => startMinsOfDay < r.endMins && endMinsOfDay > r.startMins);
    };
  }, [daySlots, duration]);

  const handleSubmit = async () => {
    if (!clientId) {
      setError('Select a client to book.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const therapistId = await getMyTherapistId();
      const [h, m] = startTime.split(':').map(Number);
      // Interpreted in the browser's own local timezone — the therapist is
      // booking against their own calendar, on their own device, so "4:30 PM"
      // means 4:30 PM wherever they currently are (matches how the grid
      // itself displays times: viewer-local, like Google Calendar).
      const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m, 0, 0);
      const end = new Date(start.getTime() + duration * 60000);

      await createAppointment({
        therapistId: String(therapistId),
        clientId,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        type,
        mode,
        notes: flagged && flagNote.trim() ? `Follow-up: ${flagNote.trim()}` : undefined,
      });
      setDone(true);
      onBooked();
    } catch (err) {
      if (err instanceof ApiFetchError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to book appointment.');
      }
      toast.error('Could not book the appointment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[3px]"
      onClick={onClose}
    >
      <div
        className="box-border max-h-[calc(100vh-64px)] w-[915px] max-w-[calc(100vw-48px)] overflow-y-auto rounded-[18px] bg-surface p-7 shadow-[0_24px_60px_-12px_rgba(28,24,18,.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-start justify-between">
          <h3 className="text-lg font-semibold text-ink">New appointment</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full text-muted-text hover:bg-action-light/60"
          >
            ✕
          </button>
        </div>

        {done ? (
          <div className="mt-5 flex items-center gap-2.5 rounded-[10px] border border-[#C8E1CF] bg-action-light px-4 py-3.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#175C3B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            <span className="text-sm font-medium text-action-dark">
              Booked with {selectedClient ? clientName(selectedClient) : 'client'} — invite sent to their email &amp; phone.
            </span>
          </div>
        ) : (
          <>
            <p className="mb-5 text-[13px] text-muted-text">Any future date, any hour — your calendar, your rules</p>

            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-text">Date</label>
            <div className="mb-2.5 flex gap-1.5">
              {dayOptions.map((d) => {
                const active = toDateKey(d) === toDateKey(day);
                return (
                  <button
                    key={toDateKey(d)}
                    type="button"
                    onClick={() => setDay(d)}
                    className="flex-1 rounded-[9px] border py-2 text-center transition-colors"
                    style={
                      active
                        ? { borderColor: '#1E7048', background: '#E8F2EB', color: '#175C3B' }
                        : { borderColor: 'var(--rule)', background: 'transparent', color: 'var(--body-text)' }
                    }
                  >
                    <div className="text-[10px] font-semibold uppercase">{formatDayShort(d)}</div>
                    <div className="mt-px text-sm font-semibold">{d.getDate()}</div>
                  </button>
                );
              })}
            </div>
            <input
              type="date"
              value={toDateKey(day)}
              onChange={(e) => e.target.value && setDay(new Date(e.target.value + 'T00:00:00'))}
              className="mb-4 h-[38px] w-full rounded-[9px] border border-rule bg-canvas/50 px-3 text-[13px] text-ink outline-none focus:border-action"
            />

            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-text">Client</label>
            <div className="relative mb-4">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#8E7563"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                value={selectedClient ? clientName(selectedClient) : clientQuery}
                onChange={(e) => {
                  setClientQuery(e.target.value);
                  setClientId('');
                  setShowClientList(true);
                }}
                onFocus={() => setShowClientList(true)}
                onBlur={() => setTimeout(() => setShowClientList(false), 150)}
                placeholder={clientsLoading ? 'Loading clients…' : 'Full name'}
                disabled={clientsLoading}
                className="h-[42px] w-full rounded-[10px] border border-rule bg-canvas/50 pl-9 pr-3.5 text-sm text-ink outline-none focus:border-action focus:shadow-[0_0_0_3px_rgba(30,112,72,.14)]"
              />
              {showClientList && !clientsLoading && filteredClients.length > 0 && (
                <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-[10px] border border-rule bg-surface py-1 shadow-[0_8px_24px_-8px_rgba(28,24,18,.25)]">
                  {filteredClients.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onMouseDown={() => {
                        setClientId(String(c.id));
                        setClientQuery('');
                        setShowClientList(false);
                      }}
                      className="block w-full px-3.5 py-2 text-left text-sm text-ink hover:bg-canvas"
                    >
                      {clientName(c)}
                    </button>
                  ))}
                </div>
              )}
              {!clientsLoading && clients.length === 0 && (
                <p className="mt-1.5 text-xs text-muted-text">No clients in your caseload yet.</p>
              )}
            </div>

            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-text">
              Appointment type
            </label>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {APPOINTMENT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className="flex h-[34px] items-center gap-1.5 rounded-[12px] border px-3 text-[13px] transition-colors"
                  style={
                    type === t.value
                      ? { borderColor: t.border, background: t.bg, color: t.text, fontWeight: 600 }
                      : { borderColor: 'var(--rule)', background: 'transparent', color: 'var(--body-text)', fontWeight: 500 }
                  }
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: t.dot }} />
                  {t.label}
                </button>
              ))}
            </div>

            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-text">Duration</label>
            <div className="mb-4 flex gap-2">
              {DURATIONS.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDurationIdx(i)}
                  className="h-[34px] flex-1 rounded-[9px] border text-xs transition-colors"
                  style={
                    durationIdx === i
                      ? { borderColor: '#1E7048', background: '#E8F2EB', color: '#175C3B', fontWeight: 600 }
                      : { borderColor: 'var(--rule)', background: 'transparent', color: 'var(--body-text)', fontWeight: 500 }
                  }
                >
                  {d}
                </button>
              ))}
            </div>

            {!slotsLoading && onLeave ? (
              <div className="mb-5 rounded-[12px] border border-[#E5C6C6] bg-[#FBEFEF] p-4 text-sm text-[#8E4848]">
                <div className="mb-1.5 flex items-center gap-2 font-semibold">
                  <AlertTriangle className="h-4 w-4" />
                  You are on leave
                </div>
                You have blocked off time for this date. You cannot book appointments during a leave.
              </div>
            ) : (
              <>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-text">
                  Start time · around the clock
                </label>
            <div className="mb-2.5 grid grid-cols-4 gap-2">
              {SUGGESTED_TIMES.map((s) => {
                const taken = !slotsLoading && isTimeTaken(s);
                const active = startTime === s;
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={taken}
                    onClick={() => setStartTime(s)}
                    className="h-[34px] rounded-[9px] border text-xs transition-colors disabled:cursor-not-allowed"
                    style={
                      taken
                        ? { borderColor: 'var(--rule)', background: '#F2EAE0', color: '#A08A78', textDecoration: 'line-through' }
                        : active
                          ? { borderColor: '#1E7048', background: '#E8F2EB', color: '#175C3B' }
                          : { borderColor: 'var(--rule)', background: 'transparent', color: 'var(--body-text)' }
                    }
                  >
                    {s}
                  </button>
                );
              })}
            </div>
              <label className="mb-1.5 mt-4 block text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-text">
                Between time / Specific time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-11 w-full rounded-[10px] border border-rule bg-canvas/50 px-3.5 text-sm text-ink outline-none focus:border-action"
              />
            {!slotsLoading && isTimeTaken(startTime) && (
              <p className="-mt-3 mb-4 text-[11px] text-[#8E4848]">Conflicts with an existing slot.</p>
            )}

            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-text">Mode</label>
            <div className="mb-5 flex gap-2">
              <button
                type="button"
                onClick={() => setMode('video')}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-[10px] border text-[13px] transition-colors"
                style={
                  mode === 'video'
                    ? { borderColor: '#1E7048', background: '#E8F2EB', color: '#175C3B', fontWeight: 600 }
                    : { borderColor: 'var(--rule)', background: 'transparent', color: 'var(--body-text)', fontWeight: 500 }
                }
              >
                <Video className="h-3.5 w-3.5" />
                Video
              </button>
              <button
                type="button"
                onClick={() => setMode('in_person')}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-[10px] border text-[13px] transition-colors"
                style={
                  mode === 'in_person'
                    ? { borderColor: '#1E7048', background: '#E8F2EB', color: '#175C3B', fontWeight: 600 }
                    : { borderColor: 'var(--rule)', background: 'transparent', color: 'var(--body-text)', fontWeight: 500 }
                }
              >
                <MapPin className="h-3.5 w-3.5" />
                In-person
              </button>
            </div>

            <div
              onClick={() => setFlagged((v) => !v)}
              className="mb-3 flex cursor-pointer select-none items-center gap-2.5 rounded-[10px] border px-3.5 py-2.5 transition-colors"
              style={
                flagged
                  ? { borderColor: '#B06060', background: '#F4E3E3' }
                  : { borderColor: 'var(--rule)', background: 'transparent' }
              }
            >
              <Flag className="h-4 w-4 flex-shrink-0" style={{ color: flagged ? '#8E4848' : '#8E7563' }} fill={flagged ? 'currentColor' : 'none'} />
              <span className="flex-1 text-sm font-semibold" style={{ color: flagged ? '#8E4848' : 'var(--body-text)' }}>
                Flag for follow-up
              </span>
              <span className="text-[11px]" style={{ color: flagged ? '#8E4848' : '#8E7563' }}>
                {flagged ? 'Flagged' : 'Off'}
              </span>
            </div>
            {flagged && (
              <input
                value={flagNote}
                onChange={(e) => setFlagNote(e.target.value)}
                placeholder="What should you follow up on?"
                className="mb-3 h-[38px] w-full rounded-[9px] border border-rule bg-canvas/50 px-3 text-[12.5px] text-ink outline-none focus:border-action"
              />
            )}

            <div className="mb-5 flex items-center justify-between rounded-[10px] bg-canvas px-4 py-3">
              <span className="text-[13px] text-body-text">Fee · UPI autopay after session</span>
              <span className="text-[15px] font-semibold">₹2,500</span>
            </div>

                {error && (
                  <div className="mb-4 rounded-lg border border-[#E5C6C6] bg-[#FBEFEF] px-3.5 py-2.5 text-sm text-[#8E4848]">
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || !clientId}
                  className="h-[46px] w-full rounded-[13px] bg-action text-sm font-semibold text-white shadow-[0_12px_26px_-8px_rgba(30,112,72,.35)] transition-colors hover:bg-action-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? 'Booking…' : `Book appointment · ${summary}`}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
