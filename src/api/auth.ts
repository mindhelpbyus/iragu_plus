/**
 * api/auth.ts — Auth API (AWS Cognito, direct SDK)
 *
 * ✅ Identity is AWS Cognito. The browser authenticates directly against the shared
 *    user pool via SRP (see lib/cognito.ts) — there is NO backend `/auth/*` route.
 * ✅ The resulting access token is sent as `Authorization: Bearer` on every API call
 *    (see api/client.ts); the API Gateway validates it.
 * ✅ No Firebase, no HTTP-only cookies, no mock/local-DB path.
 */

import {
  cognitoSignIn,
  cognitoSignOut,
  getCurrentSession,
  respondToTotpChallenge,
  startTotpSetup,
  verifyAndEnableTotp,
  disableTotp,
  getMfaEnabled,
  changePassword,
  userPool,
  newCognitoUser,
  type SignInResult,
} from '../lib/cognito';
import {
  CognitoUserAttribute,
} from 'amazon-cognito-identity-js';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Canonical user shape used across the app */
export interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  first_name?: string;
  last_name?: string;
  role: CanonicalRole;
  avatar?: string;
  account_status?: string;
  is_verified?: boolean;
  mfaEnabled?: boolean;
  additional_roles?: string[];
  permissions?: string[];
  organizationId?: string;
  onboardingStatus?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role?: string;
}

// ─── Role normalization ──────────────────────────────────────────────────────────

/**
 * Canonical roles the app understands. Authority comes from Cognito **groups**
 * (`cognito:groups`); this only canonicalizes the group name so the rest of
 * the app checks ONE value. Unknown values fall back to the least-privileged
 * role.
 *
 * `iragu_plus_saas` has NO platform-wide caller concept at all — every user
 * belongs to exactly one organization, or none (a solo/independent
 * practitioner). `org_owner` and `admin` come from the dedicated `OrgOwner`
 * and `PracticeAdmin` Cognito groups (backend-initial/infrastructure/lib/
 * auth-stack.ts) — NOT from the platform-operator `SuperAdmin`/`Admin`
 * groups, which remain in backend-initial for a separate, future
 * Bedrock-internal tool this app never reaches into. See
 * docs/specs/org-roles-and-calendar/requirements.md Requirement 0.
 *
 * Fine-grained permissions and display labels are DB data — see
 * `pages/calendar/useOrgContext.ts`'s `GET /me/org-context` — not hardcoded
 * here or in lib/roles.ts.
 */
export type CanonicalRole = 'org_owner' | 'admin' | 'therapist' | 'client';

/**
 * Cognito User Pool group names → canonical app role. Only the groups this
 * app actually recognizes appear here — `SuperAdmin`, `Admin`, `superadmin`,
 * `super_admin`, `platform_admin`, and `account_owner` are deliberately
 * ABSENT (Requirement 0.3): a token carrying only those platform-operator
 * groups has no alias match here and falls through to the least-privileged
 * `client` default (Requirement 0.4), exactly like any other unrecognized
 * group.
 */
const ROLE_ALIASES: Record<string, CanonicalRole> = {
  // AWS Cognito groups (lowercased)
  orgowner: 'org_owner',
  practiceadmin: 'admin',
  therapist: 'therapist',
  client: 'client',
  // `PendingTherapists` (a therapist awaiting admin approval) maps to the
  // same 'therapist' role as `Therapists` on the backend — see
  // backend-initial's caller-identity.ts GROUP_TO_ROLE and
  // cognito-post-confirmation's GROUP_TO_DB_ROLE, both of which treat the two
  // groups identically. The trailing-`s`-strip below turns this key into
  // `pendingtherapist`, which would otherwise fall through to the 'client'
  // default and wrongly lock a pending therapist out of this app.
  pendingtherapist: 'therapist',
  // tolerant variants
  org_owner: 'org_owner',
  practice_admin: 'admin',
  provider: 'therapist',
  counsellor: 'therapist',
  counselor: 'therapist',
  patient: 'client',
};

/** Privilege order, highest first — used to resolve users in multiple groups. */
const ROLE_PRECEDENCE: CanonicalRole[] = ['org_owner', 'admin', 'therapist', 'client'];

/** Map a single Cognito group name to a canonical role. Tolerant of case,
 *  whitespace, hyphen/underscore, and trailing plural (e.g. `Therapists`). */
