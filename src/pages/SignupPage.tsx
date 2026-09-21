/**
 * SignupPage — 6-step therapist registration wizard. Layout/copy match
 * designs/Iragu+ Signup.dc.html (Account → Credentials → Specialties →
 * Services → Profile → Verify).
 *
 * Step 1 (Account) is wired to real Cognito signup via api/auth.ts `register()`.
 * Steps 2–5 collect therapist-profile data (credentials, specialties, services,
 * bio) that STILL has no backend endpoint reachable from mid-wizard — a
 * `TherapistProfile` row's real writes (`PUT /therapists/{id}/profile`) need a
 * caller with a valid Cognito Bearer token, and `register()` below only calls
 * Cognito `signUp`: the account sits in `pending_confirmation` with no
 * session, and confirming it needs the code Cognito emailed, which this
 * wizard never collected. Calling the real save mid-wizard would 401.
 *
 * The fix: steps 2–5 stay local-only collection (unchanged), but `finish()`
 * now caches that data as a DRAFT (lib/profileDraft.ts — sessionStorage,
 * cleared on real save, never a second source of truth) and step 6 is a REAL
 * "confirm your email" screen — Cognito's `signUp` already sent a 6-digit
 * CODE (not a link; see api/auth.ts's `verifyEmail` doc for how that's known)
 * — instead of silently pretending the account was fully set up. Confirming
 * the code, then signing in with the same credentials from step 1, is what
 * finally produces the Bearer token ProfileCompletionPage
 * (pages/ProfileCompletionPage.tsx) needs to perform the REAL save this
 * wizard could never do — closing both the data-loss bug and iragu_plus's
 * gap vs. therapistApp's `ProfileCompletionPage` (mobile's own post-login
 * "finish your profile" screen).
 *
 * Step 5's profile photo picker is the shared `PhotoPicker`
 * (components/PhotoPicker.tsx) — same validated control ProfileCompletionPage
 * uses. It stays local-preview-only HERE (no session exists yet to upload
 * against); ProfileCompletionPage is what actually uploads it, post-login,
 * via api/files.ts's real presign → PUT → register flow.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { register, verifyEmail, resendConfirmationCode, login } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { saveProfileDraft } from '../lib/profileDraft';
import { PhotoPicker, validatePhotoFile } from '../components/PhotoPicker';
import { DESIGNATIONS, SPECIALTIES, MODALITIES, LANGUAGES, AGE_GROUPS, SERVICES, WEEKDAYS } from '../lib/therapistVocabulary';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import iraguPlusMark from '../assets/brand/iragu-plus-mark.svg';

const STEP_NAMES = ['Account', 'Credentials', 'Specialties', 'Services', 'Profile', 'Verify'];

// Re-exported so existing imports of validatePhotoFile from this module keep
// compiling — the real implementation now lives with the shared PhotoPicker.
export { validatePhotoFile };

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

export function toggleIndex(arr: number[], i: number): number[] {
  return arr.includes(i) ? arr.filter((x) => x !== i) : [...arr, i];
}

/**
 * Which of the 6 step-progress segments should render as filled (current or
 * completed) vs. upcoming. Exported so a regression that drops the 6th
 * ("Verify") segment — e.g. reintroducing a `.slice(0, 5)` — is caught by a
 * test rather than only noticed visually. Length is always `STEP_NAMES.length`.
 */
export function stepSegments(currentStep: number): boolean[] {
  return STEP_NAMES.map((_, i) => i < currentStep);
}

export interface ProfilePreview {
  name: string;
  headline: string;
  langs: string;
  bio: string;
  initials: string;
  fee: string | null;
}

/**
 * Derives the "Preview — how clients see you" card contents from real wizard
 * state only. Two design-mock values are deliberately NOT sourced here
 * because nothing in the wizard holds real state for them: years-of-practice
 * (an uncontrolled input in step 2) and a fixed "₹2,500" example fee. `fee`
 * instead comes from the first selected service's real configured default
 * fee (the same SERVICES/`services` data step 4 already uses), or null if no
 * service is selected — never a fabricated number.
 */
