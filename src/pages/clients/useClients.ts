import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { getMyClients, getAdminClients, type BackendClient } from '../../api/clients';
import { getMyAppointments } from '../../api/appointmentsBackend';
import { getMyTherapistId } from '../../api/therapistMe';
import { getClientMoods, getDateRangeForMoods, type DailyMood } from '../../api/moods';
import type { ClientRow } from './types';

/**
 * Only a real org_owner/org_admin/admin (non-therapist Cognito role) uses the
 * paginated GET /clients admin list. A solo therapist has org_owner-level
 * *permissions* (see lib/roles.ts's effectiveRole elevation) but their
 * underlying role is still literally 'therapist' — they use their own
 * GET /therapist/me/clients caseload, same as any org-based therapist, not
 * the platform-wide admin listing. Check the raw role, not the elevated one.
 */
function usesAdminClientList(role: string | undefined): boolean {
  return role === 'org_admin' || role === 'admin' || role === 'org_owner';
}

const PAGE_SIZE = 10;

function toRow(c: BackendClient, stats?: { total: number; next: string | null }, moods: DailyMood[] = []): ClientRow {
  return {
    id: String(c.id),
    name: `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || c.email,
    email: c.email,
    phone: c.phone || '—',
    status: c.isActive === false ? 'inactive' : 'active',
    totalSessions: stats?.total ?? 0,
    nextAppointment: stats?.next ?? null,
    safetyRisk:
      c.clientProfile?.safetyRiskLevel === 'low' ||
      c.clientProfile?.safetyRiskLevel === 'medium' ||
      c.clientProfile?.safetyRiskLevel === 'high'
        ? c.clientProfile.safetyRiskLevel
        : undefined,
    dailyMoods: moods,
  };
}

export function useClients() {
  const user = useAuthStore((s) => s.user);
  const isOrg = usesAdminClientList(user?.role);

  const [rows, setRows] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        if (isOrg) {
          const res = await getAdminClients({
            page,
            limit: PAGE_SIZE,
            sortBy: 'lastName',
            sortOrder: 'asc',
            isActive: statusFilter === 'all' ? undefined : statusFilter === 'active' ? 'true' : 'false',
          });
          if (cancelled) return;

          const moodsArray = await Promise.all(res.data.map((c) => getClientMoods(c.id)));
          setRows(res.data.map((c, i) => toRow(c, undefined, moodsArray[i])));
          setTotalPages(res.pagination.totalPages);
          setTotal(res.pagination.total);
        } else if (user) {
          const myTherapistId = await getMyTherapistId();
          const [res, myAppointments] = await Promise.all([
            getMyClients({
              page,
              limit: PAGE_SIZE,
              isActive: statusFilter === 'all' ? undefined : statusFilter === 'active' ? 'true' : 'false',
            }),
            getMyAppointments(myTherapistId).catch(() => []),
          ]);
          if (cancelled) return;

          const statsByClient = new Map<string, { total: number; next: string | null }>();
          const now = Date.now();
          for (const a of myAppointments) {
            if (!a.client) continue;
            const clientId = String(a.client.id);
            const s = statsByClient.get(clientId) ?? { total: 0, next: null };
            if (a.status === 'completed') s.total++;
            const t = new Date(a.startTime).getTime();
            if (t > now && (a.status === 'confirmed' || a.status === 'scheduled')) {
              if (!s.next || a.startTime < s.next) s.next = a.startTime;
            }
            statsByClient.set(clientId, s);
          }

          const moodsArray = await Promise.all(res.data.map((c) => {
            const clientAppointments = myAppointments.filter((a) => a.client && a.client.id === c.id);
            const { startDate, endDate } = getDateRangeForMoods(clientAppointments);
            return getClientMoods(c.id, startDate, endDate);
          }));

          setRows(res.data.map((c, i) => toRow(c, statsByClient.get(String(c.id)), moodsArray[i])));
          setTotalPages(res.pagination.totalPages);
          setTotal(res.pagination.total);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load clients');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOrg, user, page, statusFilter]);

  return { rows, loading, error, page, setPage, totalPages, total, statusFilter, setStatusFilter, isOrg };
}
