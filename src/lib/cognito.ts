/**
 * lib/cognito.ts — Direct AWS Cognito SDK integration (browser SRP)
 *
 * Ataraxia authenticates the user directly against the shared Cognito User Pool
 * (same pool/region as backend-initial). There is NO backend `/auth/login` route —
 * the API Gateway only *validates* the resulting JWT. The access token is then sent
 * as `Authorization: Bearer <token>` on every API request (see api/client.ts).
 *
 * Config comes from VITE_COGNITO_* env (sourced from backend-initial /shared/cognito/*).
 * The app client is a PUBLIC client (no secret) with ALLOW_USER_SRP_AUTH.
 */

import {
  CognitoUserPool,
  CognitoUser,
  CognitoUserAttribute,
  AuthenticationDetails,
  CognitoUserSession,
  type ICognitoUserPoolData,
} from 'amazon-cognito-identity-js';

// Re-export so callers can `import { CognitoUser } from '../lib/cognito'` when needed.
export { CognitoUser };

const UserPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID as string;
const ClientId = import.meta.env.VITE_COGNITO_CLIENT_ID as string;
const Region = (import.meta.env.VITE_AWS_REGION as string) || 'ap-south-1';
// Hosted UI (for federated Google sign-in). Domain prefix from the pool, e.g. "iraguplus-dev".
const HostedUiDomainPrefix = import.meta.env.VITE_COGNITO_HOSTED_UI_DOMAIN as string;
// Redirect target registered as a callback URL on the app client.
const OAuthRedirectUri =
  (import.meta.env.VITE_COGNITO_REDIRECT_URI as string) || `${window.location.origin}/callback`;

if (!UserPoolId || !ClientId) {
  // Surface misconfiguration early rather than failing deep in an SRP exchange.
  console.error('Cognito not configured: set VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_CLIENT_ID');
}

// SECURITY: store Cognito tokens in sessionStorage, not the SDK's default localStorage.
// sessionStorage is cleared when the tab closes → no cross-session token persistence and a
// smaller theft window if an XSS slips past the CSP. (The real XSS defense is the hardened
// CSP + DOMPurify; this reduces blast radius. A future httpOnly-cookie token broker would
// remove JS access entirely but needs backend support.) Falls back to localStorage only if
// sessionStorage is unavailable (e.g. some privacy modes).
function pickTokenStorage(): Storage | undefined {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const k = '__cognito_probe__';
      window.sessionStorage.setItem(k, '1');
      window.sessionStorage.removeItem(k);
      return window.sessionStorage;
    }
  } catch { /* sessionStorage blocked */ }
  return undefined; // SDK default (localStorage)
}

// Captured once so every CognitoUser we construct explicitly shares it — see
// newCognitoUser() below for why this can't just be read off `userPool`.
const tokenStorage = pickTokenStorage();
const poolData: ICognitoUserPoolData = { UserPoolId, ClientId, Storage: tokenStorage };
export const userPool = new CognitoUserPool(poolData);

/**
 * Construct a CognitoUser bound to the same storage as `userPool`.
 *
 * The SDK's CognitoUser constructor reads `data.Storage` directly — it does
 * NOT inherit `Pool.storage` even when `Pool` is given (and the SDK's public
 * types don't expose `.storage` on CognitoUserPool at all, even though it
 * exists at runtime). Every hand-rolled `new CognitoUser({ Username, Pool:
 * userPool })` in this file (sign-in, confirm, phone flows) was silently
 * falling back to the SDK's own default (localStorage) while
 * `userPool.getCurrentUser()` correctly reads from sessionStorage — so a
 * fresh login wrote tokens to localStorage, and the very next
 * `getCurrentSession()` call found nothing there and returned null, sending
 * every post-login API request with no Authorization header at all (401,
 * immediate logout). Always go through this helper instead of calling
 * `new CognitoUser(...)` directly.
 */
export function newCognitoUser(username: string): CognitoUser {
  return new CognitoUser({ Username: username, Pool: userPool, Storage: tokenStorage });
}

/** Base URL of the Cognito Hosted UI for this pool/region. */
export function hostedUiBase(): string {
  return `https://${HostedUiDomainPrefix}.auth.${Region}.amazoncognito.com`;
}

