import { useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';
import type { JoinCredentials } from '../../api/videoService';

const PROVIDER_LABEL: Record<JoinCredentials['provider'], string> = {
  livekit: 'LiveKit',
  zoom: 'Zoom',
  jitsi: 'Jitsi',
  huddle01: 'Huddle01',
  google_meet: 'Google Meet',
  zoho_meeting: 'Zoho Meeting',
};

/**
 * Admin/org-owner-only visibility into which transport a session is actually
 * using — per explicit instruction, hidden entirely for therapist and client
 * roles (they should never need to know or care). Only shows real data:
 * video-service's actual JoinCredentials.provider for THIS session. There's
 * no live latency/quality table reaching this frontend for the other five
 * providers, so unlike the design mockup's routing-rules panel, this never
 * fabricates comparison numbers — it states the one fact that's real.
 */
export function ProviderBadge({ provider }: { provider: JoinCredentials['provider'] | null }) {
  const [open, setOpen] = useState(false);
  if (!provider) return null;

  return (
    <div className="relative flex-none">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex h-10 items-center gap-2 rounded-[10px] border border-rule bg-surface px-3 transition-colors hover:bg-surface-sage"
      >
        <span className="rounded-full bg-ochre-light px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#8A6714]">
          Admin
        </span>
        <span className="text-xs font-medium text-ink">{PROVIDER_LABEL[provider]}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-text" />
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-40 w-72 rounded-xl border border-rule bg-surface p-3 text-xs shadow-lg">
          <div className="flex items-start gap-2 text-muted-text">
            <Info className="mt-0.5 h-3.5 w-3.5 flex-none" />
            <span>
              This session is running on <strong className="font-semibold text-ink">{PROVIDER_LABEL[provider]}</strong>.
              Visible only to admins/org owners — therapists and clients never see transport details.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
