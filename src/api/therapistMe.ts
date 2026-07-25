/**
 * api/therapistMe.ts — resolves the caller's own numeric DB id.
 *
 * The frontend only ever has the caller's Cognito sub (a UUID) — never the
 * internal Postgres User.id backend-initial's appointment/availability routes
 * require as a path param. GET /therapists/me resolves it server-side (via
 * JWT sub → cognitoId lookup, falling back to email) — see
 * resolveTherapistId() in src/lambdas/therapists/src/handler.ts. This is the
 * one correct way to get that id; do not guess it or parse it out of the JWT
 * client-side.
 *
 * Note: unlike clients/appointments/clinical-notes, the therapists Lambda
 * responds in snake_case (toSnakeCase(therapist)) — only pulling `id` here so
 * the rest of the app isn't exposed to that inconsistency.
 */
import { z } from 'zod';
import { apiFetch } from './client';

const meEnvelopeSchema = z.object({ success: z.boolean(), data: z.object({ id: z.number() }) });

let cached: Promise<number> | null = null;

/** Cached per session — the caller's numeric id never changes mid-session. */
export function getMyTherapistId(): Promise<number> {
  if (!cached) {
    cached = apiFetch('/therapists/me', { schema: meEnvelopeSchema, rawEnvelope: true })
      .then((res) => res.data.id)
      .catch((err) => {
        cached = null; // allow retry on next call rather than caching a failure
        throw err;
      });
  }
  return cached;
}
