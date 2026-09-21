import { useState } from 'react';
import { toast } from 'sonner';
import { sendInvite, isValidInviteEmail, type SentInvite } from '../../api/clientInvites';
import { ApiFetchError } from '../../api/client';

interface InviteClientModalProps {
  onClose: () => void;
  /** Fired once the invite row is created server-side — regardless of whether
   *  the email actually sent, so the Pending invites panel always reflects
   *  the real, persisted record. */
  onInvited: (invite: SentInvite) => void;
}

/**
 * "Invite a client" — a therapist bringing an off-platform person onto Iragu
 * by email (POST /clients/invite). Mirrors BookAppointmentModal's overlay/box
 * chrome for visual consistency with the rest of ClientsPage's actions.
 *
 * Success/failure here follows therapistApp's ClientInviteService exactly:
 * a 201 response does NOT mean the email sent. `data.emailSent` is the real
 * signal — the backend persists the invite either way (it's resendable), but
 * the therapist must be told honestly when the email itself failed, not
 * shown a blanket "Invite sent".
 */
export function InviteClientModal({ onClose, onInvited }: InviteClientModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<SentInvite | null>(null);
  // Minted once per modal instance (component mount) so retrying a failed
  // submit reuses the same key, but opening a fresh modal for a new invite
  // gets a new one — see apiFetch's idempotencyKey contract.
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const nameError = touched && !name.trim() ? 'A name is required.' : null;
  const emailError = touched && !isValidInviteEmail(email) ? 'Enter a valid email address.' : null;

  async function handleSubmit() {
    setTouched(true);
    if (!name.trim() || !isValidInviteEmail(email)) return;

    setSubmitting(true);
    setError(null);
    try {
      const invite = await sendInvite({ name: name.trim(), email: email.trim() }, idempotencyKey);
      onInvited(invite);
      if (invite.emailSent) {
        setSent(invite);
        toast.success(`Invite sent to ${invite.email}.`);
      } else {
        // Real failure state — the invite was saved but the email did not go
        // out. Never claim success here; surface the backend's own message.
        setError(invite.emailError ?? `The invite was saved, but the email could not be delivered to ${invite.email}.`);
        toast.error('Invite saved, but the email could not be sent.');
      }
    } catch (err) {
      const message =
        err instanceof ApiFetchError ? err.message : err instanceof Error ? err.message : 'Could not send the invite.';
      setError(message);
      toast.error('Could not send the invite.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[3px]" onClick={onClose}>
      <div
        className="box-border w-[440px] max-w-[calc(100vw-48px)] rounded-[18px] bg-surface p-7 shadow-[0_24px_60px_-12px_rgba(28,24,18,.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-start justify-between">
          <h3 className="text-lg font-semibold text-ink">Invite a client</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full text-muted-text hover:bg-action-light/60"
          >
            ✕
          </button>
        </div>

        {sent ? (
          <div className="mt-5 flex items-center gap-2.5 rounded-[10px] border border-[#C8E1CF] bg-action-light px-4 py-3.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#175C3B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            <span className="text-sm font-medium text-action-dark">
              Invite sent to {sent.email} — it expires in 14 days if unopened.
            </span>
          </div>
        ) : (
          <>
            <p className="mb-5 text-[13px] text-muted-text">
              We'll email them a link to book their first session with you.
            </p>

            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-text">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="Full name"
              className="mb-1 h-[42px] w-full rounded-[10px] border border-rule bg-canvas/50 px-3.5 text-sm text-ink outline-none focus:border-action focus:shadow-[0_0_0_3px_rgba(30,112,72,.14)]"
            />
            {nameError && <p className="mb-3 text-xs text-danger">{nameError}</p>}
            {!nameError && <div className="mb-3" />}

            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-text">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="name@example.com"
              className="mb-1 h-[42px] w-full rounded-[10px] border border-rule bg-canvas/50 px-3.5 text-sm text-ink outline-none focus:border-action focus:shadow-[0_0_0_3px_rgba(30,112,72,.14)]"
            />
            {emailError && <p className="mb-3 text-xs text-danger">{emailError}</p>}
            {!emailError && <div className="mb-3" />}

            {error && (
              <div className="mb-4 rounded-lg border border-danger/30 bg-danger-light px-3.5 py-2.5 text-sm text-danger">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="h-[46px] w-full rounded-[13px] bg-action text-sm font-semibold text-white shadow-[0_12px_26px_-8px_rgba(30,112,72,.35)] transition-colors hover:bg-action-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Sending…' : 'Send invite'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
