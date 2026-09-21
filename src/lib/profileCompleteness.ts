/**
 * profileCompleteness.ts — "is this therapist's REAL profile done" logic,
 * shared by ProfileCompletionPage (renders the checklist) and App.tsx (the
 * one-time post-login redirect gate — see lib/profileCompletionGate.ts).
 *
 * Kept out of pages/ProfileCompletionPage.tsx deliberately: App.tsx is the
 * root, eagerly-loaded bundle (every *page* is lazy-loaded — see App.tsx's
 * file header), so a static import of a function living in the page module
 * would pull the whole page component into the eager graph and defeat that
 * code-splitting boundary for anyone who never actually needs the page.
 */
import type { TherapistMe } from '../api/therapistProfile';

/** Matches backend-initial's own real minimum — `validateBio` in
 *  src/lambdas/therapist-profile/src/validation.ts rejects a trimmed bio
 *  under 50 chars whenever bio is present in the request. A shorter bio
 *  would fail the real save ProfileCompletionPage performs, so it counts
 *  as missing. */
export const MIN_BIO_LENGTH = 50;

export interface ProfileCompletenessInput {
  bio?: string | null;
  specialties?: string[] | null;
  sessionFees?: number | null;
}

/**
 * Which required fields a real therapist profile is still missing, per what
 * backend-initial's PUT /therapists/{id}/profile route actually enforces or
 * needs — NOT an invented checklist:
 *
 *  - `bio`: `validateUpdateRequest` only validates bio when the field is
 *    present in the request, but when present it must satisfy `validateBio`
 *    (trimmed length >= 50 chars, >= 10 words). A shorter bio would be
 *    rejected by the real save, so it counts as incomplete.
 *  - `specialties`: same "validated only if present" shape — but when
 *    present, `validateSpecialties` requires a non-empty array ("At least
 *    one specialty is required"). An empty/absent array is incomplete.
 *  - `sessionFees`: NOT covered by `validateUpdateRequest` at all (no
 *    presence/range rule) — but a therapist with no fee configured cannot
 *    be booked, which is the plain-English "services" gap. Included for that
 *    reason, not because the validator enforces it.
 *
 * `educationalQualification` is ALSO validated by `validateUpdateRequest`,
 * but deliberately excluded here: reading backend-initial's handler.ts
 * (lines 529-577, the PUT body -> Prisma field mapping) shows it is never
 * actually persisted for this route — checking a field the server itself
 * discards would invent a requirement nobody enforces.
 */
export function missingProfileFields(input: ProfileCompletenessInput): string[] {
  const missing: string[] = [];
  if (!input.bio || input.bio.trim().length < MIN_BIO_LENGTH) missing.push('bio');
  if (!input.specialties || input.specialties.length === 0) missing.push('specialties');
  if (input.sessionFees === null || input.sessionFees === undefined) missing.push('sessionFees');
  return missing;
}

export function isProfileComplete(input: ProfileCompletenessInput): boolean {
  return missingProfileFields(input).length === 0;
}

/** Real GET /therapists/me response -> the plain fields missingProfileFields needs. */
export function therapistMeToCompletenessInput(profile: TherapistMe | null): ProfileCompletenessInput {
  const nested = profile?.therapist_profile;
  return {
    bio: nested?.bio,
    specialties: nested?.clinical_specialties,
    sessionFees: nested?.session_fees,
  };
}

/** User-facing label for a missingProfileFields() entry. */
export function missingFieldLabel(field: string): string {
  switch (field) {
    case 'bio':
      return 'A short bio (at least 50 characters)';
    case 'specialties':
      return 'At least one specialty';
    case 'sessionFees':
      return 'Your session fee';
    default:
      return field;
  }
}
