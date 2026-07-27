import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { getMyTherapistId } from '../../api/therapistMe';
import { listLeave, createLeave, deleteLeave, type LeaveRecord } from '../../api/leave';
import { getBlockedSlots, createBlockedSlot, deleteBlockedSlot, type BlockedSlot } from '../../api/availability';
import { ApiFetchError } from '../../api/client';
import { addDays, toDateKey } from './dateUtils';

const FULL_DAY_REASONS = ['Vacation', 'Personal', 'Sick', 'Conference'] as const;
const INTRA_DAY_REASONS = ['Lunch', 'Break', 'Documentation'] as const;

/** The current wall-clock time (browser-local), rounded up to the next 5 minutes. */
function nowTimeRounded(): string {
  const d = new Date();
  const mins = Math.ceil((d.getHours() * 60 + d.getMinutes()) / 5) * 5;
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = (h * 60 + m + minutes + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

interface BlockTimeOffModalProps {
  onClose: () => void;
  onChanged?: () => void;
}

export function BlockTimeOffModal({ onClose, onChanged }: BlockTimeOffModalProps) {
  const today = toDateKey(new Date());
  const [mode, setMode] = useState<'full' | 'intra'>('full');

  // Full day state
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [fullReason, setFullReason] = useState<(typeof FULL_DAY_REASONS)[number]>('Vacation');

  // Intra day state
  const [intraDate, setIntraDate] = useState(today);
  const [startTime, setStartTime] = useState(nowTimeRounded);
  const [endTime, setEndTime] = useState(() => addMinutesToTime(nowTimeRounded(), 60));
  const [intraReason, setIntraReason] = useState<(typeof INTRA_DAY_REASONS)[number]>('Lunch');

  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchBlocks = async () => {
    try {
      const therapistId = await getMyTherapistId();
      const [leavesRes, slotsRes] = await Promise.all([
        listLeave(therapistId, today),
        getBlockedSlots(therapistId, today, toDateKey(addDays(new Date(), 90)))
      ]);
      setLeaves(leavesRes);
      setBlockedSlots(slotsRes);
    } catch {
      setError('Could not load blocked times.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlocks();
  }, [today]);

  const handleAddBlock = async () => {
    setSaving(true);
    setError(null);
    try {
      const therapistId = await getMyTherapistId();
      if (mode === 'full') {
        if (!startDate || !endDate) return;
        await createLeave(therapistId, startDate, endDate, undefined, fullReason);
      } else {
        if (!intraDate || !startTime || !endTime) return;
        const [sh, sm] = startTime.split(':').map(Number);
        const [eh, em] = endTime.split(':').map(Number);
        await createBlockedSlot(therapistId, intraDate, sh, sm, eh, em, intraReason);
      }
      await fetchBlocks();
      onChanged?.();
      toast.success('Time blocked successfully');
    } catch (err) {
      const message = err instanceof ApiFetchError ? err.message : err instanceof Error ? err.message : 'Failed to block this time.';
      setError(message);
      toast.error('Could not block this time');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveLeave = async (id: number) => {
    setRemovingId(`leave-${id}`);
    setError(null);
    try {
      const therapistId = await getMyTherapistId();
      await deleteLeave(therapistId, id);
      setLeaves((prev) => prev.filter((b) => b.id !== id));
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove block.');
    } finally {
      setRemovingId(null);
    }
  };

  const handleRemoveSlot = async (id: number) => {
    setRemovingId(`slot-${id}`);
    setError(null);
    try {
      const therapistId = await getMyTherapistId();
      await deleteBlockedSlot(therapistId, id);
      setBlockedSlots((prev) => prev.filter((b) => b.id !== id));
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove block.');
    } finally {
      setRemovingId(null);
    }
  };

  const formatLeaveLabel = (record: LeaveRecord) => {
    const start = new Date(record.startDate);
    const end = new Date(record.endDate);
    const dow = start.toLocaleDateString('en-GB', { weekday: 'short' });
    const startLabel = start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const sameDay = toDateKey(start) === toDateKey(end);
    const dateLabel = sameDay ? startLabel : `${startLabel} – ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
    return `${dow}, ${dateLabel}${record.leaveType ? ` · ${record.leaveType}` : ''}`;
  };

  const formatSlotLabel = (record: BlockedSlot) => {
    const d = new Date(record.date);
    const dateLabel = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    const sh = String(record.startHour).padStart(2, '0');
    const sm = String(record.startMinute).padStart(2, '0');
    const eh = String(record.endHour).padStart(2, '0');
    const em = String(record.endMinute).padStart(2, '0');
    return `${dateLabel}, ${sh}:${sm} – ${eh}:${em}${record.reason ? ` · ${record.reason}` : ''}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[3px]"
      onClick={onClose}
    >
      <div
        className="max-h-[calc(100vh-64px)] w-[480px] max-w-[calc(100vw-48px)] overflow-y-auto rounded-[18px] bg-surface p-7 shadow-[0_24px_60px_-12px_rgba(28,24,18,.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-start justify-between">
          <h3 className="text-lg font-semibold text-ink">Block time off</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full text-muted-text hover:bg-action-light/60"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-5 text-[13px] leading-relaxed text-muted-text">
          Clients won't be able to book you during blocked times.
        </p>

        <div className="mb-5 flex rounded-[10px] border border-rule bg-canvas p-1">
          <button
            type="button"
            onClick={() => setMode('full')}
            className={`flex-1 rounded-[6px] py-1.5 text-xs font-semibold transition-colors ${
              mode === 'full' ? 'bg-white text-ink shadow-sm' : 'text-muted-text hover:text-ink'
            }`}
          >
            Full Day(s)
          </button>
          <button
            type="button"
            onClick={() => setMode('intra')}
            className={`flex-1 rounded-[6px] py-1.5 text-xs font-semibold transition-colors ${
              mode === 'intra' ? 'bg-white text-ink shadow-sm' : 'text-muted-text hover:text-ink'
            }`}
          >
            Specific Hours
          </button>
        </div>

        {mode === 'full' ? (
          <>
            <div className="mb-5 grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-text">
                  Start Date
                </label>
                <input
                  type="date"
                  min={today}
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (endDate < e.target.value) setEndDate(e.target.value);
                  }}
                  className="h-11 w-full rounded-[10px] border border-rule bg-canvas/50 px-3.5 text-sm text-ink outline-none focus:border-action"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-text">
                  End Date
                </label>
                <input
                  type="date"
                  min={startDate}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-11 w-full rounded-[10px] border border-rule bg-canvas/50 px-3.5 text-sm text-ink outline-none focus:border-action"
                />
              </div>
            </div>

            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-text">
              Reason
            </label>
            <div className="mb-5 flex flex-wrap gap-2">
              {FULL_DAY_REASONS.map((r) => {
                const active = r === fullReason;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setFullReason(r)}
                    className="h-8 rounded-full border px-3 text-[13px] font-medium transition-colors"
                    style={
                      active
                        ? { borderColor: '#B06060', background: '#F4E3E3', color: '#8E4848' }
                        : { borderColor: 'var(--rule)', background: 'transparent', color: 'var(--body-text)' }
                    }
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className="mb-5">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-text">
                Date
              </label>
              <input
                type="date"
                min={today}
                value={intraDate}
                onChange={(e) => setIntraDate(e.target.value)}
                className="h-11 w-full rounded-[10px] border border-rule bg-canvas/50 px-3.5 text-sm text-ink outline-none focus:border-action"
              />
            </div>
            <div className="mb-5 grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-text">
                  Start Time
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
                  End Time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="h-11 w-full rounded-[10px] border border-rule bg-canvas/50 px-3.5 text-sm text-ink outline-none focus:border-action"
                />
              </div>
            </div>

            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-text">
              Reason
            </label>
            <div className="mb-5 flex flex-wrap gap-2">
              {INTRA_DAY_REASONS.map((r) => {
                const active = r === intraReason;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setIntraReason(r)}
                    className="h-8 rounded-full border px-3 text-[13px] font-medium transition-colors"
                    style={
                      active
                        ? { borderColor: '#7A9E88', background: '#E3ECE6', color: '#4A6F59' }
                        : { borderColor: 'var(--rule)', background: 'transparent', color: 'var(--body-text)' }
                    }
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-[#E5C6C6] bg-[#FBEFEF] px-3.5 py-2.5 text-sm text-[#8E4848]">
            {error}
          </div>
        )}

        <button
          type="button"
          disabled={saving || (mode === 'full' ? !startDate || !endDate : !intraDate || !startTime || !endTime)}
          onClick={handleAddBlock}
          className="mb-5 h-[42px] w-full rounded-[12px] bg-action text-sm font-semibold text-white transition-colors hover:bg-action-dark disabled:opacity-50"
        >
          {saving ? 'Adding…' : 'Add block'}
        </button>

        <div className="border-t border-rule pt-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-text">
            Currently blocked
          </div>
          {loading ? (
            <p className="text-sm text-muted-text">Loading…</p>
          ) : leaves.length === 0 && blockedSlots.length === 0 ? (
            <p className="text-sm text-muted-text">No blocked times coming up.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {leaves.map((b) => (
                <div key={`leave-${b.id}`} className="flex items-center justify-between rounded-lg bg-canvas px-3 py-2 border-l-[3px] border-[#B06060]">
                  <span className="text-sm text-ink">{formatLeaveLabel(b)}</span>
                  <button
                    type="button"
                    disabled={removingId === `leave-${b.id}`}
                    onClick={() => handleRemoveLeave(b.id)}
                    className="text-xs font-medium text-[#8E4848] hover:underline disabled:opacity-50"
                  >
                    {removingId === `leave-${b.id}` ? 'Removing…' : 'Remove'}
                  </button>
                </div>
              ))}
              {blockedSlots.map((b) => (
                <div key={`slot-${b.id}`} className="flex items-center justify-between rounded-lg bg-canvas px-3 py-2 border-l-[3px] border-[#7A9E88]">
                  <span className="text-sm text-ink">{formatSlotLabel(b)}</span>
                  <button
                    type="button"
                    disabled={removingId === `slot-${b.id}`}
                    onClick={() => handleRemoveSlot(b.id)}
                    className="text-xs font-medium text-[#8E4848] hover:underline disabled:opacity-50"
                  >
                    {removingId === `slot-${b.id}` ? 'Removing…' : 'Remove'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
