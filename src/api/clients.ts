/**
 * api/clients.ts — backend-initial's client-roster endpoints.
 *
 *   therapist role → GET /therapist/me/clients → { assignedClients, appointmentClients }
 *                    (small caseload, no sort/pagination)
 *   admin role     → GET /clients?page=&limit=&sortBy=&sortOrder=&isActive=&assignedTherapistId=
 *                    → { success, data, pagination } (full platform list)
 *
 * Both routes return the same underlying User+ClientProfile row shape.
 */
import { z } from 'zod';
import { apiFetch } from './client';

const clientProfileSchema = z
  .object({
    safetyRiskLevel: z.string().nullable().optional(),
    assignedTherapist: z
      .object({ user: z.object({ id: z.number(), firstName: z.string(), lastName: z.string() }) })
      .nullable()
      .optional(),
  })
  .nullable()
  .optional();

const backendClientSchema = z.object({
  id: z.number(),
  email: z.string(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  createdAt: z.string().optional(),
  clientProfile: clientProfileSchema,
});

export type BackendClient = z.infer<typeof backendClientSchema>;

const therapistMeClientsSchema = z.object({
  assignedClients: z.array(backendClientSchema),
  appointmentClients: z.array(backendClientSchema),
});

const adminClientsEnvelopeSchema = z.object({
  success: z.boolean(),
  data: z.array(backendClientSchema),
  pagination: z.object({ total: z.number(), totalPages: z.number(), page: z.number().optional() }),
});

export function getMyClients() {
  return apiFetch('/therapist/me/clients', { schema: therapistMeClientsSchema });
}

export interface AdminClientsQuery {
  page: number;
  limit: number;
  sortBy: 'lastName' | 'isActive' | 'createdAt';
  sortOrder: 'asc' | 'desc';
  isActive?: 'true' | 'false';
  assignedTherapistId?: string;
}

export function getAdminClients(q: AdminClientsQuery) {
  const params = new URLSearchParams({
    page: String(q.page),
    limit: String(q.limit),
    sortBy: q.sortBy,
    sortOrder: q.sortOrder,
  });
  if (q.isActive) params.set('isActive', q.isActive);
  if (q.assignedTherapistId) params.set('assignedTherapistId', q.assignedTherapistId);
  return apiFetch(`/clients?${params.toString()}`, { schema: adminClientsEnvelopeSchema, rawEnvelope: true });
}
