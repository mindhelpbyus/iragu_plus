import { useState } from 'react';
import { ChevronDown, ChevronUp, Mail, X } from 'lucide-react';
import { toast } from 'sonner';
import { initialsOf } from '../calendar/calendarConstants';
import { useClientInvites, sortInvites, pendingInvitesCount, inviteStatusMeta } from './useClientInvites';

function formatInviteDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Collapsible "Pending invites" panel for ClientsPage — real data from
 * GET /clients/invites, with a real withdraw action (DELETE). Not a
 * dedicated page: the task doesn't warrant one, and this repo's existing
 * pages keep secondary lists like this as an in-page panel.
 */
export function PendingInvitesPanel({ invitesHook }: { invitesHook: ReturnType<typeof useClientInvites> }) {
  const { invites, loading, error, withdrawingId, withdraw } = invitesHook;
  const [open, setOpen] = useState(false);

  const sorted = sortInvites(invites);
  const pending = pendingInvitesCount(invites);

  async function handleWithdraw(id: string, email: string) {
    try {
      await withdraw(id);
      toast.success(`Invite to ${email} withdrawn.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not withdraw the invite.');
    }
  }

  if (!loading && !error && invites.length === 0) return null;

  return (
    <div className="mb-4 overflow-hidden rounded-[14px] border border-rule bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3.5 text-left"
      >
        <span className="flex items-center gap-2 text-[13px] font-semibold text-ink">
          <Mail className="h-4 w-4 text-muted-text" />
          Pending invites
          {pending > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-ochre-light px-1.5 text-[10px] font-semibold text-[#8A6714]">
              {pending}
            </span>
          )}
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-text" /> : <ChevronDown className="h-4 w-4 text-muted-text" />}
      </button>

      {open && (
        <div className="border-t border-rule">
          {loading && <div className="p-6 text-center text-sm text-muted-text">Loading invites…</div>}
          {error && <div className="p-6 text-center text-sm text-danger">{error}</div>}
          {!loading &&
            !error &&
            sorted.map((invite) => {
              const meta = inviteStatusMeta(invite.status);
              const withdrawing = withdrawingId === invite.id;
              return (
                <div
                  key={invite.id}
                  className="flex items-center gap-3 border-b border-action-light px-5 py-3 last:border-b-0"
                >
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-action-light text-[11px] font-semibold text-action-dark">
                    {initialsOf(invite.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[13px] font-medium text-ink">{invite.name}</span>
                      <span
                        className="inline-flex h-5 flex-shrink-0 items-center rounded-full px-2 text-[10px] font-semibold"
                        style={{ background: meta.bg, color: meta.fg }}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <div className="truncate text-xs text-muted-text">{invite.email}</div>
                    {invite.status === 'invited' && !invite.emailSent && (
                      <div className="mt-0.5 text-xs text-danger">
                        Email not delivered{invite.emailError ? `: ${invite.emailError}` : '.'}
                      </div>
                    )}
                  </span>
                  <span className="flex-shrink-0 text-[11px] text-muted-text">
                    {invite.status === 'invited' ? `Expires ${formatInviteDate(invite.expiresAt)}` : formatInviteDate(invite.invitedAt)}
                  </span>
                  {invite.status === 'invited' && (
                    <button
                      type="button"
                      onClick={() => handleWithdraw(invite.id, invite.email)}
                      disabled={withdrawing}
                      title="Withdraw invite"
                      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-muted-text transition-colors hover:bg-danger-light hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
