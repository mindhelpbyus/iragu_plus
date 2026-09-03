import type { ReactNode } from 'react';

export interface MetricCardData {
  label: string;
  /** Null while the real value is still loading — renders a placeholder dash rather than a fabricated number. */
  value: string | null;
  /**
   * A "+N vs last week" comparison. Omitted (not fabricated) unless a real
   * prior-period comparison is actually computed — see useDashboardMetrics'
   * own comment on why this app doesn't invent one today.
   */
  delta?: string;
}

export function MetricCard({ icon, label, value, delta }: MetricCardData & { icon: ReactNode }) {
  return (
    <div className="rounded-[14px] border border-rule bg-surface p-5 shadow-[0_1px_2px_0_rgba(28,24,18,.04)]">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-text">
        <span className="text-action [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
        {label}
      </div>
      <div className="mt-2.5 text-[30px] font-medium leading-[1.1] tracking-tight text-ink">{value ?? '—'}</div>
      {delta && <div className="mt-1.5 text-xs font-medium text-action">{delta}</div>}
    </div>
  );
}
