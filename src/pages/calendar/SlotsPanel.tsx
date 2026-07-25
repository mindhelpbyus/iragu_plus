import { useState } from 'react';
import { ChevronLeft, Clock } from 'lucide-react';
import type { DayAvailability } from './useAvailabilityRange';
import { addDays, formatDayShort, toDateKey } from './dateUtils';

interface SlotsPanelProps {
  weekStart: Date;
  availabilityByDate: Record<string, DayAvailability>;
  loading: boolean;
}

export function SlotsPanel({ weekStart, availabilityByDate, loading }: SlotsPanelProps) {
  const [drillKey, setDrillKey] = useState<string | null>(null);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const drillDay = drillKey ? availabilityByDate[drillKey] : null;

  if (drillKey) {
    return (
      <div className="rounded-[14px] border border-rule bg-surface p-4">
        <button
          type="button"
          onClick={() => setDrillKey(null)}
          className="mb-3 flex items-center gap-1 text-xs font-medium text-action-dark hover:underline"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to week
        </button>
        <div className="mb-3 text-sm font-semibold text-ink">
          {new Date(drillKey).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>

        {!drillDay || drillDay.slots.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-text">No working hours set for this day</p>
        ) : (
          <div className="flex flex-col gap-1">
            {drillDay.slots.map((slot) => {
              const available = slot.isAvailable && !slot.isBooked;
              const time = new Date(slot.startTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
              return (
                <div
                  key={slot.slotId}
                  className="flex items-center justify-between rounded-lg border px-2.5 py-1.5"
                  style={{
                    borderColor: available ? 'var(--rule)' : 'transparent',
                    background: available ? 'transparent' : 'var(--canvas)',
                    opacity: available ? 1 : 0.6,
                  }}
                >
                  <span className="flex items-center gap-1.5 text-xs font-medium text-ink">
                    <Clock className="h-3 w-3 text-muted-text" />
                    {time}
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={
                      available
                        ? { background: '#E8F2EB', color: '#175C3B' }
                        : { background: '#F2EAE0', color: 'var(--muted-text)' }
                    }
                  >
                    {available ? 'Available' : 'Booked'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-[14px] border border-rule bg-surface p-4">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-text">
        Availability · this week
      </div>

      {loading ? (
        <p className="py-6 text-center text-sm text-muted-text">Loading…</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {weekDates.map((d) => {
            const key = toDateKey(d);
            const avail = availabilityByDate[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => setDrillKey(key)}
                className="flex items-center justify-between rounded-lg border border-rule px-3 py-2 text-left transition-colors hover:border-action hover:bg-action-light/40"
              >
                <div>
                  <div className="text-[10px] font-semibold uppercase text-muted-text">{formatDayShort(d)}</div>
                  <div className="text-sm font-semibold text-ink">{d.getDate()}</div>
                </div>
                <div className="text-xs font-semibold text-action-dark">{avail?.total ?? 0} slots</div>
              </button>
            );
          })}
        </div>
      )}

      <p className="mt-3 text-[10px] text-muted-text">Click a day to see open time slots.</p>
    </div>
  );
}
