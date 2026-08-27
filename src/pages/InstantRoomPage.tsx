import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { VideoCallFrame } from '../components/telehealth/VideoCallFrame';
import { joinRoom } from '../api/videoService';
import { useAuthStore } from '../store/authStore';

/**
 * A therapist joining their own ad-hoc room (instant call or internal team
 * meeting) — not tied to any scheduled appointment. Uses the same
 * VideoCallFrame as a real session, just without the clinical-documentation
 * side panel (there's no client/appointment to attach a SOAP note to).
 */
export default function InstantRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const currentUser = useAuthStore((s) => s.user);
  const displayName = currentUser?.name || 'Host';
  const isTherapist = currentUser?.role === 'therapist' || currentUser?.role === 'admin' || currentUser?.role === 'org_owner';

  const requestJoinCredentials = useCallback(() => {
    if (!roomId) throw new Error('No room specified.');
    return joinRoom(roomId, { displayName, mode: 'video' });
  }, [roomId, displayName]);

  if (!roomId) return null;

  return (
    <div className="flex h-[calc(100vh-80px)] flex-col gap-3 bg-canvas p-4">
      <VideoCallFrame
        requestJoinCredentials={requestJoinCredentials}
        displayName={displayName}
        clientName="the other participant"
        canEndForEveryone={isTherapist}
        isTherapist={isTherapist}
        onTogglePanel={() => undefined}
      />
    </div>
  );
}