export function normalizeRole(raw: unknown): CanonicalRole {
  if (typeof raw !== 'string') return 'client';
  const key = raw.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return (
    ROLE_ALIASES[key] ??
    ROLE_ALIASES[key.replace(/s$/, '')] ?? // Clients -> client, Therapists -> therapist
    'client'
  );
}

/** Resolve the effective role from `cognito:groups` (an array, since a user may
 *  belong to several groups). Picks the highest-privilege matching group. */
export function roleFromGroups(groups: unknown): CanonicalRole {
  const list = Array.isArray(groups) ? groups : groups != null ? [groups] : [];
  const roles = list.map(normalizeRole);
  return ROLE_PRECEDENCE.find((r) => roles.includes(r)) ?? 'client';
}

// ─── Claim mapping ──────────────────────────────────────────────────────────────

/**
 * Build an AuthUser from decoded Cognito id-token claims. Async: when the
 * token carries no cognito:groups (roleFromGroups falls through to the
 * least-privileged 'client'), this checks GET /therapists/me before
 * accepting that default — a real account (Google-OAuth-linked, no group
 * assigned) was found in production DB as role:'therapist' with real
 * appointments, but its Cognito identity had zero groups, so the
 * groups-only check alone locked a genuine therapist out of their own
 * calendar. Group membership stays authoritative for anyone who has it
 * (Admin/SuperAdmin trust is unaffected); this only fills the gap when
 * Cognito says nothing at all.
 */
async function userFromClaims(claims: Record<string, any>): Promise<AuthUser> {
  const first = claims.given_name ?? claims['custom:firstName'] ?? '';
  const last = claims.family_name ?? claims['custom:lastName'] ?? '';
  const name = `${first} ${last}`.trim() || claims.email || claims['cognito:username'] || 'User';

  let role = roleFromGroups(claims['cognito:groups']);
  const hasNoGroups = !Array.isArray(claims['cognito:groups']) || claims['cognito:groups'].length === 0;
  if (role === 'client' && hasNoGroups) {
    role = await roleFromTherapistLookupFallback();
  }

  return {
    id: claims.sub,
    email: claims.email ?? null,
    phone: claims.phone_number ?? null,
    name,
    first_name: first || undefined,
    last_name: last || undefined,
    role,
    is_verified: claims.email_verified === true || claims.email_verified === 'true',
    organizationId: claims['custom:organizationId'] ?? undefined,
  };
}

/** GET /therapists/me — 200 means the DB genuinely has this caller as a therapist; any failure keeps the 'client' default. */
async function roleFromTherapistLookupFallback(): Promise<CanonicalRole> {
  try {
    const { getMyTherapistId } = await import('./therapistMe');
    await getMyTherapistId();
    return 'therapist';
  } catch {
    return 'client';
  }
}

// ─── Auth Operations (Cognito) ───────────────────────────────────────────────────

/** Thrown by `login` when the account has TOTP MFA enabled. The UI should collect a
 *  code and call `completeMfaLogin(challenge, code)`. */
export class MfaRequiredError extends Error {
  challenge: Extract<SignInResult, { status: 'TOTP_REQUIRED' }>;
  constructor(challenge: Extract<SignInResult, { status: 'TOTP_REQUIRED' }>) {
    super('MFA_REQUIRED');
    this.name = 'MfaRequiredError';
    this.challenge = challenge;
  }
}

/** Email + password login via Cognito SRP. Throws MfaRequiredError if TOTP is on. */
export async function login(email: string, password: string): Promise<AuthUser> {
  const result = await cognitoSignIn(email, password);
  if (result.status === 'TOTP_REQUIRED') {
    throw new MfaRequiredError(result);
  }
  return userFromClaims(result.tokens.claims);
}

/** Complete an MFA-gated login with the user's TOTP code. */
export async function completeMfaLogin(
  challenge: MfaRequiredError['challenge'],
  code: string
): Promise<AuthUser> {
  const tokens = await respondToTotpChallenge(challenge.user, code);
  return userFromClaims(tokens.claims);
}

/** Alias for login — used by useProviderAgnosticAuth and similar hooks */
export const signInWithEmailAndPassword = login;

// ─── MFA management (Cognito software TOTP) ───────────────────────────────────────

