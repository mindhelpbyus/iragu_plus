import { describe, it, expect } from 'vitest';
import {
  isEligibleForProfileCompletionNudge,
  shouldRedirectToProfileCompletion,
  PROFILE_COMPLETION_NUDGE_KEY,
} from './profileCompletionGate';

describe('isEligibleForProfileCompletionNudge', () => {
  it('excludes the destination itself', () => {
    expect(isEligibleForProfileCompletionNudge('/complete-profile')).toBe(false);
  });

  it('excludes /login and /signup', () => {
    expect(isEligibleForProfileCompletionNudge('/login')).toBe(false);
    expect(isEligibleForProfileCompletionNudge('/signup')).toBe(false);
  });

  it('excludes the public guest-join surfaces', () => {
    expect(isEligibleForProfileCompletionNudge('/telehealth/guest/room-123')).toBe(false);
    expect(isEligibleForProfileCompletionNudge('/g/482913077')).toBe(false);
  });

  it('is eligible on ordinary protected routes', () => {
    expect(isEligibleForProfileCompletionNudge('/dashboard')).toBe(true);
    expect(isEligibleForProfileCompletionNudge('/calendar')).toBe(true);
    expect(isEligibleForProfileCompletionNudge('/settings')).toBe(true);
  });

  it('does not false-positive-exclude a route that merely starts similarly', () => {
    // Not a real route today, but pins the startsWith boundary rather than
    // an exact-match check silently becoming a substring check.
    expect(isEligibleForProfileCompletionNudge('/g')).toBe(true);
    expect(isEligibleForProfileCompletionNudge('/telehealth/guestbook')).toBe(true);
  });
});

describe('shouldRedirectToProfileCompletion', () => {
  const base = {
    role: 'therapist',
    pathname: '/dashboard',
    alreadyActedThisSession: false,
    isComplete: false,
  };

  it('redirects a therapist with an incomplete profile on an eligible path, not yet nudged', () => {
    expect(shouldRedirectToProfileCompletion(base)).toBe(true);
  });

  it('never redirects a non-therapist role — soft-nudge guard for client/admin/org_owner', () => {
    expect(shouldRedirectToProfileCompletion({ ...base, role: 'client' })).toBe(false);
    expect(shouldRedirectToProfileCompletion({ ...base, role: 'admin' })).toBe(false);
    expect(shouldRedirectToProfileCompletion({ ...base, role: 'org_owner' })).toBe(false);
    expect(shouldRedirectToProfileCompletion({ ...base, role: undefined })).toBe(false);
  });

  it('never redirects once already acted on this session — the one-time, soft-nudge guarantee', () => {
    expect(shouldRedirectToProfileCompletion({ ...base, alreadyActedThisSession: true })).toBe(false);
  });

  it('never redirects on an ineligible path (mirrors isEligibleForProfileCompletionNudge)', () => {
    expect(shouldRedirectToProfileCompletion({ ...base, pathname: '/complete-profile' })).toBe(false);
    expect(shouldRedirectToProfileCompletion({ ...base, pathname: '/login' })).toBe(false);
  });

  it('does not redirect a therapist whose profile is already complete', () => {
    expect(shouldRedirectToProfileCompletion({ ...base, isComplete: true })).toBe(false);
  });

  it('MUTATION GUARD: flips to false only because of isComplete, proving that check is load-bearing and not dead code', () => {
    const incomplete = shouldRedirectToProfileCompletion({ ...base, isComplete: false });
    const complete = shouldRedirectToProfileCompletion({ ...base, isComplete: true });
    expect(incomplete).toBe(true);
    expect(complete).toBe(false);
    expect(incomplete).not.toBe(complete);
  });

  it('exports a stable, namespaced sessionStorage key', () => {
    expect(PROFILE_COMPLETION_NUDGE_KEY).toBe('iragu_plus:profile-completion-nudged');
  });
});
