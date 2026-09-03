import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Video, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { StageOverlay } from '../components/telehealth/StageOverlay';
import { ControlBar } from '../components/telehealth/ControlBar';
import { useVideoCallState } from '../components/telehealth/useVideoCallState';
import { guestJoinRoom, resolveGuestLinkCode } from '../api/videoService';
import { LiveKitCall } from '../components/telehealth/providers/LiveKitCall';
import { JitsiCall } from '../components/telehealth/providers/JitsiCall';
import { ZoomCall } from '../components/telehealth/providers/ZoomCall';

function formatTimer(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Public, no-login guest entry point for an ad-hoc room's "copy link" share
 * flow. Two URL shapes land here: the short form (/g/:code — what
 * IdleStage's "Start and copy link" actually hands out today) and the
 * long form (/telehealth/guest/:roomId?token=... — kept working for any
 * link minted before the short form existed). The short form resolves its
 * code to {roomId, token} via resolveGuestLinkCode first; either way, the
 * SAME signed JWT is what guestJoinRoom verifies below — this page never
 * touches Cognito. Same provider-invisible principle as the main
 * VideoCallFrame — a guest never sees which video SDK is actually running.
 */
export default function GuestJoinPage() {
  const { roomId: roomIdParam, code } = useParams<{ roomId?: string; code?: string }>();
  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get('token');

  const [resolved, setResolved] = useState<{ roomId: string; token: string } | null>(
    roomIdParam && tokenParam ? { roomId: roomIdParam, token: tokenParam } : null,
  );
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(Boolean(code));

  useEffect(() => {
    if (!code || resolved) return;
    let cancelled = false;
    resolveGuestLinkCode(code)
      .then((result) => {
        if (!cancelled) setResolved(result);
      })
      .catch((err) => {
        if (!cancelled) setResolveError(err instanceof Error ? err.message : 'This link is no longer active.');
      })
      .finally(() => {
        if (!cancelled) setResolving(false);
      });
    return () => {
      cancelled = true;
    };
  }, [code, resolved]);

  const [displayName, setDisplayName] = useState('');
  const [nameSubmitted, setNameSubmitted] = useState(false);

  const requestJoinCredentials = useCallback(() => {
    if (!resolved) throw new Error('This link is missing required information.');
    return guestJoinRoom(resolved.roomId, { token: resolved.token, displayName: displayName || 'Guest', mode: 'video' });
  }, [resolved, displayName]);

  const call = useVideoCallState({ requestJoinCredentials, canEndForEveryone: false });
  const isLive = call.view === 'live';

  if (resolving) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas">
        <Loader2 className="h-6 w-6 animate-spin text-muted-text" />
      </div>
    );
  }

  if (!resolved || resolveError) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas p-6 text-center">
        <div>
          <p className="font-semibold text-ink">This link is invalid</p>
          <p className="mt-1 text-sm text-muted-text">{resolveError || 'Ask whoever sent it to share the link again.'}</p>
        </div>
      </div>
    );
  }

  if (!nameSubmitted) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas p-6">
        <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-rule bg-surface p-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-action-light text-action-dark">
              <Video className="h-6 w-6" />
            </span>
            <div className="text-lg font-medium text-ink">Join the call</div>
            <div className="text-sm text-muted-text">Enter your name to continue.</div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (displayName.trim()) setNameSubmitted(true);
            }}
            className="flex flex-col gap-3"
          >
            <Input
              autoFocus
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              maxLength={120}
            />
            <Button type="submit" disabled={!displayName.trim()} className="bg-action text-canvas hover:bg-action-dark">
              Continue
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col gap-3 bg-canvas p-4">
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-[14px] border border-rule bg-[#0F1714]">
        {call.credentials && !call.credentials.waitingRoom && (call.view === 'live' || call.view === 'failover') && (
          <div className="absolute inset-0">
            {call.credentials.provider === 'livekit' && (
              <LiveKitCall
                ref={call.providerRef}
                credentials={call.credentials}
                displayName={displayName}
                onConnected={call.onProviderConnected}
                onDisconnected={call.onProviderDisconnected}
                onLocalMediaStateChange={call.onLocalMediaStateChange}
              />
            )}
            {call.credentials.provider === 'jitsi' && (
              <JitsiCall
                ref={call.providerRef}
                credentials={call.credentials}
                displayName={displayName}
                onConnected={call.onProviderConnected}
                onDisconnected={call.onProviderDisconnected}
                onLocalMediaStateChange={call.onLocalMediaStateChange}
              />
            )}
            {call.credentials.provider === 'zoom' && (
              <ZoomCall
                ref={call.providerRef}
                credentials={call.credentials}
                displayName={displayName}
                onConnected={call.onProviderConnected}
                onDisconnected={call.onProviderDisconnected}
                onLocalMediaStateChange={call.onLocalMediaStateChange}
              />
            )}
          </div>
        )}

        {call.view !== 'live' && (
          <StageOverlay
            view={call.view}
            clientName="the host"
            displayName={displayName}
            error={call.error}
            onGoLive={call.goLive}
            onRetry={call.retryFromFailover}
            onCheckAgain={call.requestJoin}
            joinLabel="Join call"
            waitingTitle="Waiting for the host"
            waitingSub="You'll connect automatically once the host joins."
            elapsedLabel={formatTimer(call.seconds)}
            onDone={null}
          />
        )}
      </div>

      <ControlBar
        muted={call.muted}
        camOn={call.camOn}
        onToggleMute={call.toggleMute}
        onToggleCam={call.toggleCam}
        onEnd={call.endSession}
        endLabel="Leave"
        hidden={!isLive || call.credentials?.provider === 'zoom'}
      />
    </div>
  );
}
