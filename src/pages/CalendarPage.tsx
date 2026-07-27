import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { useAuthStore } from '../store/authStore';
import { CalendarToolbar } from './calendar/CalendarToolbar';
import { CalendarSidePanel, type SideTab } from './calendar/CalendarSidePanel';
import { WeekView } from './calendar/WeekView';
import { DayView } from './calendar/DayView';
import { MonthView } from './calendar/MonthView';
import { BlockTimeOffModal } from './calendar/BlockTimeOffModal';
import { BookAppointmentModal } from './calendar/BookAppointmentModal';
import { AppointmentDetailModal } from './calendar/AppointmentDetailModal';
import { type CalView, type CalEvent } from './calendar/calendarConstants';
import { useMyAppointments } from './calendar/useMyAppointments';
import { useMyLeaves } from './calendar/useMyLeaves';
import { useMyBlockedSlots } from './calendar/useMyBlockedSlots';
import { useAvailabilityRange } from './calendar/useAvailabilityRange';
import { useAutoSyncTimezone } from './calendar/useAutoSyncTimezone';
import { groupAppointmentsByDate } from './calendar/appointmentAdapter';
import {
  startOfWeek,
  addDays,
  weekDates as toWeekDates,
  toDateKey,
  formatWeekRange,
  formatDayFull,
  formatMonthYear,
} from './calendar/dateUtils';

