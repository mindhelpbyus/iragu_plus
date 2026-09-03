import { Loader2, AlertTriangle, CheckCircle2, Mic, Video, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { useConnectionReadiness } from './useConnectionReadiness';
import { useMicLevel } from './useMicLevel';
import type { CallView } from './useVideoCallState';

function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Static effectiveType -> quality label, using only data
 * useConnectionReadiness already exposes (Chromium's Network Information
 * API) — never a fabricated number. Unrecognized/absent effectiveType
 * (Safari/Firefox, or not yet measured) renders no label rather than
 * guessing.
 */
function qualityLabel(effectiveType: string | null): string | null {
  switch (effectiveType) {
    case '4g':
      return 'Good';
    case '3g':
      return 'Fair';
    case '2g':
    case 'slow-2g':
      return 'Poor';
    default:
      return null;
  }
}

interface StageOverlayProps {
  view: CallView;
  clientName: string;
  displayName: string;
  error: string | null;
  onGoLive: () => void;
  onRetry: () => void;
  onCheckAgain: () => void;
  joinLabel: string;
  waitingTitle: string;
  waitingSub: string;
  elapsedLabel: string;
  /** Where the ended card's action goes once the session has ended — it has no other way out otherwise. Omit entirely for a guest with no account to return to. */
  onDone: (() => void) | null;
  /** Defaults to "Back to telehealth" — override for contexts where that destination doesn't make sense (e.g. a guest link). */
  doneLabel?: string;
  /**
   * Shows a generic "routed automatically for the best connection" note on
   * the prejoin card. Deliberately takes no provider value — provider
   * identity stays admin/org_owner-only (see ProviderBadge.tsx); this prop
   * only controls whether the generic banner appears, never what it says.
   */
  showRoutingBanner?: boolean;
}

/**
 * Renders the pre-live / non-live states over the video stage — prejoin,
 * waiting room, failover (a real disconnect after connecting), error, and
 * ended. "live" and "idle" render nothing here — idle has its own IdleStage,
 * and the actual provider component (LiveKitCall/JitsiCall/ZoomCall) owns
 * the live view.
 */
export function StageOverlay({
  view,
  clientName,
  displayName,
  error,
  onGoLive,
  onRetry,
  onCheckAgain,
  joinLabel,
  waitingTitle,
  waitingSub,
  elapsedLabel,
  onDone,
  doneLabel = 'Back to telehealth',
  showRoutingBanner,
}: StageOverlayProps) {
  const readiness = useConnectionReadiness();
  const quality = qualityLabel(readiness.effectiveType);
  const micLevel = useMicLevel(view === 'prejoin' && readiness.mediaPermission === 'granted');

  if (view === 'prejoin') {
    return (
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="flex w-full max-w-3xl gap-6">
          <div
            className="relative min-h-[300px] flex-1 overflow-hidden rounded-xl"
            style={{ background: 'radial-gradient(circle at 50% 40%, #2C3A34, #0F1714)' }}
          >
            <div className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-surface-warm text-[30px] font-semibold text-muted-text">
              {initialsOf(displayName)}
            </div>
            <span className="absolute bottom-3.5 left-3.5 rounded-full bg-black/60 px-2.5 py-1 text-[11.5px] font-medium text-canvas backdrop-blur-sm">
              Camera preview
            </span>
          </div>
          <div className="flex w-[340px] flex-none flex-col gap-3.5 rounded-xl border border-rule bg-surface p-6">
            <div>
              <div className="text-[19px] font-medium tracking-tight text-ink">Ready to join</div>
              <div className="mt-1 text-[12.5px] leading-relaxed text-muted-text">
                Session with {clientName}. Devices are checked automatically when you connect.
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2.5 rounded-lg border border-rule px-3 py-2.5">
                <Mic className="h-4 w-4 flex-none text-action-dark" />
                <span className="flex-1 truncate text-[12.5px] text-ink">{readiness.micLabel || 'Microphone'}</span>
                {readiness.mediaPermission === 'granted' && (
                  <span className="flex h-3.5 w-9 flex-none items-end gap-[2px]" aria-hidden>
                    {[0.2, 0.4, 0.6, 0.8, 1].map((threshold) => (
                      <span
                        key={threshold}
                        className={`w-[3px] flex-1 rounded-sm transition-colors ${micLevel >= threshold ? 'bg-action' : 'bg-rule'}`}
                        style={{ height: `${threshold * 100}%` }}
                      />
                    ))}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2.5 rounded-lg border border-rule px-3 py-2.5">
                <Video className="h-4 w-4 flex-none text-action-dark" />
                <span className="flex-1 truncate text-[12.5px] text-ink">{readiness.cameraLabel || 'Camera'}</span>
                {readiness.mediaPermission === 'granted' && <Check className="h-3.5 w-3.5 flex-none text-action" />}
              </div>
              {readiness.downlinkMbps !== null && (
                <div className="flex items-center gap-2.5 rounded-lg border border-rule bg-surface-sage px-3 py-2.5">
                  <span className="flex-1 text-[12.5px] text-ink">
                    Network {readiness.downlinkMbps} Mbps{readiness.effectiveType ? ` · ${readiness.effectiveType}` : ''}
                  </span>
                  {quality && <span className="flex-none text-[11px] font-semibold text-action-dark">{quality}</span>}
                </div>
              )}
            </div>

            <div className="rounded-lg bg-surface-warm p-3 text-[11.5px] leading-relaxed text-body-text">
              {showRoutingBanner
                ? 'Routed automatically for the best connection. A secure room is created for this appointment when you join — no separate app or account needed.'
                : 'A secure room is created for this appointment when you join — no separate app or account needed.'}
            </div>
            <Button onClick={onGoLive} className="h-12 rounded-2xl bg-action text-[14px] font-semibold text-canvas shadow-[0_10px_24px_-6px_rgba(30,112,72,.22)] hover:bg-action-dark">
              {joinLabel}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'waiting') {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-8 text-center">
        <div className="relative flex h-24 w-24 items-center justify-center">
          <span className="absolute inset-0 animate-pulse rounded-full border-2 border-sage/35" />
          <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#1A2320] text-2xl font-semibold text-[#9BBBA7]">
            {initialsOf(clientName)}
          </span>
        </div>
        <div className="max-w-[420px]">
          <div className="text-xl font-medium tracking-tight text-canvas">{waitingTitle}</div>
          <div className="mt-2 text-[13px] leading-relaxed text-[#9BBBA7]">{waitingSub}</div>
        </div>
        <Button onClick={onCheckAgain} className="h-10 rounded-[10px] bg-action px-4.5 text-[13px] font-semibold text-canvas hover:bg-action-dark">
          Check again
        </Button>
        <div className="mt-2 flex items-center gap-2 rounded-full bg-sage/[.14] px-3.5 py-2 text-[11.5px] text-[#9BBBA7]">
          <Loader2 className="h-3 w-3 animate-spin" />
          Room held open · you'll connect automatically
        </div>
      </div>
    );
  }

  if (view === 'failover') {
    return (
      <div className="absolute inset-0 flex items-center justify-center p-8" style={{ background: 'radial-gradient(circle at 50% 40%, #24211C, #0F1714)' }}>
        <div className="flex w-full max-w-[520px] flex-col gap-4.5 rounded-2xl border border-ochre/35 bg-white/[.06] p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[10px] bg-ochre-light text-[#8A6714]">
              <AlertTriangle className="h-[19px] w-[19px]" />
            </span>
            <div>
              <div className="text-base font-medium text-canvas">Connection lost</div>
              <div className="mt-0.5 text-xs text-rule-hi">{error || 'The call disconnected unexpectedly.'}</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Button onClick={onRetry} className="h-[42px] flex-1 rounded-[10px] bg-action text-[13px] font-semibold text-canvas hover:bg-action-dark">
              Rejoin the call
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'error') {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center">
        <AlertTriangle className="h-8 w-8 text-danger" />
        <p className="font-semibold text-canvas">Couldn't join the call</p>
        <p className="max-w-sm text-sm text-rule-hi">{error}</p>
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  }

  if (view === 'ended') {
    return (
      <div className="absolute inset-0 flex items-center justify-center overflow-auto bg-canvas p-7">
        <div className="flex w-full max-w-[560px] flex-col gap-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-action-light text-action-dark">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div>
              <div className="text-xl font-medium tracking-tight text-ink">Session ended</div>
              <div className="mt-0.5 text-[12.5px] text-muted-text">Duration: {elapsedLabel}</div>
            </div>
          </div>
          {onDone ? (
            <Button onClick={onDone} className="h-11 self-start rounded-xl bg-action px-5 text-[13px] font-semibold text-canvas hover:bg-action-dark">
              {doneLabel}
            </Button>
          ) : (
            <p className="text-[12.5px] text-muted-text">You can close this window now.</p>
          )}
        </div>
      </div>
    );
  }

  return null;
}
