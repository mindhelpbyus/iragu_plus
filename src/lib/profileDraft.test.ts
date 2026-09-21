import { describe, it, expect, beforeEach } from 'vitest';
import { saveProfileDraft, loadProfileDraft, clearProfileDraft, type ProfileDraft } from './profileDraft';

/** Minimal in-memory Storage — this repo's vitest environment has no DOM, so
 *  there is no real `sessionStorage` global to exercise against. */
function fakeStorage(): Storage {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => (data.has(key) ? data.get(key)! : null),
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
    clear: () => data.clear(),
    key: (i: number) => Array.from(data.keys())[i] ?? null,
    get length() {
      return data.size;
    },
  } as Storage;
}

const SAMPLE: ProfileDraft = {
  designation: 'Clinical Psychologist',
  specialties: ['Anxiety', 'OCD'],
  modalities: ['CBT'],
  languages: ['English', 'Hindi'],
  serviceFeeRupees: '2500',
  bio: 'A caring, evidence-based approach to anxiety and OCD.',
};

const OWNER_EMAIL = 'priya@example.com';

describe('profileDraft', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = fakeStorage();
  });

  it('round-trips a saved draft exactly for the same owner email', () => {
    saveProfileDraft(SAMPLE, OWNER_EMAIL, storage);
    expect(loadProfileDraft(OWNER_EMAIL, storage)).toEqual(SAMPLE);
  });

  it('email comparison is case-insensitive', () => {
    saveProfileDraft(SAMPLE, 'Priya@Example.COM', storage);
    expect(loadProfileDraft('priya@example.com', storage)).toEqual(SAMPLE);
  });

  it('REGRESSION: refuses to hand a draft saved for one email to a different one', () => {
    saveProfileDraft(SAMPLE, 'person-a@example.com', storage);
    expect(loadProfileDraft('person-b@example.com', storage)).toBeNull();
  });

  it('returns null when nothing has been saved', () => {
    expect(loadProfileDraft(OWNER_EMAIL, storage)).toBeNull();
  });

  it('clears the draft so a later load returns null', () => {
    saveProfileDraft(SAMPLE, OWNER_EMAIL, storage);
    clearProfileDraft(storage);
    expect(loadProfileDraft(OWNER_EMAIL, storage)).toBeNull();
  });

  it('is resilient to corrupted JSON in storage — returns null, not a throw', () => {
    storage.setItem('iragu_plus:signup-profile-draft:v1', '{not valid json');
    expect(loadProfileDraft(OWNER_EMAIL, storage)).toBeNull();
  });

  it('fills in safe defaults for a partial/legacy record rather than surfacing undefined fields', () => {
    storage.setItem(
      'iragu_plus:signup-profile-draft:v1',
      JSON.stringify({ ownerEmail: OWNER_EMAIL, draft: { bio: 'Just a bio' } })
    );
    expect(loadProfileDraft(OWNER_EMAIL, storage)).toEqual({
      designation: null,
      specialties: [],
      modalities: [],
      languages: [],
      serviceFeeRupees: null,
      bio: 'Just a bio',
    });
  });

  it('a save then a clear leaves storage with no leftover key at all', () => {
    saveProfileDraft(SAMPLE, OWNER_EMAIL, storage);
    clearProfileDraft(storage);
    expect(storage.getItem('iragu_plus:signup-profile-draft:v1')).toBeNull();
  });
});
