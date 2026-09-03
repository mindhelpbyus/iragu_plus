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
import { usePayouts } from './payouts/usePayouts';
import type { PayoutRow } from '../api/billing';

const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  completed: { bg: '#E8F2EB', fg: '#175C3B' },
  processing: { bg: '#F2EAE0', fg: '#6B5545' },
  pending: { bg: '#F2EAE0', fg: '#6B5545' },
  on_hold: { bg: '#F5EDE8', fg: '#8E5A3D' },
  failed: { bg: '#FBEEEE', fg: '#B06060' },
};

function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.pending;
  return (
    <span
      className="inline-flex h-[22px] items-center rounded-full px-2.5 text-[11px] font-medium capitalize"
      style={{ background: s.bg, color: s.fg }}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function PayoutsPage() {
  const { summary, bankDetails, payouts, loading, error, page, setPage, totalPages, total } = usePayouts();

  return (
    <>
      <PageHeader title="Payouts" />

      <main className="flex-1 overflow-y-auto p-7">
        <div className="mx-auto max-w-[1200px]">
          {error && (
            <div className="mb-5 rounded-lg border border-[#E0B4B4] bg-[#FBEEEE] px-4 py-3 text-sm text-[#B06060]">
              {error}
            </div>
          )}

          {loading && !summary && <div className="p-10 text-center text-sm text-muted-text">Loading payouts…</div>}

          {summary && (
            <>
              <div className="mb-5 grid grid-cols-3 gap-5">
                <div className="rounded-[14px] border border-[#C8E1CF] bg-gradient-to-br from-action-light to-[#DCEBE0] p-5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-action-dark">
                    {summary.payout_blocked_reason ? 'Payout on hold' : `Next payout · ${formatDate(summary.next_payout_date)}`}
                  </div>
                  <div className="mt-2 text-[28px] font-medium text-[#0A3220]">
                    {formatPaise(summary.accrued_unpaid_net_paise)}
                  </div>
                  <div className="mt-1 text-xs font-medium text-action-dark">
                    {summary.payout_blocked_reason ??
                      `${summary.accrued_session_count} session${summary.accrued_session_count === 1 ? '' : 's'} accrued`}
                  </div>
                </div>

                <div className="rounded-[14px] border border-rule bg-surface p-5">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-text">
                      Payout account
                    </div>
                  </div>
                  {bankDetails?.active ? (
                    <div className="mt-3.5 flex items-center gap-3.5">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[10px] bg-action-light text-action-dark">
                        ₹
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-ink">
                          {bankDetails.bank_registered_name ?? 'Bank account'}
                          {bankDetails.account_last_4 ? ` ····${bankDetails.account_last_4}` : ''}
                        </div>
                        <div className="text-xs text-[#8E7563]">
                          {bankDetails.bank_verified ? 'Verified' : bankDetails.verification_status} · via Razorpay Route
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3.5 text-sm text-muted-text">
                      No payout account on file yet.
                    </div>
                  )}
                </div>

                <div className="rounded-[14px] border border-rule bg-surface p-5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-text">
                    Last payout
                  </div>
                  <div className="mt-2 text-[26px] font-medium text-ink">
                    {summary.last_payout_amount_paise != null ? formatPaise(summary.last_payout_amount_paise) : '—'}
                  </div>
                  <div className="mt-1 text-xs text-[#8E7563]">
                    {summary.last_payout_date ? formatDate(summary.last_payout_date) : 'No payouts yet'}
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-[14px] border border-rule bg-surface shadow-[0_1px_2px_0_rgba(28,24,18,.04)]">
                <div className="border-b border-rule px-5 py-4">
                  <div className="text-[15px] font-semibold text-ink">Payout history</div>
                  <div className="mt-0.5 text-xs text-muted-text">What Iragu+ paid you, per settlement</div>
                </div>

                <div
                  className="grid gap-3 border-b border-rule bg-canvas px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-text"
                  style={{ gridTemplateColumns: '.9fr .8fr .9fr .9fr .9fr 1fr' }}
                >
                  <span>Gross</span>
                  <span>Deductions</span>
                  <span>Net paid</span>
                  <span>Status</span>
                  <span>UTR reference</span>
                  <span>Date</span>
                </div>

                {!loading && payouts.length === 0 && (
                  <div className="p-10 text-center text-sm text-muted-text">No payouts yet.</div>
                )}

                {payouts.map((p: PayoutRow) => (
                  <div
                    key={p.id}
                    className="grid items-center gap-3 border-b border-action-light px-5 py-3 text-[13px] text-[#48382E] last:border-b-0"
                    style={{ gridTemplateColumns: '.9fr .8fr .9fr .9fr .9fr 1fr' }}
                  >
                    <span>{formatPaise(p.grossAmountPaise)}</span>
                    <span className="text-[#8E7563]">− {formatPaise(p.deductionsPaise)}</span>
                    <span className="font-semibold text-action-dark">{formatPaise(p.netAmountPaise)}</span>
                    <span>
                      <StatusPill status={p.status} />
                    </span>
                    <span className="truncate font-mono text-[11px] text-[#8E7563]">{p.utr ?? '—'}</span>
                    <span>{formatDate(p.completedAt ?? p.createdAt)}</span>
                  </div>
                ))}

                <div className="flex items-center justify-between border-t border-rule bg-canvas px-5 py-3">
                  <div className="text-xs text-muted-text">{total} total payout{total === 1 ? '' : 's'}</div>
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
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
