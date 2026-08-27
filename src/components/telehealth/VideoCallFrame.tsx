import { ExternalLink, ShieldCheck, PanelRight } from 'lucide-react';
import { Button } from '../ui/button';
import { useVideoCallState, type CallView } from './useVideoCallState';
import { StageOverlay } from './StageOverlay';
import { ControlBar } from './ControlBar';
import { LiveKitCall } from './providers/LiveKitCall';
import { JitsiCall } from './providers/JitsiCall';
import { ZoomCall } from './providers/ZoomCall';
import type { JoinCredentials } from '../../api/videoService';

interface VideoCallFrameProps {
  /** The real join call — joinAppointmentRoom for a scheduled session, joinRoom for an ad-hoc room the caller already has access to. */
  requestJoinCredentials: () => Promise<JoinCredentials>;
  displayName: string;
  clientName: string;
  canEndForEveryone: boolean;
  isTherapist: boolean;
  onTogglePanel: () => void;
  onViewChange?: (view: CallView) => void;
}

function formatTimer(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * The one frame every session renders through. It never shows a provider
 * name as a switcher — video-service's /join response decides the provider
 * server-side; the provider is never surfaced to the therapist or client —
 * neither role should ever need to know or care which transport is running.
 * This component just dispatches rendering to whichever adapter matches.
 * LiveKit/Jitsi/Zoom render fully in-page; Google Meet/Zoho Meeting have no
 * embeddable web SDK (confirmed against video-service's own adapters and
 * each vendor's docs), so those open in a new tab with an explicit notice
 * (never naming the provider) rather than a silent redirect.
 */
export function VideoCallFrame({
  requestJoinCredentials,
  displayName,
  clientName,
  canEndForEveryone,
  isTherapist,
  onTogglePanel,
  onViewChange,
}: VideoCallFrameProps) {
  const call = useVideoCallState({ requestJoinCredentials, canEndForEveryone });

  if (onViewChange) onViewChange(call.view);

  const isLive = call.view === 'live';
  const subLine = isTherapist ? `Session with ${clientName}` : `With your therapist`;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* Header */}
      <div className="flex h-16 flex-none items-center gap-5 rounded-xl border border-rule bg-surface px-5">
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap text-[15px] font-medium tracking-tight text-ink">Video session</span>
            {isLive && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-action-light px-2 py-0.5 text-[11px] font-semibold text-action-dark">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-action" />
                Live
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 truncate text-[11.5px] text-muted-text">
            <span>{subLine}</span>
            <span className="text-rule-hi">·</span>
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              End-to-end encrypted
            </span>
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex h-10 flex-none items-center gap-1.5 rounded-[10px] bg-surface-warm px-3">
          <span className="font-mono text-[13px] font-semibold tabular-nums text-ink">{formatTimer(call.seconds)}</span>
        </div>

        <button
          type="button"
          onClick={onTogglePanel}
          aria-label="Toggle side panel"
          className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] border border-rule bg-surface text-body-text transition-colors hover:bg-surface-sage"
        >
          <PanelRight className="h-[18px] w-[18px]" />
        </button>
      </div>

      {/* Stage */}
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-[14px] border border-rule bg-[#0F1714]">
        {call.credentials &&
          !call.credentials.waitingRoom &&
          (call.view === 'live' || call.view === 'failover') && (
            <ExternalProviderStage
              serverUrl={call.credentials.serverUrl}
              onLeave={call.endSession}
              renderEmbedded={
                call.credentials.provider === 'livekit' ||
                call.credentials.provider === 'jitsi' ||
                call.credentials.provider === 'zoom'
              }
            >
              {call.credentials.provider === 'livekit' && (
                <LiveKitCall
                  ref={call.providerRef}
                  credentials={call.credentials}
                  displayName={displayName}
                  onConnected={call.onProviderConnected}
                  onDisconnected={call.onProviderDisconnected}
                  onLocalMediaStateChange={() => undefined}
                />
              )}
              {call.credentials.provider === 'jitsi' && (
                <JitsiCall
                  ref={call.providerRef}
                  credentials={call.credentials}
                  displayName={displayName}
                  onConnected={call.onProviderConnected}
                  onDisconnected={call.onProviderDisconnected}
                  onLocalMediaStateChange={() => undefined}
                />
              )}
              {call.credentials.provider === 'zoom' && (
                <ZoomCall
                  ref={call.providerRef}
                  credentials={call.credentials}
                  displayName={displayName}
                  onConnected={call.onProviderConnected}
                  onDisconnected={call.onProviderDisconnected}
                  onLocalMediaStateChange={() => undefined}
                />
              )}
              {call.credentials.provider === 'huddle01' && (
                <div className="flex h-full w-full items-center justify-center text-sm text-rule-hi">
                  Huddle01 rooms aren't available yet — video-service's Huddle01 adapter is a placeholder pending a verified API integration.
                </div>
              )}
            </ExternalProviderStage>
          )}

        {call.view !== 'live' && (
          <StageOverlay
            view={call.view}
            clientName={clientName}
            displayName={displayName}
            error={call.error}
            onGoLive={call.goLive}
            onRetry={call.retryFromFailover}
            onCheckAgain={call.requestJoin}
            joinLabel={isTherapist ? 'Open the room' : 'Join session'}
            waitingTitle={isTherapist ? `Waiting for ${clientName}` : 'Waiting for your therapist'}
            waitingSub="We'll connect you automatically once your session partner joins."
            elapsedLabel={formatTimer(call.seconds)}
          />
        )}
      </div>

      <ControlBar
        muted={call.muted}
        camOn={call.camOn}
        onToggleMute={call.toggleMute}
        onToggleCam={call.toggleCam}
        onEnd={call.endSession}
        endLabel={isTherapist ? 'End session' : 'Leave'}
        hidden={!isLive || call.credentials?.provider === 'zoom'}
      />
    </div>
  );
}

/**
 * Google Meet / Zoho Meeting have no embeddable web SDK — this renders the
 * explicit "opens in a new tab" notice instead of the embedded provider
 * components. LiveKit/Jitsi/Zoom pass through to their real embedded UI.
 */
function ExternalProviderStage({
  serverUrl,
  renderEmbedded,
  children,
  onLeave,
}: {
  serverUrl?: string;
  renderEmbedded: boolean;
  children: React.ReactNode;
  onLeave: () => void;
}) {
  if (renderEmbedded) {
    return <div className="absolute inset-0">{children}</div>;
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
      <ExternalLink className="h-8 w-8 text-ochre" />
      <div>
        <p className="font-semibold text-canvas">This session opens in a new tab</p>
        <p className="mt-1 max-w-sm text-sm text-rule-hi">
          This call can't be embedded here — it opens in a separate window instead.
        </p>
      </div>
      <div className="flex gap-2">
        {serverUrl && (
          <Button
            onClick={() => window.open(serverUrl, '_blank', 'noopener,noreferrer')}
            className="bg-action text-canvas hover:bg-action-dark"
          >
            Open the call <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        )}
        <Button onClick={onLeave} variant="outline">
          I've finished — end session
        </Button>
      </div>
    </div>
  );
}
