import { useCallback, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Video } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { StageOverlay } from '../components/telehealth/StageOverlay';
import { ControlBar } from '../components/telehealth/ControlBar';
import { useVideoCallState } from '../components/telehealth/useVideoCallState';
import { guestJoinRoom } from '../api/videoService';
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
 * flow — /telehealth/guest/:roomId?token=... . The signed token in the URL
 * (video-service's POST /rooms/{id}/guest-link) is the only credential; this
 * page never touches Cognito. Same provider-invisible principle as the main
 * VideoCallFrame — a guest never sees which video SDK is actually running.
 */
export default function GuestJoinPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [displayName, setDisplayName] = useState('');
  const [nameSubmitted, setNameSubmitted] = useState(false);

  const requestJoinCredentials = useCallback(() => {
    if (!roomId || !token) throw new Error('This link is missing required information.');
    return guestJoinRoom(roomId, { token, displayName: displayName || 'Guest', mode: 'video' });
  }, [roomId, token, displayName]);

  const call = useVideoCallState({ requestJoinCredentials, canEndForEveryone: false });
  const isLive = call.view === 'live';

  if (!roomId || !token) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas p-6 text-center">
        <div>
          <p className="font-semibold text-ink">This link is invalid</p>
          <p className="mt-1 text-sm text-muted-text">Ask whoever sent it to share the link again.</p>
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
