/**
 * api/notificationPreferences.ts — GET/PUT /users/me/notification-preferences.
 *
 * Lives in backend-initial's `clients` Lambda (src/lambdas/clients/src/handler.ts,
 * routes registered ~line 1174/1195) but the route itself is role-agnostic: it
 * resolves the caller via the generic `resolveCaller` and keys the
 * `NotificationPreferences` row by `caller.userId` — there is no
 * `assertRole(caller, 'client')` anywhere in this handler block, so any
 * authenticated user (therapist included) can call it. Confirmed against
 * `infrastructure/lib/api-stack.ts:2185`, which registers the route with the
 * default (any-authenticated-user) Cognito authorizer, no extra scope.
 *
 * The real stored shape is push/sound/vibration only (mobile-notification
 * toggles) — NOT the fine-grained per-category prefs
 * (new-requests/messages/payouts/...) the design mock shows. That richer
 * shape has no backing table or route anywhere in backend-initial (verified:
 * no writer of the `NotificationPreferences` Prisma model besides this route,
 * and its own columns are exactly these three booleans). Settings surfaces
 * the real fields honestly rather than faking the mock's categories.
 */
import { z } from 'zod';
import { apiFetch } from './client';

const notificationPreferencesSchema = z.object({
  pushEnabled: z.boolean(),
  soundEnabled: z.boolean(),
  vibrationEnabled: z.boolean(),
});
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;

export function getNotificationPreferences(): Promise<NotificationPreferences> {
  return apiFetch('/users/me/notification-preferences', {
    schema: z.object({ success: z.boolean(), data: notificationPreferencesSchema }),
    rawEnvelope: true,
  }).then((res) => res.data);
}

export function updateNotificationPreferences(
  patch: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  return apiFetch('/users/me/notification-preferences', {
    method: 'PUT',
    body: patch,
    schema: z.object({ success: z.boolean(), data: notificationPreferencesSchema }),
    rawEnvelope: true,
  }).then((res) => res.data);
}
