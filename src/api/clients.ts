/**
 * api/clients.ts — backend-initial's client-roster endpoints.
 *
 *   therapist role → GET /therapist/me/clients?page=&limit=&isActive=
 *                    → { success, data, pagination } (own caseload + appointment history)
 *   admin role     → GET /clients?page=&limit=&sortBy=&sortOrder=&isActive=&assignedTherapistId=
 *                    → { success, data, pagination } (full platform list)
 *
 * Both routes return the same envelope and the same underlying User+ClientProfile row shape.
 */
import { z } from 'zod';
import { apiFetch } from './client';

const clientProfileSchema = z
  .object({
    safetyRiskLevel: z.string().nullable().optional(),
    assignedTherapist: z
      .object({ 
        user: z.object({ 
          id: z.number(), 
          firstName: z.string().nullable(), 
          lastName: z.string().nullable() 
        }) 
      })
      .nullable()
      .optional(),
  })
  .nullable()
  .optional();

const appointmentStatusSchema = z.object({
  startTime: z.string(),
  status: z.string(),
});

const backendClientSchema = z.object({
  id: z.number(),
  email: z.string(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  createdAt: z.string().optional(),
  clientProfile: clientProfileSchema,
  appointmentsAsClient: z.array(appointmentStatusSchema).optional(),
});

export type BackendClient = z.infer<typeof backendClientSchema>;

const clientsEnvelopeSchema = z.object({
  success: z.boolean(),
  data: z.array(backendClientSchema),
  pagination: z.object({ total: z.number(), totalPages: z.number(), page: z.number().optional() }),
});

export interface AdminClientsQuery {
  page: number;
  limit: number;
  sortBy?: 'lastName' | 'isActive' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  isActive?: 'true' | 'false';
  assignedTherapistId?: string;
}

export interface MyClientsQuery {
  page?: number;
  limit?: number;
  isActive?: 'true' | 'false';
}

export function getMyClients(q: MyClientsQuery = {}) {
  const params = new URLSearchParams({
    page: String(q.page ?? 1),
    limit: String(q.limit ?? 50),
  });
  if (q.isActive) params.set('isActive', q.isActive);
  return apiFetch(`/therapist/me/clients?${params.toString()}`, { schema: clientsEnvelopeSchema, rawEnvelope: true });
}

export function getAdminClients(q: AdminClientsQuery) {
  const params = new URLSearchParams({
    page: String(q.page),
    limit: String(q.limit),
    sortBy: q.sortBy ?? 'createdAt',
    sortOrder: q.sortOrder ?? 'desc',
  });
  if (q.isActive) params.set('isActive', q.isActive);
  if (q.assignedTherapistId) params.set('assignedTherapistId', q.assignedTherapistId);
  return apiFetch(`/clients?${params.toString()}`, { schema: clientsEnvelopeSchema, rawEnvelope: true });
}
