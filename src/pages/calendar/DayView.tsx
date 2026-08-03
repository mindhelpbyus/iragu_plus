import { useEffect, useState } from 'react';
import { Video } from 'lucide-react';
import { toast } from 'sonner';
import { HourGutter } from './HourGutter';
import { AlertTriangle } from 'lucide-react';
import { NowLine } from './NowLine';
import { useScrollToBusinessHours } from './useScrollToBusinessHours';
import { topForHour, heightForMinutes, HOUR_PX, type CalEvent } from './calendarConstants';
import { formatDayFull, isSameDay, getLeaveBlocksForDay } from './dateUtils';
import { rescheduleAppointment } from '../../api/appointmentsBackend';
import { type LeaveRecord } from '../../api/leave';
import { type BlockedSlot } from '../../api/availability';
import { toDateKey } from './dateUtils';
import type { TherapistSummary } from '../../api/orgTherapists';

interface DayViewProps {
  day: Date;
  events: CalEvent[];
  leaves?: LeaveRecord[];
  blockedSlots?: BlockedSlot[];
  search?: string;
  onSelectEvent: (ev: CalEvent) => void;
  onRescheduled?: () => void;
  onSlotClick?: (date: Date, timeStr: string, therapistId?: number) => void;
  /** Practice mode only (design.md Component 9) — when both are present and
   *  non-empty, renders one column per therapist instead of the single
   *  events list. Drag-to-reschedule is disabled in this mode (see below). */
  therapists?: TherapistSummary[];
  eventsByTherapist?: Record<string, Record<number, CalEvent[]>>;
}