export interface CognitoTokens {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  /** Decoded claims from the id token (email, cognito:groups, etc.) */
  claims: Record<string, any>;
}

function toTokens(session: CognitoUserSession): CognitoTokens {
  return {
    idToken: session.getIdToken().getJwtToken(),
    accessToken: session.getAccessToken().getJwtToken(),
    refreshToken: session.getRefreshToken().getToken(),
    claims: session.getIdToken().decodePayload(),
  };
}

/**
 * Result of an SRP sign-in attempt. Either fully signed in (tokens), or a TOTP
 * MFA challenge that the UI must answer via `respondToTotpChallenge`.
 */
export type SignInResult =
  | { status: 'SUCCESS'; tokens: CognitoTokens }
  | { status: 'TOTP_REQUIRED'; user: CognitoUser };

/** SRP email+password sign-in. Surfaces a TOTP challenge when MFA is enabled. */
export function cognitoSignIn(email: string, password: string): Promise<SignInResult> {
  const user = newCognitoUser(email);
  const details = new AuthenticationDetails({ Username: email, Password: password });

  return new Promise((resolve, reject) => {
    user.authenticateUser(details, {
      onSuccess: (session) => resolve({ status: 'SUCCESS', tokens: toTokens(session) }),
      onFailure: (err) => reject(err),
      totpRequired: () => resolve({ status: 'TOTP_REQUIRED', user }),
      newPasswordRequired: () =>
        reject(new Error('A password reset is required before you can sign in.')),
    });
  });
}

/** Answer a software-TOTP MFA challenge raised during sign-in. */
export function respondToTotpChallenge(user: CognitoUser, code: string): Promise<CognitoTokens> {
  return new Promise((resolve, reject) => {
    user.sendMFACode(
      code,
      {
        onSuccess: (session) => resolve(toTokens(session)),
        onFailure: (err) => reject(err),
      },
      'SOFTWARE_TOKEN_MFA'
    );
  });
}

/** The current signed-in CognitoUser with an active session attached (or null). */
export function getCurrentCognitoUser(): Promise<CognitoUser | null> {
  const user = userPool.getCurrentUser();
  if (!user) return Promise.resolve(null);
  return new Promise((resolve) => {
    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      resolve(err || !session?.isValid() ? null : user);
    });
  });
}

// ─── MFA (software TOTP) ──────────────────────────────────────────────────────

/** Begin TOTP enrollment: returns the secret to render as a QR / manual key. */
export async function startTotpSetup(): Promise<string> {
  const user = await getCurrentCognitoUser();
  if (!user) throw new Error('Not authenticated');
  return new Promise((resolve, reject) => {
    user.associateSoftwareToken({
      associateSecretCode: (secret) => resolve(secret),
      onFailure: (err) => reject(err),
    });
  });
}

/** Verify the first TOTP code, then enable TOTP as the preferred MFA method. */
export async function verifyAndEnableTotp(code: string, deviceName = 'Authenticator'): Promise<void> {
  const user = await getCurrentCognitoUser();
  if (!user) throw new Error('Not authenticated');
  await new Promise<void>((resolve, reject) => {
    user.verifySoftwareToken(code, deviceName, {
      onSuccess: () => resolve(),
      onFailure: (err) => reject(err),
    });
  });
  await new Promise<void>((resolve, reject) => {
    user.setUserMfaPreference(null, { PreferredMfa: true, Enabled: true }, (err) =>
      err ? reject(err) : resolve()
    );
  });
}

/** Disable TOTP MFA for the current user. */
export async function disableTotp(): Promise<void> {
  const user = await getCurrentCognitoUser();
  if (!user) throw new Error('Not authenticated');
  return new Promise((resolve, reject) => {
    user.setUserMfaPreference(null, { PreferredMfa: false, Enabled: false }, (err) =>
      err ? reject(err) : resolve()
    );
  });
}

/** Whether the current user has any MFA setting enabled. */
export async function getMfaEnabled(): Promise<boolean> {
  const user = await getCurrentCognitoUser();
  if (!user) return false;
  return new Promise((resolve) => {
    user.getUserData((err, data) => {
      if (err || !data) {
        resolve(false);
        return;
      }
      resolve((data.UserMFASettingList?.length ?? 0) > 0);
    });
  });
}

