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

describe('profileDraft', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = fakeStorage();
  });

  it('round-trips a saved draft exactly', () => {
    saveProfileDraft(SAMPLE, storage);
    expect(loadProfileDraft(storage)).toEqual(SAMPLE);
  });

  it('returns null when nothing has been saved', () => {
    expect(loadProfileDraft(storage)).toBeNull();
  });

  it('clears the draft so a later load returns null', () => {
    saveProfileDraft(SAMPLE, storage);
    clearProfileDraft(storage);
    expect(loadProfileDraft(storage)).toBeNull();
  });

  it('is resilient to corrupted JSON in storage — returns null, not a throw', () => {
    storage.setItem('iragu_plus:signup-profile-draft:v1', '{not valid json');
    expect(loadProfileDraft(storage)).toBeNull();
  });

  it('fills in safe defaults for a partial/legacy record rather than surfacing undefined fields', () => {
    storage.setItem('iragu_plus:signup-profile-draft:v1', JSON.stringify({ bio: 'Just a bio' }));
    expect(loadProfileDraft(storage)).toEqual({
      designation: null,
      specialties: [],
      modalities: [],
      languages: [],
      serviceFeeRupees: null,
      bio: 'Just a bio',
    });
  });

  it('a save then a clear leaves storage with no leftover key at all', () => {
    saveProfileDraft(SAMPLE, storage);
    clearProfileDraft(storage);
    expect(storage.getItem('iragu_plus:signup-profile-draft:v1')).toBeNull();
  });
});
