import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { VideoCallFrame } from '../components/telehealth/VideoCallFrame';
import { InstantSessionPanel } from '../components/telehealth/InstantSessionPanel';
import { joinRoom } from '../api/videoService';
import { useAuthStore } from '../store/authStore';
import type { CallView } from '../components/telehealth/useVideoCallState';

/**
 * A therapist joining their own ad-hoc room (instant call or internal team
 * meeting) — not tied to any scheduled appointment. Uses the same
 * VideoCallFrame as a real session; the side panel here is
 * InstantSessionPanel (Chat/People/Notes), a smaller, different component
 * from SessionPanel.tsx — there's no client/appointment to attach a real
 * SOAP note to, only a draft note that can later be submitted against a
 * client the therapist picks (see InstantSessionPanel's own comment).
 */
export default function InstantRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const displayName = currentUser?.name || 'Host';
  const isTherapist = currentUser?.role === 'therapist' || currentUser?.role === 'admin' || currentUser?.role === 'org_owner';
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'org_owner';

  const [panelOpen, setPanelOpen] = useState(true);
  const [view, setView] = useState<CallView>('prejoin');
  const [callStartedAt, setCallStartedAt] = useState<string | null>(null);

  const requestJoinCredentials = useCallback(() => {
    if (!roomId) throw new Error('No room specified.');
    return joinRoom(roomId, { displayName, mode: 'video' });
  }, [roomId, displayName]);

  const handleViewChange = (nextView: CallView) => {
    setView(nextView);
    if (nextView === 'live' && !callStartedAt) setCallStartedAt(new Date().toISOString());
  };

  if (!roomId) return null;

  return (
    <div className="flex h-[calc(100vh-80px)] gap-4 bg-canvas p-4">
      <div className="flex h-full min-h-0 flex-1 flex-col gap-3">
        <VideoCallFrame
          requestJoinCredentials={requestJoinCredentials}
          displayName={displayName}
          clientName="the other participant"
          canEndForEveryone={isTherapist}
          isTherapist={isTherapist}
          onTogglePanel={() => setPanelOpen((v) => !v)}
          onViewChange={handleViewChange}
          showProviderBadge={isAdmin}
          onDone={() => navigate('/telehealth', { replace: true })}
        />
      </div>

      {panelOpen && isTherapist && (
        <div className="hidden h-full min-h-0 w-[380px] flex-none lg:flex">
          <InstantSessionPanel roomId={roomId} view={view} callStartedAt={callStartedAt} />
        </div>
      )}
    </div>
  );
}
