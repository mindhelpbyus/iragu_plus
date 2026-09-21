/**
 * api/therapistProfile.ts — the caller's own combined therapist record.
 * Backs Settings AND ProfileCompletionPage. Two real backend-initial Lambdas:
 *
 * - GET  /therapists/me            (`therapists` Lambda) — User row (name,
 *   email, phone, profilePhoto) + nested `therapistProfile` (title, license,
 *   verification status, bio, clinicalSpecialties, therapeuticModalities,
 *   languagesSpoken, sessionFees, sessionType, buffer minutes, ...). One call
 *   covers Account/Services/Availability-buffer AND ProfileCompletionPage.
 * - PUT  /therapists/me             — name/phone/profilePhoto
 *   (`therapists` Lambda, src/lambdas/therapists/src/handler.ts:745..,
 *   resolves `me` server-side; caller-identity-checked via
 *   `assertSelf(caller, therapistIdNum)` at handler.ts:806-807). `profilePhoto`
 *   must be the raw S3 key from api/files.ts's upload flow, never a display
 *   URL — see `isPersistablePhotoKey` in backend-initial's
 *   shared/storage/profile-photo.ts; a URL is silently dropped, not stored.
 * - PUT  /therapists/{id}/profile   — bio/specialties/modalities/
 *   languagesSpoken/sessionFees/sessionType/buffer minutes
 *   (`therapist-profile` Lambda, src/lambdas/therapist-profile/src/handler.ts:423,
 *   fields mapped at handler.ts:529-577). This route does NOT accept the `me`
 *   shorthand (it does a bare `parseInt(therapistId)`, unlike the
 *   `therapists` Lambda's `resolveTherapistId`) — callers here always pass
 *   the caller's own numeric `id` from the GET response, never a value from
 *   anywhere else.
 *
 * Caller-identity: `PUT /therapists/{id}/profile` now calls
 * `resolveCaller`/`assertSelf` (handler.ts:432-433) — fixed after this
 * module's earlier note flagged it as missing. This client still only ever
 * sends the caller's own id, which was already correct usage either way.
 *
 * Credential fields (licenseNumber/licenseState/licenseExpiration/
 * rciCertificateUrl/degreeCertificateUrl — see shared/credential-lock.ts)
 * freeze once verificationStatus leaves the pre-review states, so this
 * client does not expose them as writable — Settings shows them read-only.
 * `title` and `sessionLengthsOffered`/`acceptedInsurances` exist as
 * TherapistProfile columns but no live route writes them (confirmed against
 * both handlers) — not exposed as editable here either. Same for display
 * name/headline/age-groups, which SignupPage's wizard collects locally but
 * which have no TherapistProfile column at all — ProfileCompletionPage does
 * not attempt to save them either, for the same reason.
 */
import { z } from 'zod';
import { apiFetch } from './client';

const nestedProfileSchema = z
  .object({
    title: z.string().nullable().optional(),
    license_number: z.string().nullable().optional(),
    verification_status: z.string().nullable().optional(),
    bio: z.string().nullable().optional(),
    clinical_specialties: z.array(z.string()).nullable().optional(),
    therapeutic_modalities: z.array(z.string()).nullable().optional(),
    languages_spoken: z.array(z.string()).nullable().optional(),
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
    /** Already resolved to a signed, fetchable URL server-side
     *  (`withResolvedPhoto` — see backend-initial's
     *  shared/storage/profile-photo.ts) — display only, never write this
     *  value back; writes need the raw S3 key api/files.ts's upload flow
     *  returns. */
    profile_photo: z.string().nullable().optional(),
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
  /** Raw S3 key from api/files.ts's upload flow (`FileRecord.s3Key`) — NEVER
   *  a display URL (see `isPersistablePhotoKey`, module doc above). */
  profilePhoto?: string;
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
  /** Backend validates this only when present (`validateUpdateRequest` in
   *  backend-initial's therapist-profile/src/validation.ts): trimmed length
   *  must be >= 50 chars and >= 10 words (`validateBio`). */
  bio?: string;
  /** Backend validates this only when present: must be a non-empty array,
   *  max 10 entries (`validateSpecialties`). Unrecognised values are
   *  silently coerced/dropped server-side, not rejected — see
   *  `coerceSpecialisations` in handler.ts:515-527. */
  specialties?: string[];
  modalities?: string[];
  languagesSpoken?: string[];
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
