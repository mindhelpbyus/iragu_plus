/**
 * api/client.ts — Ataraxia HTTP API Client
 *
 * ✅ SECURITY ARCHITECTURE:
 * - Auth is AWS Cognito. The access token is attached as `Authorization: Bearer`
 *   on every request (token comes from the Cognito SDK session — see lib/cognito.ts).
 * - The shared API Gateway validates the JWT (HttpJwtAuthorizer, default-deny).
 * - Zero console.log of response data (PHI-safe).
 * - X-Request-ID on every request for backend trace correlation.
 * - 401 → clear session + redirect to /login (token expired / invalid).
 */

import { z } from 'zod';
import { logger } from '../utils/secureLogger';
import { getAccessToken as getCognitoAccessToken } from '../lib/cognito';

/** Shared HTTP API Gateway — backend-initial (no /api prefix) + billing_payment (/api/*). */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
/** Separate video-service backend (LiveKit rooms/tokens/transcripts). */
export const VIDEO_API_BASE_URL = import.meta.env.VITE_VIDEO_API_BASE_URL || '';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
}

export class ApiException extends Error {
  code?: string;
  status?: number;
  details?: unknown;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiException';
    this.code = error.code;
    this.status = error.status;
    this.details = error.details;
  }
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  isFormData?: boolean;
  /** Override the base URL (e.g. video-service). Defaults to the shared gateway. */
  baseUrl?: string;
  /**
   * Skip the automatic `{ data }` envelope unwrap and return the raw parsed
   * body. Some backend routes wrap responses as `{ ok, data }` / `{ ok, error }`
   * (backend-initial admin Lambda) rather than the generic `{ data }` shape —
   * callers that need to inspect `ok`/`error` themselves (apiFetch's schema
   * validation) must see the untouched body. Defaults to false (auto-unwrap).
   */
  rawEnvelope?: boolean;
}

// ─── Core Request ─────────────────────────────────────────────────────────────

export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { method = 'GET', headers = {}, body, isFormData = false, baseUrl = API_BASE_URL, rawEnvelope = false } = options;

  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

  const requestHeaders: Record<string, string> = {
    // ✅ X-Request-ID for backend trace correlation (HIPAA audit)
    'X-Request-ID': crypto.randomUUID(),
    ...headers,
  };

  // ✅ Attach the Cognito access token (the API Gateway validates this JWT).
  // A caller-supplied Authorization header wins — billing_payment requires the
  // ID token (its Lambda reads custom:* claims), which api/billing.ts supplies.
  if (!requestHeaders['Authorization']) {
    const accessToken = await getCognitoAccessToken();
    if (accessToken) {
      requestHeaders['Authorization'] = `Bearer ${accessToken}`;
    }
  }

  if (!isFormData) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  const fetchOptions: RequestInit = {
    method,
    headers: requestHeaders,
  };

  if (body !== undefined) {
    fetchOptions.body = isFormData ? (body as BodyInit) : JSON.stringify(body);
  }


  try {
    logger.debug('API Request', { method, url: endpoint });

    const response = await fetch(url, fetchOptions);

    // ✅ 401 = session expired — wipe state, redirect to login
    if (response.status === 401) {
      logger.info('Session expired — redirecting to login');
      // Give the app a chance to clear Zustand/React Query state via event
      window.dispatchEvent(new CustomEvent('auth:session-expired'));
      window.location.replace('/login?reason=session-expired');
      // Never resolves — browser is navigating away
      return new Promise<T>(() => undefined);
    }

    if (!response.ok) {
      let error: { message?: string; code?: string } = {};
      const text = await response.text().catch(() => '');
      try {
        error = text ? JSON.parse(text) : {};
      } catch {
        error = { message: text || `HTTP ${response.status}` };
      }

      // ✅ Log status only — never log body (could contain PHI)
      logger.error('API error', { status: response.status, code: error.code });

      throw new ApiException({
        message: error.message || `Request failed with status ${response.status}`,
        code: error.code || `HTTP_${response.status}`,
        status: response.status,
        details: error,
      });
    }

    // Parse response body
    const text = await response.text();
    if (!text) return {} as T;

    const parsed = JSON.parse(text) as Record<string, unknown>;

    if (rawEnvelope) return parsed as T;

    // Unwrap standard backend envelope: { success, data, message }
    if (parsed.data !== undefined) {
      return parsed.data as T;
    }

    return parsed as T;
  } catch (err) {
    if (err instanceof ApiException) throw err;

    // Network / parse error — log sanitized message only
    logger.error('Network error', { endpoint, method });
    throw new ApiException({
      message: err instanceof Error ? err.message : 'Network error',
      code: 'NETWORK_ERROR',
    });
  }
}

// ─── Convenience helpers ──────────────────────────────────────────────────────

export function get<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'GET' });
}

export function post<T>(endpoint: string, body?: unknown): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'POST', body });
}

