/**
 * api/requests.ts — Part H's real Requests workflow (backend-initial's
 * appointments Lambda, inquiry-routes.ts / reschedule-request-routes.ts).
 * GET /requests returns a discriminated union of both kinds; approve/decline
 * stay separate per-kind endpoints since their side effects (create a real
 * Appointment vs. move an existing one) are too different to share one
 * "decide" call cleanly.
 */
import { z } from 'zod';
import { apiFetch } from './client';

const inquirySchema = z.object({
  kind: z.literal('inquiry'),
  id: z.number(),
  therapistId: z.number(),
  prospectClientUserId: z.number().nullable(),
  prospectName: z.string().nullable(),
  message: z.string(),
  requestedStartTime: z.string(),
  requestedEndTime: z.string(),
  requestedMode: z.string(),
  requestedType: z.string(),
  status: z.string(),
  resultingAppointmentId: z.number().nullable(),
  declineReason: z.string().nullable(),
  createdAt: z.string(),
});
export type InquiryRequest = z.infer<typeof inquirySchema>;

const rescheduleRequestSchema = z.object({
  kind: z.literal('reschedule'),
  id: z.number(),
  appointmentId: z.number(),
  clientName: z.string().nullable(),
  requestedBy: z.string(),
  currentStartTime: z.string(),
  currentEndTime: z.string(),
  requestedStartTime: z.string(),
  requestedEndTime: z.string(),
  reason: z.string().nullable(),
  status: z.string(),
  declineReason: z.string().nullable(),
  createdAt: z.string(),
});
export type RescheduleRequestItem = z.infer<typeof rescheduleRequestSchema>;

const requestItemSchema = z.discriminatedUnion('kind', [inquirySchema, rescheduleRequestSchema]);
export type RequestItem = z.infer<typeof requestItemSchema>;

export function listRequests(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiFetch(`/requests${qs}`, {
    schema: z.object({ success: z.boolean(), data: z.array(requestItemSchema) }),
    rawEnvelope: true,
  }).then((res) => res.data);
}

export function approveInquiry(id: number) {
  return apiFetch(`/inquiries/${id}/approve`, {
    method: 'POST',
    body: {},
    schema: z.object({ success: z.boolean(), data: z.object({ appointmentId: z.number() }).passthrough() }),
    rawEnvelope: true,
  }).then((res) => res.data);
}

export function declineInquiry(id: number, reason?: string) {
  return apiFetch(`/inquiries/${id}/decline`, {
    method: 'POST',
    body: reason ? { reason } : {},
    schema: z.object({ success: z.boolean(), data: inquirySchema }),
    rawEnvelope: true,
  }).then((res) => res.data);
}

export function approveReschedule(id: number) {
  return apiFetch(`/reschedule-requests/${id}/approve`, {
    method: 'POST',
    body: {},
    schema: z.object({ success: z.boolean(), data: rescheduleRequestSchema }),
    rawEnvelope: true,
  }).then((res) => res.data);
}

export function declineReschedule(id: number, reason?: string) {
  return apiFetch(`/reschedule-requests/${id}/decline`, {
    method: 'POST',
    body: reason ? { reason } : {},
    schema: z.object({ success: z.boolean(), data: rescheduleRequestSchema }),
    rawEnvelope: true,
  }).then((res) => res.data);
}