/** Change the current user's password (requires the old password). */
export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  const user = await getCurrentCognitoUser();
  if (!user) throw new Error('Not authenticated');
  return new Promise((resolve, reject) => {
    user.changePassword(oldPassword, newPassword, (err) => (err ? reject(err) : resolve()));
  });
}

/** Returns the current valid session's tokens, refreshing silently if needed. */
export function getCurrentSession(): Promise<CognitoTokens | null> {
  const user = userPool.getCurrentUser();
  if (!user) return Promise.resolve(null);
  return new Promise((resolve) => {
    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session || !session.isValid()) {
        resolve(null);
        return;
      }
      resolve(toTokens(session));
    });
  });
}

/** Best-effort access token for the Authorization header (null if signed out). */
export async function getAccessToken(): Promise<string | null> {
  const tokens = await getCurrentSession();
  return tokens?.accessToken ?? null;
}

/** Sign the user out locally (clears tokens from storage). */
export function cognitoSignOut(): void {
  const user = userPool.getCurrentUser();
  if (user) user.signOut();
}

// ─── Federated Google sign-in (Hosted UI, authorization-code flow) ──────────────

/**
 * Redirect to the Cognito Hosted UI for Google sign-in. Cognito handles the OAuth
 * round-trip and returns to OAuthRedirectUri with `?code=...`, which the /callback
 * route exchanges via `exchangeCodeForTokens`.
 *
 * NOTE: OAuthRedirectUri must be registered as a callback URL on the app client.
 */
export function startGoogleSignIn(): void {
  const params = new URLSearchParams({
    client_id: ClientId,
    response_type: 'code',
    scope: 'email openid profile',
    redirect_uri: OAuthRedirectUri,
    identity_provider: 'Google',
  });
  window.location.href = `${hostedUiBase()}/oauth2/authorize?${params.toString()}`;
}

/** Exchange a Hosted-UI authorization code for Cognito tokens (called on /callback). */
export async function exchangeCodeForTokens(code: string): Promise<CognitoTokens> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: ClientId,
    code,
    redirect_uri: OAuthRedirectUri,
  });
  const res = await fetch(`${hostedUiBase()}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) throw new Error('Failed to exchange authorization code');
  const data = await res.json();
  const decode = (jwt: string) => JSON.parse(atob(jwt.split('.')[1]));
  return {
    idToken: data.id_token,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    claims: decode(data.id_token),
  };
}

// ─── Phone-number sign-in (Cognito SMS) ─────────────────────────────────────────
// NOTE: requires the pool to allow phone_number sign-in + SMS (backend backlog).

/** Start phone sign-up: Cognito sends an SMS verification code. */
export function phoneSignUp(phoneNumber: string, password: string): Promise<string> {
  const attributes = [
    new CognitoUserAttribute({ Name: 'phone_number', Value: phoneNumber }),
  ];
  return new Promise((resolve, reject) => {
    userPool.signUp(phoneNumber, password, attributes, [], (err, result) => {
      if (err || !result) reject(err ?? new Error('Phone sign-up failed'));
      else resolve(result.userSub);
    });
  });
}

/** Confirm phone sign-up with the SMS code. */
export function phoneConfirm(phoneNumber: string, code: string): Promise<void> {
  const user = newCognitoUser(phoneNumber);
  return new Promise((resolve, reject) => {
    user.confirmRegistration(code, true, (err) => (err ? reject(err) : resolve()));
  });
}

/** Sign in with phone number + password (SRP). */
export function phoneSignIn(phoneNumber: string, password: string): Promise<CognitoTokens> {
  const user = newCognitoUser(phoneNumber);
  const details = new AuthenticationDetails({ Username: phoneNumber, Password: password });
  return new Promise((resolve, reject) => {
    user.authenticateUser(details, {
      onSuccess: (session) => resolve(toTokens(session)),
      onFailure: (err) => reject(err),
    });
  });
}

/**
 * Global sign-out: revokes all refresh tokens for this user across every device.
 * Cognito has no "list active sessions" API, so this (revoke-all) is the closest
 * equivalent to "log out of all other devices".
 */
export async function cognitoGlobalSignOut(): Promise<void> {
  const user = await getCurrentCognitoUser();
  if (!user) return;
  return new Promise((resolve, reject) => {
    user.globalSignOut({ onSuccess: () => resolve(), onFailure: (err) => reject(err) });
  });
}
