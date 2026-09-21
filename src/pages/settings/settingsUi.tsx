import type { ReactNode } from 'react';

/** Shared field wrapper for Settings forms — label + control + optional hint. */
export function SettingsField({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-text">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-muted-text">{hint}</p>}
    </div>
  );
}

export const settingsInputClass =
  'h-[42px] w-full rounded-[10px] border border-rule bg-surface px-3.5 text-sm text-ink outline-none transition-colors focus:border-action disabled:cursor-not-allowed disabled:bg-canvas disabled:text-muted-text disabled:opacity-80';

export const settingsSelectClass =
  'h-[42px] w-full rounded-[10px] border border-rule bg-surface px-3.5 text-sm text-ink outline-none transition-colors focus:border-action';

/**
 * Honest "this isn't built yet" panel — used wherever the design mock shows
 * a control with no real backend behind it. Never replaced with fabricated
 * data or a mutation that silently no-ops.
 */
export function GapNotice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-[10px] border border-dashed border-rule bg-canvas px-4 py-3.5">
      <div className="text-[13px] font-semibold text-body-text">{title}</div>
      <div className="mt-1 text-xs leading-relaxed text-muted-text">{children}</div>
    </div>
  );
}

export function SettingsSectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <>
      <h3 className="m-0 text-[17px] font-semibold text-ink">{title}</h3>
      <p className="mt-1 mb-6 text-[13px] text-muted-text">{description}</p>
    </>
  );
}
