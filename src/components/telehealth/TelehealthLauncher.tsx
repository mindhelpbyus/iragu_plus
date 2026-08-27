import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { useMyAppointments } from '../../pages/calendar/useMyAppointments';
import { createRoom, createGuestLink } from '../../api/videoService';
import type { RawAppointment } from '../../api/appointmentsBackend';

function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function clientName(appt: RawAppointment): string {
  if (!appt.client) return 'Unknown client';
  return `${appt.client.firstName ?? ''} ${appt.client.lastName ?? ''}`.trim() || appt.client.email;
}

function formatCountdown(startTime: string): string {
  const diffMs = new Date(startTime).getTime() - Date.now();
  if (diffMs <= 0) return 'Starting now';
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `In ${mins} minute${mins === 1 ? '' : 's'}`;
  const hours = Math.round(mins / 60);
  return `In ${hours} hour${hours === 1 ? '' : 's'}`;
}

function formatTimeRange(startIso: string, endIso: string): string {
  const fmt = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return `${fmt(startIso)} – ${fmt(endIso)}`;
}

/**
 * Real launcher for /telehealth with no appointment selected — replaces the
 * old bare "No session selected" empty state. Matches how Zoom/Jitsi
 * actually handle this: the landing state IS the action surface (today's
 * real queue to join, plus a real "start now" path), never a dead end.
 * Provider stays invisible here too — same principle as VideoCallFrame.
 */
export function TelehealthLauncher() {
  const navigate = useNavigate();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const { appointments, loading } = useMyAppointments(todayStart, todayEnd);
  const videoAppointments = appointments.filter((a) => a.mode === 'video' && a.status !== 'cancelled');
  const now = Date.now();
  const upcoming = videoAppointments
    .filter((a) => new Date(a.endTime).getTime() > now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const [next, ...rest] = upcoming;

  const [startingInstant, setStartingInstant] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const startInstantRoom = async () => {
    setStartingInstant(true);
    try {
      const room = await createRoom('instant_video_call', 'Instant meeting');
      navigate(`/telehealth/room/${room.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start the room');
    } finally {
      setStartingInstant(false);
    }
  };

  const startAndCopyLink = async () => {
    setStartingInstant(true);
    try {
      const room = await createRoom('instant_video_call', 'Instant meeting');
      const { token } = await createGuestLink(room.id);
      const link = `${window.location.origin}/telehealth/guest/${room.id}?token=${encodeURIComponent(token)}`;
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      toast.success('Link copied — share it with anyone you want on the call.');
      setTimeout(() => setCopiedLink(false), 2500);
      navigate(`/telehealth/room/${room.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create a shareable link');
    } finally {
      setStartingInstant(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-80px)] flex-col gap-4 bg-canvas p-4">
      <div className="flex items-center gap-3 rounded-xl border border-rule bg-surface px-5 py-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-warm text-body-text">
          <Video className="h-5 w-5" />
        </span>
        <div>
          <div className="text-lg font-medium tracking-tight text-ink">No session in progress</div>
          <div className="text-[12.5px] text-muted-text">
            {loading ? 'Loading today’s schedule…' : `${videoAppointments.length} video session${videoAppointments.length === 1 ? '' : 's'} today`}
          </div>
        </div>
      </div>

      {next && (
        <div className="flex items-center gap-4 rounded-2xl border border-rule bg-surface p-5">
          <span className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-action-light text-lg font-semibold text-action-dark">
            {initialsOf(clientName(next))}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-semibold text-ink">{clientName(next)}</span>
              <span className="flex-none rounded-full bg-action-light px-2 py-0.5 text-[11px] font-semibold text-action-dark">
                {formatCountdown(next.startTime)}
              </span>
            </div>
            <div className="mt-0.5 text-[12.5px] text-muted-text">
              {formatTimeRange(next.startTime, next.endTime)} · {next.consultingReason || next.type}
            </div>
          </div>
          <Button
            onClick={() => navigate(`/telehealth/${next.id}`)}
            className="flex-none bg-action px-6 text-canvas hover:bg-action-dark"
          >
            Open the room
          </Button>
        </div>
      )}

      {rest.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="px-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-text">Later today</div>
          {rest.map((appt) => (
            <button
              key={appt.id}
              onClick={() => navigate(`/telehealth/${appt.id}`)}
              className="flex items-center gap-3 rounded-xl border border-rule bg-surface px-4 py-3 text-left transition-colors hover:bg-surface-sage"
            >
              <span className="w-16 flex-none text-[12.5px] font-medium text-muted-text">
                {new Date(appt.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </span>
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-surface-warm text-[11px] font-semibold text-body-text">
                {initialsOf(clientName(appt))}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{clientName(appt)}</span>
              <span className="flex-none text-xs text-muted-text">{appt.consultingReason || appt.type}</span>
            </button>
          ))}
        </div>
      )}

      {!loading && videoAppointments.length === 0 && (
        <div className="rounded-xl border border-dashed border-rule-hi p-6 text-center text-sm text-muted-text">
          No video sessions scheduled today.
        </div>
      )}

      <div className="rounded-2xl border border-rule bg-surface p-5">
        <div className="font-medium text-ink">Start an unscheduled session</div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted-text">
          Open a room now and share the join link with anyone — no account needed on their side.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" onClick={startInstantRoom} disabled={startingInstant}>
            Open an instant room
          </Button>
          <Button variant="outline" onClick={startAndCopyLink} disabled={startingInstant}>
            {copiedLink ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
            {copiedLink ? 'Link copied' : 'Start and copy link'}
          </Button>
        </div>
      </div>
    </div>
  );
}
