/**
 * profileDraft.ts — sessionStorage cache for the therapist-profile data
 * SignupPage's steps 2-5 collect locally with nowhere real to save it yet
 * (see SignupPage.tsx's file header). A DRAFT only: it exists purely so
 * ProfileCompletionPage (the real, post-login save screen) can pre-fill what
 * the therapist already typed instead of asking them to retype it, never as
 * a second source of truth. Cleared the moment a real save succeeds.
 *
 * sessionStorage (not localStorage) deliberately — same reasoning as
 * lib/cognito.ts's token storage: cleared when the tab closes, smaller
 * blast radius, and it already holds nothing more sensitive than what the
 * therapist is about to submit through the real API anyway.
 *
 * The profile photo is NOT part of this draft — a `File` cannot survive
 * `JSON.stringify`/a page reload, so ProfileCompletionPage re-prompts for it
 * (see PhotoPicker.tsx) rather than pretending to cache it.
 *
 * `Storage` is accepted as a parameter (defaulting to the browser's real
 * `sessionStorage`) so these stay unit-testable in this repo's DOM-less
 * vitest environment — pass an in-memory fake in tests, never reference
 * `sessionStorage` in an assertion.
 *
 * SCOPED BY EMAIL, deliberately. The draft is written before a real session
 * exists and cleared only on a successful save — never on merely abandoning
 * the wizard at the confirm-email step, and a plain link-click there doesn't
 * clear sessionStorage. Without an ownership check, a second, unrelated
 * person logging in on the SAME TAB later (e.g. a shared reception computer)
 * would have person A's bio/specialties/fee silently prefilled into their
 * own ProfileCompletionPage. `loadProfileDraft` now requires the CURRENT
 * caller's own email and refuses to return a draft saved under a different
 * one — comparison is case-insensitive (Cognito emails aren't guaranteed a
 * consistent case between signup and login).
 */

const PROFILE_DRAFT_STORAGE_KEY = 'iragu_plus:signup-profile-draft:v1';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export interface ProfileDraft {
  /** Step 2's chosen professional designation label, e.g. "Clinical
   *  Psychologist" — cached for continuity even though no live
   *  backend-initial route currently persists it (see
   *  api/therapistProfile.ts's module doc: `title` has no live writer). */
  designation: string | null;
  /** Step 3 chips, as real display strings (not indices — indices are only
   *  meaningful against SignupPage's local vocabulary arrays). */
  specialties: string[];
  modalities: string[];
  languages: string[];
  /** Step 4's real, single default session fee — see ServicesTab.tsx: only
   *  ONE default fee is real backend-initial state today, a full
   *  per-service catalog is not. Rupees, as typed (e.g. "2500"), not paise. */
  serviceFeeRupees: string | null;
  /** Step 5's bio text. */
  bio: string;
}

function safeStorage(storage: Storage): Storage | null {
  try {
    // Confirms the store is actually usable (private-mode Safari can expose
    // `window.sessionStorage` but throw on every call) before we rely on it.
    const probeKey = '__profile_draft_probe__';
    storage.setItem(probeKey, '1');
    storage.removeItem(probeKey);
    return storage;
  } catch {
    return null;
  }
}

/** Best-effort save — a storage failure must never block the signup wizard
 *  from advancing to the confirm-email step. `ownerEmail` is the email the
 *  wizard was filled out for (SignupPage's step 1) — required so a later
 *  `loadProfileDraft` can refuse to hand this draft to a different person. */
export function saveProfileDraft(draft: ProfileDraft, ownerEmail: string, storage: Storage = sessionStorage): void {
  const s = safeStorage(storage);
  if (!s) return;
  try {
    s.setItem(PROFILE_DRAFT_STORAGE_KEY, JSON.stringify({ ownerEmail: normalizeEmail(ownerEmail), draft }));
  } catch {
    // best-effort — e.g. storage quota exceeded
  }
}

/**
 * Returns the cached draft, or null if there isn't one / it's unreadable /
 * it was saved for a DIFFERENT email than `currentEmail`. Callers must
 * always pass the real, currently-authenticated user's own email — never
 * skip this check "just to see the draft."
 */
export function loadProfileDraft(currentEmail: string, storage: Storage = sessionStorage): ProfileDraft | null {
  const s = safeStorage(storage);
  if (!s) return null;
  try {
    const raw = s.getItem(PROFILE_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ownerEmail?: unknown; draft?: Partial<ProfileDraft> };
    if (typeof parsed.ownerEmail !== 'string' || parsed.ownerEmail !== normalizeEmail(currentEmail)) {
      return null;
    }
    const d = parsed.draft ?? {};
    return {
      designation: d.designation ?? null,
      specialties: Array.isArray(d.specialties) ? d.specialties : [],
      modalities: Array.isArray(d.modalities) ? d.modalities : [],
      languages: Array.isArray(d.languages) ? d.languages : [],
      serviceFeeRupees: d.serviceFeeRupees ?? null,
      bio: typeof d.bio === 'string' ? d.bio : '',
    };
  } catch {
    return null;
  }
}

/** Clear the draft — called immediately after a real profile save succeeds,
 *  so a later visit never re-offers stale pre-signup data. */
export function clearProfileDraft(storage: Storage = sessionStorage): void {
  const s = safeStorage(storage);
  if (!s) return;
  try {
    s.removeItem(PROFILE_DRAFT_STORAGE_KEY);
  } catch {
    // best-effort
  }
}
