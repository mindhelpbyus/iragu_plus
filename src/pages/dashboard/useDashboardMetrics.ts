import { useEffect, useState } from 'react';
import { getMyClients } from '../../api/clients';
import { getMyAppointments } from '../../api/appointmentsBackend';
import { getMyTherapistId } from '../../api/therapistMe';
import { getClientMoods } from '../../api/moods';
import { analyzeMood } from '../../components/ui/MoodIndicator';

// Bounds the mood-aggregation fan-out to a reasonable sample rather than
// every client in a large caseload — same N+1-but-bounded pattern
// useClients.ts already uses (Promise.all over one page of clients), just
// applied here to a fixed sample instead of a paginated page.
const MOOD_SAMPLE_SIZE = 20;
const MOOD_LOOKBACK_DAYS = 14;

function startOfWeek(d: Date): Date {
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day; // Monday as the start of the week
  const result = new Date(d);
  result.setDate(d.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfWeek(d: Date): Date {
  const start = startOfWeek(d);
  const result = new Date(start);
  result.setDate(start.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
}

export interface DashboardMetrics {
  activeClients: number | null;
  sessionsThisWeek: number | null;
  sessionsToday: number | null;
  avgMoodScore: string | null;
  loading: boolean;
}

/**
 * Real dashboard metrics — replaces the previous hardcoded mockData.ts
 * METRICS array. Revenue and a practice-wide activity feed are still
 * DELIBERATELY not included here: EarningsPage now has a real
 * billing_payment integration (api/billing.ts), but surfacing a revenue
 * figure on the Dashboard is its own product decision (which period, which
 * card) — not assumed here. There is still no activity/task feed endpoint
 * anywhere in this app (tracked as Part G.2/G.3) — showing a number for
 * that would be the exact fake-data problem this hook exists to fix.
 */
export function useDashboardMetrics(): DashboardMetrics {
  const [activeClients, setActiveClients] = useState<number | null>(null);
  const [sessionsThisWeek, setSessionsThisWeek] = useState<number | null>(null);
  const [sessionsToday, setSessionsToday] = useState<number | null>(null);
  const [avgMoodScore, setAvgMoodScore] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const therapistId = await getMyTherapistId();
        const now = new Date();
        const weekStart = startOfWeek(now);
        const weekEnd = endOfWeek(now);
        const todayKey = now.toISOString().slice(0, 10);

        const [clientsRes, weekAppointments] = await Promise.all([
          getMyClients({ isActive: 'true', limit: MOOD_SAMPLE_SIZE }),
          getMyAppointments(therapistId, {
            startDate: weekStart.toISOString().slice(0, 10),
            endDate: weekEnd.toISOString().slice(0, 10),
          }).catch(() => []),
        ]);
        if (cancelled) return;

        const liveAppointments = weekAppointments.filter((a) => a.status !== 'cancelled');
        setSessionsThisWeek(liveAppointments.length);
        setSessionsToday(liveAppointments.filter((a) => a.startTime.slice(0, 10) === todayKey).length);
        setActiveClients(clientsRes.pagination.total);

        const moodEnd = now.toISOString();
        const moodStart = new Date(now.getTime() - MOOD_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
        const moodsArrays = await Promise.all(
          clientsRes.data.map((c) => getClientMoods(c.id, moodStart, moodEnd).catch(() => [])),
        );
        if (cancelled) return;
        setAvgMoodScore(analyzeMood(moodsArrays.flat()));
      } catch {
        // Leave metrics null — the UI shows an honest loading/empty state
        // rather than a fabricated number.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { activeClients, sessionsThisWeek, sessionsToday, avgMoodScore, loading };
}
