/**
 * api/notifications.ts — backend-initial's real per-user notification inbox
 * (src/lambdas/notifications-inbox/index.js), the header bell's backend.
 * Distinct from the existing `notifications` Lambda, which is admin-only.
 * Identity is always the caller's own JWT sub, server-derived — no id param.
 */
import { z } from 'zod';
import { apiFetch } from './client';

const notificationSchema = z.object({
  id: z.string(),
  type: z.string(),
  who: z.string(),
  what: z.string(),
  link: z.string().nullable(),
  read: z.boolean(),
  createdAt: z.number(),
});
export type Notification = z.infer<typeof notificationSchema>;

export async function listNotifications(
  opts: { limit?: number; cursor?: string } = {}
): Promise<{ items: Notification[]; unreadCount: number; nextCursor?: string }> {
  const params = new URLSearchParams();
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.cursor) params.set('cursor', opts.cursor);
  const qs = params.toString();
  return apiFetch(`/notification-inbox${qs ? `?${qs}` : ''}`, {
    schema: z.object({
      items: z.array(notificationSchema),
      count: z.number(),
      unreadCount: z.number(),
      nextCursor: z.string().optional(),
    }),
  });
}

export function markNotificationRead(id: string): Promise<Notification> {
  return apiFetch(`/notification-inbox/${encodeURIComponent(id)}/read`, {
    method: 'PATCH',
    schema: notificationSchema,
  });
}

export async function markAllNotificationsRead(): Promise<number> {
  const res = await apiFetch('/notification-inbox/read-all', {
    method: 'POST',
    schema: z.object({ updated: z.number() }),
  });
  return res.updated;
}
