import { useMemo } from 'react';
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, type TooltipProps } from 'recharts';
import { PageHeader } from '../components/layout/PageHeader';
import { formatPaise } from '../lib/money';
import { useAnalytics } from './analytics/useAnalytics';
import type { AppointmentType } from '../api/appointmentsBackend';

/** Session-mix fill per real appointment type — reuses the app's existing
 *  categorical tokens (the same 4 hues the design's own session-mix bars and
 *  chat-card icon chips already use elsewhere), not new hardcoded colors. */
const SESSION_TYPE_BAR_CLASS: Record<AppointmentType, string> = {
  individual: 'bg-action',
  couples: 'bg-lavender',
  group: 'bg-sage',
  family: 'bg-ochre',
};

function RevenueTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const point = payload[0];
  const rupees = typeof point.value === 'number' ? point.value : 0;
  const label = (point.payload as { label: string } | undefined)?.label ?? '';
  return (
    <div className="rounded-lg border border-rule bg-surface px-3 py-2 text-xs shadow-[0_2px_8px_rgba(28,24,18,.08)]">
      <div className="font-medium text-ink">{label}</div>
      <div className="mt-0.5 font-semibold text-action-dark">{formatPaise(rupees * 100)}</div>
    </div>
  );
}

export default function AnalyticsPage() {
  const {
    revenue,
    sessionMix,
    sessionMixTotal,
    introSessionCount,
    attendance,
    attendanceDelta,
    loading,
    error,
  } = useAnalytics();

  const chartData = useMemo(
    () => revenue.map((r) => ({ label: r.label, rupees: Math.round(r.grossPaise / 100) })),
    [revenue],
  );
  const hasRevenue = revenue.some((r) => r.grossPaise > 0);

  const deltaColorClass = !attendanceDelta
    ? 'text-muted-text'
    : attendanceDelta.startsWith('+')
      ? 'text-action-dark'
      : attendanceDelta.startsWith('-')
        ? 'text-danger'
        : 'text-muted-text';

  return (
    <>
      <PageHeader title="Analytics" />

      <main className="flex-1 overflow-y-auto p-7">
        <div className="mx-auto max-w-[1200px]">
          {error && (
            <div className="mb-5 rounded-lg border border-[#E0B4B4] bg-[#FBEEEE] px-4 py-3 text-sm text-[#B06060]">
              {error}
            </div>
          )}

          {loading && (
            <div className="p-10 text-center text-sm text-muted-text">Loading analytics…</div>
          )}

          {!loading && (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[2fr_1fr]">
              <div className="rounded-[14px] border border-rule bg-surface p-6">
                <div className="mb-5 text-[11px] font-semibold uppercase tracking-wider text-muted-text">
                  Revenue — last 6 months
                </div>
                {hasRevenue ? (
                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 26, right: 8, left: 8, bottom: 0 }} barCategoryGap="24%">
                        <defs>
                          <linearGradient id="revenueBarFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--sage)" />
                            <stop offset="100%" stopColor="var(--action)" />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="label"
                          axisLine={false}
                          tickLine={false}
                          dy={8}
                          tick={{ fill: 'var(--muted-text)', fontSize: 11, fontWeight: 500 }}
                        />
                        <Tooltip cursor={{ fill: 'var(--action-light)' }} content={<RevenueTooltip />} />
                        <Bar dataKey="rupees" fill="url(#revenueBarFill)" radius={[8, 8, 3, 3]} maxBarSize={56}>
                          <LabelList
                            dataKey="rupees"
                            position="top"
                            formatter={(v: number) => formatPaise(v * 100)}
                            style={{ fill: 'var(--action-dark)', fontSize: 11, fontWeight: 600 }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex h-[220px] items-center justify-center text-center text-sm text-muted-text">
                    No session earnings in the last 6 months yet.
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-5">
                <div className="rounded-[14px] border border-rule bg-surface p-5">
                  <div className="mb-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-text">
                    Session mix
                  </div>
                  {sessionMixTotal === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-text">
                      No completed sessions in the last 6 months yet.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {sessionMix.map((bucket) => (
                        <div key={bucket.type}>
                          <div className="mb-1.5 flex justify-between text-[13px]">
                            <span className="text-[#48382E]">{bucket.label}</span>
                            <span className="text-[#8E7563]">{bucket.percent}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-surface-warm">
                            <div
                              className={`h-full rounded-full ${SESSION_TYPE_BAR_CLASS[bucket.type]}`}
                              style={{ width: `${bucket.percent}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {introSessionCount > 0 && (
                    <div className="mt-4 border-t border-rule pt-3 text-xs text-muted-text">
                      Includes {introSessionCount} intro session{introSessionCount === 1 ? '' : 's'}
                    </div>
                  )}
                </div>

                <div className="rounded-[14px] border border-rule bg-surface p-5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-text">
                    Attendance rate
                  </div>
                  <div className="mt-2 text-[26px] font-medium text-ink">
                    {attendance.rate === null ? '—' : `${attendance.rate}%`}
                  </div>
                  <div className={`mt-1 text-xs font-medium ${deltaColorClass}`}>
                    {attendanceDelta ?? (attendance.rate === null ? 'No completed sessions this month yet' : 'No prior month to compare')}
                    {attendance.noShow > 0 &&
                      ` · ${attendance.noShow} no-show${attendance.noShow === 1 ? '' : 's'}`}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
