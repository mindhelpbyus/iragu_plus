import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import ZoomMtgEmbedded from '@zoom/meetingsdk/embedded';
import { parseZoomJoinUrl } from './zoomJoinUrl';
import type { ProviderCallHandle, ProviderCallProps } from './types';

type EmbeddedClientInstance = ReturnType<typeof ZoomMtgEmbedded.createClient>;

/**
 * Real Zoom integration via Meeting SDK's Embedded/Component View — chosen
 * over Video SDK because video-service's real backend (providers/zoomAdapter.ts)
 * already signs Meeting SDK JWTs (mn/role/sdkKey), not Video SDK's tpc/app_key
 * shape; changing that is a separate backend decision, not a frontend one.
 * Embedded renders Zoom's own toolbar INSIDE our container (init({zoomAppRoot})),
 * so unlike LiveKit/Jitsi this provider's mic/camera/leave controls are Zoom's
 * native buttons, not ours — accepted tradeoff: the call still never leaves
 * this page (no external tab/popup), which is the actual hard requirement.
 *
 * serverUrl from video-service is a full join_url
 * (https://zoom.us/j/{meetingNumber}?pwd={password}) — meetingNumber/password
 * aren't separate JoinCredentials fields, so they're parsed out of that URL
 * (see zoomJoinUrl.ts) rather than duplicating them server-side for a single
 * call site.
 */
export const ZoomCall = forwardRef<ProviderCallHandle, ProviderCallProps>(
  ({ credentials, displayName, onConnected, onDisconnected }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const clientRef = useRef<EmbeddedClientInstance | null>(null);
    const [error, setError] = useState<string | null>(null);
    const intentionalLeave = useRef(false);

    if (!credentials.serverUrl) {
      throw new Error('Zoom join credentials are missing serverUrl (join_url)');
    }
    if (!credentials.token) {
      throw new Error('Zoom join credentials are missing the Meeting SDK signature');
    }

    useEffect(() => {
      if (!containerRef.current) return;
      let disposed = false;
      const client = ZoomMtgEmbedded.createClient();
      clientRef.current = client;

      const { meetingNumber, password } = parseZoomJoinUrl(credentials.serverUrl!);

      client
        .init({
          zoomAppRoot: containerRef.current,
          language: 'en-US',
          patchJsMedia: true,
          leaveOnPageUnload: true,
        })
        .then(() =>
          client.join({
            signature: credentials.token,
            meetingNumber,
            password,
            userName: displayName,
          }),
        )
        .then(() => {
          if (!disposed) onConnected();
        })
        .catch((err: unknown) => {
          if (!disposed) setError(err instanceof Error ? err.message : 'Failed to join Zoom meeting');
        });

      client.on('connection-change', (payload: { state: string }) => {
        if (payload.state === 'Closed') onDisconnected(intentionalLeave.current ? 'user-left' : 'connection-lost');
      });

      return () => {
        disposed = true;
        client.leaveMeeting().catch(() => undefined);
        clientRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps -- join credentials/displayName are stable for the component's lifetime.
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        // Embedded's own toolbar owns mic/camera for the user directly;
        // these exist so the outer frame's chrome (e.g. a keyboard shortcut
        // or an accessibility affordance) can still drive them programmatically.
        toggleAudio: async () => {
          const current = clientRef.current?.getCurrentUser();
          await clientRef.current?.mute(!current?.muted);
        },
        toggleVideo: async () => {
          // No confirmed startVideo/stopVideo toggle in this SDK version's
          // Embedded namespace — video is controlled via Zoom's own toolbar
          // button inside the rendered client, not exposed as a separate
          // imperative call. Left as a documented no-op rather than a silent
          // wrong action.
        },
        leave: async () => {
          intentionalLeave.current = true;
          await clientRef.current?.leaveMeeting();
        },
      }),
      [],
    );

    if (error) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-black text-sm text-red-400">
          {error}
        </div>
      );
    }

    return <div ref={containerRef} className="h-full w-full bg-black" />;
  },
);
ZoomCall.displayName = 'ZoomCall';
