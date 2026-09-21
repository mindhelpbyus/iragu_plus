import { useEffect, useState } from 'react';
import { listTransactions, type TransactionRow } from '../../api/billing';
import { getMyAppointments, type AppointmentType, type RawAppointment } from '../../api/appointmentsBackend';
import { getMyTherapistId } from '../../api/therapistMe';

/** This backend's transaction list caps pageSize at 100 (billing_payment's
 *  transactionQuery validator) — see fetchAllTransactions below, which pages
 *  through the real ledger rather than assuming one page covers 6 months. */
const TRANSACTIONS_PAGE_SIZE = 100;

/** YYYY-MM-DD in local time — deliberately not `toISOString().slice(0,10)`,
 *  which converts to UTC first and can shift a month boundary to the wrong
 *  calendar day for an IST caller (see pages/calendar/dateUtils.ts's
 *  `toDateKey`, the same fix already applied there). */
function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ─── Revenue (last 6 months) ───────────────────────────────────────────────

export interface MonthlyRevenue {
  year: number;
  month: number; // 0-11
  /** Short month label, e.g. "Apr". */
  label: string;
  grossPaise: number;
}

/** The 6 calendar months ending with the current month, oldest first. */
export function lastSixMonths(now: Date = new Date()): { year: number; month: number }[] {
  const out: { year: number; month: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ year: d.getFullYear(), month: d.getMonth() });
  }
  return out;
}

/**
 * Sums real gross session-earning amounts (what the client paid, before
 * platform commission/TDS — `grossPaise` on api/billing.ts's TransactionRow,
 * the same field EarningsPage's cycle card reads) per calendar month, across
 * the given window. No backend revenue rollup exists (billing_payment has no
 * such route) — this is real client-side aggregation over the same
 * transaction ledger EarningsPage already reads, never mocked data. Revenue
 * (gross, what was billed) is deliberately not `netPaise` (take-home after
 * deductions) — that number is already Earnings' subject.
 */