export default function CalendarPage() {
  const user = useAuthStore((s) => s.user);
  // Calendar is only meaningful for someone with their own therapist
  // schedule. org_owner/org_admin/admin without a therapist identity land
  // here with nothing to fetch — GET /therapists/me would 404 for them, so
  // don't attempt it (this is what crashed the screen for SuperAdmin before
  // roles were defined).
  const isTherapist = user?.role === 'therapist';

  const [view, setView] = useState<CalView>('week');
  const [panelOpen, setPanelOpen] = useState(true);
  const [sideTab, setSideTab] = useState<SideTab>('calendar');
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [miniMonth, setMiniMonth] = useState(() => new Date());
  const [search, setSearch] = useState('');
  const [blockOpen, setBlockOpen] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);
  const [bookingDate, setBookingDate] = useState<Date | null>(null);
  const [bookingTime, setBookingTime] = useState<string | undefined>(undefined);
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);

  const handleBookSlot = (d: Date, timeStr?: string) => {
    setBookingDate(d);
    setBookingTime(timeStr);
    setBookOpen(true);
  };

  const weekStart = useMemo(() => startOfWeek(anchorDate), [anchorDate]);
  const weekDates = useMemo(() => toWeekDates(weekStart), [weekStart]);

  // Fetch range covers whichever view is active, so switching views doesn't
  // need a fresh network round-trip most of the time.
  const rangeStart = view === 'month' ? startOfWeek(new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1)) : weekStart;
  const rangeEnd =
    view === 'month'
      ? addDays(startOfWeek(new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0)), 6)
      : addDays(weekStart, 6);

  const { appointments, loading, error, refetch } = useMyAppointments(rangeStart, rangeEnd, isTherapist);
  const { leaves, refetch: refetchLeaves } = useMyLeaves(rangeStart, rangeEnd, isTherapist);
  const { blockedSlots, refetch: refetchBlockedSlots } = useMyBlockedSlots(rangeStart, rangeEnd, isTherapist);
  const eventsByDate = useMemo(() => groupAppointmentsByDate(appointments), [appointments]);
  const hasEventsOn = (dateKey: string) => (eventsByDate[dateKey]?.length ?? 0) > 0;

  const searchMatchCount = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return 0;
    return Object.values(eventsByDate)
      .flat()
      .filter((ev) => (ev.name + ' ' + ev.type).toLowerCase().includes(q)).length;
  }, [search, eventsByDate]);

  // MiniCalendar's visible month grid (42 days) — fetched independently of
  // the main view's range since the mini-calendar can be browsing a
  // different month than the main grid.
  const miniGridStart = useMemo(() => startOfWeek(new Date(miniMonth.getFullYear(), miniMonth.getMonth(), 1)), [miniMonth]);
  const miniGridEnd = useMemo(
    () => addDays(startOfWeek(new Date(miniMonth.getFullYear(), miniMonth.getMonth() + 1, 0)), 6),
    [miniMonth],
  );
  const { byDate: availabilityByDate, loading: availabilityLoading, refetch: refetchAvailability } = useAvailabilityRange(
    miniGridStart,
    miniGridEnd,
    isTherapist,
  );

  // Agenda tab always shows "next 7 days from today", independent of
  // whichever range the main grid/view is currently showing — only fetched
  // when that tab is actually open.
  const agendaStart = useMemo(() => new Date(), []);
  const agendaEnd = useMemo(() => addDays(agendaStart, 7), [agendaStart]);
  const { appointments: agendaAppointments } = useMyAppointments(
    agendaStart,
    agendaEnd,
    isTherapist && sideTab === 'agenda',
  );
  const agendaEventsByDate = useMemo(() => groupAppointmentsByDate(agendaAppointments), [agendaAppointments]);

  useAutoSyncTimezone(isTherapist, refetchAvailability);

  const subtitle =
    view === 'day'
      ? formatDayFull(anchorDate)
      : view === 'week'
        ? formatWeekRange(weekStart)
        : formatMonthYear(anchorDate);

  const goDay = (d: Date) => {
    setAnchorDate(d);
    setMiniMonth(d);
    setView('day');
  };

  const selectMiniDay = (d: Date) => {
    setAnchorDate(d);
    setMiniMonth(d);
  };

  const navigate = (direction: 'prev' | 'next') => {
    const delta = direction === 'next' ? 1 : -1;
    setAnchorDate((d) => {
      const next =
        view === 'day' ? addDays(d, delta) : view === 'week' ? addDays(d, 7 * delta) : new Date(d.getFullYear(), d.getMonth() + delta, d.getDate());
      setMiniMonth(next);
      return next;
    });
  };

  return (
    <>
      <PageHeader title="Calendar" />

      <main className="flex-1 overflow-y-auto p-7">
        <CalendarToolbar
          subtitle={subtitle}
          search={search}
          onSearchChange={setSearch}
          searchMatchCount={searchMatchCount}
          view={view}
          onViewChange={setView}
          onPrev={() => navigate('prev')}
          onNext={() => navigate('next')}
          onToday={() => {
            const t = new Date();
            setAnchorDate(t);
            setMiniMonth(t);
          }}
          onBlockTimeOff={() => setBlockOpen(true)}
          onBook={() => handleBookSlot(anchorDate)}
        />

        {error && (
          <div className="mx-auto mb-4 max-w-[1400px] rounded-lg border border-[#E5C6C6] bg-[#FBEFEF] px-4 py-2.5 text-sm text-[#8E4848]">
            Couldn't load your appointments: {error}
          </div>
        )}

        {!isTherapist && (
          <div className="mx-auto mb-4 max-w-[1400px] rounded-lg border border-rule bg-surface-warm px-4 py-2.5 text-sm text-muted-text">
            This calendar shows a therapist's own schedule. Your account doesn't have a personal
            schedule to display — practice-wide scheduling views are on the roadmap.
          </div>
        )}

        <div className="relative mx-auto flex max-w-[1400px] items-start gap-5">
          <CalendarSidePanel
            open={panelOpen}
            sideTab={sideTab}
            onSideTabChange={setSideTab}
            monthAnchor={miniMonth}
            onMonthChange={setMiniMonth}
            selectedDay={anchorDate}
            onSelectDay={selectMiniDay}
            weekStart={weekStart}
            availabilityByDate={availabilityByDate}
            availabilityLoading={availabilityLoading}
            hasEventsOn={hasEventsOn}
            agendaEventsByDate={agendaEventsByDate}
          />

          <button
            type="button"
            onClick={() => setPanelOpen((v) => !v)}
            title={panelOpen ? 'Collapse panel' : 'Expand panel'}
            aria-label={panelOpen ? 'Collapse panel' : 'Expand panel'}
            className="absolute top-8 z-10 flex h-12 w-[18px] items-center justify-center rounded-r-md border border-l-0 border-rule bg-surface text-muted-text shadow-[0_1px_2px_0_rgba(28,24,18,.04)] transition-[left] duration-300 hover:bg-action-light/60 hover:text-action-dark"
            style={{ left: panelOpen ? '280px' : '0px' }}
          >
            {panelOpen ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>

          <div className="min-w-0 flex-1">
            {loading && (
              <div className="flex h-[624px] items-center justify-center rounded-[14px] border border-rule bg-surface text-sm text-muted-text">
                Loading appointments…
              </div>
            )}
            {!loading && view === 'week' && (
              <WeekView
                weekDates={weekDates}
                eventsByDate={eventsByDate}
                leaves={leaves}
                blockedSlots={blockedSlots}
                search={search}
                onSelectDay={goDay}
                onSelectEvent={setSelectedEvent}
                onSlotClick={handleBookSlot}
              />
            )}
            {!loading && view === 'day' && (
              <DayView
                day={anchorDate}
                events={eventsByDate[toDateKey(anchorDate)] ?? []}
                leaves={leaves}
                blockedSlots={blockedSlots}
                search={search}
                onSelectEvent={setSelectedEvent}
                onRescheduled={refetch}
                onSlotClick={handleBookSlot}
              />
            )}
            {!loading && view === 'month' && (
              <MonthView
                monthAnchor={anchorDate}
                eventsByDate={eventsByDate}
                onSelectDay={goDay}
                onSelectEvent={setSelectedEvent}
              />
            )}
          </div>
        </div>
      </main>

      {blockOpen && (
        <BlockTimeOffModal
          onClose={() => setBlockOpen(false)}
          onChanged={() => {
            refetch();
            refetchAvailability();
            refetchLeaves();
            refetchBlockedSlots();
          }}
        />
      )}
      {bookOpen && (
        <BookAppointmentModal 
          initialDate={bookingDate || anchorDate} 
          initialStartTime={bookingTime}
          onClose={() => { setBookOpen(false); setBookingTime(undefined); }} 
          onBooked={refetch} 
        />
      )}
      {selectedEvent && (
        <AppointmentDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onChanged={refetch}
        />
      )}
    </>
  );
}
