import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/button';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../components/ui/pagination';
import { useClients } from './clients/useClients';
import { initialsOf } from './calendar/calendarConstants';
import { MoodIndicator } from '../components/ui/MoodIndicator';

const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  active: { bg: '#E8F2EB', fg: '#175C3B' },
  inactive: { bg: '#F2EAE0', fg: '#6B5545' },
};

function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.inactive;
  return (
    <span
      className="rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize"
      style={{ background: s.bg, color: s.fg }}
    >
      {status}
    </span>
  );
}

function formatNext(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { weekday: 'short' }) + ' · ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function ClientsPage() {
  const navigate = useNavigate();
  const { rows, loading, error, page, setPage, totalPages, total, statusFilter, setStatusFilter, isOrg } = useClients();

  return (
    <>
      <PageHeader title="Clients" />

      <main className="flex-1 overflow-y-auto p-7">
        <div className="mx-auto max-w-[1400px]">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-[28px] font-medium tracking-tight text-ink">Clients</h2>
              <p className="mt-1 text-sm text-muted-text">
                {total} {isOrg ? 'total' : 'in your caseload'}
              </p>
            </div>
            <Button className="h-10 gap-2" onClick={() => navigate('/clients?new=1')}>
              <Plus className="h-4 w-4" />
              New client
            </Button>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-muted-text" />
              <input
                placeholder="Search by name or email"
                className="h-9 w-[240px] rounded-lg border border-rule bg-surface pl-[30px] pr-2.5 text-[13px] text-ink outline-none transition-colors focus:border-action"
              />
            </div>
            {(['all', 'active', 'inactive'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`h-9 rounded-lg border px-3 text-[13px] font-medium capitalize transition-colors ${
                  statusFilter === s
                    ? 'border-action bg-action-light text-action-dark'
                    : 'border-rule bg-surface text-[#48382E] hover:bg-action-light/40'
                }`}
              >
                {s === 'all' ? 'All statuses' : s}
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-[14px] border border-rule bg-surface shadow-[0_1px_2px_0_rgba(28,24,18,.04)]">
            <div
              className="grid gap-3 border-b border-rule bg-canvas px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-text"
              style={{ gridTemplateColumns: '2.2fr 1fr 0.7fr 1fr 1.2fr' }}
            >
              <span>Client</span>
              <span>Status</span>
              <span>Sessions</span>
              <span>Mood</span>
              <span>Next session</span>
            </div>

            {loading && <div className="p-10 text-center text-sm text-muted-text">Loading clients…</div>}
            {error && <div className="p-10 text-center text-sm text-[#B06060]">{error}</div>}
            {!loading && !error && rows.length === 0 && (
              <div className="p-10 text-center text-sm text-muted-text">No clients found.</div>
            )}

            {!loading &&
              !error &&
              rows.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => navigate(`/clients/${c.id}`)}
                  className="grid w-full items-center gap-3 border-b border-action-light px-5 py-3 text-left transition-colors last:border-b-0 hover:bg-action-light/30"
                  style={{ gridTemplateColumns: '2.2fr 1fr 0.7fr 1fr 1.2fr' }}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-action-light text-xs font-semibold text-action-dark">
                      {initialsOf(c.name)}
                    </span>
                    <span className="min-w-0">
                      <div className="truncate text-[13.5px] font-medium text-ink">{c.name}</div>
                      <div className="truncate text-xs text-muted-text">{c.email}</div>
                    </span>
                  </span>
                  <span>
                    <StatusPill status={c.status} />
                  </span>
                  <span className="text-[13px] text-ink">{c.totalSessions}</span>
                  <span>
                    <MoodIndicator moods={c.dailyMoods} />
                  </span>
                  <span className="text-[13px] text-ink">{formatNext(c.nextAppointment)}</span>
                </button>
              ))}
          </div>

          {totalPages > 1 && (
            <Pagination className="mt-5 justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className={page === 1 ? 'pointer-events-none opacity-40' : 'cursor-pointer'}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .slice(Math.max(0, page - 3), page + 2)
                  .map((p) => (
                    <PaginationItem key={p}>
                      <PaginationLink isActive={p === page} onClick={() => setPage(p)} className="cursor-pointer">
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className={page === totalPages ? 'pointer-events-none opacity-40' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </main>
    </>
  );
}
