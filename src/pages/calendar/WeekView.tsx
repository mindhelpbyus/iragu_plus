import { Clock } from 'lucide-react';
import { HourGutter } from './HourGutter';
import { AlertTriangle } from 'lucide-react';
import { NowLine } from './NowLine';
import { useScrollToBusinessHours } from './useScrollToBusinessHours';
import { topForHour, heightForMinutes, type CalEvent } from './calendarConstants';
import { formatDayShort, isSameDay, toDateKey, getLeaveBlocksForDay } from './dateUtils';

import { type LeaveRecord } from '../../api/leave';
import { type BlockedSlot } from '../../api/availability';
import type { TherapistSummary } from '../../api/orgTherapists';

interface WeekViewProps {
  weekDates: Date[];
  eventsByDate: Record<string, CalEvent[]>;
  leaves?: LeaveRecord[];
  blockedSlots?: BlockedSlot[];
  search?: string;
  onSelectDay: (d: Date) => void;
  onSelectEvent: (ev: CalEvent) => void;
  onSlotClick?: (date: Date, timeStr: string, therapistId?: number) => void;
  /** Practice mode only (design.md Component 9) — when both this and eventsByTherapist
   *  are present and non-empty, renders one column per therapist per day. Absent = today's single-column-per-day rendering, unchanged. */
  therapists?: TherapistSummary[];
  eventsByTherapist?: Record<string, Record<number, CalEvent[]>>;
}

export function WeekView({
  weekDates,
  eventsByDate,
  leaves,
  blockedSlots,
  search,
  onSelectDay,
  onSelectEvent,
  onSlotClick,
  therapists,
  eventsByTherapist,
}: WeekViewProps) {
  const q = (search || '').trim().toLowerCase();
  const scrollRef = useScrollToBusinessHours();
  const today = new Date();
  const isMultiTherapist = !!therapists?.length && !!eventsByTherapist;
  const subColsPerDay = isMultiTherapist ? therapists!.length : 1;
  const gridTemplateColumns = `64px repeat(${weekDates.length * subColsPerDay}, 1fr)`;

  return (
    <div className="h-[624px] w-full min-w-0 overflow-hidden rounded-[14px] border border-rule bg-surface shadow-[0_1px_2px_0_rgba(28,24,18,.04)]">
      <div className="grid border-b border-rule bg-canvas" style={{ gridTemplateColumns }}>
        <div className="flex items-end justify-center pb-2">
          <Clock className="h-3.5 w-3.5 text-muted-text" />
        </div>
        {weekDates.map((d) => {
          const isToday = isSameDay(d, today);
          const dateHeader = (
            <button
              key={`${toDateKey(d)}-date`}
              type="button"
              onClick={() => onSelectDay(d)}
              className="border-l border-gray-200 px-2 pb-1 pt-2.5 text-center"
              style={isMultiTherapist ? { gridColumn: `span ${subColsPerDay}` } : undefined}
            >
              <div className={`text-[11px] font-semibold uppercase ${isToday ? 'text-action-dark' : 'text-muted-text'}`}>
                {formatDayShort(d)}
              </div>
              <div
                className="mx-auto mt-1 flex h-[30px] w-[30px] items-center justify-center rounded-full text-[13px] font-semibold"
                style={{ background: isToday ? '#1E7048' : 'transparent', color: isToday ? '#fff' : 'var(--ink)' }}
              >
                {d.getDate()}
              </div>
            </button>
          );
          return dateHeader;
        })}
        {isMultiTherapist &&
          weekDates.map((d) =>
            therapists!.map((t) => (
              <div
                key={`${toDateKey(d)}-${t.id}`}
                className="truncate border-l border-gray-200 px-1.5 pb-2 text-center text-[9.5px] font-medium text-muted-text"
                title={`${t.firstName} ${t.lastName}`}
              >
                {t.firstName} {t.lastName[0]}.
              </div>
            )),
          )}
      </div>

      <div ref={scrollRef} className="grid max-h-[560px] overflow-y-auto" style={{ gridTemplateColumns }}>
        <HourGutter />
        {weekDates.flatMap((d) => {
          const dKey = toDateKey(d);
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          // leaves/blockedSlots are always the CALLER's own schedule (useMyLeaves/
          // useMyBlockedSlots) — in Practice mode these only make sense overlaid on
          // the caller's own column, not on colleagues' columns whose availability
          // this view has no data for. Computed once per day (not per event) and
          // reused by both the render overlay and the conflict check below.
          const leaveBlocks = !isMultiTherapist && leaves ? getLeaveBlocksForDay(d, leaves) : [];
          const dayBlockedSlots = !isMultiTherapist && blockedSlots ? blockedSlots.filter((s) => isSameDay(new Date(s.date), d)) : [];
          const columnsForDay = isMultiTherapist ? therapists! : [undefined];

          return columnsForDay.map((t) => {
          const events = isMultiTherapist
            ? (eventsByTherapist![dKey]?.[t!.id] ?? [])
            : (eventsByDate[dKey] ?? []);

          return (
            <div
              key={t ? `${dKey}-${t.id}` : dKey}
              className="relative border-l border-gray-200"
              style={{ background: isWeekend ? 'var(--canvas)' : 'transparent' }}
            >
              {Array.from({ length: 24 }).map((_, h) => (
                <div key={h} className="h-20 border-b border-gray-200 flex flex-col">
                  <div className="flex-1 cursor-pointer hover:bg-black/5" onClick={() => onSlotClick && onSlotClick(d, `${String(h).padStart(2, '0')}:00`, t?.id)} />
                  <div className="flex-1 cursor-pointer hover:bg-black/5" onClick={() => onSlotClick && onSlotClick(d, `${String(h).padStart(2, '0')}:30`, t?.id)} />
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

              {events.map((ev) => {
                const match = !q || (ev.name + ' ' + ev.type).toLowerCase().includes(q);
                
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
                    key={ev.id}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEvent(ev);
                    }}
                    className={`absolute left-0.5 right-0.5 cursor-pointer overflow-hidden rounded-[5px] border-l-[3.5px] p-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-transform hover:scale-[1.02] ${
                      isConflicting ? 'border-l-[#B06060] bg-[#FBEFEF] z-10' : ''
                    }`}
                    style={{
                      top: topForHour(ev.startHour),
                      height: heightForMinutes(ev.durationMin),
                      opacity: match ? 1 : 0.2,
                      ...(!isConflicting && {
                        background: ev.colors.bg,
                        borderLeftColor: ev.colors.border,
                      }),
                    }}
                  >
                    <div className="relative flex items-start justify-between">
                      <div className={`text-[11px] font-semibold leading-[1.1] pr-4 ${isConflicting ? 'text-[#8E4848]' : ''}`} style={isConflicting ? undefined : { color: ev.colors.fg }}>
                        {ev.name}
                      </div>
                      {isConflicting && <AlertTriangle className="absolute right-0 top-0 h-3.5 w-3.5 text-[#8E4848]" />}
                      {!isConflicting && ev.clientInitials && (
                        <div 
                          className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white shadow-sm"
                          style={{ background: ev.colors.border }}
                        >
                          {ev.clientInitials}
                        </div>
                      )}
                    </div>
                    <div className="mt-0.5 text-[9.5px] leading-[1.2] text-[#716A60]">
                      {ev.time.replace('–', ' - ')}
                      <br />
                      {ev.type}
                    </div>
                  </div>
                );
              })}

              {isSameDay(d, today) && <NowLine />}
            </div>
          );
          });
        })}
      </div>
    </div>
  );
}
