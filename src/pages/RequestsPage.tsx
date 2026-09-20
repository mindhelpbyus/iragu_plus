import { useMemo, useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/button';
import { Calendar as CalendarIcon } from 'lucide-react';
import { useRequests } from './requests/useRequests';
import { initialsOf } from './calendar/calendarConstants';
import type { RequestItem } from '../api/requests';

const STATUS_FILTERS = ['pending', 'approved', 'declined'] as const;

export function formatAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function formatSlot(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export function itemName(item: RequestItem): string {
  return item.kind === 'inquiry' ? item.prospectName ?? 'A prospective client' : item.clientName ?? 'A client';
}

export function itemSubtitle(item: RequestItem): string {
  return item.kind === 'inquiry' ? item.message : item.reason || 'Would like to move this session';
}

function itemSlotLine(item: RequestItem): string {
  return item.kind === 'inquiry'
    ? `${formatSlot(item.requestedStartTime)} · ${item.requestedMode === 'in_person' ? 'In person' : 'Video'}`
    : `${formatSlot(item.currentStartTime)} → ${formatSlot(item.requestedStartTime)}`;
}

export default function RequestsPage() {
  const { requests, loading, error, isFeatureDisabled, decidingId, decide } = useRequests();
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('pending');

  const visible = useMemo(
    () => requests.filter((r) => r.status === statusFilter),
    [requests, statusFilter],
  );

  return (
    <>
      <PageHeader title="Requests" />
      <main className="flex-1 overflow-y-auto p-7">
        <div className="mx-auto max-w-[860px]">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-[28px] font-medium tracking-tight text-ink">Requests</h2>
              <p className="mt-1 text-sm text-muted-text">
                {loading ? 'Loading…' : `${requests.filter((r) => r.status === 'pending').length} pending`}
              </p>
            </div>
            <div className="flex gap-1.5">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`h-8 rounded-full border px-3 text-xs font-medium capitalize transition-colors ${
                    statusFilter === s
                      ? 'border-action-border bg-action-light text-action-dark'
                      : 'border-rule bg-surface text-[#48382E] hover:bg-action-light/40'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {isFeatureDisabled && (
            <div className="rounded-[14px] border border-rule bg-surface p-10 text-center text-sm text-muted-text">
              The Requests workflow isn't turned on for your practice yet.
            </div>
          )}

          {!isFeatureDisabled && error && (
            <div className="mb-4 rounded-lg border border-[#E5C6C6] bg-[#FBEFEF] px-4 py-2.5 text-sm text-[#8E4848]">{error}</div>
          )}

          {!isFeatureDisabled && !loading && !error && visible.length === 0 && (
            <div className="rounded-[14px] border border-rule bg-surface p-10 text-center text-sm text-muted-text">
              No {statusFilter} requests.
            </div>
          )}

          <div className="flex flex-col gap-3.5">
            {visible.map((item) => {
              const key = `${item.kind}-${item.id}`;
              const deciding = decidingId === item.id;
              return (
                <div key={key} className="flex items-start gap-4 rounded-[14px] border border-rule bg-surface p-5">
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-action-light text-[15px] font-semibold text-action-dark">
                    {initialsOf(itemName(item))}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[15px] font-semibold text-ink">{itemName(item)}</span>
                      <span
                        className={`inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold ${
                          item.kind === 'inquiry' ? 'bg-action-light text-action-dark' : 'bg-ochre-light text-[#8A6714]'
                        }`}
                      >
                        {item.kind === 'inquiry' ? 'New client' : 'Reschedule'}
                      </span>
                      <span className="ml-auto text-[11px] text-muted-text">{formatAgo(item.createdAt)}</span>
                    </div>
                    <div className="mt-1.5 text-[13px] leading-relaxed text-[#48382E]">{itemSubtitle(item)}</div>
                    <div className="mt-2.5 flex items-center gap-2 text-xs text-[#6B5545]">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {itemSlotLine(item)}
                    </div>
                    {item.status === 'pending' && (
                      <div className="mt-3.5 flex gap-2">
                        <Button
                          size="sm"
                          className="h-[34px] px-4 text-[13px]"
                          disabled={deciding}
                          onClick={() => decide(item, 'approve')}
                        >
                          {item.kind === 'inquiry' ? 'Approve' : 'Approve move'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-[34px] px-3.5 text-[13px] text-[#8E4848] hover:bg-[#F4E3E3] hover:text-[#8E4848]"
                          disabled={deciding}
                          onClick={() => decide(item, 'decline')}
                        >
                          Decline
                        </Button>
                      </div>
                    )}
                    {item.status !== 'pending' && item.declineReason && (
                      <div className="mt-2.5 text-xs italic text-muted-text">"{item.declineReason}"</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </>
  );
}
