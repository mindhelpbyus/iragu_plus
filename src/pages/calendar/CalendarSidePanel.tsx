import { MiniCalendar } from './MiniCalendar';
import { AgendaPanel } from './AgendaPanel';
import { SlotsPanel } from './SlotsPanel';
import type { DayAvailability } from './useAvailabilityRange';
import type { CalEvent } from './calendarConstants';

export type SideTab = 'calendar' | 'agenda' | 'slots';

interface CalendarSidePanelProps {
  open: boolean;
  sideTab: SideTab;
  onSideTabChange: (t: SideTab) => void;
  monthAnchor: Date;
  onMonthChange: (d: Date) => void;
  selectedDay: Date;
  onSelectDay: (d: Date) => void;
  weekStart: Date;
  availabilityByDate: Record<string, DayAvailability>;
  availabilityLoading: boolean;
  hasEventsOn: (dateKey: string) => boolean;
  agendaEventsByDate: Record<string, CalEvent[]>;
}

const TABS: { id: SideTab; label: string }[] = [
  { id: 'calendar', label: 'Calendar' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'slots', label: 'Slots' },
];

export function CalendarSidePanel({
  open,
  sideTab,
  onSideTabChange,
  monthAnchor,
  onMonthChange,
  selectedDay,
  onSelectDay,
  weekStart,
  availabilityByDate,
  availabilityLoading,
  hasEventsOn,
  agendaEventsByDate,
}: CalendarSidePanelProps) {
  return (
    <div className="overflow-hidden transition-[width] duration-300" style={{ width: open ? '280px' : '0px' }}>
      <div className="flex w-[280px] flex-col gap-5">
        <div className="flex gap-1 rounded-[10px] border border-rule bg-surface p-[3px]">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onSideTabChange(t.id)}
              className={`h-[30px] flex-1 rounded-lg text-[11.5px] font-semibold transition-colors ${
                sideTab === t.id ? 'bg-action-light text-action-dark' : 'text-muted-text hover:bg-action-light/40'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {sideTab === 'calendar' && (
          <MiniCalendar
            monthAnchor={monthAnchor}
            onMonthChange={onMonthChange}
            selectedDay={selectedDay}
            onSelectDay={onSelectDay}
            availabilityByDate={availabilityByDate}
            hasEventsOn={hasEventsOn}
          />
        )}
        {sideTab === 'agenda' && <AgendaPanel eventsByDate={agendaEventsByDate} />}
        {sideTab === 'slots' && (
          <SlotsPanel weekStart={weekStart} availabilityByDate={availabilityByDate} loading={availabilityLoading} />
        )}
      </div>
    </div>
  );
}
