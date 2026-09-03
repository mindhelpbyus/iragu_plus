import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type MutableRefObject } from 'react';
import { ConnectionState, RoomEvent, type Room } from 'livekit-client';
import {
  LiveKitRoom,
  GridLayout,
  FocusLayout,
  ParticipantTile,
  useTracks,
  useLocalParticipant,
  useRoomContext,
  useConnectionState,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import type { ProviderCallHandle, ProviderCallProps } from './types';

/**
 * Real LiveKit integration — livekit-client's Room.connect() (driven
 * declaratively by <LiveKitRoom serverUrl/token>) and
 * localParticipant.setMicrophoneEnabled/setCameraEnabled for mic/camera,
 * which actually call getUserMedia and publish/unpublish real tracks (unlike
 * the previous UI, which only flipped local booleans).
 */
export const LiveKitCall = forwardRef<ProviderCallHandle, ProviderCallProps>(
  ({ credentials, displayName, onConnected, onDisconnected, onLocalMediaStateChange }, ref) => {
    if (!credentials.serverUrl) {
      throw new Error('LiveKit join credentials are missing serverUrl');
    }
    const intentionalLeave = useRef(false);

    return (
      <LiveKitRoom
        serverUrl={credentials.serverUrl}
        token={credentials.token}
        connect
        audio={credentials.features.audio}
        video={credentials.features.video}
        data-lk-theme="default"
        className="h-full w-full"
        onDisconnected={() => onDisconnected(intentionalLeave.current ? 'user-left' : 'connection-lost')}
      >
        <LiveKitCallInner
          ref={ref}
          displayName={displayName}
          onConnected={onConnected}
          onLocalMediaStateChange={onLocalMediaStateChange}
          intentionalLeave={intentionalLeave}
        />
      </LiveKitRoom>
    );
  },
);
LiveKitCall.displayName = 'LiveKitCall';

const LiveKitCallInner = forwardRef<
  ProviderCallHandle,
  {
    displayName: string;
    onConnected: () => void;
    onLocalMediaStateChange: ProviderCallProps['onLocalMediaStateChange'];
    intentionalLeave: MutableRefObject<boolean>;
  }
>(({ displayName, onConnected, onLocalMediaStateChange, intentionalLeave }, ref) => {
  const room: Room = useRoomContext();
  const connectionState = useConnectionState(room);
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], { onlySubscribed: false });
  const [gridLayout, setGridLayout] = useState(true);

  useEffect(() => {
    if (connectionState === ConnectionState.Connected) {
      room.localParticipant.setName(displayName).catch(() => undefined);
      onConnected();
    }
  }, [connectionState, room, displayName, onConnected]);

  useEffect(() => {
    onLocalMediaStateChange({ audioEnabled: isMicrophoneEnabled, videoEnabled: isCameraEnabled });
  }, [isMicrophoneEnabled, isCameraEnabled, onLocalMediaStateChange]);

  useImperativeHandle(
    ref,
    () => ({
      toggleAudio: async () => {
        await localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled);
      },
      toggleVideo: async () => {
        await localParticipant.setCameraEnabled(!localParticipant.isCameraEnabled);
      },
      leave: async () => {
        intentionalLeave.current = true;
        await room.disconnect();
      },
      toggleScreenShare: async () => {
        await localParticipant.setScreenShareEnabled(!localParticipant.isScreenShareEnabled);
      },
      cycleLayout: () => {
        setGridLayout((g) => !g);
      },
    }),
    [localParticipant, room, intentionalLeave],
  );

  // Surface a hard disconnect (kicked, room ended server-side, network drop)
  // distinctly from a voluntary leave — both still flow through onDisconnected
  // via <LiveKitRoom onDisconnected>, this just ensures the event is bound
  // even if the consumer only listens at the Room level elsewhere.
  useEffect(() => {
    const onReconnecting = () => undefined; // reserved for a future "reconnecting…" banner
    room.on(RoomEvent.Reconnecting, onReconnecting);
    return () => {
      room.off(RoomEvent.Reconnecting, onReconnecting);
    };
  }, [room]);

  return (
    <div className="h-full w-full bg-black">
      {gridLayout ? (
        <GridLayout tracks={tracks} style={{ height: '100%' }}>
          <ParticipantTile />
        </GridLayout>
      ) : (
        tracks[0] && <FocusLayout trackRef={tracks[0]} style={{ height: '100%' }} />
      )}
    </div>
  );
});
LiveKitCallInner.displayName = 'LiveKitCallInner';
