import { HOUR_PX } from './calendarConstants';

const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

export function HourGutter() {
  return (
    <div>
      {HOURS.map((h) => (
        <div
          key={h}
          className="box-border border-b border-gray-200 pr-2.5 pt-1 text-right text-[11px] font-medium text-muted-text"
          style={{ height: HOUR_PX }}
        >
          {h}
        </div>
      ))}
    </div>
  );
}
