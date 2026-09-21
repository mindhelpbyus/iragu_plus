/**
 * profileCompletionGate.ts — pure decision logic behind App.tsx's one-time
 * "your profile isn't finished yet" redirect to `/complete-profile`.
 *
 * therapistApp's mobile equivalent (business rule #6 in its
 * `.claude/context/domain-model.md`) is a SOFT nudge, not a hard gate: the
 * ring/checklist card lives on the dashboard (`home_page.dart`) and is
 * reached by tapping it, not by every screen bouncing an incomplete
 * therapist back to it — `ProfileCompletionPage` is a normal named route
 * (`mobile_shell.dart`'s route table) with a plain back button, and nothing
 * in the router refuses navigation elsewhere while incomplete.
 *
 * This mirrors that: `shouldRedirectToProfileCompletion` says "redirect" at
 * most ONCE per browser session (App.tsx sets `PROFILE_COMPLETION_NUDGE_KEY`
 * in sessionStorage the moment it acts on a `true`, whichever way the visit
 * to `/complete-profile` then goes) — never a persistent per-route gate.
 * RequireAuth (App.tsx) does NOT call this on every protected route; only
 * the one post-`refreshUser()` check does, mirroring the "check once, right
 * after auth resolves" shape RequireAuth's own role check already uses for
 * a wrong-role login, but without that check's every-render repetition.
 */

/** sessionStorage flag — set the first time this session's check has been
 *  acted on (redirected OR found complete), so it never re-fires this
 *  session even if the therapist navigates around afterward. */
export const PROFILE_COMPLETION_NUDGE_KEY = 'iragu_plus:profile-completion-nudged';

/**
 * Paths where the one-time redirect must never fire, even for a logged-in
 * therapist with a genuinely incomplete profile:
 *  - `/complete-profile` itself (redirecting to where you already are).
 *  - `/login` / `/signup` — App.tsx's own routing already bounces a
 *    logged-in non-client user away from these to `/dashboard`; redirecting
 *    to `/complete-profile` from here as well would race that navigation.
 *  - the public guest-join surfaces (`/telehealth/guest/*`, `/g/*`) — a
 *    therapist who happens to hold a guest link must not be yanked out of
 *    joining a call to go fill in a bio first.
 */
export function isEligibleForProfileCompletionNudge(pathname: string): boolean {
  if (pathname === '/complete-profile') return false;
  if (pathname === '/login' || pathname === '/signup') return false;
  if (pathname.startsWith('/telehealth/guest/')) return false;
  if (pathname.startsWith('/g/')) return false;
  return true;
}

export interface ProfileCompletionGateParams {
  /** Canonical app role — see api/auth.ts's `CanonicalRole`. Only a
   *  therapist has a TherapistProfile row to be incomplete. */
  role: string | undefined;
  pathname: string;
  /** Whether PROFILE_COMPLETION_NUDGE_KEY is already set this session. */
  alreadyActedThisSession: boolean;
  isComplete: boolean;
}

/** The single decision: should App.tsx navigate to `/complete-profile` right now? */
export function shouldRedirectToProfileCompletion(params: ProfileCompletionGateParams): boolean {
  if (params.role !== 'therapist') return false;
  if (params.alreadyActedThisSession) return false;
  if (!isEligibleForProfileCompletionNudge(params.pathname)) return false;
  return !params.isComplete;
}
