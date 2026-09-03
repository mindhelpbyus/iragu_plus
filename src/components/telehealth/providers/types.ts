import type { JoinCredentials } from '../../../api/videoService';

/**
 * Every provider adapter (LiveKit/Jitsi/Zoom) implements this exact prop
 * contract so VideoCallFrame can render whichever one video-service assigned
 * to a room without the caller (or the therapist) ever knowing which SDK is
 * actually running underneath — per explicit product direction: therapists
 * should never see or choose a provider name.
 */
export interface ProviderCallProps {
  credentials: JoinCredentials;
  displayName: string;
  /** Called once the provider SDK has genuinely connected (not just "attempted"). */
  onConnected: () => void;
  /** Called on any disconnect — user-initiated leave, error, or the room ending. */
  onDisconnected: (reason?: string) => void;
  /** Called when the local mic/camera state actually changes at the SDK level. */
  onLocalMediaStateChange: (state: { audioEnabled: boolean; videoEnabled: boolean }) => void;
}

/**
 * Imperative controls VideoCallFrame's outer chrome (mic/camera/leave
 * buttons) drives on whichever provider is currently mounted. Each adapter
 * exposes this via a ref so the SAME physical buttons work regardless of
 * provider — no per-provider UI branching above this layer.
 */
export interface ProviderCallHandle {
  toggleAudio: () => Promise<void>;
  toggleVideo: () => Promise<void>;
  leave: () => Promise<void>;
  /**
   * Screen-share/layout are LiveKit-only for now — Jitsi/Zoom's own
   * embedded UI already owns these concepts, so their adapters don't
   * implement them. Optional here (rather than a required stub on every
   * adapter) so VideoCallFrame can render those ControlBar buttons only
   * when the mounted provider actually supports them.
   */
  toggleScreenShare?: () => Promise<void>;
  cycleLayout?: () => void;
}
