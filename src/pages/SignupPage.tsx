/**
 * SignupPage — 6-step therapist registration wizard. Layout/copy match
 * designs/Iragu+ Signup.dc.html exactly (Account → Credentials → Specialties →
 * Services → Profile → Done).
 *
 * Step 1 (Account) is wired to real Cognito signup via api/auth.ts `register()`.
 * Steps 2–5 collect therapist-profile data (credentials, specialties, services,
 * bio) that has no backend endpoint yet — this is a `TherapistProfile` row in
 * backend-initial, created after Cognito signup succeeds, not part of Cognito
 * registration itself. Per the plan (ship UI against a minimal endpoint, grow
 * it): the fields are collected and held in local state for now and are NOT
 * yet sent anywhere — see the `finish()` TODO for exactly what's missing.
 */
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { register } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import iraguPlusMark from '../assets/brand/iragu-plus-mark.svg';

const STEP_NAMES = ['Account', 'Credentials', 'Specialties', 'Services', 'Profile', 'Done'];

const DESIGNATIONS = ['Clinical Psychologist', 'Counseling Psychologist', 'Psychiatrist', 'Therapist / Counselor'];
const SPECIALTIES = ['Anxiety', 'Depression', 'Work stress', 'Trauma/PTSD', 'OCD', 'Couples', 'Grief', 'LGBTQ+', 'Sleep', 'Addiction'];
const MODALITIES = ['CBT', 'DBT', 'EMDR', 'ACT', 'Psychodynamic', 'Gottman'];
const LANGUAGES = ['English', 'Hindi', 'Malayalam', 'Tamil', 'Telugu', 'Bengali'];
const AGE_GROUPS = ['Children', 'Teens', 'Adults', 'Seniors'];
const SERVICES = [
  { label: 'Individual therapy · 50min', defaultFee: '2500' },
  { label: 'Couples therapy · 75min', defaultFee: '3500' },
  { label: 'Group session · 60min', defaultFee: '800' },
  { label: 'Intake assessment · 60min', defaultFee: '3000' },
];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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

function toggleIndex(arr: number[], i: number): number[] {
  return arr.includes(i) ? arr.filter((x) => x !== i) : [...arr, i];
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

  const handleAccountSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const user = await register({
        email,
        password,
        firstName,
        lastName,
        phoneNumber: phone || undefined,
        role: 'therapist',
      });
      setUser(user);
      toast.success('Account created — let’s finish your profile');
      setStep(2);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create account');
    } finally {
      setIsLoading(false);
    }
  };

  const finish = () => {
    // TODO(backend): POST the collected profile (desig/specs/modalities/langs/
    // ages/services/availDays/bio) to backend-initial once a
    // create-therapist-profile endpoint exists. Not sent today.
    setStep(6);
  };

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
          {STEP_NAMES.slice(0, 5).map((_, i) => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full"
              style={{ background: i < step ? 'var(--action)' : 'var(--rule)' }}
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
                    <label
                      key={s.label}
                      className="flex items-center gap-3 rounded-[10px] border border-rule px-3.5 py-2.5"
                    >
                      <input
                        type="checkbox"
                        checked={services.includes(i)}
                        onChange={() => setServices(toggleIndex(services, i))}
                        className="h-4 w-4 accent-[var(--action)]"
                      />
                      <span className="flex-1 text-sm text-ink">{s.label}</span>
                      <span className="text-xs text-muted-text">₹</span>
                      <Input defaultValue={s.defaultFee} className="h-8 w-20 text-right" disabled={!services.includes(i)} />
                    </label>
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
            <p className="my-1.5 mb-5 text-sm text-muted-text">This is what clients see when they find you.</p>
            <div className="grid grid-cols-[1fr_260px] gap-5">
              <div className="flex flex-col gap-4 rounded-2xl border border-rule bg-surface p-6">
                <Field label="Display name">
                  <Input defaultValue={`Dr. ${firstName} ${lastName}`.trim()} />
                </Field>
                <Field label="Headline">
                  <Input placeholder="e.g. Clinical Psychologist · CBT for anxiety & depression" />
                </Field>
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
              </div>
              <div className="rounded-2xl border border-rule bg-surface-warm p-5">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-text">Preview</div>
                <div className="text-sm font-semibold text-ink">{`Dr. ${firstName} ${lastName}`.trim() || 'Dr. Your Name'}</div>
                <p className="mt-2 text-xs leading-relaxed text-body-text">
                  {bio.slice(0, 140) || 'Your bio preview will appear here as you type.'}
                  {bio.length > 140 ? '…' : ''}
                </p>
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
          <div className="py-10 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-action-light">
              <div className="h-8 w-8 rounded-full bg-action" />
            </div>
            <h1 className="text-2xl font-medium tracking-tight text-ink">You're in</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-text">
              Your account is ready. We're reviewing your credentials — you can explore your dashboard while you
              wait.
            </p>
            <div className="mx-auto mt-6 flex max-w-xs flex-col gap-2 text-left">
              {[
                { label: 'Account created', done: true },
                { label: 'RCI credentials in review', done: false },
                { label: 'Add a profile photo', done: false },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-2.5 rounded-[10px] border border-rule bg-surface px-3.5 py-2.5">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ background: row.done ? 'var(--action)' : 'var(--dim)' }}
                  />
                  <span className="text-[13px] text-ink">{row.label}</span>
                </div>
              ))}
            </div>
            <Button onClick={() => navigate('/dashboard')} className="mt-7 h-11 rounded-2xl px-6">
              Explore your dashboard
            </Button>
          </div>
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
