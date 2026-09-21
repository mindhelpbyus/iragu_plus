/**
 * ProfileCompletionPage — real "finish your profile" screen shown after a
 * genuine first login when the therapist's REAL server profile is still
 * missing required fields. Closes iragu_plus's gap vs. therapistApp's own
 * `ProfileCompletionPage` (mobile's `.claude/context/domain-model.md`
 * business rule #6: "Profile completion gate — therapists with
 * `isVerified=false` redirect to ProfileCompletionPage after login") — and is
 * the real destination SignupPage's wizard now hands off to instead of
 * silently discarding what it collected (see SignupPage.tsx's file header).
 *
 * Real backend evidence — see api/therapistProfile.ts's module doc for the
 * full route contract:
 *  - GET  /therapists/me            — current saved state.
 *  - PUT  /therapists/{id}/profile  — bio/specialties/modalities/
 *    languagesSpoken/sessionFees/sessionType. `id` is always the caller's
 *    OWN numeric id from the GET above.
 *  - PUT  /therapists/me            — profilePhoto, after a real presigned
 *    upload (api/files.ts).
 *
 * What's editable here is deliberately narrower than the signup wizard's
 * full step 2-5 surface: designation/age-groups/display-name/headline and a
 * true multi-service catalog all have NO real TherapistProfile column or
 * live writer (confirmed against both handlers — see
 * api/therapistProfile.ts and ServicesTab.tsx's own GapNotice for the
 * single-real-fee reasoning this page mirrors exactly). Offering to save a
 * field the server would silently discard would be a second version of the
 * exact bug this page exists to fix.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  getMyTherapistProfile,
  updateTherapistCore,
  updateTherapistProfile,
  type TherapistMe,
} from '../api/therapistProfile';
import { uploadFile } from '../api/files';
import { loadProfileDraft, clearProfileDraft, type ProfileDraft } from '../lib/profileDraft';
import { SPECIALTIES, MODALITIES, LANGUAGES } from '../lib/therapistVocabulary';
import {
  MIN_BIO_LENGTH,
  missingProfileFields,
  missingFieldLabel,
} from '../lib/profileCompleteness';
import { rupeesToPaise, paiseToRupeesInput } from './settings/settingsHelpers';
import { SettingsField, settingsInputClass, settingsSelectClass } from './settings/settingsUi';
import { PageHeader } from '../components/layout/PageHeader';
import { PhotoPicker } from '../components/PhotoPicker';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';

export interface ProfileFormState {
  bio: string;
  specialties: string[];
  modalities: string[];
  languages: string[];
  feeRupees: string;
  sessionType: 'online' | 'in-person' | 'both';
}

/**
 * Pre-fill the editable form from the REAL server profile first, falling
 * back to the sessionStorage draft ONLY for a field the server has no value
 * for yet. Never the reverse — a stale draft must not overwrite something
 * the therapist (or an admin) already saved for real, which is exactly the
 * "draft as a second source of truth" the draft module's own doc forbids.
 */
export function prefillProfileForm(profile: TherapistMe | null, draft: ProfileDraft | null): ProfileFormState {
  const nested = profile?.therapist_profile;
  const serverSpecialties = nested?.clinical_specialties ?? [];
  const serverModalities = nested?.therapeutic_modalities ?? [];
  const serverLanguages = nested?.languages_spoken ?? [];
  const serverFee = nested?.session_fees;
  const serverType = nested?.session_type;

  return {
    bio: nested?.bio || draft?.bio || '',
    specialties: serverSpecialties.length > 0 ? serverSpecialties : (draft?.specialties ?? []),
    modalities: serverModalities.length > 0 ? serverModalities : (draft?.modalities ?? []),
    languages: serverLanguages.length > 0 ? serverLanguages : (draft?.languages ?? []),
    feeRupees: serverFee != null ? paiseToRupeesInput(serverFee) : (draft?.serviceFeeRupees ?? ''),
    sessionType: serverType === 'online' || serverType === 'in-person' || serverType === 'both' ? serverType : 'online',
  };
}

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-9 rounded-full px-3.5 text-[13px] font-medium transition-colors"
      style={
        active
          ? { border: '1px solid var(--action-border)', background: 'var(--action-light)', color: 'var(--action-dark)' }
          : { border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--body-text)' }
      }
    >
      {children}
    </button>
  );
}

