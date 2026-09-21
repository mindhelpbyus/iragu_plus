import { describe, it, expect } from 'vitest';
import {
  MIN_BIO_LENGTH,
  missingProfileFields,
  isProfileComplete,
  therapistMeToCompletenessInput,
  missingFieldLabel,
} from './profileCompleteness';
import type { TherapistMe } from '../api/therapistProfile';

const LONG_ENOUGH_BIO = 'A caring, evidence-based approach to anxiety and stress, with over a decade of practice.';

function therapistMe(overrides: Partial<NonNullable<TherapistMe['therapist_profile']>> = {}): TherapistMe {
  return {
    id: 42,
    first_name: 'Priya',
    last_name: 'Menon',
    email: 'priya@example.com',
    phone: null,
    profile_photo: null,
    therapist_profile: {
      bio: null,
      clinical_specialties: [],
      therapeutic_modalities: [],
      languages_spoken: [],
      session_fees: null,
      session_type: null,
      ...overrides,
    },
  } as TherapistMe;
}

describe('missingProfileFields / isProfileComplete', () => {
  it('flags everything missing on a brand-new profile', () => {
    expect(missingProfileFields({})).toEqual(['bio', 'specialties', 'sessionFees']);
    expect(isProfileComplete({})).toBe(false);
  });

  it('flags a bio under the real backend minimum (validateBio requires >= 50 chars)', () => {
    expect(missingProfileFields({ bio: 'Too short', specialties: ['Anxiety'], sessionFees: 250000 })).toEqual(['bio']);
  });

  it('accepts a bio at exactly the real minimum length', () => {
    const exactly50 = 'a'.repeat(MIN_BIO_LENGTH);
    expect(missingProfileFields({ bio: exactly50, specialties: ['Anxiety'], sessionFees: 250000 })).toEqual([]);
  });

  it('flags a bio one character under the real minimum length', () => {
    const oneUnder = 'a'.repeat(MIN_BIO_LENGTH - 1);
    expect(missingProfileFields({ bio: oneUnder, specialties: ['Anxiety'], sessionFees: 250000 })).toEqual(['bio']);
  });

  it('flags an empty specialties array (validateSpecialties requires at least one)', () => {
    expect(missingProfileFields({ bio: LONG_ENOUGH_BIO, specialties: [], sessionFees: 250000 })).toEqual(['specialties']);
  });

  it('flags a missing session fee as the "services" gap', () => {
    expect(missingProfileFields({ bio: LONG_ENOUGH_BIO, specialties: ['Anxiety'], sessionFees: null })).toEqual(['sessionFees']);
  });

  it('flags an undefined session fee the same as a null one', () => {
    expect(missingProfileFields({ bio: LONG_ENOUGH_BIO, specialties: ['Anxiety'] })).toEqual(['sessionFees']);
  });

  it('does NOT flag educationalQualification — validateUpdateRequest validates it, but the real handler never persists it for this route', () => {
    // ProfileCompletenessInput has no educationalQualification field at all —
    // if this check existed it would need to be threaded through
    // missingProfileFields's signature, and it deliberately is not.
    const complete = { bio: LONG_ENOUGH_BIO, specialties: ['Anxiety'], sessionFees: 250000 };
    expect(missingProfileFields(complete)).toEqual([]);
    expect(Object.keys(complete)).not.toContain('educationalQualification');
  });

  it('is complete once bio, specialties and sessionFees are all real', () => {
    expect(isProfileComplete({ bio: LONG_ENOUGH_BIO, specialties: ['Anxiety', 'OCD'], sessionFees: 250000 })).toBe(true);
  });

  it('treats whitespace-only bio as missing, not merely short', () => {
    expect(missingProfileFields({ bio: '     ', specialties: ['Anxiety'], sessionFees: 250000 })).toEqual(['bio']);
  });

  it('accepts a session fee of zero rupees (a real, if unusual, configured value) as present — MUTATION GUARD for the null/undefined-only check', () => {
    // `0` is falsy but a perfectly valid `sessionFees` value once coerced to
    // paise — the check must be `=== null || === undefined`, not `!input.sessionFees`.
    // Mutating the real check to `!input.sessionFees` would make this test fail.
    expect(missingProfileFields({ bio: LONG_ENOUGH_BIO, specialties: ['Anxiety'], sessionFees: 0 })).toEqual([]);
  });
});

describe('therapistMeToCompletenessInput', () => {
  it('extracts the real nested fields GET /therapists/me returns', () => {
    const profile = therapistMe({ bio: LONG_ENOUGH_BIO, clinical_specialties: ['Anxiety'], session_fees: 250000 });
    expect(therapistMeToCompletenessInput(profile)).toEqual({
      bio: LONG_ENOUGH_BIO,
      specialties: ['Anxiety'],
      sessionFees: 250000,
    });
  });

  it('handles a null profile without throwing', () => {
    expect(therapistMeToCompletenessInput(null)).toEqual({
      bio: undefined,
      specialties: undefined,
      sessionFees: undefined,
    });
  });

  it('handles a profile with no nested therapist_profile at all', () => {
    const profile = { id: 1, therapist_profile: null } as unknown as TherapistMe;
    expect(therapistMeToCompletenessInput(profile)).toEqual({
      bio: undefined,
      specialties: undefined,
      sessionFees: undefined,
    });
  });
});

describe('missingFieldLabel', () => {
  it('has a human label for every field missingProfileFields can return', () => {
    for (const field of missingProfileFields({})) {
      expect(missingFieldLabel(field)).not.toBe(field);
    }
  });

  it('falls back to the raw field name for an unrecognised key rather than throwing', () => {
    expect(missingFieldLabel('somethingNew')).toBe('somethingNew');
  });
});
