import { Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getMyAppointments, type RawAppointment } from '../../api/appointmentsBackend';
import { getMyTherapistId } from '../../api/therapistMe';
import { initialsOf, tagColors, modeColors } from './mockData';

const TYPE_TAG: Record<RawAppointment['type'], 'Individual' | 'Couple' | 'Group' | 'Intake'> = {
  individual: 'Individual',
  couples: 'Couple',
  family: 'Group',
  group: 'Group',
};

function clientName(appt: RawAppointment): string {
  if (!appt.client) return 'Unknown client';
  return `${appt.client.firstName ?? ''} ${appt.client.lastName ?? ''}`.trim() || appt.client.email;
}

function formatTimeRange(startIso: string, endIso: string): string {
  const fmt = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${fmt(startIso)} – ${fmt(endIso)}`;
}

export function TodaysSchedule() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<RawAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const therapistId = await getMyTherapistId();
        const todayKey = new Date().toISOString().slice(0, 10);
        const rows = await getMyAppointments(therapistId, { startDate: todayKey, endDate: todayKey });
        if (!cancelled) setAppointments(rows.filter((a) => a.status !== 'cancelled'));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load today\'s schedule');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="rounded-[14px] border border-rule bg-surface p-5 shadow-[0_1px_2px_0_rgba(28,24,18,.04)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-[17px] font-semibold text-ink">Today's schedule</h3>
          <div className="mt-0.5 text-xs text-muted-text">
            {loading ? 'Loading…' : `${appointments.length} session${appointments.length === 1 ? '' : 's'}`}
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/calendar')}
          className="h-8 rounded-lg px-3 text-[13px] font-medium text-[#48382E] transition-colors hover:bg-action-light/60"
        >
          View calendar →
        </button>
      </div>

      {error && <p className="py-4 text-center text-xs text-red-600">{error}</p>}
      {!error && !loading && appointments.length === 0 && (
        <p className="py-4 text-center text-xs text-muted-text">No sessions scheduled today.</p>
      )}

      <div className="flex flex-col gap-2.5">
        {appointments.map((appt) => {
          const tagLabel = TYPE_TAG[appt.type];
          const tag = tagColors(tagLabel);
          const mode = modeColors(appt.mode === 'video' ? 'ext' : 'int');
          const name = clientName(appt);
          return (
            <div
              key={appt.id}
              className="flex items-center gap-3.5 rounded-[10px] border border-rule p-3.5"
              style={{
                borderLeft: `3px solid ${mode.accent}`,
                background: `linear-gradient(90deg, ${mode.tint} 0%, var(--surface) 18%)`,
              }}
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-action-light text-[13px] font-semibold text-action-dark">
                {initialsOf(name)}
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className="text-[11px] font-semibold uppercase tracking-[0.05em]"
                  style={{ color: mode.timeColor }}
                >
                  {formatTimeRange(appt.startTime, appt.endTime)}
                </div>
                <div className="mt-0.5 truncate text-[15px] font-semibold text-ink">{name}</div>
                <div className="mt-0.5 truncate text-xs text-muted-text">{appt.consultingReason || appt.type}</div>
              </div>
              <span
                className="hidden h-[22px] flex-shrink-0 items-center rounded-full px-2.5 text-[11px] font-medium sm:inline-flex"
                style={{ background: tag.bg, color: tag.fg }}
              >
                {tagLabel}
              </span>
              {appt.mode === 'video' && (
                <button
                  type="button"
                  onClick={() => navigate(`/telehealth/${appt.id}`)}
                  className="flex h-8 flex-shrink-0 items-center gap-1.5 rounded-lg bg-action px-3 text-[13px] font-medium text-white transition-colors hover:bg-action-dark"
                >
                  <Video className="h-3.5 w-3.5" />
                  Join
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
