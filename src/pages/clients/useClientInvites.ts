import { useCallback, useEffect, useState } from 'react';
import { listInvites, withdrawInvite, type InvitedClient, type SentInvite } from '../../api/clientInvites';

/**
 * POST /clients/invite's response (SentInvite) doesn't carry a creation
 * timestamp the way GET /clients/invites' rows do (`invitedAt`, from
 * `ClientInvite.createdAt`) — this invite was *just* created, so "now" is
 * accurate until the next list refetch reconciles it with the real value.
 * Mirrors therapistApp's InvitedClient.fromJson, which falls back to
 * DateTime.now() the same way when the field is absent.
 */
export function toInvitedClient(invite: SentInvite): InvitedClient {
  return {
    id: invite.id,
    name: invite.name,
    email: invite.email,
    phone: invite.phone,
    status: invite.status,
    invitedAt: new Date().toISOString(),
    sentAt: invite.sentAt,
    expiresAt: invite.expiresAt,
    emailSent: invite.emailSent,
    emailError: invite.emailError ?? null,
  };
}

/**
 * 'invited' rows (the only actionable/withdrawable ones) sort first, most
 * recently invited within each group; everything else (accepted/revoked/
 * expired) follows, also most-recent-first. Pure so it's independently
 * testable without standing up the hook's fetch/loading machinery.
 */
export function sortInvites(invites: InvitedClient[]): InvitedClient[] {
  return [...invites].sort((a, b) => {
    const aPending = a.status === 'invited';
    const bPending = b.status === 'invited';
    if (aPending !== bPending) return aPending ? -1 : 1;
    return new Date(b.invitedAt).getTime() - new Date(a.invitedAt).getTime();
  });
}

export function pendingInvitesCount(invites: InvitedClient[]): number {
  return invites.filter((i) => i.status === 'invited').length;
}

/**
 * Human status label + tone shown next to each row — mirrors ClientsPage's
 * StatusPill styling intent. Colors reference globals.css's design tokens
 * directly (`var(--…)`) rather than copying their hex values, so a palette
 * change there doesn't leave this badge stale.
 */
export function inviteStatusMeta(status: string): { label: string; bg: string; fg: string } {
  switch (status) {
    case 'invited':
      // Same ochre-light/#8A6714 pairing RequestsPage.tsx's "Reschedule"
      // badge already uses — globals.css has no darker-ochre text token,
      // so this one value is copied from that existing precedent, not invented.
      return { label: 'Pending', bg: 'var(--ochre-light)', fg: '#8A6714' };
    case 'accepted':
      return { label: 'Joined', bg: 'var(--action-light)', fg: 'var(--action-dark)' };
    case 'revoked':
      return { label: 'Withdrawn', bg: 'var(--surface-warm)', fg: 'var(--muted-text)' };
    case 'expired':
      return { label: 'Expired', bg: 'var(--danger-light)', fg: 'var(--danger)' };
    default:
      return { label: status, bg: 'var(--surface-warm)', fg: 'var(--muted-text)' };
  }
}

export function useClientInvites() {
  const [invites, setInvites] = useState<InvitedClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setInvites(await listInvites());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load invites.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Prepend/replace a just-sent invite without waiting on a refetch. */
  const addInvite = useCallback((invite: SentInvite) => {
    const row = toInvitedClient(invite);
    setInvites((prev) => [row, ...prev.filter((i) => i.id !== row.id)]);
  }, []);

  async function withdraw(inviteId: string): Promise<void> {
    setWithdrawingId(inviteId);
    try {
      const result = await withdrawInvite(inviteId);
      // The row still exists server-side (status flips to 'revoked', not
      // deleted) — reflect that instead of dropping it from the list.
      setInvites((prev) => prev.map((i) => (i.id === inviteId ? { ...i, status: result.status } : i)));
    } finally {
      setWithdrawingId(null);
    }
  }

  return { invites, loading, error, withdrawingId, withdraw, addInvite, reload: load };
}
