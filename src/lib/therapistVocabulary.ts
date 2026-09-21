/**
 * therapistVocabulary.ts — the chip option lists SignupPage's steps 2-4 show,
 * extracted so ProfileCompletionPage (src/pages/ProfileCompletionPage.tsx)
 * can present the SAME chips for the SAME real backend fields
 * (clinicalSpecialties/therapeuticModalities/languagesSpoken — see
 * backend-initial's therapist-profile handler.ts:529-545) instead of a
 * second, driftable copy.
 *
 * SPECIALTIES/MODALITIES/LANGUAGES are now copied VERBATIM from
 * backend-initial's canonical `shared/clinical-vocabulary.ts` (also served
 * via `GET /config`) — not a separately product-chosen list. A prior version
 * of this file used display labels ("Work stress", "Trauma/PTSD", "Gottman",
 * "Bengali") that don't match the server's exact-normalized-string coercion
 * (`coerceSpecialisations`/`coerceModalities`/`coerceLanguages`,
 * `clinical-vocabulary.ts`'s `coerce()`), which silently drops (logs, never
 * rejects) anything it doesn't recognise — a therapist could pick 6 of 10
 * "specialties" that all got dropped on save with no error, immediately
 * re-failing the very completeness check this page exists to satisfy.
 * If backend-initial's canonical list changes, update this file to match —
 * do not reintroduce a display-only relabeling.
 */
export const DESIGNATIONS = ['Clinical Psychologist', 'Counseling Psychologist', 'Psychiatrist', 'Therapist / Counselor'];
export const SPECIALTIES = ['Anxiety', 'Depression', 'PTSD', 'Stress', 'Trauma', 'OCD', 'Relationship Issues', 'Grief & Loss', 'Self-Esteem', 'Anger Management', 'Addiction'];
export const MODALITIES = ['CBT', 'DBT', 'ACT', 'EMDR', 'Psychodynamic', 'IFS', 'Mindfulness', 'Somatic'];
export const LANGUAGES = ['English', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Hindi'];
export const AGE_GROUPS = ['Children', 'Teens', 'Adults', 'Seniors'];
export const SERVICES = [
  { label: 'Individual therapy · 50min', defaultFee: '2500' },
  { label: 'Couples therapy · 75min', defaultFee: '3500' },
  { label: 'Group session · 60min', defaultFee: '800' },
  { label: 'Intake assessment · 60min', defaultFee: '3000' },
];
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