export function put<T>(endpoint: string, body?: unknown): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'PUT', body });
}

export function patch<T>(endpoint: string, body?: unknown): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'PATCH', body });
}

// ─── video-service helpers (separate backend; same Bearer token) ────────────────
export function videoGet<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'GET', baseUrl: VIDEO_API_BASE_URL });
}
export function videoPost<T>(endpoint: string, body?: unknown): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'POST', body, baseUrl: VIDEO_API_BASE_URL });
}

export function del<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'DELETE' });
}

// ─── Zod-validated fetch (apiFetch) ──────────────────────────────────────────
// Adopted from iragu-website's lib/api/shared/fetch.ts pattern: every response
// is validated against a Zod schema at the API boundary, so a shape mismatch
// throws a readable ApiSchemaError in dev instead of silently misbehaving
// downstream (this is what would have caught the ProfessionalClientsView
// envelope bug immediately instead of it shipping as an empty list for weeks).
// Built on top of apiRequest — same transport, auth, 401-redirect, and
// envelope-unwrap behavior; this layer only adds schema validation + distinct
// error types callers can branch on.

/** Session expired or missing — same signal apiRequest's 401 path acts on. */
export class UnauthorizedError extends Error {
  readonly status = 401;
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/** Backend returned a non-2xx with a structured { code, message, fields? } error. */
export class ApiFetchError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>
  ) {
    super(message);
    this.name = 'ApiFetchError';
  }
}

/** Backend returned 2xx but the body didn't match the expected schema. */
export class ApiSchemaError extends Error {
  constructor(
    readonly endpoint: string,
    readonly issues: z.core.$ZodIssue[]
  ) {
    super(`Response from ${endpoint} did not match the expected schema`);
    this.name = 'ApiSchemaError';
  }
}

export type ApiFetchOptions<T> = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Zod schema for the response body (after envelope unwrap). Required. */
  schema: z.ZodType<T>;
  /** Override the base URL — e.g. video-service, or billing.ts's ID-token header. */
  baseUrl?: string;
  headers?: Record<string, string>;
  /** Idempotency key for mutating requests — pass a *stable* key per logical
   *  action (not a fresh UUID per call) so a retry reuses it, not silently
   *  bypasses the dedup it's meant to provide. */
  idempotencyKey?: string;
  /**
   * Validate against the raw, un-unwrapped response body — required for
   * backend-initial's admin Lambda, which wraps every response as
   * `{ ok: true, data }` / `{ ok: false, error }` (a different shape from the
   * generic `{ data }` envelope `apiRequest` auto-unwraps by default). Most
   * routes should leave this false and write `schema` for the inner payload.
   */
  rawEnvelope?: boolean;
};

/**
 * Typed, Zod-validated request. Prefer this over `apiRequest`/`get`/`post` for
 * new call sites — the schema requirement makes API-shape drift a build-time
 * or first-run error instead of a silent runtime one.
 */
export async function apiFetch<T>(endpoint: string, opts: ApiFetchOptions<T>): Promise<T> {
  const headers: Record<string, string> = { ...opts.headers };
  if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;

  let body: unknown;
  try {
    body = await apiRequest<unknown>(endpoint, {
      method: opts.method ?? 'GET',
      body: opts.body,
      baseUrl: opts.baseUrl,
      headers,
      rawEnvelope: opts.rawEnvelope,
    });
  } catch (err) {
    if (err instanceof ApiException) {
      if (err.status === 401) throw new UnauthorizedError();
      throw new ApiFetchError(
        err.status ?? 0,
        err.code ?? 'UNKNOWN_ERROR',
        err.message,
        (err.details as { fields?: Record<string, string> } | undefined)?.fields
      );
    }
    throw err;
  }

  const parsed = opts.schema.safeParse(body);
  if (!parsed.success) {
    logger.error('[apiFetch] schema mismatch', { endpoint, issueCount: parsed.error.issues.length });
    throw new ApiSchemaError(endpoint, parsed.error.issues);
  }
  return parsed.data;
}

// ─── Legacy compatibility shims ─────────────────────────────────────────────────
// Auth is now Cognito (lib/cognito.ts). The frontend does not manually store tokens;
// the SDK manages them. These remain only so older imports keep compiling.

/** @deprecated The Cognito SDK manages tokens. No-op. */
export function setAuthTokens(_access: string, _refresh?: string): void {}

/** @deprecated Use the async Cognito session instead. Returns null synchronously. */
export function getAccessToken(): string | null {
  return null;
}

/** @deprecated The Cognito SDK manages the refresh token. Returns null. */
export function getRefreshToken(): string | null {
  return null;
}

/** @deprecated Use auth.logout() (Cognito sign-out). No-op. */
export function clearAuthTokens(): void {}

/** @deprecated Use the auth store / getCurrentUser(). Intentionally unreliable. */
export function isAuthenticated(): boolean {
  return false;
}