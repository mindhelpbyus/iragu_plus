import { useCallback, useEffect, useRef, useState } from 'react';
import { endRoom, type JoinCredentials } from '../../api/videoService';
import type { ProviderCallHandle } from './providers/types';

export type CallView = 'prejoin' | 'waiting' | 'live' | 'failover' | 'ended' | 'error';

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
   * prejoin/waiting/live/failover/ended state machine either way; only the
   * network call that produces JoinCredentials differs per entry point.
   */
  requestJoinCredentials: () => Promise<JoinCredentials>;
  canEndForEveryone: boolean;
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
export function useVideoCallState({ requestJoinCredentials, canEndForEveryone }: UseVideoCallStateArgs) {
  const [view, setView] = useState<CallView>('prejoin');
  const [credentials, setCredentials] = useState<JoinCredentials | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [camOn, setCamOn] = useState(true);
  const [seconds, setSeconds] = useState(0);
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

  return {
    view,
    setView,
    credentials,
    error,
    muted,
    camOn,
    seconds,
    providerRef,
    requestJoin,
    goLive,
    onProviderConnected,
    onProviderDisconnected,
    toggleMute,
    toggleCam,
    endSession,
    retryFromFailover,
  };
}