export function DayView({ day, events: eventsProp, leaves, blockedSlots, search = '', onSelectEvent, onRescheduled, onSlotClick, therapists, eventsByTherapist }: DayViewProps) {
  const [events, setEvents] = useState<CalEvent[]>(eventsProp);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const q = search.trim().toLowerCase();
  const isToday = isSameDay(day, new Date());
  const scrollRef = useScrollToBusinessHours();
  const isMultiTherapist = !!therapists?.length && !!eventsByTherapist;
  const dayKey = toDateKey(day);

  useEffect(() => {
    setEvents(eventsProp);
  }, [eventsProp]);

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isMultiTherapist || dragIdx === null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const snapped = Math.max(0, Math.min(1880, Math.round(y / 40) * 40));
    const newStartHour = snapped / HOUR_PX;
    const idx = dragIdx;
    setDragIdx(null);

    const target = events[idx];
    if (!target?.id) return;

    const startH = Math.floor(newStartHour);
    const startM = Math.round((newStartHour - startH) * 60);
    const newStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), startH, startM, 0, 0);
    const newEnd = new Date(newStart.getTime() + target.durationMin * 60000);

    if (newStart.getTime() < Date.now()) {
      alert("Cannot reschedule an appointment to the past.");
      return;
    }

    // Optimistic move so the drag feels immediate; reconciled by refetch,
    // reverted below if the backend rejects the new slot (e.g. a conflict).
    const fmt = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    setEvents((prev) =>
      prev.map((ev, i) =>
        i === idx
          ? { ...ev, startHour: newStartHour, time: `${fmt(startH, startM)} – ${fmt(Math.floor((newStartHour * 60 + ev.durationMin) / 60), Math.round((newStartHour * 60 + ev.durationMin) % 60))}` }
          : ev,
      ),
    );

    try {
      await rescheduleAppointment(String(target.id), newStart.toISOString(), newEnd.toISOString());
      toast.success('Appointment rescheduled');
      if (onRescheduled) onRescheduled();
    } catch (err) {
      setEvents(eventsProp);
      toast.error(err instanceof Error ? err.message : 'Could not reschedule — slot may be unavailable.');
    }
  };

  return (
    <div className="h-[624px] w-full min-w-0 overflow-hidden rounded-[14px] border border-rule bg-surface shadow-[0_1px_2px_0_rgba(28,24,18,.04)]">
      <div className="flex items-center gap-3 border-b border-rule bg-canvas px-5 py-3.5">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-action text-[17px] font-semibold text-white">
          {day.getDate()}
        </div>
        <div>
          <div className="text-sm font-semibold text-ink">{formatDayFull(day)}</div>
          <div className="text-xs text-muted-text">
            {events.length} session{events.length === 1 ? '' : 's'} · Tap a session to open · drag to reschedule
          </div>
        </div>
      </div>

      {isMultiTherapist && (
        <div className="grid border-b border-rule bg-canvas" style={{ gridTemplateColumns: `64px repeat(${therapists!.length}, 1fr)` }}>
          <div />
          {therapists!.map((t) => (
            <div key={t.id} className="truncate border-l border-gray-200 px-2 py-2 text-center text-[11px] font-semibold text-muted-text" title={`${t.firstName} ${t.lastName}`}>
              {t.firstName} {t.lastName}
            </div>
          ))}
        </div>
      )}

      <div
        ref={scrollRef}
        className="relative grid max-h-[560px] overflow-y-auto"
        style={{ gridTemplateColumns: isMultiTherapist ? `64px repeat(${therapists!.length}, 1fr)` : '64px 1fr' }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <HourGutter />
        {(isMultiTherapist ? therapists! : [undefined]).map((t) => {
        const columnEvents = isMultiTherapist ? (eventsByTherapist![dayKey]?.[t!.id] ?? []) : events;
        // Computed once per column, not once per event — leaves/blockedSlots are
        // always the CALLER's own schedule, so only relevant outside Practice mode.
        const leaveBlocks = !isMultiTherapist && leaves ? getLeaveBlocksForDay(day, leaves) : [];
        const dayBlockedSlots = !isMultiTherapist && blockedSlots ? blockedSlots.filter(s => isSameDay(new Date(s.date), day)) : [];
        return (
        <div key={t ? t.id : 'mine'} className="relative border-l border-gray-200">
          {Array.from({ length: 24 }).map((_, h) => (
            <div key={h} className="h-20 border-b border-gray-200 flex flex-col">
              <div className="flex-1 cursor-pointer hover:bg-black/5" onClick={() => onSlotClick && onSlotClick(day, `${String(h).padStart(2, '0')}:00`, t?.id)} />
              <div className="flex-1 cursor-pointer hover:bg-black/5" onClick={() => onSlotClick && onSlotClick(day, `${String(h).padStart(2, '0')}:30`, t?.id)} />
            </div>
          ))}

          {leaveBlocks.map((lb, i) => (
            <div
              key={`lb-${lb.id}-${i}`}
              className="absolute left-0 right-0 z-[1] flex items-start justify-center pt-3 pointer-events-none"
              style={{
                top: topForHour(lb.startHour),
                height: heightForMinutes(lb.durationMin),
                background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #F4E3E3 10px, #F4E3E3 20px)',
              }}
            >
              <div className="rounded-full bg-[#B06060] px-3 py-0.5 text-[10px] font-bold text-white shadow-sm">
                {lb.reason}
              </div>
            </div>
          ))}

          {dayBlockedSlots.map((bs, i) => {
            const startH = bs.startHour + bs.startMinute / 60;
            const endH = bs.endHour + bs.endMinute / 60;
            const durationMin = (endH - startH) * 60;
            const reason = bs.reason?.toLowerCase() || '';
            const bg = reason.includes('lunch') ? '#F4E9CC' : reason.includes('break') ? '#E3ECE6' : '#E5E1F0';
            const border = reason.includes('lunch') ? '#C49840' : reason.includes('break') ? '#7A9E88' : '#9A90B8';

            return (
              <div
                key={`bs-${bs.id}-${i}`}
                className="absolute left-0 right-0 z-[1] flex items-start justify-center pt-3 border-l-[3px] pointer-events-none"
                style={{
                  top: topForHour(startH),
                  height: heightForMinutes(durationMin),
                  background: `repeating-linear-gradient(45deg, transparent, transparent 10px, ${bg} 10px, ${bg} 20px)`,
                  borderLeftColor: border,
                }}
              >
                <div className="rounded-full px-3 py-0.5 text-[10px] font-bold text-white shadow-sm" style={{ background: border }}>
                  {bs.reason || 'Blocked'}
                </div>
              </div>
            );
          })}

          {columnEvents.map((ev, i) => {
            const match = !q || (ev.name + ' ' + ev.type).toLowerCase().includes(q);
            const isPastEvent = ev.startTimeIso ? new Date(ev.startTimeIso).getTime() < Date.now() : false;

            const isConflicting = leaveBlocks.some(lb => {
              const evStart = ev.startHour;
              const evEnd = ev.startHour + ev.durationMin / 60;
              const lbStart = lb.startHour;
              const lbEnd = lb.startHour + lb.durationMin / 60;
              return evStart < lbEnd && evEnd > lbStart;
            }) || dayBlockedSlots.some(bs => {
              const evStart = ev.startHour;
              const evEnd = ev.startHour + ev.durationMin / 60;
              const bsStart = bs.startHour + bs.startMinute / 60;
              const bsEnd = bs.endHour + bs.endMinute / 60;
              return evStart < bsEnd && evEnd > bsStart;
            });

            return (
              <div
                key={ev.id ?? ev.time + ev.name}
                draggable={!isMultiTherapist && !isPastEvent}
                onDragStart={(e) => {
                  if (isPastEvent) return;
                  setDragIdx(i);
                  e.dataTransfer.setData('text/plain', String(ev.id));
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onClick={() => onSelectEvent(ev)}
                className={`absolute cursor-pointer overflow-hidden rounded-[10px] border p-2.5 shadow-sm transition-all hover:scale-[1.01] ${
                  isConflicting ? 'border-[#B06060] bg-[#FBEFEF] z-10' : 'border-[#C8E1CF] bg-action-light'
                }`}
                style={{
                  top: topForHour(ev.startHour),
                  height: heightForMinutes(ev.durationMin),
                  opacity: match ? 1 : 0.25,
                }}
              >
                <div className="w-1 flex-shrink-0" style={{ background: isConflicting ? '#B06060' : ev.colors.border }} />
                <div className={`flex w-[60px] flex-shrink-0 flex-col items-center justify-center border-r border-black/5 ${isConflicting ? 'bg-[#FBEFEF]' : 'bg-white/40'}`}>
                  <div className="text-[13px] font-bold" style={{ color: isConflicting ? '#8E4848' : ev.colors.fg }}>
                    {ev.time.split('–')[0].trim()}
                  </div>
                  <div className={`text-[9px] font-semibold uppercase ${isConflicting ? 'text-[#8E4848]' : 'text-muted-text'}`}>{ev.durationMin}m</div>
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-2.5 px-3">
                  <div className="min-w-0 flex-1 flex items-center justify-between">
                    <div>
                      <div className={`truncate text-[13px] font-semibold ${isConflicting ? 'text-[#8E4848]' : 'text-ink'}`}>{ev.name}</div>
                      <div className={`truncate text-[11px] ${isConflicting ? 'text-[#8E4848]' : 'text-[#48382E]'}`}>{ev.type}</div>
                    </div>
                    {isConflicting && <AlertTriangle className="h-4 w-4 text-[#8E4848] flex-shrink-0" />}
                  </div>
                  {ev.clientInitials && (
                    <div 
                      className="absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white shadow-sm"
                      style={{ background: ev.colors.border }}
                    >
                      {ev.clientInitials}
                    </div>
                  )}
                  {ev.showJoin && (
                    <button
                      type="button"
                      className="flex h-7 flex-shrink-0 items-center gap-1 rounded-md bg-action px-2.5 text-xs font-medium text-white hover:bg-action-dark"
                    >
                      <Video className="h-3 w-3" />
                      Join
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {isToday && <NowLine withLabel />}
        </div>
        );
        })}
      </div>
    </div>
  );
}
