/**
 * api/clientInvites.ts — backend-initial's client-invite endpoints
 * (`src/lambdas/clients/src/handler.ts`, backed by `src/lib/client-invite-service.ts`).
 *
 * A therapist inviting an OFF-PLATFORM prospective client by email — separate
 * from the Requests/inquiry workflow (api/requests.ts), which is for people
 * who already reached the therapist through the platform. This mirrors
 * therapistApp's `ClientInviteService` (lib/services/clients/client_invite_service.dart),
 * which exists precisely because the old client-side stub always claimed
 * success without ever calling the backend or sending an email.
 *
 *   POST   /clients/invite            → 201 { success, data: SentInvite }
 *          Returns 201 even when the SES send failed — the invite row is
 *          persisted and resendable. `data.emailSent` is the real signal;
 *          a 2xx status alone does NOT mean the email went out.
 *   GET    /clients/invites           → { success, data: InvitedClient[] }
 *   DELETE /clients/invites/{inviteId} → { success, data: { id, status } }
 *
 * Backend validation (client-invite-service.ts) that this client mirrors:
 *   - `name` is REQUIRED server-side (400 INVALID_NAME if blank) — despite
 *     looking optional at a glance, an invite with no name is rejected.
 *   - `email` must pass a real format check (400 INVALID_EMAIL).
 *   - An email already belonging to a platform user is rejected (409
 *     ALREADY_REGISTERED) — that's an existing user, not an invite target.
 */
import { z } from 'zod';
import { apiFetch } from './client';

/**
 * RFC-5322-lite — deliberately mirrors backend-initial's own `isValidEmail`
 * (`src/lib/client-invite-service.ts`) so the form rejects the same typos
 * the server would reject, without being stricter than the real contract.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidInviteEmail(email: string): boolean {
  const trimmed = email.trim();
  return trimmed.length > 0 && trimmed.length <= 254 && EMAIL_RE.test(trimmed);
}

/** Lifecycle values `client-invite-service.ts` writes, plus the derived 'expired'
 *  the list route computes at read time (not persisted). */
export const INVITE_STATUSES = ['invited', 'accepted', 'revoked', 'expired'] as const;
export type InviteRecordStatus = (typeof INVITE_STATUSES)[number];

/** Response shape of POST /clients/invite's `data`. */
const sentInviteSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  status: z.string(),
  expiresAt: z.string(),
  sentAt: z.string().nullable(),
  emailSent: z.boolean(),
  // Only present when emailSent is false — handler.ts spreads these in
  // conditionally rather than always including them as null.
  emailError: z.string().optional(),
  emailErrorCode: z.string().optional(),
});
export type SentInvite = z.infer<typeof sentInviteSchema>;

/** Response shape of each item in GET /clients/invites' `data` array. */
const invitedClientSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  status: z.string(),
  invitedAt: z.string(),
  sentAt: z.string().nullable(),
  expiresAt: z.string(),
  emailSent: z.boolean(),
  // List route always includes the key (null when there was no send error),
  // unlike the POST response which omits it entirely on success.
  emailError: z.string().nullable(),
});
export type InvitedClient = z.infer<typeof invitedClientSchema>;

export interface SendInviteInput {
  /** Required — the backend 400s with INVALID_NAME on a blank name. */
  name: string;
  email: string;
  phone?: string;
  note?: string;
  /** ISO-8601 datetime of a session already pencilled in, surfaced in the invite email. */
  sessionAt?: string;
}

/**
 * POST /clients/invite.
 *
 * `idempotencyKey` should be a *stable* id for this one submission attempt
 * (e.g. minted once when the invite form/modal is opened) so that clicking
 * "Send" again after a network hiccup retries the same logical request
 * instead of risking a duplicate. Pass a fresh key only when the therapist
 * starts a genuinely new invite.
 */
export function sendInvite(input: SendInviteInput, idempotencyKey?: string) {
  const body: Record<string, unknown> = {
    name: input.name.trim(),
    email: input.email.trim(),
  };
  if (input.phone?.trim()) body.phone = input.phone.trim();
  if (input.note?.trim()) body.note = input.note.trim();
  if (input.sessionAt) body.sessionAt = input.sessionAt;

  return apiFetch(`/clients/invite`, {
    method: 'POST',
    body,
    schema: z.object({ success: z.boolean(), data: sentInviteSchema }),
    rawEnvelope: true,
    idempotencyKey,
  }).then((res) => res.data);
}

/** GET /clients/invites — the therapist's own sent invites (Clients → Invited). */
export function listInvites(status?: InviteRecordStatus) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiFetch(`/clients/invites${qs}`, {
    schema: z.object({ success: z.boolean(), data: z.array(invitedClientSchema) }),
    rawEnvelope: true,
  }).then((res) => res.data);
}

/** DELETE /clients/invites/{inviteId} — withdraw a pending invite (sets status='revoked'). */
export function withdrawInvite(inviteId: string) {
  return apiFetch(`/clients/invites/${inviteId}`, {
    method: 'DELETE',
    schema: z.object({ success: z.boolean(), data: z.object({ id: z.string(), status: z.string() }) }),
    rawEnvelope: true,
  }).then((res) => res.data);
}
