import { PALETTE_FLAT, type CalEvent } from './calendarConstants';
import { addDays, isSameDay, startOfWeek, toDateKey } from './dateUtils';

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function chipColorFor(name: string) {
  if (name.includes('Couple') || name.includes('&')) return PALETTE_FLAT.lavender;
  if (name.toLowerCase().includes('intake') || name.toLowerCase().includes('group int')) return PALETTE_FLAT.amber;
  return PALETTE_FLAT.green;
}

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
}

export function MonthView({ monthAnchor, eventsByDate, onSelectDay, onSelectEvent }: MonthViewProps) {
  const cells = monthGridDates(monthAnchor);
  const today = new Date();

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
          const events = eventsByDate[toDateKey(d)] ?? [];
          const visible = events.slice(0, 3);
          const more = events.length - visible.length;

          return (
            <div
              key={toDateKey(d)}
              role="button"
              tabIndex={0}
              onClick={() => onSelectDay(d)}
              onKeyDown={(e) => e.key === 'Enter' && onSelectDay(d)}
              className="box-border min-h-[104px] cursor-pointer border-b border-r border-action-light p-2 text-left transition-colors hover:bg-canvas"
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
                  const colors = chipColorFor(ev.name + ev.type);
                  return (
                    <button
                      key={ev.id ?? ev.time + ev.name}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(ev);
                      }}
                      className="truncate rounded px-1.5 py-0.5 text-left text-[10px] font-medium hover:brightness-95"
                      style={{ background: colors.bg, color: colors.fg, borderLeft: `2px solid ${colors.border}` }}
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
