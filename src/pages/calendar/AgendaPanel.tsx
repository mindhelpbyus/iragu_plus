import { useNavigate } from 'react-router-dom';
import { isSameDay } from './dateUtils';
import type { CalEvent } from './calendarConstants';

interface AgendaPanelProps {
  eventsByDate: Record<string, CalEvent[]>;
}

const HIDDEN_STATUSES: NonNullable<CalEvent['status']>[] = ['cancelled', 'no-show', 'completed'];

/** "in 32m" / "in 4h" style countdown, blank once the session has already started. */
function formatCountdown(startIso: string | undefined, now: Date): string {
  if (!startIso) return '';
  const diffMs = new Date(startIso).getTime() - now.getTime();
  if (diffMs <= 0) return '';
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `in ${mins}m`;
  return `in ${Math.round(mins / 60)}h`;
}

export function AgendaPanel({ eventsByDate }: AgendaPanelProps) {
  const navigate = useNavigate();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const upcoming = Object.entries(eventsByDate)
    .flatMap(([dateKey, events]) => events.map((ev) => ({ ev, dateKey, date: new Date(dateKey + 'T00:00:00') })))
    .filter(({ ev, date }) => date >= today && date < weekEnd && !HIDDEN_STATUSES.includes(ev.status ?? 'scheduled'))
    .sort((a, b) => (a.ev.startTimeIso ?? '').localeCompare(b.ev.startTimeIso ?? ''));

  const groups: { label: 'Today' | 'Tomorrow' | 'This week'; items: typeof upcoming }[] = [
    { label: 'Today', items: upcoming.filter(({ date }) => isSameDay(date, today)) },
    { label: 'Tomorrow', items: upcoming.filter(({ date }) => isSameDay(date, tomorrow)) },
    { label: 'This week', items: upcoming.filter(({ date }) => date > tomorrow) },
  ];

  const hasAny = upcoming.length > 0;

  return (
    <div className="rounded-[14px] border border-rule bg-surface p-4">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-text">
        Agenda · next 7 days
      </div>

      {!hasAny ? (
        <p className="py-6 text-center text-sm text-muted-text">No sessions in the next 7 days.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => {
            if (group.items.length === 0) return null;
            return (
              <div key={group.label}>
                <div className="mb-1 text-[11.5px] font-bold text-action-dark">{group.label}</div>
                <div className="flex flex-col">
                  {group.items.map(({ ev, dateKey }) => (
                    <div
                      key={ev.id ?? dateKey + ev.time + ev.name}
                      onClick={() => ev.showJoin && navigate('/telehealth')}
                      className="flex cursor-pointer items-stretch gap-2.5 border-b border-action-light py-2 last:border-b-0"
                    >
                      <div className="w-[3px] flex-shrink-0 rounded-sm" style={{ background: ev.colors.border }} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-semibold text-ink">{ev.name}</div>
                        <div className="truncate text-[11px] text-muted-text">
                          {ev.time} · {ev.type}
                        </div>
                      </div>
                      {formatCountdown(ev.startTimeIso, now) && (
                        <span className="flex-shrink-0 self-center text-[11px] font-semibold text-action-dark">
                          {formatCountdown(ev.startTimeIso, now)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
