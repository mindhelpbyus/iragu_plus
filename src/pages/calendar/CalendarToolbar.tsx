import { Search, ChevronLeft, ChevronRight, CircleSlash, Plus } from 'lucide-react';
import type { CalView } from './calendarConstants';

interface CalendarToolbarProps {
  subtitle: string;
  search: string;
  onSearchChange: (v: string) => void;
  searchMatchCount: number;
  view: CalView;
  onViewChange: (v: CalView) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onBlockTimeOff: () => void;
  onBook: () => void;
}

const VIEWS: { id: CalView; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
];

export function CalendarToolbar({
  subtitle,
  search,
  onSearchChange,
  searchMatchCount,
  view,
  onViewChange,
  onPrev,
  onNext,
  onToday,
  onBlockTimeOff,
  onBook,
}: CalendarToolbarProps) {
  return (
    <div className="mx-auto mb-6 flex max-w-[1400px] flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-[28px] font-medium tracking-tight text-ink">Calendar</h2>
        <p className="mt-1 text-sm text-muted-text">{subtitle}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-muted-text" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search appointments"
            className="h-8 w-[170px] rounded-lg border border-rule bg-surface pl-[30px] pr-2.5 text-[12.5px] text-ink outline-none transition-colors focus:border-action"
          />
          {search.trim().length > 0 && (
            <span className="absolute -right-2 -top-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-action px-1 text-[9px] font-bold text-white">
              {searchMatchCount}
            </span>
          )}
        </div>

        <div className="h-6 w-px bg-rule" />

        <button
          type="button"
          onClick={onPrev}
          title="Previous"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#48382E] transition-colors hover:bg-action-light/60"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onToday}
          className="h-8 rounded-lg border border-rule bg-surface px-3 text-[13px] font-medium text-ink transition-colors hover:bg-action-light/60"
        >
          Today
        </button>
        <button
          type="button"
          onClick={onNext}
          title="Next"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#48382E] transition-colors hover:bg-action-light/60"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <div className="mx-1.5 h-6 w-px bg-rule" />

        {VIEWS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onViewChange(id)}
            className={`h-8 rounded-lg px-3 text-[13px] transition-colors ${
              id === view
                ? 'border border-rule bg-surface font-semibold text-action-dark'
                : 'border border-transparent font-medium text-[#48382E] hover:bg-action-light/40'
            }`}
          >
            {label}
          </button>
        ))}

        <button
          type="button"
          onClick={onBlockTimeOff}
          className="flex h-8 items-center gap-1.5 rounded-lg border border-rule bg-surface px-3 text-[13px] font-medium text-[#48382E] transition-colors hover:bg-action-light/60"
        >
          <CircleSlash className="h-3.5 w-3.5" strokeWidth={1.75} />
          Block time off
        </button>
        <button
          type="button"
          onClick={onBook}
          className="flex h-8 items-center gap-1.5 rounded-lg bg-action px-3 text-[13px] font-medium text-white transition-colors hover:bg-action-dark"
        >
          <Plus className="h-3.5 w-3.5" />
          Book
        </button>
      </div>
    </div>
  );
}