export function buildProfilePreview(input: {
  firstName: string;
  lastName: string;
  displayName: string;
  headline: string;
  bio: string;
  langIndices: number[];
  serviceIndices: number[];
}): ProfilePreview {
  const { firstName, lastName, displayName, headline, bio, langIndices, serviceIndices } = input;
  const name = displayName.trim() || `Dr. ${firstName} ${lastName}`.trim() || 'Your name';
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase().trim() || '?';
  const langs = langIndices.map((i) => LANGUAGES[i]).filter(Boolean).join(', ');
  const bioTrimmed = bio.trim();
  const bioPreview = bioTrimmed
    ? bioTrimmed.length > 140
      ? `${bioTrimmed.slice(0, 140)}…`
      : bioTrimmed
    : 'Your bio appears here as you type…';
  const fee = serviceIndices.length > 0 ? SERVICES[serviceIndices[0]].defaultFee : null;
  return {
    name,
    headline: headline.trim() || 'Your headline',
    langs,
    bio: bioPreview,
    initials,
    fee,
  };
}

export default function SignupPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s._setUser);
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1 — Account (real Cognito signup fields)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('');

  // Steps 2–5 — profile fields (held locally; no backend endpoint yet, see file header)
  const [desig, setDesig] = useState(0);
  const [specs, setSpecs] = useState<number[]>([0, 2]);
  const [modalities, setModalities] = useState<number[]>([0]);
  const [langs, setLangs] = useState<number[]>([0, 1]);
  const [ages, setAges] = useState<number[]>([1, 2]);
  const [services, setServices] = useState<number[]>([0, 3]);
  const [availDays, setAvailDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [bio, setBio] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [headline, setHeadline] = useState('');

  // Step 5 — profile photo (real file picker + local preview via the shared
  // PhotoPicker; see file header for why this doesn't upload here).
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

  // Object URLs are only freed by us — revoke on replace/unmount so repeated
  // picks in one session don't leak.
  useEffect(() => {
    return () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    };
  }, [photoPreviewUrl]);

  const handlePhotoSelected = (file: File) => {
    setPhotoFile(file);
    setPhotoPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  // Step 6 — confirm-email (real Cognito confirmation; see file header)
  const [confirmCode, setConfirmCode] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleAccountSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await register({
        email,
        password,
        firstName,
        lastName,
        phoneNumber: phone || undefined,
        role: 'therapist',
      });
      // Deliberately NOT calling setUser() here. register() only calls Cognito
      // signUp() — the account has no session yet (pending_confirmation) — so
      // the returned AuthUser is optimistic, not real. Setting it into the
      // global auth store this early used to flip /signup's own route guard
      // (`user && user.role !== 'client' -> redirect to /dashboard`),
      // unmounting this wizard before step 2 ever rendered and sending every
      // subsequent API call out with no real Authorization header (401 ->
      // bounced to /login). The real session — and the real setUser() call —
      // happens in handleConfirmSubmit below, once verifyEmail()+login()
      // have actually produced one.
      toast.success('Account created — let’s finish your profile');
      setStep(2);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create account');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Cache the collected profile data as a DRAFT (never a save — no session
   * exists to save against yet) and move to the real confirm-email step.
   * `photoFile` is deliberately NOT cached (see lib/profileDraft.ts's file
   * header) — ProfileCompletionPage re-prompts for it once a session exists.
   */
  const finish = () => {
    saveProfileDraft(
      {
        designation: DESIGNATIONS[desig] ?? null,
        specialties: specs.map((i) => SPECIALTIES[i]).filter((v): v is string => Boolean(v)),
        modalities: modalities.map((i) => MODALITIES[i]).filter((v): v is string => Boolean(v)),
        languages: langs.map((i) => LANGUAGES[i]).filter((v): v is string => Boolean(v)),
        serviceFeeRupees: services.length > 0 ? SERVICES[services[0]].defaultFee : null,
        bio,
      },
      email,
    );
    setStep(6);
  };

  /**
   * Confirm the Cognito account with the code the user typed, then sign in
   * with the same credentials step 1 already collected — `confirmRegistration`
   * only moves the account UNCONFIRMED -> CONFIRMED, it does not itself
   * establish a session. This is the step that finally produces a real
   * Bearer token, which is what lets ProfileCompletionPage perform the save
   * this wizard never could.
   */
  const handleConfirmSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsConfirming(true);
    try {
      await verifyEmail(email, confirmCode.trim());
      const user = await login(email, password);
      setUser(user);
      toast.success('Account confirmed — let’s finish your profile');
      navigate('/complete-profile');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not confirm your account');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);
    try {
      await resendConfirmationCode(email);
      toast.success('Confirmation code resent — check your email');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not resend the code');
    } finally {
      setIsResending(false);
    }
  };

  // Step 5 "Preview — how clients see you" — see buildProfilePreview's doc
  // comment for why years-of-practice and the fixed "₹2,500" mock fee are
  // deliberately not reproduced here.
  const preview = buildProfilePreview({
    firstName,
    lastName,
    displayName,
    headline,
    bio,
    langIndices: langs,
    serviceIndices: services,
  });

  return (
    <div className="min-h-screen bg-canvas">
      <header className="flex h-16 items-center justify-between border-b border-rule bg-surface px-7">
        <div className="flex items-center gap-2.5">
          <img src={iraguPlusMark} alt="Iragu+" className="h-[30px] w-[30px]" />
          <div>
            <div className="text-base font-semibold tracking-tight text-ink">Iragu+</div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-action">Practice registration</div>
          </div>
        </div>
        <div className="text-[13px] text-muted-text">
          Already registered?{' '}
          <a href="/login" className="font-medium text-action-dark hover:underline">
            Sign in
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-[640px] px-6 pb-16 pt-9">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-text">
            Step {step} of 6 · {STEP_NAMES[step - 1]}
          </span>
          {step < 6 && <span className="text-xs text-muted-text">~5 minutes</span>}
        </div>
        <div className="mb-7 flex gap-1.5">
          {stepSegments(step).map((filled, i) => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full"
              style={{ background: filled ? 'var(--action)' : 'var(--rule)' }}
            />
          ))}
        </div>

        {step === 1 && (
          <form onSubmit={handleAccountSubmit}>
            <h1 className="text-[26px] font-medium tracking-tight text-ink">Grow your practice with Iragu+</h1>
            <p className="my-2.5 mb-6 text-sm leading-relaxed text-muted-text">
              Join 340+ verified therapists. Scheduling, telehealth, notes, and payments — in one calm place. Free to
              register; Iragu+ takes a small commission per session.
            </p>
            <div className="rounded-2xl border border-rule bg-surface p-6">
              <div className="grid grid-cols-2 gap-4">
                <Field label="First name">
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" required />
                </Field>
                <Field label="Last name">
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" required />
                </Field>
                <Field label="Work email">
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@clinic.in" required />
                </Field>
                <Field label="Mobile (for OTP)">
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" />
                </Field>
                <Field label="City">
                  <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
                </Field>
                <Field label="Password">
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    minLength={8}
                    required
                  />
                </Field>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button type="submit" disabled={isLoading} className="h-11 rounded-2xl px-6">
                {isLoading ? 'Creating account…' : 'Create account'}
              </Button>
            </div>
            <div className="mt-8 flex items-center justify-center gap-2.5 text-xs text-muted-text">
              {['HIPAA', 'SOC 2', 'DPDP Act'].map((badge) => (
                <span key={badge} className="rounded-full bg-surface-warm px-2.5 py-1 text-[11px] font-medium text-body-text">
                  {badge}
                </span>
              ))}
            </div>
          </form>
        )}

        {step === 2 && (
          <div>
            <h1 className="text-2xl font-medium tracking-tight text-ink">Credentials &amp; license</h1>
            <p className="my-1.5 mb-5 text-sm text-muted-text">
              We verify every therapist before their profile goes live. This keeps client trust high — and your
              calendar full.
            </p>
            <div className="flex flex-col gap-4.5 rounded-2xl border border-rule bg-surface p-6">
              <div>
                <FieldLabel>Professional designation</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {DESIGNATIONS.map((d, i) => (
                    <Chip key={d} active={desig === i} onClick={() => setDesig(i)}>
                      {d}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="RCI registration no.">
                  <Input placeholder="e.g. CRR-A-00000" />
                </Field>
                <Field label="Years of practice">
                  <Input placeholder="e.g. 5" />
                </Field>
                <Field label="Highest qualification" className="col-span-2">
                  <Input placeholder="e.g. M.Phil Clinical Psychology" />
                </Field>
              </div>
              <div>
                <FieldLabel>Upload documents</FieldLabel>
                <div className="grid grid-cols-2 gap-2.5">
                  {['RCI certificate', 'Degree certificate'].map((doc) => (
                    <div
                      key={doc}
                      className="cursor-pointer rounded-[10px] border border-dashed border-rule-hi bg-canvas p-4 text-center transition-colors hover:border-action hover:bg-action-light/40"
                    >
                      <div className="text-xs font-semibold text-ink">{doc}</div>
                      <div className="text-[11px] text-muted-text">PDF or image, max 10 MB</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 rounded-[10px] border border-ochre-border bg-ochre-light p-3.5">
                <div className="text-xs leading-relaxed text-ochre">
                  Verification takes 1–2 business days. You can finish setting up your profile while we review.
                </div>
              </div>
            </div>
            <StepNav step={step} setStep={setStep} />
          </div>
        )}

        {step === 3 && (
          <div>
            <h1 className="text-2xl font-medium tracking-tight text-ink">Your specialties</h1>
            <p className="my-1.5 mb-5 text-sm text-muted-text">Select what you're best known for — clients filter by these.</p>
            <div className="flex flex-col gap-5 rounded-2xl border border-rule bg-surface p-6">
              <ChipGroup label="Specialties" options={SPECIALTIES} selected={specs} onToggle={(i) => setSpecs(toggleIndex(specs, i))} />
              <ChipGroup label="Modalities" options={MODALITIES} selected={modalities} onToggle={(i) => setModalities(toggleIndex(modalities, i))} />
              <ChipGroup label="Languages" options={LANGUAGES} selected={langs} onToggle={(i) => setLangs(toggleIndex(langs, i))} />
              <ChipGroup label="Age groups" options={AGE_GROUPS} selected={ages} onToggle={(i) => setAges(toggleIndex(ages, i))} />
            </div>
            <StepNav step={step} setStep={setStep} />
          </div>
        )}

        {step === 4 && (
          <div>
            <h1 className="text-2xl font-medium tracking-tight text-ink">Services, fees &amp; availability</h1>
            <p className="my-1.5 mb-5 text-sm text-muted-text">
              12% platform commission on completed sessions. Payouts every Friday via Razorpay Route.
            </p>
            <div className="flex flex-col gap-5 rounded-2xl border border-rule bg-surface p-6">
              <div>
                <FieldLabel>Services you offer</FieldLabel>
                <div className="flex flex-col gap-2">
                  {SERVICES.map((s, i) => (
                    <div
                      key={s.label}
                      className="flex items-center gap-3 rounded-[10px] border border-rule px-3.5 py-2.5"
                    >
                      <Checkbox
                        checked={services.includes(i)}
                        onCheckedChange={() => setServices(toggleIndex(services, i))}
                        aria-label={s.label}
                        className="h-[18px] w-[18px] rounded-[5px]"
                      />
                      <span
                        className="flex-1 cursor-pointer text-sm text-ink"
                        onClick={() => setServices(toggleIndex(services, i))}
                      >
                        {s.label}
                      </span>
                      <span className="text-xs text-muted-text">₹</span>
                      <Input defaultValue={s.defaultFee} className="h-8 w-20 text-right" disabled={!services.includes(i)} />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <FieldLabel>Weekly availability</FieldLabel>
                <div className="flex gap-1.5">
                  {WEEKDAYS.map((d, i) => (
                    <Chip key={d} active={availDays.includes(i)} onClick={() => setAvailDays(toggleIndex(availDays, i))}>
                      {d}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field label="From">
                  <Input type="time" defaultValue="09:00" />
                </Field>
                <Field label="Until">
                  <Input type="time" defaultValue="18:00" />
                </Field>
                <Field label="Buffer (min)">
                  <Input defaultValue="10" />
                </Field>
              </div>
              <Field label="Payout account (UPI or bank)">
                <Input placeholder="yourname@bank" />
              </Field>
            </div>
            <StepNav step={step} setStep={setStep} />
          </div>
        )}

        {step === 5 && (
          <div>
            <h1 className="text-2xl font-medium tracking-tight text-ink">Your public profile</h1>
            <p className="my-1.5 mb-5 text-sm text-muted-text">
              This is what clients see when choosing a therapist. Profiles with a photo and bio get 3× more bookings.
            </p>
            <div className="flex flex-col gap-5 rounded-2xl border border-rule bg-surface p-6">
              <div className="flex items-center gap-5">
                <PhotoPicker previewUrl={photoPreviewUrl} onFileSelected={handlePhotoSelected} />
                <div className="text-xs leading-relaxed text-muted-text">
                  <b className="text-ink">Photo guidelines</b>
                  <br />
                  Warm, friendly, well-lit headshot. Face clearly visible, no sunglasses. Clients respond best to a
                  soft smile — this is often their first impression of therapy.
                  {photoFile && (
                    <div className="mt-1.5 text-[11px] text-action-dark">Selected: {photoFile.name}</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Display name">
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={`Dr. ${firstName} ${lastName}`.trim() || 'Dr. Your Name'}
                  />
                </Field>
                <Field label="Headline">
                  <Input
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="e.g. Clinical Psychologist · CBT for anxiety & depression"
                  />
                </Field>
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <FieldLabel>About you</FieldLabel>
                  <span className="text-[11px] text-muted-text">{bio.length}/600</span>
                </div>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 600))}
                  rows={6}
                  placeholder="Tell clients about your approach…"
                />
              </div>

              <div>
                <FieldLabel>Preview — how clients see you</FieldLabel>
                <div className="flex gap-3.5 rounded-2xl border border-rule bg-canvas p-4.5">
                  <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-action-light text-[17px] font-semibold text-action-dark">
                    {photoPreviewUrl ? (
                      <img src={photoPreviewUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      preview.initials
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-semibold text-ink">{preview.name}</div>
                    <div className="mt-0.5 text-xs text-muted-text">
                      {preview.headline}
                      {preview.langs ? ` · ${preview.langs}` : ''}
                    </div>
                    <p className="mt-1.5 text-xs italic leading-relaxed text-muted-text">{preview.bio}</p>
                  </div>
                  {preview.fee && (
                    <div className="shrink-0 text-right">
                      <div className="text-[15px] font-semibold text-action-dark">₹{preview.fee}</div>
                      <div className="text-[11px] text-muted-text">per session</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between">
              <Button variant="outline" onClick={() => setStep(4)} className="h-11 rounded-2xl px-6">
                Back
              </Button>
              <Button onClick={finish} className="h-11 rounded-2xl px-6">
                Finish
              </Button>
            </div>
          </div>
        )}

        {step === 6 && (
          <form onSubmit={handleConfirmSubmit} className="py-10 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-action-light">
              <div className="h-8 w-8 rounded-full bg-action" />
            </div>
            <h1 className="text-2xl font-medium tracking-tight text-ink">Check your email</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-text">
              We sent a 6-digit confirmation code to <b className="text-ink">{email || 'your email'}</b>. Enter it
              below to confirm your account — your profile details are saved and waiting for you on the next step.
            </p>
            <div className="mx-auto mt-6 max-w-xs text-left">
              <FieldLabel>Confirmation code</FieldLabel>
              <Input
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value)}
                placeholder="123456"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                className="text-center text-lg tracking-[0.3em]"
              />
            </div>
            <Button type="submit" disabled={isConfirming || !confirmCode.trim()} className="mt-6 h-11 rounded-2xl px-6">
              {isConfirming ? 'Confirming…' : 'Confirm & continue'}
            </Button>
            <div className="mt-4 text-xs text-muted-text">
              Didn't get a code?{' '}
              <button
                type="button"
                onClick={handleResendCode}
                disabled={isResending}
                className="font-medium text-action-dark hover:underline disabled:opacity-50"
              >
                {isResending ? 'Resending…' : 'Resend code'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-text">{children}</label>;
}

function ChipGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: number[];
  onToggle: (i: number) => void;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex flex-wrap gap-2">
        {options.map((opt, i) => (
          <Chip key={opt} active={selected.includes(i)} onClick={() => onToggle(i)}>
            {opt}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function StepNav({ step, setStep }: { step: number; setStep: (s: number) => void }) {
  return (
    <div className="mt-6 flex justify-between">
      <Button variant="outline" onClick={() => setStep(Math.max(1, step - 1))} className="h-11 rounded-2xl px-6">
        Back
      </Button>
      <Button onClick={() => setStep(Math.min(6, step + 1))} className="h-11 rounded-2xl px-6">
        Continue
      </Button>
    </div>
  );
}