export function aggregateMonthlyRevenue(
  transactions: Pick<TransactionRow, 'occurredAt' | 'grossPaise'>[],
  months: { year: number; month: number }[]
): MonthlyRevenue[] {
  const sums = new Map<string, number>();
  for (const tx of transactions) {
    if (!tx.occurredAt) continue;
    const d = new Date(tx.occurredAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    sums.set(key, (sums.get(key) ?? 0) + tx.grossPaise);
  }
  return months.map(({ year, month }) => ({
    year,
    month,
    label: new Date(year, month, 1).toLocaleDateString('en-IN', { month: 'short' }),
    grossPaise: sums.get(`${year}-${month}`) ?? 0,
  }));
}

async function fetchAllTransactions(dateFrom: string): Promise<TransactionRow[]> {
  const all: TransactionRow[] = [];
  let page = 1;
  for (;;) {
    const res = await listTransactions({
      types: ['session_earning'],
      dateFrom,
      page,
      pageSize: TRANSACTIONS_PAGE_SIZE,
    });
    all.push(...res.data);
    if (page >= res.pagination.totalPages || res.data.length === 0) break;
    page += 1;
  }
  return all;
}

// ─── Session mix ────────────────────────────────────────────────────────────

/** The REAL Appointment.type enum (prisma/schema.prisma) — 4 clinical
 *  session types. The design mock shows Individual/Couples/Group/Intake;
 *  there is no 5th "Intake" appointment type anywhere in the schema, so that
 *  bucket is not reproduced here (see design-gap-checklist.md). */
export const SESSION_TYPE_ORDER: readonly AppointmentType[] = ['individual', 'couples', 'group', 'family'];

const SESSION_TYPE_LABELS: Record<AppointmentType, string> = {
  individual: 'Individual',
  couples: 'Couples',
  group: 'Group',
  family: 'Family',
};

export interface SessionMixBucket {
  type: AppointmentType;
  label: string;
  count: number;
  /** Rounded 0-100; 0 when there are no sessions in the window. */
  percent: number;
}

/**
 * Buckets completed sessions by the real `type` field. `sessionCategory`
 * ('intro'|'regular') is a separate flag layered on one of these 4 types,
 * not a bucket of its own — see countIntroSessions below, surfaced as a
 * secondary note rather than a fabricated 5th slice.
 */
export function bucketSessionMix(appointments: Pick<RawAppointment, 'type'>[]): SessionMixBucket[] {
  const total = appointments.length;
  const counts = new Map<AppointmentType, number>();
  for (const a of appointments) counts.set(a.type, (counts.get(a.type) ?? 0) + 1);
  return SESSION_TYPE_ORDER.map((type) => {
    const count = counts.get(type) ?? 0;
    return {
      type,
      label: SESSION_TYPE_LABELS[type],
      count,
      percent: total === 0 ? 0 : Math.round((count / total) * 100),
    };
  });
}

/** How many of the window's sessions were the client's intro session —
 *  reported as a secondary note (see AnalyticsPage), not forced into its own
 *  session-mix bucket the schema doesn't support. */
export function countIntroSessions(appointments: Pick<RawAppointment, 'sessionCategory'>[]): number {
  return appointments.filter((a) => a.sessionCategory === 'intro').length;
}

// ─── Attendance ─────────────────────────────────────────────────────────────

export interface AttendanceStats {
  completed: number;
  noShow: number;
  /** Rounded 0-100; null when there's no completed+no-show data to divide by
   *  (never fabricate a rate from an empty window). */
  rate: number | null;
}

/**
 * The real wire value is 'no_show' (underscore) — backend-initial's
 * src/shared/appointment-status.ts is the single source of truth and
 * deliberately keeps no alias for the legacy 'no-show' (hyphen) spelling.
 * This frontend's own RawAppointment type still types the hyphenated form,
 * though, so both are matched defensively here — the same hedge
 * pages/calendar/orgAppointmentAdapter.ts's HIDDEN_STATUSES already takes.
 */
function isNoShow(status: string): boolean {
  return status === 'no_show' || status === 'no-show';
}

export function computeAttendance(appointments: { status: string }[]): AttendanceStats {
  const completed = appointments.filter((a) => a.status === 'completed').length;
  const noShow = appointments.filter((a) => isNoShow(a.status)).length;
  const denom = completed + noShow;
  return { completed, noShow, rate: denom === 0 ? null : Math.round((completed / denom) * 100) };
}

/** "+N% vs last month" / "N% vs last month" / "Same as last month" — null
 *  only when either side has no rate to compare (never fabricate a delta),
 *  mirroring dashboard/useDashboardMetrics.ts's formatSessionsDelta. */
export function formatAttendanceDelta(current: number | null, previous: number | null): string | null {
  if (current === null || previous === null) return null;
  const diff = current - previous;
  if (diff === 0) return 'Same as last month';
  return diff > 0 ? `+${diff}% vs last month` : `${diff}% vs last month`;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

function monthBounds(year: number, month: number): { start: Date; end: Date } {
  return { start: new Date(year, month, 1), end: new Date(year, month + 1, 0) };
}

export interface AnalyticsData {
  revenue: MonthlyRevenue[];
  sessionMix: SessionMixBucket[];
  sessionMixTotal: number;
  introSessionCount: number;
  attendance: AttendanceStats;
  attendanceDelta: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * Real analytics for the last 6 months — no mocked data, no backend rollup
 * to lean on. Revenue and session mix reuse the same real endpoints
 * EarningsPage/Calendar already call (billing_payment's transactions ledger,
 * backend-initial's GET /appointments/therapist); attendance issues two more
 * calls to the same appointments endpoint with a status filter. See the
 * exported pure functions above for the aggregation logic — tested in
 * useAnalytics.test.ts.
 */
export function useAnalytics(): AnalyticsData {
  const [revenue, setRevenue] = useState<MonthlyRevenue[]>([]);
  const [sessionMix, setSessionMix] = useState<SessionMixBucket[]>([]);
  const [sessionMixTotal, setSessionMixTotal] = useState(0);
  const [introSessionCount, setIntroSessionCount] = useState(0);
  const [attendance, setAttendance] = useState<AttendanceStats>({ completed: 0, noShow: 0, rate: null });
  const [attendanceDelta, setAttendanceDelta] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const therapistId = await getMyTherapistId();
        const now = new Date();
        const months = lastSixMonths(now);
        const windowStart = monthBounds(months[0].year, months[0].month).start;
        const thisMonth = monthBounds(now.getFullYear(), now.getMonth());
        const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonth = monthBounds(prevMonthDate.getFullYear(), prevMonthDate.getMonth());

        const [transactions, mixAppointments, thisMonthAppts, lastMonthAppts] = await Promise.all([
          fetchAllTransactions(toDateKey(windowStart)).catch(() => [] as TransactionRow[]),
          getMyAppointments(therapistId, {
            startDate: toDateKey(windowStart),
            endDate: toDateKey(now),
            status: 'completed',
          }).catch(() => [] as RawAppointment[]),
          getMyAppointments(therapistId, {
            startDate: toDateKey(thisMonth.start),
            endDate: toDateKey(thisMonth.end),
            status: 'completed,no_show',
          }).catch(() => null),
          getMyAppointments(therapistId, {
            startDate: toDateKey(lastMonth.start),
            endDate: toDateKey(lastMonth.end),
            status: 'completed,no_show',
          }).catch(() => null),
        ]);
        if (cancelled) return;

        setRevenue(aggregateMonthlyRevenue(transactions, months));
        setSessionMix(bucketSessionMix(mixAppointments));
        setSessionMixTotal(mixAppointments.length);
        setIntroSessionCount(countIntroSessions(mixAppointments));

        const thisStats = thisMonthAppts ? computeAttendance(thisMonthAppts) : { completed: 0, noShow: 0, rate: null };
        const lastStats = lastMonthAppts ? computeAttendance(lastMonthAppts) : null;
        setAttendance(thisStats);
        setAttendanceDelta(formatAttendanceDelta(thisStats.rate, lastStats?.rate ?? null));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    revenue,
    sessionMix,
    sessionMixTotal,
    introSessionCount,
    attendance,
    attendanceDelta,
    loading,
    error,
  };
}
