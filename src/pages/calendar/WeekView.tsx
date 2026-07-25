import { Clock } from 'lucide-react';
import { HourGutter } from './HourGutter';
import { AlertTriangle } from 'lucide-react';
import { NowLine } from './NowLine';
import { useScrollToBusinessHours } from './useScrollToBusinessHours';
import { topForHour, heightForMinutes, type CalEvent } from './calendarConstants';
import { formatDayShort, isSameDay, toDateKey, getLeaveBlocksForDay } from './dateUtils';

import { type LeaveRecord } from '../../api/leave';
import { type BlockedSlot } from '../../api/availability';

interface WeekViewProps {
  weekDates: Date[];
  eventsByDate: Record<string, CalEvent[]>;
  leaves?: LeaveRecord[];
  blockedSlots?: BlockedSlot[];
  search: string;
  onSelectDay: (d: Date) => void;
  onSelectEvent: (ev: CalEvent) => void;
}

export function WeekView({ weekDates, eventsByDate, leaves, blockedSlots, search, onSelectDay, onSelectEvent }: WeekViewProps) {
  const q = search.trim().toLowerCase();
  const scrollRef = useScrollToBusinessHours();
  const today = new Date();

  return (
    <div className="h-[624px] w-full min-w-0 overflow-hidden rounded-[14px] border border-rule bg-surface shadow-[0_1px_2px_0_rgba(28,24,18,.04)]">
      <div className="grid border-b border-rule bg-canvas" style={{ gridTemplateColumns: '64px repeat(7, 1fr)' }}>
        <div className="flex items-end justify-center pb-2">
          <Clock className="h-3.5 w-3.5 text-muted-text" />
        </div>
        {weekDates.map((d) => {
          const isToday = isSameDay(d, today);
          return (
            <button
              key={toDateKey(d)}
              type="button"
              onClick={() => onSelectDay(d)}
              className="border-l border-action-light px-2 pb-3 pt-2.5 text-center"
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
        })}
      </div>

      <div ref={scrollRef} className="grid max-h-[560px] overflow-y-auto" style={{ gridTemplateColumns: '64px repeat(7, 1fr)' }}>
        <HourGutter />
        {weekDates.map((d) => {
          const dKey = toDateKey(d);
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          const events = eventsByDate[dKey] ?? [];
          const leaveBlocks = leaves ? getLeaveBlocksForDay(d, leaves) : [];

          return (
            <div
              key={dKey}
              className="relative border-l border-action-light"
              style={{ background: isWeekend ? 'var(--canvas)' : 'transparent' }}
            >
              {Array.from({ length: 24 }).map((_, h) => (
                <div key={h} className="h-20 border-b border-action-light" />
              ))}

              {(leaves ? getLeaveBlocksForDay(d, leaves) : []).map((lb, i) => (
                <div
                  key={`lb-${lb.id}-${i}`}
                  className="absolute left-0 right-0 z-[1] flex items-start justify-center pt-3"
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

              {(blockedSlots ? blockedSlots.filter((s) => isSameDay(new Date(s.date), d)) : []).map((bs, i) => {
                const startH = bs.startHour + bs.startMinute / 60;
                const endH = bs.endHour + bs.endMinute / 60;
                const durationMin = (endH - startH) * 60;
                const reason = bs.reason?.toLowerCase() || '';
                const bg = reason.includes('lunch') ? '#F4E9CC' : reason.includes('break') ? '#E3ECE6' : '#E5E1F0';
                const border = reason.includes('lunch') ? '#C49840' : reason.includes('break') ? '#7A9E88' : '#9A90B8';
                
                return (
                  <div
                    key={`bs-${bs.id}-${i}`}
                    className="absolute left-0 right-0 z-[1] flex items-start justify-center pt-3 border-l-[3px]"
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
                }) || (blockedSlots ? blockedSlots.filter(s => isSameDay(new Date(s.date), d)) : []).some(bs => {
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
                    className={`absolute left-1 right-1 cursor-pointer overflow-hidden rounded-[10px] border p-2 shadow-sm transition-transform hover:scale-[1.02] ${
                      isConflicting ? 'border-[#B06060] bg-[#FBEFEF] z-10' : 'border-[#C8E1CF] bg-action-light/90'
                    }`}
                    style={{
                      top: topForHour(ev.startHour),
                      height: heightForMinutes(ev.durationMin),
                      opacity: match ? 1 : 0.2,
                      ...(!isConflicting && ev.clientInitials && {
                        background: 'var(--action-light)',
                        borderColor: 'var(--action)',
                      }),
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className={`text-[11px] font-bold ${isConflicting ? 'text-[#8E4848]' : 'text-action-dark'}`}>{ev.name}</div>
                      {isConflicting && <AlertTriangle className="h-3.5 w-3.5 text-[#8E4848]" />}
                    </div>
                    <div className="mt-0.5 text-[10px] text-muted-text">
                      {ev.time}
                      <br />
                      {ev.type}
                    </div>
                    {ev.clientInitials && (
                      <div 
                        className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[9px] font-bold text-white shadow-sm"
                        style={{ background: ev.colors.border }}
                      >
                        {ev.clientInitials}
                      </div>
                    )}
                  </div>
                );
              })}

              {isSameDay(d, today) && <NowLine />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
