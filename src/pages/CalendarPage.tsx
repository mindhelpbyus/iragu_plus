import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { useOrgContext, hasMultiTherapistCalendars } from './calendar/useOrgContext';
import { CalendarToolbar } from './calendar/CalendarToolbar';
import { CalendarSidePanel, type SideTab } from './calendar/CalendarSidePanel';
import { WeekView } from './calendar/WeekView';
import { DayView } from './calendar/DayView';
import { MonthView } from './calendar/MonthView';
import { TherapistFilter } from './calendar/TherapistFilter';
import { BlockTimeOffModal } from './calendar/BlockTimeOffModal';
import { BookAppointmentModal } from './calendar/BookAppointmentModal';
import { AppointmentDetailModal } from './calendar/AppointmentDetailModal';
import { type CalView, type CalEvent } from './calendar/calendarConstants';
import { useMyAppointments } from './calendar/useMyAppointments';
import { useMyLeaves } from './calendar/useMyLeaves';
import { useMyBlockedSlots } from './calendar/useMyBlockedSlots';
import { useAvailabilityRange } from './calendar/useAvailabilityRange';
import { useAutoSyncTimezone } from './calendar/useAutoSyncTimezone';
import { useOrgAppointments } from './calendar/useOrgAppointments';
import { groupAppointmentsByDate } from './calendar/appointmentAdapter';
import { groupOrgAppointmentsByDateAndTherapist } from './calendar/orgAppointmentAdapter';
import { getOrgTherapists, type TherapistSummary } from '../api/orgTherapists';
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
  const { orgContext } = useOrgContext();
  // Calendar is only meaningful for someone with their own therapist
  // schedule. A pure org_owner/admin management grant with no TherapistProfile
  // lands here with nothing personal to fetch — GET /therapists/me would 404
  // for them, so don't attempt it.
  const hasTherapistProfile = orgContext?.hasTherapistProfile ?? false;
  // The mode switch (My Calendar / Practice Calendar) only makes sense for
  // someone who has BOTH a personal schedule AND a real, permission-backed
  // org-wide grant to switch into — a solo/independent therapist has
  // org_owner-level *permissions* (via the backend's OrgRulesConfig implicit
  // elevation) but no `orgRoles` grant and no colleagues, so there is
  // nothing to switch to. Gated on the actual `calendar:view_org`
  // permission (hasMultiTherapistCalendars), not just "has some org role
  // row" — a future org role that holds orgRoles but not calendar:view_org
  // must not surface Practice mode or fire org-scoped fetches for it.
  const canViewPractice = hasMultiTherapistCalendars(orgContext);
  const showModeSwitch = hasTherapistProfile && canViewPractice;
  const [mode, setMode] = useState<'mine' | 'practice'>('mine');
  // A pure management grant (no TherapistProfile at all) has no "mine" to
  // show — force Practice mode and skip rendering the switch (Group H/task 32,
  // [LATER], is what actually renders anything for 'practice' mode; for now
  // this just prevents a personal-schedule fetch attempt for such a caller).
  const effectiveMode = hasTherapistProfile ? mode : 'practice';
  const isTherapist = hasTherapistProfile && effectiveMode === 'mine';
  // Gate the actual Practice-mode data fetches (getOrgTherapists/
  // getOrgAppointments) on the real calendar:view_org permission, not just
  // "effectiveMode resolved to practice" — a management-only grant that for
  // some reason lacks that permission must not fire org-scoped requests the
  // frontend has no basis to believe will succeed; the backend's 403 is the
  // authorization boundary, but the frontend shouldn't fire requests it
  // already knows (from its own permission set) are ungranted.
  const isPractice = effectiveMode === 'practice' && canViewPractice;

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
  const [bookingTherapistId, setBookingTherapistId] = useState<number | undefined>(undefined);
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);

  // Practice mode: the org's therapist roster (for TherapistFilter) and which
  // subset is currently selected. undefined = whole org (no filter applied).
  const [orgTherapists, setOrgTherapists] = useState<TherapistSummary[]>([]);
  const [orgTherapistsError, setOrgTherapistsError] = useState<string | null>(null);
  const [selectedTherapistIds, setSelectedTherapistIds] = useState<number[] | undefined>(undefined);

  const fetchOrgTherapists = useCallback(() => {
    if (!isPractice) return;
    let cancelled = false;
    setOrgTherapistsError(null);
    getOrgTherapists()
      .then((rows) => {
        if (!cancelled) setOrgTherapists(rows);
      })
      .catch((err) => {
        if (cancelled) return;
        setOrgTherapists([]);
        // A fetch failure must not look identical to "this org has no
        // therapists" — surface it so the user knows to retry rather than
        // concluding the practice roster is genuinely empty.
        setOrgTherapistsError(err instanceof Error ? err.message : 'Failed to load the practice therapist list');
      });
    return () => {
      cancelled = true;
    };
  }, [isPractice]);

  useEffect(() => {
    const cleanup = fetchOrgTherapists();
    return cleanup;
  }, [fetchOrgTherapists]);

  const handleBookSlot = (d: Date, timeStr?: string, therapistId?: number) => {
    setBookingDate(d);
    setBookingTime(timeStr);
    setBookingTherapistId(therapistId);
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

  // Practice mode data source — undefined selectedTherapistIds means "whole
  // org" server-side (design.md Component 7/8).
  const {
    appointments: orgAppointments,
    loading: orgLoading,
    error: orgError,
    refetch: refetchOrg,
  } = useOrgAppointments(rangeStart, rangeEnd, selectedTherapistIds, isPractice);
  const eventsByTherapist = useMemo(
    () => groupOrgAppointmentsByDateAndTherapist(orgAppointments),
    [orgAppointments],
  );
  // Task 38 — an explicit empty selection (Select None) shows a message
  // instead of an empty-looking grid; distinct from `undefined` (whole org).
  const isEmptySelection = isPractice && selectedTherapistIds !== undefined && selectedTherapistIds.length === 0;
  const therapistsForViews = isPractice
    ? orgTherapists.filter((t) => selectedTherapistIds === undefined || selectedTherapistIds.includes(t.id))
    : undefined;

  const searchMatchCount = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return 0;
    const events = isPractice
      ? Object.values(eventsByTherapist).flatMap((byTherapist) => Object.values(byTherapist).flat())
      : Object.values(eventsByDate).flat();
    return events.filter((ev) => (ev.name + ' ' + ev.type).toLowerCase().includes(q)).length;
  }, [search, eventsByDate, eventsByTherapist, isPractice]);

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
          showModeSwitch={showModeSwitch}
          mode={effectiveMode}
          onModeChange={setMode}
          therapistFilterSlot={
            isPractice ? (
              <TherapistFilter
                therapists={orgTherapists}
                selectedIds={selectedTherapistIds}
                onChange={setSelectedTherapistIds}
              />
            ) : undefined
          }
        />

        {!isPractice && error && (
          <div className="mx-auto mb-4 max-w-[1400px] rounded-lg border border-[#E5C6C6] bg-[#FBEFEF] px-4 py-2.5 text-sm text-[#8E4848]">
            Couldn't load your appointments: {error}
          </div>
        )}

        {isPractice && orgError && (
          <div className="mx-auto mb-4 max-w-[1400px] rounded-lg border border-[#E5C6C6] bg-[#FBEFEF] px-4 py-2.5 text-sm text-[#8E4848]">
            Couldn't load the practice calendar: {orgError}
          </div>
        )}

        {isPractice && orgTherapistsError && (
          <div className="mx-auto mb-4 flex max-w-[1400px] items-center justify-between gap-3 rounded-lg border border-[#E5C6C6] bg-[#FBEFEF] px-4 py-2.5 text-sm text-[#8E4848]">
            <span>Couldn't load the practice therapist list: {orgTherapistsError}</span>
            <button
              type="button"
              onClick={fetchOrgTherapists}
              className="flex-shrink-0 rounded-md border border-[#E5C6C6] px-2.5 py-1 text-xs font-semibold text-[#8E4848] hover:bg-[#F4E3E3]"
            >
              Retry
            </button>
          </div>
        )}

        {!isPractice && !isTherapist && (
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
            {(isPractice ? orgLoading : loading) && (
              <div className="flex h-[624px] items-center justify-center rounded-[14px] border border-rule bg-surface text-sm text-muted-text">
                Loading appointments…
              </div>
            )}
            {!(isPractice ? orgLoading : loading) && isEmptySelection && (
              <div className="flex h-[624px] items-center justify-center rounded-[14px] border border-rule bg-surface text-sm text-muted-text">
                Select one or more therapists to view their calendars.
              </div>
            )}
            {!(isPractice ? orgLoading : loading) && !isEmptySelection && view === 'week' && (
              <WeekView
                weekDates={weekDates}
                eventsByDate={eventsByDate}
                leaves={leaves}
                blockedSlots={blockedSlots}
                search={search}
                onSelectDay={goDay}
                onSelectEvent={setSelectedEvent}
                onSlotClick={handleBookSlot}
                therapists={therapistsForViews}
                eventsByTherapist={isPractice ? eventsByTherapist : undefined}
              />
            )}
            {!(isPractice ? orgLoading : loading) && !isEmptySelection && view === 'day' && (
              <DayView
                day={anchorDate}
                events={eventsByDate[toDateKey(anchorDate)] ?? []}
                leaves={leaves}
                blockedSlots={blockedSlots}
                search={search}
                onSelectEvent={setSelectedEvent}
                onRescheduled={refetch}
                onSlotClick={handleBookSlot}
                therapists={therapistsForViews}
                eventsByTherapist={isPractice ? eventsByTherapist : undefined}
              />
            )}
            {!(isPractice ? orgLoading : loading) && !isEmptySelection && view === 'month' && (
              <MonthView
                monthAnchor={anchorDate}
                eventsByDate={eventsByDate}
                onSelectDay={goDay}
                onSelectEvent={setSelectedEvent}
                search={search}
                therapists={therapistsForViews}
                eventsByTherapist={isPractice ? eventsByTherapist : undefined}
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
          fixedTherapistId={bookingTherapistId}
          onClose={() => { setBookOpen(false); setBookingTime(undefined); setBookingTherapistId(undefined); }}
          onBooked={() => { refetch(); refetchOrg(); }}
        />
      )}
      {selectedEvent && (
        <AppointmentDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onChanged={() => { refetch(); refetchOrg(); }}
        />
      )}
    </>
  );
}