export default function ProfileCompletionPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<TherapistMe | null>(null);
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [bio, setBio] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [modalities, setModalities] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [feeRupees, setFeeRupees] = useState('');
  const [sessionType, setSessionType] = useState<'online' | 'in-person' | 'both'>('online');

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDraft(loadProfileDraft());
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const me = await getMyTherapistProfile();
        if (cancelled) return;
        setProfile(me);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load your profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Populate the editable form once (and only once) the real profile has
  // loaded — re-running on every `draft` change would stomp an in-progress
  // edit back to the initial pre-fill.
  useEffect(() => {
    if (loading) return;
    const form = prefillProfileForm(profile, draft);
    setBio(form.bio);
    setSpecialties(form.specialties);
    setModalities(form.modalities);
    setLanguages(form.languages);
    setFeeRupees(form.feeRupees);
    setSessionType(form.sessionType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, profile]);

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    };
  }, [photoPreviewUrl]);

  const missing = missingProfileFields({ bio, specialties, sessionFees: rupeesToPaise(feeRupees) });
  const displayPhotoUrl = photoPreviewUrl ?? profile?.profile_photo ?? null;

  async function handleSave() {
    if (!profile) return;
    const trimmedBio = bio.trim();
    if (trimmedBio.length < MIN_BIO_LENGTH) {
      toast.error(`Bio must be at least ${MIN_BIO_LENGTH} characters.`);
      return;
    }
    if (specialties.length === 0) {
      toast.error('Select at least one specialty.');
      return;
    }
    const paise = rupeesToPaise(feeRupees);
    if (paise === null) {
      toast.error('Enter a valid session fee (e.g. 2500).');
      return;
    }

    setSaving(true);
    try {
      if (photoFile) {
        const uploaded = await uploadFile(photoFile, 'profile_picture');
        await updateTherapistCore({ profilePhoto: uploaded.s3Key });
      }
      await updateTherapistProfile(profile.id, {
        bio: trimmedBio,
        specialties,
        modalities,
        languagesSpoken: languages,
        sessionFees: paise,
        sessionType,
      });
      clearProfileDraft();
      toast.success('Profile complete — you’re ready to go live.');
      navigate('/dashboard');
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === 'CREDENTIALS_LOCKED') {
        toast.error('Some fields are locked while your credentials are under review.');
      } else {
        toast.error(err instanceof Error ? err.message : 'Could not save your profile');
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Complete your profile" />
        <main className="flex-1 overflow-y-auto p-7">
          <div className="py-10 text-center text-sm text-muted-text">Loading…</div>
        </main>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Complete your profile" />
      <main className="flex-1 overflow-y-auto p-7">
        <div className="mx-auto flex max-w-[640px] flex-col gap-5">
          {error && (
            <div className="rounded-lg border border-[#E5C6C6] bg-[#FBEFEF] px-4 py-2.5 text-sm text-[#8E4848]">
              {error}
            </div>
          )}

          <div className="rounded-2xl border border-rule bg-surface p-6">
            <h2 className="m-0 text-[17px] font-semibold text-ink">
              {missing.length === 0 ? "You're all set" : 'A few things left'}
            </h2>
            <p className="mt-1 mb-4 text-[13px] text-muted-text">
              {missing.length === 0
                ? 'Your profile has everything clients need to find and book you.'
                : "Clients can't find or book you until these are filled in — everything else in the app stays fully available in the meantime."}
            </p>
            {missing.length > 0 && (
              <div className="flex flex-col gap-2">
                {missing.map((field) => (
                  <div key={field} className="flex items-center gap-2.5 rounded-[10px] border border-rule bg-canvas px-3.5 py-2.5">
                    <div className="h-2 w-2 rounded-full" style={{ background: 'var(--dim)' }} />
                    <span className="text-[13px] text-ink">{missingFieldLabel(field)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-5 rounded-2xl border border-rule bg-surface p-6">
            <div className="flex items-center gap-5">
              <PhotoPicker
                previewUrl={displayPhotoUrl}
                onFileSelected={(file) => {
                  setPhotoFile(file);
                  setPhotoPreviewUrl((prev) => {
                    if (prev) URL.revokeObjectURL(prev);
                    return URL.createObjectURL(file);
                  });
                }}
              />
              <div className="text-xs leading-relaxed text-muted-text">
                <b className="text-ink">Profile photo</b>
                <br />
                Optional, but profiles with a photo get more bookings.
                {photoFile && <div className="mt-1.5 text-[11px] text-action-dark">Selected: {photoFile.name}</div>}
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-text">About you</label>
                <span className="text-[11px] text-muted-text">{bio.length}/600</span>
              </div>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 600))}
                rows={5}
                placeholder="Tell clients about your approach…"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-text">Specialties</label>
              <div className="flex flex-wrap gap-2">
                {SPECIALTIES.map((s) => (
                  <Chip key={s} active={specialties.includes(s)} onClick={() => setSpecialties(toggleValue(specialties, s))}>
                    {s}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-text">Modalities</label>
              <div className="flex flex-wrap gap-2">
                {MODALITIES.map((m) => (
                  <Chip key={m} active={modalities.includes(m)} onClick={() => setModalities(toggleValue(modalities, m))}>
                    {m}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-text">Languages</label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((l) => (
                  <Chip key={l} active={languages.includes(l)} onClick={() => setLanguages(toggleValue(languages, l))}>
                    {l}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <SettingsField label="Session fee (₹)" hint="Your default fee, before the platform commission.">
                <input
                  value={feeRupees}
                  onChange={(e) => setFeeRupees(e.target.value)}
                  inputMode="decimal"
                  placeholder="2500"
                  className={settingsInputClass}
                />
              </SettingsField>
              <SettingsField label="Session format">
                <select
                  value={sessionType}
                  onChange={(e) => setSessionType(e.target.value as typeof sessionType)}
                  className={settingsSelectClass}
                >
                  <option value="online">Online only</option>
                  <option value="in-person">In-person only</option>
                  <option value="both">Online & in-person</option>
                </select>
              </SettingsField>
            </div>
          </div>

          <div className="flex items-center justify-between pb-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="text-[13px] font-medium text-muted-text hover:underline"
            >
              Skip for now
            </button>
            <Button disabled={saving} onClick={handleSave} className="h-11 rounded-2xl px-6">
              {saving ? 'Saving…' : 'Save & continue'}
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
