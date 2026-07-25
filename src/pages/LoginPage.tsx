/**
 * LoginPage — therapist sign-in. Layout/copy match designs/Iragu+ Login.dc.html
 * (radial forest gradient, email/phone pill toggle, rotating quote, HIPAA/SOC 2/
 * DPDP badges). Only the email flow is wired to real Cognito SRP auth for now —
 * phone/OTP and Google/Apple are visual per the prototype (not implemented
 * upstream in Cognito yet).
 */
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { login, completeMfaLogin, MfaRequiredError } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import iraguPlusMark from '../assets/brand/iragu-plus-mark.svg';

const QUOTE = '"Between stimulus and response there is a space. In that space is our power to choose our response."';

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

const REASON_MESSAGES: Record<string, string> = {
  'session-expired': 'Your session expired. Please sign in again.',
  timeout: 'You were signed out after a period of inactivity.',
  'wrong-app': "That account is a client login — Iragu+ is for therapists and practice staff. Use Iragu's client app instead.",
};

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setUser = useAuthStore((s) => s._setUser);
  const [mode, setMode] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mfaChallenge, setMfaChallenge] = useState<MfaRequiredError['challenge'] | null>(null);
  const [mfaCode, setMfaCode] = useState('');

  useEffect(() => {
    const reason = searchParams.get('reason');
    const message = reason && REASON_MESSAGES[reason];
    if (message) toast.info(message);
    // Only fire once per page load, not on every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const user = await login(email, password);
      setUser(user);
      toast.success(`Welcome back, ${user.name}`);
      navigate('/dashboard');
    } catch (err) {
      if (err instanceof MfaRequiredError) {
        setMfaChallenge(err.challenge);
      } else {
        toast.error(err instanceof Error ? err.message : 'Invalid credentials');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!mfaChallenge) return;
    setIsLoading(true);
    try {
      const user = await completeMfaLogin(mfaChallenge, mfaCode.trim());
      setUser(user);
      toast.success(`Welcome back, ${user.name}`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid authentication code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden p-8"
      style={{
        background:
          'radial-gradient(circle at 50% 40%, rgba(122,158,136,.12), transparent 60%), var(--canvas)',
      }}
    >
      <div
        className="pointer-events-none absolute h-[280px] w-[280px] rounded-full opacity-40"
        style={{ top: '10%', left: '12%', background: 'radial-gradient(circle, rgba(122,158,136,.35), transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute h-[220px] w-[220px] rounded-full opacity-40"
        style={{ bottom: '14%', right: '14%', background: 'radial-gradient(circle, rgba(30,112,72,.25), transparent 70%)' }}
      />

      <div className="relative w-full max-w-[420px] text-center">
        <img src={iraguPlusMark} alt="Iragu+" title="Iragu+ by Bedrock Health Solutions" className="mx-auto mb-4 h-14 w-14" />

        <h1 className="text-[28px] font-medium tracking-tight text-ink">
          {mfaChallenge ? 'Verify it’s you' : 'Welcome back'}
        </h1>
        <p className="mx-auto mt-5 mb-8 max-w-[320px] text-sm italic leading-relaxed text-muted-text">
          {mfaChallenge ? 'Enter the 6-digit code from your authenticator app.' : QUOTE}
        </p>

        {mfaChallenge ? (
          <form onSubmit={handleMfaSubmit} className="flex flex-col gap-3 text-left">
            <Input
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              placeholder="000000"
              maxLength={6}
              autoFocus
              className="text-center text-lg tracking-[0.3em]"
            />
            <Button type="submit" disabled={isLoading || mfaCode.length !== 6} className="h-12 rounded-2xl">
              {isLoading ? 'Verifying…' : 'Verify'}
            </Button>
          </form>
        ) : (
          <>
            <div className="mb-5 flex gap-1.5 rounded-[10px] bg-surface-warm p-1">
              <button
                type="button"
                onClick={() => setMode('email')}
                className="h-9 flex-1 rounded-lg text-[13px] font-semibold transition-colors"
                style={
                  mode === 'email'
                    ? { background: 'var(--surface)', color: 'var(--action-dark)', boxShadow: '0 1px 3px rgba(15,23,42,.08)' }
                    : { background: 'transparent', color: 'var(--body-text)' }
                }
              >
                Email
              </button>
              <button
                type="button"
                onClick={() => setMode('phone')}
                className="h-9 flex-1 rounded-lg text-[13px] font-medium transition-colors"
                style={
                  mode === 'phone'
                    ? { background: 'var(--surface)', color: 'var(--action-dark)', boxShadow: '0 1px 3px rgba(15,23,42,.08)' }
                    : { background: 'transparent', color: 'var(--body-text)' }
                }
              >
                Phone / OTP
              </button>
            </div>

            {mode === 'email' ? (
              <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3 text-left">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-text">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@clinic.in"
                    required
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-text">
                    Password
                  </label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    autoComplete="current-password"
                  />
                </div>
                <button
                  type="button"
                  className="-mt-1 self-end text-xs font-medium text-action-dark hover:underline"
                >
                  Forgot password?
                </button>
                <Button type="submit" disabled={isLoading} className="mt-2 h-12 rounded-2xl text-[15px] font-semibold">
                  {isLoading ? 'Signing in…' : 'Sign in to your practice'}
                </Button>
              </form>
            ) : (
              <div className="flex flex-col gap-3 text-left">
                <Input placeholder="+91 98765 43210" />
                <div className="flex gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <input
                      key={i}
                      maxLength={1}
                      className="h-[52px] min-w-0 flex-1 rounded-[10px] border border-rule bg-surface text-center text-lg outline-none focus:border-action"
                    />
                  ))}
                </div>
                <button type="button" className="self-start text-[13px] font-medium text-action-dark">
                  Send OTP
                </button>
              </div>
            )}

            <div className="mt-4 flex flex-col gap-2.5">
              {mode === 'email' ? null : (
                <Button className="h-12 rounded-2xl text-[15px] font-semibold" onClick={() => toast.info('Enter the OTP to continue')}>
                  Sign in to your practice
                </Button>
              )}
              <a href="/login" className="text-center text-xs font-medium text-muted-text hover:text-action-dark">
                Are you a client? Sign in here
              </a>
            </div>

            <div className="relative my-6 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-text">
              <span className="relative z-10 bg-transparent px-3">or continue with</span>
              <div className="absolute left-0 top-1/2 h-px w-[calc(50%-80px)] bg-rule" />
              <div className="absolute right-0 top-1/2 h-px w-[calc(50%-80px)] bg-rule" />
            </div>

            <div className="flex gap-2.5">
              <Button
                variant="outline"
                className="h-10 flex-1 gap-2 text-sm"
                onClick={() => toast.info('Google sign-in coming soon')}
              >
                <GoogleIcon />
                Google
              </Button>
              <Button
                variant="outline"
                className="h-10 flex-1 gap-2 text-sm"
                onClick={() => toast.info('Apple sign-in coming soon')}
              >
                <AppleIcon />
                Apple
              </Button>
            </div>

            <div className="mt-8 flex items-center justify-center gap-2.5 text-xs text-muted-text">
              {['HIPAA', 'SOC 2', 'DPDP Act'].map((badge) => (
                <span key={badge} className="rounded-full bg-surface-warm px-2.5 py-1 text-[11px] font-medium text-body-text">
                  {badge}
                </span>
              ))}
            </div>

            <div className="mt-5 text-xs text-muted-text">
              New to Iragu+?{' '}
              <a href="/signup" className="font-medium text-action-dark hover:underline">
                Register your practice for free
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
