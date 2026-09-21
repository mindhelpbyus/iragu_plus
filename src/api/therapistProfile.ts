/**
 * api/therapistProfile.ts — the caller's own combined therapist record for
 * Settings. Two real backend-initial Lambdas back this:
 *
 * - GET  /therapists/me            (`therapists` Lambda) — User row (name,
 *   email, phone) + nested `therapistProfile` (title, license, verification
 *   status, sessionFees, sessionType, buffer minutes, ...). One call covers
 *   the Account, Services and Availability-buffer tabs.
 * - PUT  /therapists/me             — name/phone only (`therapists` Lambda,
 *   src/lambdas/therapists/src/handler.ts:745..`, resolves `me` server-side).
 * - PUT  /therapists/{id}/profile   — sessionFees/sessionType/buffer minutes
 *   (`therapist-profile` Lambda, src/lambdas/therapist-profile/src/handler.ts:423).
 *   This route does NOT accept the `me` shorthand (it does a bare
 *   `parseInt(therapistId)`, unlike the `therapists` Lambda's
 *   `resolveTherapistId`) — callers here always pass the caller's own numeric
 *   `id` from the GET response, never a value from anywhere else.
 *
 * Security note (found, not fixed — out of scope for this frontend change):
 * `PUT /therapists/{id}/profile` performs NO caller-identity check at all
 * (verified against the handler source — every other mutating route in that
 * file calls `resolveCaller`/`assertSelf`, this one does not). Any
 * authenticated caller can currently edit ANY therapist's profile by number.
 * This client only ever sends the caller's own id, which is correct usage,
 * but the hole itself needs a backend-initial fix (add the same
 * resolveCaller+assertSelf guard the `/resubmit` route right above it uses).
 *
 * Credential fields (licenseNumber/licenseState/licenseExpiration/
 * rciCertificateUrl/degreeCertificateUrl — see shared/credential-lock.ts)
 * freeze once verificationStatus leaves the pre-review states, so this
 * client does not expose them as writable — Settings shows them read-only.
 * `title` and `sessionLengthsOffered`/`acceptedInsurances` exist as
 * TherapistProfile columns but no live route writes them (confirmed against
 * both handlers) — not exposed as editable here either.
 */
import { z } from 'zod';
import { apiFetch } from './client';

const nestedProfileSchema = z
  .object({
    title: z.string().nullable().optional(),
    license_number: z.string().nullable().optional(),
    verification_status: z.string().nullable().optional(),
    session_fees: z.number().nullable().optional(),
    session_type: z.string().nullable().optional(),
    buffer_before_minutes: z.number().nullable().optional(),
    buffer_after_minutes: z.number().nullable().optional(),
  })
  .passthrough();

const therapistMeSchema = z
  .object({
    id: z.number(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    therapist_profile: nestedProfileSchema.nullable().optional(),
  })
  .passthrough();

export type TherapistMe = z.infer<typeof therapistMeSchema>;

export function getMyTherapistProfile(): Promise<TherapistMe> {
  return apiFetch('/therapists/me', {
    schema: z.object({ success: z.boolean(), data: therapistMeSchema }),
    rawEnvelope: true,
  }).then((res) => res.data);
}

export interface UpdateTherapistCoreRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

/** PUT /therapists/me — updates User-level name/phone only (email is not writable via this route). */
export function updateTherapistCore(patch: UpdateTherapistCoreRequest): Promise<TherapistMe> {
  return apiFetch('/therapists/me', {
    method: 'PUT',
    body: patch,
    schema: z.object({ success: z.boolean(), data: therapistMeSchema }),
    rawEnvelope: true,
  }).then((res) => res.data);
}

export interface UpdateTherapistProfileRequest {
  sessionFees?: number;
  sessionType?: 'online' | 'in-person' | 'both';
  bufferBeforeMinutes?: number | null;
  bufferAfterMinutes?: number | null;
}

/** PUT /therapists/{id}/profile — id MUST be the caller's own numeric id (see module note above). */
export function updateTherapistProfile(
  id: number,
  patch: UpdateTherapistProfileRequest
): Promise<unknown> {
  return apiFetch(`/therapists/${id}/profile`, {
    method: 'PUT',
    body: patch,
    schema: z.object({ success: z.boolean() }).passthrough(),
    rawEnvelope: true,
  });
}
