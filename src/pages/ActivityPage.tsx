/**
 * pages/ActivityPage.tsx — a real, chronological, filterable practice-wide
 * activity log (All / Sessions / Notes / Payments / Messages / Clients).
 *
 * Design reference: designs/Iragu+ CRM.dc.html, `isActivity` block
 * (~line 1652) — timeline rail with per-event dots, filter pills row.
 *
 * NOT the Tasks feature's TaskActivityFeed.tsx (pages/dashboard) — that's a
 * checkbox/category to-do widget on the Dashboard. This page is read-only,
 * for oversight/audit, and pulls from five independent real backends; see
 * pages/activity/useActivity.ts for the merge.
 */
import { PageHeader } from '../components/layout/PageHeader';
import { useActivity, ACTIVITY_CATEGORIES, type ActivityFilter } from './activity/useActivity';

const FILTERS: ActivityFilter[] = ['all', ...ACTIVITY_CATEGORIES];

function formatEventTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const dayDiff = Math.round((startOfDay(now).getTime() - startOfDay(d).getTime()) / 86_400_000);

  if (dayDiff === 0) return `Today · ${time}`;
  if (dayDiff === 1) return `Yesterday · ${time}`;
  if (dayDiff > 1 && dayDiff < 7) return `${d.toLocaleDateString('en-IN', { weekday: 'short' })} · ${time}`;
  return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · ${time}`;
}

export default function ActivityPage() {
  const { items, totalCount, loading, error, filter, setFilter } = useActivity();
  const showMessagesNote = filter === 'all' || filter === 'Messages';

  return (
    <>
      <PageHeader title="Activity" />
      <main className="flex-1 overflow-y-auto p-7">
        <div className="mx-auto max-w-[820px]">
          <div className="mb-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-[28px] font-medium tracking-tight text-ink">Activity</h2>
              <p className="mt-1 text-sm text-muted-text">
                A complete, timestamped log of everything that happened across your practice — for
                oversight and audit, not action.
              </p>
            </div>
          </div>

          <div className="my-4 flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`h-[30px] rounded-full border px-3 text-xs font-medium transition-colors ${
                  filter === f
                    ? 'border-action-border bg-action-light text-action-dark'
                    : 'border-rule bg-surface text-body-text hover:bg-action-light/40'
                }`}
              >
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </div>

          {showMessagesNote && (
            <p className="mb-5 rounded-lg border border-rule bg-canvas px-3 py-2 text-xs text-muted-text">
              Messages shows only the most recent message per conversation, not a complete
              message log.
            </p>
          )}

          {loading && <div className="py-10 text-center text-sm text-muted-text">Loading activity…</div>}

          {!loading && error && (
            <div className="mb-4 rounded-lg border border-[#E5C6C6] bg-[#FBEFEF] px-4 py-2.5 text-sm text-[#8E4848]">
              {error}
            </div>
          )}

          {!loading && !error && totalCount === 0 && (
            <div className="rounded-[14px] border border-rule bg-surface p-10 text-center text-sm text-muted-text">
              No activity in the last 30 days.
            </div>
          )}

          {!loading && !error && totalCount > 0 && items.length === 0 && (
            <div className="rounded-[14px] border border-rule bg-surface p-10 text-center text-sm text-muted-text">
              No {filter} activity in the last 30 days.
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <div className="relative pl-6">
              <div className="absolute bottom-1.5 left-[5px] top-1.5 w-[2px] bg-rule" />
              {items.map((event) => (
                <div key={event.id} className="relative pb-5">
                  <span
                    className="absolute -left-6 top-0.5 h-3 w-3 rounded-full border-2 border-canvas"
                    style={{ background: event.dotColor }}
                  />
                  <div className="mb-0.5 text-[11px] text-muted-text">{formatEventTimestamp(event.timestamp)}</div>
                  <div className="text-sm leading-relaxed text-ink">
                    <b>{event.actor}</b> {event.text}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
