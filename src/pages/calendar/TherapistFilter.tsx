import { useState } from 'react';
import { Users, ChevronDown } from 'lucide-react';
import type { TherapistSummary } from '../../api/orgTherapists';

interface TherapistFilterProps {
  therapists: TherapistSummary[];
  /** undefined = whole org (no filter applied). */
  selectedIds: number[] | undefined;
  onChange: (ids: number[] | undefined) => void;
}

/**
 * Practice Calendar's therapist multi-select (design.md Component 9) —
 * checkbox dropdown modeled on the mock design's CalendarContainer.tsx
 * therapist-filter layout (Select All / Select None / per-therapist
 * checkbox), rebuilt against real data from GET /org/therapists.
 */
export function TherapistFilter({ therapists, selectedIds, onChange }: TherapistFilterProps) {
  const [open, setOpen] = useState(false);

  const allIds = therapists.map((t) => t.id);
  const isAllSelected = selectedIds === undefined || selectedIds.length === allIds.length;
  const selectedCount = selectedIds === undefined ? allIds.length : selectedIds.length;

  const label = therapists.length === 0
    ? 'Therapists'
    : isAllSelected
      ? 'All Therapists'
      : `${selectedCount} Therapist${selectedCount !== 1 ? 's' : ''}`;

  function toggle(id: number) {
    const current = selectedIds ?? allIds;
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    onChange(next.length === allIds.length ? undefined : next);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="flex h-8 items-center gap-1.5 rounded-lg border border-rule bg-surface px-3 text-[13px] font-medium text-[#48382E] transition-colors hover:bg-action-light/60"
      >
        <Users className="h-3.5 w-3.5" strokeWidth={1.75} />
        {label}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute z-10 mt-1 w-72 rounded-[10px] border border-rule bg-surface py-1 shadow-[0_8px_24px_-8px_rgba(28,24,18,.25)]">
          <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-text">
            Select therapists
          </div>
          <div className="flex gap-1.5 px-3 pb-2">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onChange(undefined)}
              className="flex-1 rounded-lg border border-rule px-2 py-1 text-xs font-medium text-ink hover:bg-canvas"
            >
              Select All
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onChange([])}
              className="flex-1 rounded-lg border border-rule px-2 py-1 text-xs font-medium text-ink hover:bg-canvas"
            >
              Select None
            </button>
          </div>
          <div className="my-1 h-px bg-rule" />
          <div className="max-h-64 overflow-y-auto">
            {therapists.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-muted-text">No therapists in this practice yet.</div>
            ) : (
              therapists.map((t) => {
                const checked = selectedIds === undefined || selectedIds.includes(t.id);
                return (
                  <label
                    key={t.id}
                    className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-ink hover:bg-canvas"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(t.id)}
                      onMouseDown={(e) => e.preventDefault()}
                      className="h-4 w-4 rounded border-rule accent-action"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">
                        {t.firstName} {t.lastName}
                      </div>
                      <div className="truncate text-xs text-muted-text">{t.email}</div>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