/** Begin TOTP enrollment — returns the secret (render as QR + manual key). */
export async function setupMFA(): Promise<{ secret: string; otpauthIssuer: string }> {
  const secret = await startTotpSetup();
  return { secret, otpauthIssuer: 'Ataraxia' };
}

/** Verify the first TOTP code and enable MFA. */
export async function verifyMFA(code: string): Promise<{ verified: boolean }> {
  await verifyAndEnableTotp(code);
  return { verified: true };
}

/** Disable TOTP MFA. */
export async function disableMFA(): Promise<void> {
  return disableTotp();
}

/** Current MFA status for the signed-in user. */
export async function getMFAStatus(): Promise<{ enabled: boolean; type: string | null }> {
  const enabled = await getMfaEnabled();
  return { enabled, type: enabled ? 'TOTP' : null };
}

/** Change password (old + new). */
export async function changeUserPassword(oldPassword: string, newPassword: string): Promise<void> {
  return changePassword(oldPassword, newPassword);
}

/** Register a new user in Cognito. Requires email confirmation per pool policy. */
export async function register(data: RegisterRequest): Promise<AuthUser> {
  const attributes: CognitoUserAttribute[] = [
    new CognitoUserAttribute({ Name: 'email', Value: data.email }),
    new CognitoUserAttribute({ Name: 'given_name', Value: data.firstName }),
    new CognitoUserAttribute({ Name: 'family_name', Value: data.lastName }),
  ];
  if (data.phoneNumber) {
    attributes.push(new CognitoUserAttribute({ Name: 'phone_number', Value: data.phoneNumber }));
  }
  // NOTE: role is NOT a Cognito attribute. Authority lives in Cognito **groups**
  // (Admin / Clients / SuperAdmin / Therapists). A browser client cannot add
  // itself to a group, so group assignment happens server-side — a Cognito
  // post-confirmation Lambda (or admin) puts the user in the right group based
  // on `data.role`. The `role` returned below is only an optimistic UI hint
  // until the next sign-in mints a token carrying `cognito:groups`.

  return new Promise((resolve, reject) => {
    userPool.signUp(data.email, data.password, attributes, [], (err, result) => {
      if (err || !result) {
        reject(err ?? new Error('Sign up failed'));
        return;
      }
      resolve({
        id: result.userSub,
        email: data.email,
        phone: data.phoneNumber ?? null,
        name: `${data.firstName} ${data.lastName}`.trim(),
        first_name: data.firstName,
        last_name: data.lastName,
        role: normalizeRole(data.role), // optimistic UI hint; real role comes from groups on next sign-in
        is_verified: false,
        account_status: 'pending_confirmation',
      });
    });
  });
}

/** Confirm a new account with the code Cognito emailed. */
export async function verifyEmail(email: string, code: string): Promise<void> {
  const user = newCognitoUser(email);
  return new Promise((resolve, reject) => {
    user.confirmRegistration(code, true, (err) => (err ? reject(err) : resolve()));
  });
}

/** Sign out of Cognito (clears local tokens). */
export async function logout(): Promise<void> {
  cognitoSignOut();
}

/** Current authenticated user from the active Cognito session, or throws if none. */
export async function getCurrentUser(): Promise<AuthUser> {
  const tokens = await getCurrentSession();
  if (!tokens) throw new Error('Not authenticated');
  return userFromClaims(tokens.claims);
}

// ─── Password reset (Cognito) ────────────────────────────────────────────────────

/** Trigger a Cognito password-reset code email. */
export async function forgotPassword(email: string): Promise<void> {
  const user = newCognitoUser(email);
  return new Promise((resolve, reject) => {
    user.forgotPassword({ onSuccess: () => resolve(), onFailure: (err) => reject(err) });
  });
}

/** Complete a password reset with the emailed code. */
export async function resetPassword(
  email: string,
  code: string,
  newPassword: string
): Promise<void> {
  const user = newCognitoUser(email);
  return new Promise((resolve, reject) => {
    user.confirmPassword(code, newPassword, {
      onSuccess: () => resolve(),
      onFailure: (err) => reject(err),
    });
  });
}

// ─── Legacy service export (used by LoginPage.tsx as RealAuthService) ─────────────

export const RealAuthService = {
  login,
  completeMfaLogin,
  logout,
  register,
  getCurrentUser,
  verifyEmail,
  forgotPassword,
  resetPassword,
  setupMFA,
  verifyMFA,
  disableMFA,
  getMFAStatus,
  changeUserPassword,
};
