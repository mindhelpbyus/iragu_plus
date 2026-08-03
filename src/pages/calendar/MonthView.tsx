import { type CalEvent } from './calendarConstants';
import { addDays, isSameDay, startOfWeek, toDateKey } from './dateUtils';
import type { TherapistSummary } from '../../api/orgTherapists';

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** 6 full weeks (42 days), Monday-first, covering the given month plus its leading/trailing days. */
function monthGridDates(monthAnchor: Date): Date[] {
  const firstOfMonth = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
  const gridStart = startOfWeek(firstOfMonth);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

interface MonthViewProps {
  monthAnchor: Date;
  eventsByDate: Record<string, CalEvent[]>;
  onSelectDay: (d: Date) => void;
  onSelectEvent: (ev: CalEvent) => void;
  /** Matches WeekView/DayView's search dimming — non-matching chips render at
   *  reduced opacity instead of being hidden, so the toolbar's match-count
   *  badge and the grid stay visually consistent across all three views. */
  search?: string;
  /** Practice mode only (design.md Component 9) — when present, each day
   *  cell's chips are flattened across all selected therapists (already
   *  type-colored via calendarConstants' TYPE_COLOR, same as My Calendar
   *  mode) rather than reading eventsByDate for the caller's own schedule. */
  therapists?: TherapistSummary[];
  eventsByTherapist?: Record<string, Record<number, CalEvent[]>>;
}

export function MonthView({ monthAnchor, eventsByDate, onSelectDay, onSelectEvent, search, therapists, eventsByTherapist }: MonthViewProps) {
  const cells = monthGridDates(monthAnchor);
  const today = new Date();
  const isMultiTherapist = !!therapists?.length && !!eventsByTherapist;
  const q = (search || '').trim().toLowerCase();

  function eventsForDay(dateKey: string): CalEvent[] {
    if (!isMultiTherapist) return eventsByDate[dateKey] ?? [];
    const byTherapist = eventsByTherapist![dateKey] ?? {};
    return Object.values(byTherapist).flat();
  }

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-[14px] border border-rule bg-surface shadow-[0_1px_2px_0_rgba(28,24,18,.04)]">
      <div className="grid border-b border-rule bg-canvas" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {DOW.map((d) => (
          <div key={d} className="p-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-text">
            {d}
          </div>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {cells.map((d) => {
          const otherMonth = d.getMonth() !== monthAnchor.getMonth();
          const isToday = isSameDay(d, today);
          const events = eventsForDay(toDateKey(d));
          const visible = events.slice(0, 3);
          const more = events.length - visible.length;

          return (
            <div
              key={toDateKey(d)}
              role="button"
              tabIndex={0}
              onClick={() => onSelectDay(d)}
              onKeyDown={(e) => e.key === 'Enter' && onSelectDay(d)}
              className="box-border min-h-[104px] cursor-pointer border-b border-r border-gray-200 p-2 text-left transition-colors hover:bg-canvas"
            >
              <div
                className="mb-1.5 flex h-6 w-6 items-center justify-center rounded-full text-xs"
                style={{
                  fontWeight: isToday ? 600 : 400,
                  color: isToday ? '#fff' : otherMonth ? '#C9BEAD' : 'var(--ink)',
                  background: isToday ? '#1E7048' : 'transparent',
                }}
              >
                {d.getDate()}
              </div>

              <div className="flex flex-col gap-1">
                {visible.map((ev) => {
                  const colors = ev.colors;
                  const match = !q || (ev.name + ' ' + ev.type).toLowerCase().includes(q);
                  return (
                    <button
                      key={ev.id ?? ev.time + ev.name}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(ev);
                      }}
                      className="truncate rounded px-1.5 py-0.5 text-left text-[10px] font-medium hover:brightness-95"
                      style={{ background: colors.bg, color: colors.fg, borderLeft: `2px solid ${colors.border}`, opacity: match ? 1 : 0.35 }}
                    >
                      {ev.name}
                    </button>
                  );
                })}
                {more > 0 && <div className="text-[10px] text-muted-text">+{more} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
