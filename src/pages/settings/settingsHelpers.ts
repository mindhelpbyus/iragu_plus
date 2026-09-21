/**
 * settingsHelpers.ts — pure functions backing SettingsPage/SupportPage, split
 * out so they're unit-testable without a DOM environment (this repo has none
 * — see SettingsPage.test.ts's original comment). Every function here is a
 * real transform used by the page, not a rubber-stamp.
 */

/** "2,500" (rupee input string, no symbol) -> 250000 (paise). Returns null for
 *  anything that isn't a non-negative number — the caller must not save on null. */
export function rupeesToPaise(input: string): number | null {
  const trimmed = input.trim().replace(/,/g, '');
  if (trimmed === '') return null;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const rupees = Number(trimmed);
  if (!Number.isFinite(rupees) || rupees < 0) return null;
  return Math.round(rupees * 100);
}

/** 250000 (paise) -> "2500" for an editable rupee input. null/undefined -> "". */
export function paiseToRupeesInput(paise: number | null | undefined): string {
  if (paise === null || paise === undefined) return '';
  return String(Math.round(paise) / 100);
}

const SESSION_TYPE_LABELS: Record<string, string> = {
  online: 'Online only',
  'in-person': 'In-person only',
  both: 'Online & in-person',
};

export function sessionTypeLabel(type: string | null | undefined): string {
  if (!type) return 'Not set';
  return SESSION_TYPE_LABELS[type] ?? type;
}

/** Buffer-minutes input -> a value to send (null clears the override, per the
 *  backend's own convention — see TherapistProfile.bufferBeforeMinutes).
 *  Returns undefined (not null) for an invalid/negative entry, so the caller
 *  can tell "clear it" apart from "reject this edit". Clamped to a sane
 *  0–120 range — the design shows a single buffer field in minutes and
 *  nothing platform-side documents a wider bound, but a 6-hour "buffer"
 *  is not a real gap between sessions. */
export function parseBufferMinutes(input: string): number | null | undefined {
  const trimmed = input.trim();
  if (trimmed === '') return null;
  if (!/^\d+$/.test(trimmed)) return undefined;
  const n = Number(trimmed);
  if (n < 0 || n > 120) return undefined;
  return n;
}

const VERIFICATION_STATUS_LABELS: Record<string, string> = {
  credentials_pending: 'Not yet submitted',
  pending: 'Under review',
  changes_requested: 'Changes requested',
  approved: 'Verified',
  renewal_requested: 'Renewal requested',
  renewal_submitted: 'Renewal under review',
  rejected: 'Rejected',
  suspended: 'Suspended',
};

/** Real backend.TherapistProfile.verificationStatus labels — see
 *  backend-initial/src/shared/therapist-status.ts for the authoritative list. */
export function verificationStatusLabel(status: string | null | undefined): string {
  if (!status) return 'Unknown';
  return VERIFICATION_STATUS_LABELS[status] ?? status;
}

export function verificationIsApproved(status: string | null | undefined): boolean {
  return status === 'approved';
}

/** Password change client-side sanity check — matches SignupPage's own
 *  minLength=8 rule (no client-side complexity regex; Cognito enforces its
 *  real policy server-side and that error message is shown verbatim on
 *  failure, never duplicated/guessed here). */
export function validateNewPassword(
  newPassword: string,
  confirmPassword: string
): string | null {
  if (newPassword.length < 8) return 'New password must be at least 8 characters.';
  if (newPassword !== confirmPassword) return 'New password and confirmation do not match.';
  return null;
}

/** A 6-digit TOTP code, trimmed of spaces (authenticator apps often show
 *  "123 456"). Returns null when it isn't a plausible code — callers should
 *  not call verifyMFA on null. */
export function normalizeTotpCode(input: string): string | null {
  const digits = input.replace(/\s/g, '');
  return /^\d{6}$/.test(digits) ? digits : null;
}

/** mailto: link for Support's category tiles — real, functional (opens the
 *  user's mail client), not a fake ticket submission against a backend this
 *  app has no reachable client for (see SupportPage's module doc). */
export function buildSupportMailto(subject: string, supportEmail: string): string {
  return `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}`;
}
