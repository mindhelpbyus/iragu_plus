import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
import type { DayAvailability } from './useAvailabilityRange';
import { addDays, isSameDay, startOfWeek, toDateKey, formatMonthYear } from './dateUtils';

/** 6 full weeks (42 days), Monday-first, covering the given month plus its leading/trailing days. */
function monthGridDates(monthAnchor: Date): Date[] {
  const firstOfMonth = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
  const gridStart = startOfWeek(firstOfMonth);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

interface MiniCalendarProps {
  monthAnchor: Date;
  onMonthChange: (d: Date) => void;
  selectedDay: Date;
  onSelectDay: (d: Date) => void;
  availabilityByDate: Record<string, DayAvailability>;
  hasEventsOn: (dateKey: string) => boolean;
}

export function MiniCalendar({
  monthAnchor,
  onMonthChange,
  selectedDay,
  onSelectDay,
  availabilityByDate,
  hasEventsOn,
}: MiniCalendarProps) {
  const cells = monthGridDates(monthAnchor);
  const today = new Date();

  return (
    <div className="rounded-[14px] border border-rule bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-ink">{formatMonthYear(monthAnchor)}</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onMonthChange(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() - 1, 1))}
            className="flex h-[26px] w-[26px] items-center justify-center rounded-lg text-muted-text hover:bg-action-light/60"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onMonthChange(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 1))}
            className="flex h-[26px] w-[26px] items-center justify-center rounded-lg text-muted-text hover:bg-action-light/60"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mb-1.5 grid grid-cols-7 gap-0.5 text-center text-[10px] font-semibold text-muted-text">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d) => {
          const otherMonth = d.getMonth() !== monthAnchor.getMonth();
          const key = toDateKey(d);
          const isToday = isSameDay(d, today);
          const selected = !isToday && isSameDay(d, selectedDay);
          const busy = !otherMonth && hasEventsOn(key);
          const avail = availabilityByDate[key];

          const fg = isToday ? '#fff' : selected ? '#175C3B' : otherMonth ? '#C9BEAD' : '#48382E';
          const bg = isToday ? '#1E7048' : selected ? '#E8F2EB' : 'transparent';
          const dot = busy ? (selected ? '#175C3B' : '#1E7048') : 'transparent';

          const cell = (
            <button
              type="button"
              disabled={otherMonth}
              onClick={() => onSelectDay(d)}
              className="relative flex h-7 w-full select-none items-center justify-center rounded-full text-xs transition-colors hover:bg-action-light/40"
              style={{ fontWeight: isToday || selected ? 600 : 400, color: fg, background: bg }}
            >
              {d.getDate()}
              <span
                className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full"
                style={{ background: dot }}
              />
            </button>
          );

          if (otherMonth) return <div key={key}>{cell}</div>;

          return (
            <Tooltip key={key}>
              <TooltipTrigger asChild>{cell}</TooltipTrigger>
              <TooltipContent side="top">
                <div className="text-xs">
                  <div className="font-medium">{d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  <div className="text-muted-foreground">
                    {avail ? (avail.total > 0 ? `${avail.total} available slots` : 'No availability') : '—'}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
