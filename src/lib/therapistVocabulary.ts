/**
 * therapistVocabulary.ts — the chip option lists SignupPage's steps 2-4 show,
 * extracted so ProfileCompletionPage (src/pages/ProfileCompletionPage.tsx)
 * can present the SAME chips for the SAME real backend fields
 * (clinicalSpecialties/therapeuticModalities/languagesSpoken — see
 * backend-initial's therapist-profile handler.ts:529-545) instead of a
 * second, driftable copy.
 *
 * These are a product-chosen display vocabulary, not backend-initial's
 * canonical clinical vocabulary (`shared/clinical-vocabulary.ts`, served via
 * `GET /config`) — the two can disagree, and where they do, the server's
 * `coerceSpecialisations`/`coerceModalities`/`coerceLanguages` silently drop
 * anything it doesn't recognise (logged, not rejected). Reconciling the two
 * vocabularies is a separate, larger change; this file only stops the chip
 * list itself from being copy-pasted a second time.
 */
export const DESIGNATIONS = ['Clinical Psychologist', 'Counseling Psychologist', 'Psychiatrist', 'Therapist / Counselor'];
export const SPECIALTIES = ['Anxiety', 'Depression', 'Work stress', 'Trauma/PTSD', 'OCD', 'Couples', 'Grief', 'LGBTQ+', 'Sleep', 'Addiction'];
export const MODALITIES = ['CBT', 'DBT', 'EMDR', 'ACT', 'Psychodynamic', 'Gottman'];
export const LANGUAGES = ['English', 'Hindi', 'Malayalam', 'Tamil', 'Telugu', 'Bengali'];
export const AGE_GROUPS = ['Children', 'Teens', 'Adults', 'Seniors'];
export const SERVICES = [
  { label: 'Individual therapy · 50min', defaultFee: '2500' },
  { label: 'Couples therapy · 75min', defaultFee: '3500' },
  { label: 'Group session · 60min', defaultFee: '800' },
  { label: 'Intake assessment · 60min', defaultFee: '3000' },
];
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
