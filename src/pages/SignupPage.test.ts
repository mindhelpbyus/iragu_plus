import { describe, it, expect } from 'vitest';
import { toggleIndex, stepSegments, validatePhotoFile, buildProfilePreview } from './SignupPage';

describe('toggleIndex', () => {
  it('adds an index not already present', () => {
    expect(toggleIndex([0, 2], 1)).toEqual([0, 2, 1]);
  });

  it('removes an index already present', () => {
    expect(toggleIndex([0, 1, 2], 1)).toEqual([0, 2]);
  });
});

describe('stepSegments (progress bar — design shows 6 segments, Account through Done)', () => {
  it('returns exactly 6 segments, not 5 — regression guard for the dropped "Done" segment', () => {
    expect(stepSegments(1)).toHaveLength(6);
    expect(stepSegments(6)).toHaveLength(6);
  });

  it('fills segments up to and including the current step, leaves the rest upcoming', () => {
    expect(stepSegments(3)).toEqual([true, true, true, false, false, false]);
  });

  it('fills only the first segment on step 1', () => {
    expect(stepSegments(1)).toEqual([true, false, false, false, false, false]);
  });

  it('fills all 6 segments on the final "Done" step', () => {
    expect(stepSegments(6)).toEqual([true, true, true, true, true, true]);
  });
});

describe('validatePhotoFile', () => {
  it('accepts a small image file', () => {
    expect(validatePhotoFile({ type: 'image/png', size: 1024 })).toBeNull();
  });

  it('rejects a non-image file', () => {
    expect(validatePhotoFile({ type: 'application/pdf', size: 1024 })).toMatch(/image file/i);
  });

  it('rejects a file over the 10 MB backend-initial therapist_photo cap', () => {
    const tooBig = 10 * 1024 * 1024 + 1;
    expect(validatePhotoFile({ type: 'image/jpeg', size: tooBig })).toMatch(/10 MB/);
  });

  it('accepts a file exactly at the 10 MB cap', () => {
    const exactly10MB = 10 * 1024 * 1024;
    expect(validatePhotoFile({ type: 'image/jpeg', size: exactly10MB })).toBeNull();
  });
});

describe('buildProfilePreview', () => {
  const base = {
    firstName: 'Priya',
    lastName: 'Menon',
    displayName: '',
    headline: '',
    bio: '',
    langIndices: [] as number[],
    serviceIndices: [] as number[],
  };

  it('falls back to "Dr. {firstName} {lastName}" when no display name was typed', () => {
    expect(buildProfilePreview(base).name).toBe('Dr. Priya Menon');
  });

  it('prefers an explicitly typed display name over the firstName/lastName fallback', () => {
    expect(buildProfilePreview({ ...base, displayName: 'Dr. P. Menon' }).name).toBe('Dr. P. Menon');
  });

  it('derives initials from first and last name', () => {
    expect(buildProfilePreview(base).initials).toBe('PM');
  });

  it('falls back to a placeholder headline when none was typed', () => {
    expect(buildProfilePreview(base).headline).toBe('Your headline');
  });

  it('joins selected languages by real index, not fabricated text', () => {
    // English=0, Malayalam=2 in SignupPage's LANGUAGES array
    expect(buildProfilePreview({ ...base, langIndices: [0, 2] }).langs).toBe('English, Malayalam');
  });

  it('shows a placeholder when no bio was typed yet', () => {
    expect(buildProfilePreview(base).bio).toBe('Your bio appears here as you type…');
  });

  it('truncates a long bio to 140 chars with an ellipsis', () => {
    const longBio = 'a'.repeat(200);
    const result = buildProfilePreview({ ...base, bio: longBio }).bio;
    expect(result).toBe(`${'a'.repeat(140)}…`);
  });

  it('does not truncate a bio at or under 140 chars', () => {
    const shortBio = 'a'.repeat(140);
    expect(buildProfilePreview({ ...base, bio: shortBio }).bio).toBe(shortBio);
  });

  it('sources fee from the first selected real service, never a hardcoded number', () => {
    // index 2 = 'Group session · 60min', defaultFee '800' in SignupPage's SERVICES array
    expect(buildProfilePreview({ ...base, serviceIndices: [2, 0] }).fee).toBe('800');
  });

  it('returns null fee (not a fabricated placeholder) when no service is selected', () => {
    expect(buildProfilePreview(base).fee).toBeNull();
  });
});
