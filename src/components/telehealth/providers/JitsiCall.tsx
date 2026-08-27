import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { loadJitsiExternalApi, type JitsiMeetExternalAPI } from './jitsiExternalApi';
import type { ProviderCallHandle, ProviderCallProps } from './types';

/**
 * Real Jitsi integration via the IFrame External API
 * (https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe/), against
 * this platform's self-hosted Jitsi/Prosody instance — serverUrl from
 * video-service's join response is `https://{JITSI_DOMAIN}`, token is a real
 * Prosody JWT (security/jitsiToken.ts). audioMuteStatusChanged /
 * videoMuteStatusChanged are real IFrame API events fired by the embedded
 * Jitsi client itself, not local component state — so onLocalMediaStateChange
 * reflects what's actually true inside the call.
 */
export const JitsiCall = forwardRef<ProviderCallHandle, ProviderCallProps>(
  ({ credentials, displayName, onConnected, onDisconnected, onLocalMediaStateChange }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const apiRef = useRef<JitsiMeetExternalAPI | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const mediaStateRef = useRef({ audioEnabled: credentials.features.audio, videoEnabled: credentials.features.video });

    if (!credentials.serverUrl) {
      throw new Error('Jitsi join credentials are missing serverUrl');
    }
    const domain = credentials.serverUrl.replace(/^https?:\/\//, '');

    useEffect(() => {
      let disposed = false;

      loadJitsiExternalApi(domain)
        .then(() => {
          if (disposed || !containerRef.current || !window.JitsiMeetExternalAPI) return;

          const api = new window.JitsiMeetExternalAPI(domain, {
            roomName: credentials.roomName,
            parentNode: containerRef.current,
            width: '100%',
            height: '100%',
            jwt: credentials.token || undefined,
            userInfo: { displayName },
            configOverwrite: {
              startWithAudioMuted: !credentials.features.audio,
              startWithVideoMuted: !credentials.features.video,
              prejoinPageEnabled: false,
              disableDeepLinking: true,
            },
            interfaceConfigOverwrite: {
              TOOLBAR_BUTTONS: [], // outer VideoCallFrame chrome owns all controls
            },
          });
          apiRef.current = api;

          const handleJoined = () => onConnected();
          const handleLeft = () => onDisconnected('user-left');
          const handleReadyToClose = () => onDisconnected('user-left');
          const handleAudioMute = (e: unknown) => {
            mediaStateRef.current = { ...mediaStateRef.current, audioEnabled: !(e as { muted: boolean }).muted };
            onLocalMediaStateChange(mediaStateRef.current);
          };
          const handleVideoMute = (e: unknown) => {
            mediaStateRef.current = { ...mediaStateRef.current, videoEnabled: !(e as { muted: boolean }).muted };
            onLocalMediaStateChange(mediaStateRef.current);
          };

          api.addListener('videoConferenceJoined', handleJoined);
          api.addListener('videoConferenceLeft', handleLeft);
          api.addListener('readyToClose', handleReadyToClose);
          api.addListener('audioMuteStatusChanged', handleAudioMute);
          api.addListener('videoMuteStatusChanged', handleVideoMute);
        })
        .catch((err) => {
          if (!disposed) setLoadError(err instanceof Error ? err.message : 'Failed to load Jitsi');
        });

      return () => {
        disposed = true;
        apiRef.current?.dispose();
        apiRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps -- join credentials/displayName are stable for the component's lifetime; re-running on their identity would tear down and rejoin the call.
    }, [domain]);

    useImperativeHandle(
      ref,
      () => ({
        toggleAudio: async () => {
          apiRef.current?.executeCommand('toggleAudio');
        },
        toggleVideo: async () => {
          apiRef.current?.executeCommand('toggleVideo');
        },
        leave: async () => {
          apiRef.current?.executeCommand('hangup');
        },
      }),
      [],
    );

    if (loadError) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-black text-sm text-red-400">
          {loadError}
        </div>
      );
    }

    return <div ref={containerRef} className="h-full w-full bg-black" />;
  },
);
JitsiCall.displayName = 'JitsiCall';
