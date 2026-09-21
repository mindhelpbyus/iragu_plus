import { describe, it, expect } from 'vitest';
import { prefillProfileForm } from './ProfileCompletionPage';
import type { TherapistMe } from '../api/therapistProfile';
import type { ProfileDraft } from '../lib/profileDraft';

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

const SAMPLE_DRAFT: ProfileDraft = {
  designation: 'Clinical Psychologist',
  specialties: ['Anxiety', 'OCD'],
  modalities: ['CBT'],
  languages: ['English', 'Hindi'],
  serviceFeeRupees: '2500',
  bio: 'Draft bio from the signup wizard.',
};

describe('prefillProfileForm', () => {
  it('uses the draft when the server has nothing yet (brand-new profile)', () => {
    const form = prefillProfileForm(therapistMe(), SAMPLE_DRAFT);
    expect(form).toEqual({
      bio: SAMPLE_DRAFT.bio,
      specialties: SAMPLE_DRAFT.specialties,
      modalities: SAMPLE_DRAFT.modalities,
      languages: SAMPLE_DRAFT.languages,
      feeRupees: SAMPLE_DRAFT.serviceFeeRupees,
      sessionType: 'online',
    });
  });

  it('prefers real server state over the draft for every field the server actually has', () => {
    const profile = therapistMe({
      bio: 'Already saved for real.',
      clinical_specialties: ['Trauma/PTSD'],
      therapeutic_modalities: ['DBT'],
      languages_spoken: ['Tamil'],
      session_fees: 300000,
      session_type: 'both',
    });
    const form = prefillProfileForm(profile, SAMPLE_DRAFT);
    expect(form).toEqual({
      bio: 'Already saved for real.',
      specialties: ['Trauma/PTSD'],
      modalities: ['DBT'],
      languages: ['Tamil'],
      feeRupees: '3000',
      sessionType: 'both',
    });
  });

  it('returns empty/default values with no profile and no draft at all', () => {
    expect(prefillProfileForm(null, null)).toEqual({
      bio: '',
      specialties: [],
      modalities: [],
      languages: [],
      feeRupees: '',
      sessionType: 'online',
    });
  });

  it('falls back to an invalid/legacy sessionType as "online" rather than passing it through', () => {
    const profile = therapistMe({ session_type: 'carrier-pigeon' });
    expect(prefillProfileForm(profile, null).sessionType).toBe('online');
  });

  it('lets the server\'s non-empty array win over the draft, field by field — MUTATION GUARD', () => {
    // Server explicitly has specialties/languages saved for real, but zero
    // modalities — the draft must fill in ONLY modalities, not overwrite the
    // two fields the server already has. Mutating the `.length > 0` guard to
    // an unconditional "server wins" would still pass the two fields below,
    // but this pins modalities falling back to the draft specifically —
    // catches a mutation that made the fallback never trigger at all.
    const profile = therapistMe({
      bio: 'Real bio already saved.',
      clinical_specialties: ['Grief'],
      therapeutic_modalities: [],
      languages_spoken: ['Bengali'],
      session_fees: 100000,
      session_type: 'online',
    });
    const form = prefillProfileForm(profile, SAMPLE_DRAFT);
    expect(form.specialties).toEqual(['Grief']);
    expect(form.languages).toEqual(['Bengali']);
    expect(form.modalities).toEqual(SAMPLE_DRAFT.modalities); // server has none yet -> draft fills in
  });
});
