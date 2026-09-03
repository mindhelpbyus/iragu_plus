import { PageHeader } from '../components/layout/PageHeader';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../components/ui/pagination';
import { formatPaise } from '../lib/money';
import { useEarnings } from './earnings/useEarnings';
import type { TransactionRow } from '../api/billing';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function formatPeriod(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return `${fmt(s)} – ${fmt(e)}`;
}

export default function EarningsPage() {
  const { summary, transactions, clientNames, loading, error, page, setPage, totalPages, total } = useEarnings();

  return (
    <>
      <PageHeader title="Earnings" />

      <main className="flex-1 overflow-y-auto p-7">
        <div className="mx-auto max-w-[1200px]">
          {error && (
            <div className="mb-5 rounded-lg border border-[#E0B4B4] bg-[#FBEEEE] px-4 py-3 text-sm text-[#B06060]">
              {error}
            </div>
          )}

          {loading && !summary && <div className="p-10 text-center text-sm text-muted-text">Loading earnings…</div>}

          {summary && (
            <>
              <div className="mb-5 grid grid-cols-3 gap-5">
                <div className="rounded-[14px] border border-[#C8E1CF] bg-gradient-to-br from-action-light to-[#DCEBE0] p-5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-action-dark">
                    Available for payout
                  </div>
                  <div className="mt-2 text-[28px] font-medium text-[#0A3220]">
                    {formatPaise(summary.accrued_unpaid_net_paise)}
                  </div>
                  <div className="mt-1 text-xs font-medium text-action-dark">
                    {summary.payout_blocked_reason
                      ? summary.payout_blocked_reason
                      : `${summary.accrued_session_count} session${summary.accrued_session_count === 1 ? '' : 's'} · pays out ${formatDate(summary.next_payout_date)}`}
                  </div>
                </div>

                <div className="rounded-[14px] border border-rule bg-surface p-5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-text">
                    Cycle gross earnings ({formatPeriod(summary.current_period_start, summary.current_period_end)})
                  </div>
                  <div className="mt-2 text-[26px] font-medium text-ink">
                    {formatPaise(summary.current_period_gross_paise)}
                  </div>
                  <div className="mt-1 text-xs text-muted-text">
                    {summary.current_period_sessions} completed session{summary.current_period_sessions === 1 ? '' : 's'}
                  </div>
                </div>

                <div className="rounded-[14px] border border-rule bg-surface p-5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-text">
                    Cycle deductions
                  </div>
                  <div className="mt-2 text-[26px] font-medium text-ink">
                    {formatPaise(summary.current_period_commission_paise + summary.current_period_tds_paise)}
                  </div>
                  <div className="mt-1 text-xs text-muted-text">
                    Platform fee {formatPaise(summary.current_period_commission_paise)} · TDS{' '}
                    {formatPaise(summary.current_period_tds_paise)}
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-[14px] border border-rule bg-surface shadow-[0_1px_2px_0_rgba(28,24,18,.04)]">
                <div className="border-b border-rule px-5 py-4">
                  <div className="text-[15px] font-semibold text-ink">Session earnings</div>
                  <div className="mt-0.5 text-xs text-muted-text">
                    What the client paid, what Iragu+ deducts, and what you receive
                  </div>
                </div>

                <div
                  className="grid gap-3 border-b border-rule bg-canvas px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-text"
                  style={{ gridTemplateColumns: '1.4fr 1fr .8fr .9fr .7fr .8fr' }}
                >
                  <span>Client</span>
                  <span>Date</span>
                  <span>Gross</span>
                  <span>Platform</span>
                  <span>TDS</span>
                  <span className="text-right">Your net</span>
                </div>

                {!loading && transactions.length === 0 && (
                  <div className="p-10 text-center text-sm text-muted-text">No session earnings yet.</div>
                )}

                {transactions.map((tx: TransactionRow) => (
                  <div
                    key={tx.id}
                    className="grid items-center gap-3 border-b border-action-light px-5 py-3 text-[13px] text-[#48382E] last:border-b-0"
                    style={{ gridTemplateColumns: '1.4fr 1fr .8fr .9fr .7fr .8fr' }}
                  >
                    <span className="truncate font-medium text-ink">
                      {tx.appointmentId != null ? clientNames.get(Number(tx.appointmentId)) ?? '—' : '—'}
                    </span>
                    <span>{formatDate(tx.occurredAt)}</span>
                    <span>{formatPaise(tx.grossPaise)}</span>
                    <span className="text-[#8E7563]">− {formatPaise(tx.platformCommissionPaise ?? 0)}</span>
                    <span className="text-[#8E7563]">− {formatPaise(tx.tdsPaise ?? 0)}</span>
                    <span className="text-right font-semibold text-action-dark">{formatPaise(tx.netPaise)}</span>
                  </div>
                ))}

                <div className="flex items-center justify-between border-t border-rule bg-canvas px-5 py-3">
                  <div className="text-xs text-muted-text">{total} total session{total === 1 ? '' : 's'}</div>
                  {totalPages > 1 && (
                    <Pagination className="mx-0 w-auto justify-end">
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

                <div className="flex items-center gap-2 border-t border-rule bg-canvas px-5 py-3 text-xs text-[#8E7563]">
                  TDS deposited against your PAN under §194-O · reflected in your Form 26AS
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
