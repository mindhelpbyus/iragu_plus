import { Mic, MicOff, Video, VideoOff, PhoneOff, MonitorUp, Captions, LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';

interface ControlBarProps {
  muted: boolean;
  camOn: boolean;
  onToggleMute: () => void;
  onToggleCam: () => void;
  onEnd: () => void;
  endLabel: string;
  /** Zoom's Embedded toolbar owns its own mic/camera/leave controls — hide ours to avoid a duplicate, conflicting set. */
  hidden?: boolean;
  /**
   * Screen-share/captions/layout — optional, and each independently
   * optional, because not every call site has these wired yet (Part D.2).
   * Omitting a handler hides that button entirely rather than rendering a
   * dead control — GuestJoinPage/InstantRoomPage don't pass these yet.
   */
  screenSharing?: boolean;
  onToggleScreenShare?: () => void;
  captionsOn?: boolean;
  onToggleCaptions?: () => void;
  onToggleLayout?: () => void;
}

const baseBtn =
  'flex h-[46px] w-[46px] flex-none items-center justify-center rounded-[11px] border border-white/[.14] bg-white/[.06] text-canvas transition-colors hover:bg-white/[.14]';
const activeDanger = 'border-0 bg-danger text-canvas hover:bg-[#9A5252]';
const activeAction = 'border-0 bg-action text-canvas hover:bg-action-dark';

export function ControlBar({
  muted,
  camOn,
  onToggleMute,
  onToggleCam,
  onEnd,
  endLabel,
  hidden,
  screenSharing,
  onToggleScreenShare,
  captionsOn,
  onToggleCaptions,
  onToggleLayout,
}: ControlBarProps) {
  if (hidden) {
    return (
      <div className="flex items-center justify-center rounded-[14px] border border-rule bg-surface px-4 py-2">
        <span className="text-xs text-muted-text">Controls are in the video panel above</span>
      </div>
    );
  }

  return (
    <div className="flex flex-none flex-wrap items-center justify-center gap-2 rounded-[14px] bg-[#1A2320] p-2.5">
      <button
        type="button"
        onClick={onToggleMute}
        aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}
        className={muted ? `${baseBtn} ${activeDanger}` : baseBtn}
      >
        {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </button>
      <button
        type="button"
        onClick={onToggleCam}
        aria-label={camOn ? 'Turn camera off' : 'Turn camera on'}
        className={!camOn ? `${baseBtn} ${activeDanger}` : baseBtn}
      >
        {camOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
      </button>

      {onToggleScreenShare && (
        <button
          type="button"
          onClick={onToggleScreenShare}
          aria-label={screenSharing ? 'Stop sharing your screen' : 'Share your screen'}
          className={screenSharing ? `${baseBtn} ${activeAction}` : baseBtn}
        >
          <MonitorUp className="h-5 w-5" />
        </button>
      )}

      {onToggleCaptions && (
        <button
          type="button"
          onClick={() => {
            onToggleCaptions();
            if (!captionsOn) toast.info('Live captions are coming soon.');
          }}
          aria-label={captionsOn ? 'Turn off captions' : 'Turn on captions'}
          className={captionsOn ? `${baseBtn} ${activeAction}` : baseBtn}
        >
          <Captions className="h-5 w-5" />
        </button>
      )}

      {onToggleLayout && (
        <button type="button" onClick={onToggleLayout} aria-label="Change layout" className={baseBtn}>
          <LayoutGrid className="h-5 w-5" />
        </button>
      )}

      <span className="mx-1 h-7 w-px bg-white/[.14]" />

      <button
        type="button"
        onClick={onEnd}
        className="flex h-[46px] flex-none items-center gap-2 rounded-[11px] bg-danger px-5 text-[13px] font-semibold text-canvas transition-colors hover:bg-[#9A5252]"
      >
        <PhoneOff className="h-[19px] w-[19px]" />
        {endLabel}
      </button>
    </div>
  );
}
