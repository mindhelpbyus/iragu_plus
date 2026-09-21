/**
 * api/homework.ts — POST/GET/PATCH/DELETE /homework (backend-initial's
 * homework Lambda, src/lambdas/homework/src/handler.ts). Same discipline as
 * api/clinicalNotes.ts: creating homework requires a real `appointmentId`
 * tied to the therapist/client pair (assertAppointmentTie — platform rule
 * `clinical_records_require_session`) plus the client's DPDP consent
 * (requireDpdpConsent). This client does not pre-check either — the server
 * is the source of truth, and a request that fails either check 400s/403s
 * rather than being silently blocked here.
 *
 * Status vocabulary is backend-initial's HomeworkLexicon
 * (src/shared/lexicons/homework.ts): assigned | in_progress | completed |
 * overdue, with transitions gated server-side on PATCH /homework/{id}. The
 * client-side mirror of the therapist-facing transition (`mark_complete`)
 * lives in ClientDetailPage.tsx for UX only — never the source of truth.
 */
import { z } from 'zod';
import { apiFetch } from './client';

/** Real backend.Homework shape — see backend-initial/prisma/schema.prisma. */
export const homeworkSchema = z.object({
  id: z.number(),
  clientId: z.number(),
  therapistId: z.number(),
  appointmentId: z.number(),
  title: z.string(),
  instructions: z.string().nullable(),
  category: z.string().nullable(),
  status: z.string(),
  assignedDate: z.string(),
  dueDate: z.string().nullable(),
  completedDate: z.string().nullable(),
  clientResponse: z.string().nullable(),
  therapistFeedback: z.string().nullable(),
  templateId: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type HomeworkRecord = z.infer<typeof homeworkSchema>;

export interface CreateHomeworkRequest {
  therapistId: string;
  clientId: string;
  /** Required — validated server-side via assertAppointmentTie before create. */
  appointmentId: string;
  title: string;
  instructions?: string;
  category?: string;
  dueDate?: string;
}

/** POST /homework — 201 on success; 400/404/409 if appointmentId doesn't tie
 *  the therapist to this client, 403 if the client hasn't given DPDP consent. */
export function createHomework(request: CreateHomeworkRequest) {
  return apiFetch('/homework', {
    method: 'POST',
    body: request,
    schema: z.object({ success: z.boolean(), data: homeworkSchema }),
    rawEnvelope: true,
  }).then((res) => res.data);
}

export interface ListHomeworkParams {
  /** Required for a therapist caller — GET /homework 403s without it unless admin (assertSelf-style check server-side). */
  therapistId?: string;
  status?: string;
}

/** GET /homework?clientId=...&therapistId=... — a client sees their own
 *  homework; a therapist sees homework they assigned. */
export function listHomework(clientId: string, params: ListHomeworkParams = {}) {
  const qs = new URLSearchParams({ clientId });
  if (params.therapistId) qs.set('therapistId', params.therapistId);
  if (params.status) qs.set('status', params.status);
  return apiFetch(`/homework?${qs.toString()}`, {
    schema: z.object({ success: z.boolean(), data: z.array(homeworkSchema) }),
    rawEnvelope: true,
  }).then((res) => res.data);
}

export function getHomework(id: number) {
  return apiFetch(`/homework/${id}`, {
    schema: z.object({ success: z.boolean(), data: homeworkSchema }),
    rawEnvelope: true,
  }).then((res) => res.data);
}

export interface UpdateHomeworkRequest {
  status?: 'assigned' | 'in_progress' | 'completed' | 'overdue';
  clientResponse?: string;
  therapistFeedback?: string;
}

/** PATCH /homework/{id} — lexicon-gated status transitions server-side; an
 *  illegal transition 400s rather than silently no-opping. */
export function updateHomework(id: number, patch: UpdateHomeworkRequest) {
  return apiFetch(`/homework/${id}`, {
    method: 'PATCH',
    body: patch,
    schema: z.object({ success: z.boolean(), data: homeworkSchema }),
    rawEnvelope: true,
  }).then((res) => res.data);
}

/** DELETE /homework/{id} — only the assigning therapist (or admin) may delete, server-side. */
export function deleteHomework(id: number) {
  return apiFetch(`/homework/${id}`, {
    method: 'DELETE',
    schema: z.object({ success: z.boolean(), message: z.string() }),
    rawEnvelope: true,
  }).then(() => undefined);
}
