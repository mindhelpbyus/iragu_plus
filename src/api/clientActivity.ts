/**
 * api/clientActivity.ts — GET /clients/activity-events (backend-initial's
 * `clients` Lambda, src/lambdas/clients/src/handler.ts).
 *
 * A therapist-wide, cross-client, timestamped read of mood check-ins, missed
 * mood check-ins, and intake-form completions across the caller's own
 * clients — scoped server-side the same way GET /therapist/me/clients is
 * (clientProfile.assignedTherapistId OR an appointment with this therapist).
 * Backs the Activity page's "Clients" filter; no client-side scoping is
 * needed or possible here, the server never returns another therapist's data.
 */
import { z } from 'zod';
import { apiFetch } from './client';

export const CLIENT_ACTIVITY_EVENT_TYPES = ['mood_checkin', 'mood_missed', 'intake_completed'] as const;
export type ClientActivityEventType = (typeof CLIENT_ACTIVITY_EVENT_TYPES)[number];

const clientActivityEventSchema = z.object({
  type: z.enum(CLIENT_ACTIVITY_EVENT_TYPES),
  clientId: z.number(),
  clientName: z.string(),
  timestamp: z.string(),
  detail: z.string(),
});
export type ClientActivityEvent = z.infer<typeof clientActivityEventSchema>;

/** startDate/endDate are ISO date(-time) strings; both are required server-side. */
export function getClientActivityEvents(startDate: string, endDate: string): Promise<ClientActivityEvent[]> {
  const params = new URLSearchParams({ startDate, endDate });
  return apiFetch(`/clients/activity-events?${params.toString()}`, {
    schema: z.object({ success: z.boolean(), data: z.array(clientActivityEventSchema) }),
    rawEnvelope: true,
  }).then((res) => res.data);
}
