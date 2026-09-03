import { useEffect, useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { formatPaise } from '../lib/money';
import { getFeeBreakdown, type FeeBreakdown } from '../api/billing';

/** Illustrative only — real session fees are set per-therapist in Settings → Services. */
const EXAMPLE_SESSION_AMOUNT_PAISE = 150000;

export default function PlansPage() {
  const [breakdown, setBreakdown] = useState<FeeBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getFeeBreakdown(EXAMPLE_SESSION_AMOUNT_PAISE);
        if (!cancelled) setBreakdown(res);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load pricing');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <PageHeader title="Plans" />

      <main className="flex-1 overflow-y-auto p-7">
        <div className="mx-auto max-w-[640px]">
          {error && (
            <div className="mb-5 rounded-lg border border-[#E0B4B4] bg-[#FBEEEE] px-4 py-3 text-sm text-[#B06060]">
              {error}
            </div>
          )}

          <div className="rounded-[14px] border border-rule bg-surface p-6">
            <div className="flex items-center gap-2.5 text-base font-semibold text-ink">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1E7048" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 3h12" />
                <path d="M6 8h12" />
                <path d="m6 13 8.5 8" />
                <path d="M6 13h3" />
                <path d="M9 13c6.667 0 6.667-10 0-10" />
              </svg>
              Per-session marketplace pricing
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-text">
              There are no subscription tiers. Clients pay per session (Razorpay); you receive automated payouts
              with TDS handled for you
              {breakdown ? (
                <>
                  ; Iragu+ takes a <span className="font-semibold text-ink">{breakdown.rates.platformFeeRatePct}%</span>{' '}
                  commission
                </>
              ) : (
                '; Iragu+ takes a commission'
              )}{' '}
              set in billing configuration. Session fees are set by you in Settings → Services.
            </p>
          </div>

          {loading && !breakdown && (
            <div className="mt-5 p-10 text-center text-sm text-muted-text">Loading current rates…</div>
          )}

          {breakdown && (
            <div className="mt-5 rounded-[14px] border border-rule bg-surface p-6">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-text">
                Worked example · {formatPaise(EXAMPLE_SESSION_AMOUNT_PAISE)} session
              </div>
              <div className="mt-4 flex flex-col gap-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-text">Client pays (session fee + platform fee + GST)</span>
                  <span className="font-semibold text-ink">{formatPaise(breakdown.clientCharges.totalChargedPaise)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-text">Platform commission ({breakdown.rates.platformFeeRatePct}%)</span>
                  <span className="text-[#8E7563]">− {formatPaise(breakdown.clientCharges.platformFee)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-text">GST on platform fee ({breakdown.rates.gstRatePct}%)</span>
                  <span className="text-[#8E7563]">− {formatPaise(breakdown.clientCharges.platformFeeGst)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between border-t border-rule pt-3 text-sm">
                  <span className="font-medium text-ink">You receive</span>
                  <span className="font-semibold text-action-dark">{formatPaise(breakdown.therapistReceives.amountPaise)}</span>
                </div>
              </div>
              <p className="mt-4 text-xs text-muted-text">
                The platform fee and GST are charged to the client on top of your session fee — they are not
                deducted from what you receive. TDS is deducted separately at payout; see Earnings.
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
