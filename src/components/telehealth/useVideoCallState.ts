import { useCallback, useEffect, useRef, useState } from 'react';
import { endRoom, type JoinCredentials } from '../../api/videoService';
import type { ProviderCallHandle } from './providers/types';

export type CallView = 'idle' | 'prejoin' | 'waiting' | 'live' | 'failover' | 'ended' | 'error';

/**
 * Pure decision logic for a provider disconnect, extracted so it's testable
 * without a DOM/hook-rendering environment. A disconnect after a genuine
 * connection that wasn't a deliberate leave is the design's "failover"
 * moment — surfaced honestly, never silently retried.
 */
export function resolveDisconnectView(
  reason: string | undefined,
  hasEverConnected: boolean,
): { view: CallView; error: string | null } {
  if (reason === 'user-left' || reason === 'ended-by-therapist') {
    return { view: 'ended', error: null };
  }
  if (hasEverConnected) {
    return { view: 'failover', error: null };
  }
  return { view: 'error', error: reason || 'Connection lost before the call could start.' };
}

interface UseVideoCallStateArgs {
  /**
   * The actual join call — joinAppointmentRoom for a scheduled appointment,
   * joinRoom for an ad-hoc room the caller already has access to, or
   * guestJoinRoom for a public guest-link join. This hook owns the
   * idle/prejoin/waiting/live/failover/ended state machine either way; only
   * the network call that produces JoinCredentials differs per entry point.
   */
  requestJoinCredentials: () => Promise<JoinCredentials>;
  canEndForEveryone: boolean;
  /**
   * Start in 'idle' (a real launcher state, not a route-level branch) rather
   * than jumping straight to 'prejoin'. Used wherever there's a meaningful
   * "nothing happening yet" moment — e.g. the main appointment frame, where
   * the therapist/client should see today's queue before committing to join.
   */
  startIdle?: boolean;
}

/**
 * Real state machine backing the video call page, matching the design's
 * prejoin/waiting/live/failover/ended states — driven by video-service's
 * actual join response (waitingRoom flag) rather than the design prototype's
 * locally-toggled `view` state. "failover" is surfaced when the mounted
 * provider adapter reports a disconnect that ISN'T a user-initiated leave —
 * there is no automatic re-routing to a different provider yet (that's a
 * video-service capability, not something the frontend can decide on its
 * own), so failover here means "connection lost, offer to retry the join."
 */
export function useVideoCallState({ requestJoinCredentials, canEndForEveryone, startIdle }: UseVideoCallStateArgs) {
  const [view, setView] = useState<CallView>(startIdle ? 'idle' : 'prejoin');
  const [credentials, setCredentials] = useState<JoinCredentials | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [camOn, setCamOn] = useState(true);
  const [seconds, setSeconds] = useState(0);
  // Real toggle state, honestly staged: captions has no backing STT pipeline
  // yet (that's Part A/Sarvam's eventual job), so toggling this only flips
  // the button's own state — ControlBar surfaces a "coming soon" message
  // rather than pretending captions actually appear.
  const [captionsOn, setCaptionsOn] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const providerRef = useRef<ProviderCallHandle>(null);
  const hasEverConnected = useRef(false);

  useEffect(() => {
    if (view !== 'live') return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [view]);

  const requestJoin = useCallback(async () => {
    setError(null);
    try {
      const creds = await requestJoinCredentials();
      setCredentials(creds);
      setMuted(!creds.features.audio);
      setCamOn(creds.features.video);
      if (creds.waitingRoom) {
        setView('waiting');
      }
      // else: stay in whatever view called this (prejoin renders the
      // provider component once credentials exist and !waitingRoom).
      return creds;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join the call');
      setView('error');
      return null;
    }
  }, [requestJoinCredentials]);

  const goLive = useCallback(async () => {
    if (!credentials || credentials.waitingRoom) {
      const creds = await requestJoin();
      if (!creds || creds.waitingRoom) return;
    }
    setView('live');
  }, [credentials, requestJoin]);

  const onProviderConnected = useCallback(() => {
    hasEverConnected.current = true;
    setView('live');
  }, []);

  const onProviderDisconnected = useCallback((reason?: string) => {
    const { view: nextView, error: nextError } = resolveDisconnectView(reason, hasEverConnected.current);
    setView(nextView);
    setError(nextError);
  }, []);

  /**
   * muted/camOn are the SDK's REAL, reported state (via
   * onLocalMediaStateChange below) — not locally flipped on click. A
   * provider's toggleAudio()/toggleVideo() can fail (e.g. camera permission
   * revoked mid-call, device disconnected), so optimistically flipping the
   * icon here would show a control that's lying about what's actually live.
   */
  const onLocalMediaStateChange = useCallback((state: { audioEnabled: boolean; videoEnabled: boolean }) => {
    setMuted(!state.audioEnabled);
    setCamOn(state.videoEnabled);
  }, []);

  const toggleMute = useCallback(async () => {
    await providerRef.current?.toggleAudio();
  }, []);

  const toggleCam = useCallback(async () => {
    await providerRef.current?.toggleVideo();
  }, []);

  const endSession = useCallback(async () => {
    await providerRef.current?.leave().catch(() => undefined);
    if (canEndForEveryone && credentials?.roomId) {
      await endRoom(credentials.roomId).catch(() => undefined);
    }
    setView('ended');
  }, [canEndForEveryone, credentials]);

  const retryFromFailover = useCallback(async () => {
    setCredentials(null);
    setView('prejoin');
    await requestJoin();
  }, [requestJoin]);

  const toggleCaptions = useCallback(() => {
    setCaptionsOn((on) => !on);
  }, []);

  // Only real on LiveKit — providerRef.current?.toggleScreenShare is
  // undefined for Jitsi/Zoom adapters (see ProviderCallHandle's own
  // comment), so this silently no-ops rather than throwing for those
  // providers. VideoCallFrame only renders the button when it can tell the
  // mounted provider is LiveKit, but this guard keeps the hook itself safe
  // regardless of caller.
  const toggleScreenShare = useCallback(async () => {
    if (!providerRef.current?.toggleScreenShare) return;
    await providerRef.current.toggleScreenShare();
    setScreenSharing((s) => !s);
  }, []);

  const cycleLayout = useCallback(() => {
    providerRef.current?.cycleLayout?.();
  }, []);

  return {
    view,
    setView,
    credentials,
    error,
    muted,
    camOn,
    captionsOn,
    screenSharing,
    seconds,
    providerRef,
    requestJoin,
    goLive,
    onProviderConnected,
    onProviderDisconnected,
    onLocalMediaStateChange,
    toggleMute,
    toggleCam,
    toggleCaptions,
    toggleScreenShare,
    cycleLayout,
    endSession,
    retryFromFailover,
  };
}
