import { Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TODAYS_SCHEDULE, initialsOf, tagColors, modeColors } from './mockData';

export function TodaysSchedule() {
  const navigate = useNavigate();

  return (
    <div className="rounded-[14px] border border-rule bg-surface p-5 shadow-[0_1px_2px_0_rgba(28,24,18,.04)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-[17px] font-semibold text-ink">Today's schedule</h3>
          <div className="mt-0.5 text-xs text-muted-text">6 sessions · Next in 18 min</div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/calendar')}
          className="h-8 rounded-lg px-3 text-[13px] font-medium text-[#48382E] transition-colors hover:bg-action-light/60"
        >
          View calendar →
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        {TODAYS_SCHEDULE.map((appt) => {
          const tag = tagColors(appt.tag);
          const mode = modeColors(appt.mode);
          return (
            <div
              key={appt.time + appt.name}
              className="flex items-center gap-3.5 rounded-[10px] border border-rule p-3.5"
              style={{
                borderLeft: `3px solid ${mode.accent}`,
                background: `linear-gradient(90deg, ${mode.tint} 0%, var(--surface) 18%)`,
              }}
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-action-light text-[13px] font-semibold text-action-dark">
                {initialsOf(appt.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className="text-[11px] font-semibold uppercase tracking-[0.05em]"
                  style={{ color: mode.timeColor }}
                >
                  {appt.time}
                </div>
                <div className="mt-0.5 truncate text-[15px] font-semibold text-ink">{appt.name}</div>
                <div className="mt-0.5 truncate text-xs text-muted-text">{appt.type}</div>
              </div>
              <span
                className="hidden h-[22px] flex-shrink-0 items-center rounded-full px-2.5 text-[11px] font-medium sm:inline-flex"
                style={{ background: tag.bg, color: tag.fg }}
              >
                {appt.tag}
              </span>
              <button
                type="button"
                onClick={() => navigate('/telehealth')}
                className="flex h-8 flex-shrink-0 items-center gap-1.5 rounded-lg bg-action px-3 text-[13px] font-medium text-white transition-colors hover:bg-action-dark"
              >
                <Video className="h-3.5 w-3.5" />
                Join
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
