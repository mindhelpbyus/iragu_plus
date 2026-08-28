import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Copy, Check, Camera, Wifi, ShieldQuestion } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { useMyAppointments } from '../../pages/calendar/useMyAppointments';
import { createRoom, createGuestLink } from '../../api/videoService';
import { useConnectionReadiness } from './useConnectionReadiness';
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
 * The "nothing happening yet" state — first-class state of the same
 * idle/prejoin/waiting/live/failover/ended machine VideoCallFrame renders,
 * matching how the design's own StageViews.tsx treats it (a state, not a
 * separate route/component). Same provider-invisible principle as the rest
 * of the frame: never names a transport in this view for therapist/client.
 */
export function IdleStage({ onOpenAppointment }: { onOpenAppointment: (appointmentId: number) => void }) {
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
  const readiness = useConnectionReadiness();

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
    <div className="absolute inset-0 overflow-y-auto bg-canvas p-7">
      <div className="mx-auto flex max-w-[880px] flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-surface-warm text-body-text">
            <Video className="h-5 w-5" />
          </span>
          <div>
            <div className="text-xl font-medium tracking-tight text-ink">No session in progress</div>
            <div className="mt-0.5 text-[12.5px] text-muted-text">
              {loading ? 'Loading today’s schedule…' : `${videoAppointments.length} video session${videoAppointments.length === 1 ? '' : 's'} today`}
            </div>
          </div>
        </div>

        {next && (
          <div className="flex items-center gap-5 rounded-2xl border border-rule-hi bg-surface p-[22px] shadow-[0_1px_2px_rgba(28,24,18,.05)]">
            <span className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-action-light text-lg font-semibold text-action-dark">
              {initialsOf(clientName(next))}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-base font-medium text-ink">{clientName(next)}</span>
                <span className="flex-none rounded-full bg-action-light px-2 py-0.5 text-[11px] font-semibold text-action-dark">
                  {formatCountdown(next.startTime)}
                </span>
              </div>
              <div className="mt-1 text-[12.5px] text-muted-text">
                {formatTimeRange(next.startTime, next.endTime)} · {next.consultingReason || next.type}
              </div>
            </div>
            <div className="flex flex-none flex-col gap-2">
              <Button
                onClick={() => onOpenAppointment(next.id)}
                className="h-11 rounded-xl bg-action px-6 text-canvas shadow-[0_10px_24px_-6px_rgba(30,112,72,.22)] hover:bg-action-dark"
              >
                Open the room
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenAppointment(next.id)}
                className="h-[34px] rounded-xl text-xs"
              >
                Test devices
              </Button>
            </div>
          </div>
        )}

        {rest.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <div className="px-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-text">Later today</div>
            {rest.map((appt) => (
              <button
                key={appt.id}
                onClick={() => onOpenAppointment(appt.id)}
                className="flex items-center gap-3.5 rounded-xl border border-rule bg-surface px-4 py-3.5 text-left transition-colors hover:bg-surface-sage"
              >
                <span className="w-[62px] flex-none text-[13px] font-medium text-ink">
                  {new Date(appt.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </span>
                <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-surface-warm text-[11px] font-semibold text-muted-text">
                  {initialsOf(clientName(appt))}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{clientName(appt)}</span>
                <span className="flex-none rounded-full bg-surface-sage px-2.5 py-1 text-[11px] font-medium text-body-text">
                  {appt.consultingReason || appt.type}
                </span>
                <span className="w-[86px] flex-none text-right text-xs font-medium text-muted-text/70">Not started</span>
              </button>
            ))}
          </div>
        )}

        {!loading && videoAppointments.length === 0 && (
          <div className="rounded-xl border border-dashed border-rule-hi p-6 text-center text-sm text-muted-text">
            No video sessions scheduled today.
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-rule bg-surface p-[18px]">
            <div className="flex h-full flex-col gap-2.5">
              <div className="text-[13px] font-semibold text-ink">Start an unscheduled session</div>
              <p className="flex-1 text-xs leading-relaxed text-muted-text">
                Open a room now and share the join link with anyone — no account needed on their side.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={startInstantRoom} disabled={startingInstant} className="h-[34px] rounded-xl text-xs">
                  Open an instant room
                </Button>
                <Button variant="outline" size="sm" onClick={startAndCopyLink} disabled={startingInstant} className="h-[34px] rounded-xl text-xs">
                  {copiedLink ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
                  {copiedLink ? 'Link copied' : 'Start and copy link'}
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-rule bg-surface-sage p-[18px]">
            <div className="flex flex-col gap-2.5">
              <div className="text-[13px] font-semibold text-ink">Connection readiness</div>
              <div className="flex flex-col gap-1.5 text-xs text-body-text">
                <ReadinessRow
                  ok={readiness.mediaPermission === 'granted'}
                  unknown={readiness.mediaPermission === 'unknown' || readiness.mediaPermission === 'checking'}
                  icon={<Camera className="h-3.5 w-3.5" />}
                  label={
                    readiness.mediaPermission === 'granted'
                      ? 'Camera and microphone allowed'
                      : readiness.mediaPermission === 'denied'
                        ? 'Camera or microphone blocked'
                        : readiness.mediaPermission === 'unsupported'
                          ? 'Camera and microphone unavailable in this browser'
                          : 'Camera and microphone permission not checked yet'
                  }
                />
                <ReadinessRow
                  ok={readiness.downlinkMbps !== null}
                  unknown={readiness.downlinkMbps === null}
                  icon={<Wifi className="h-3.5 w-3.5" />}
                  label={
                    readiness.downlinkMbps !== null
                      ? `${readiness.downlinkMbps} Mbps${readiness.effectiveType ? ` · ${readiness.effectiveType}` : ''}`
                      : 'Network quality not reported by this browser'
                  }
                />
                <ReadinessRow
                  ok={false}
                  unknown
                  icon={<ShieldQuestion className="h-3.5 w-3.5" />}
                  label="Room readiness is checked once you open a session"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReadinessRow({ ok, unknown, icon, label }: { ok: boolean; unknown: boolean; icon: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={ok ? 'text-action' : unknown ? 'text-muted-text' : 'text-danger'}>{icon}</span>
      {label}
    </span>
  );
}
