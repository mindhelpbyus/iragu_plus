/**
 * api/leave.ts — POST/GET/DELETE /therapists/availability/{therapistId}/leave
 * (backend-initial's therapist-availability Lambda, LeaveService/TherapistLeave).
 * Backs Calendar's "Block time off" modal — replacing the local-only
 * BLOCKED_DAYS mock in pages/calendar/mockData.ts.
 */
import { z } from 'zod';
import { apiFetch } from './client';

const leaveRecordSchema = z.object({
  id: z.number(),
  therapistId: z.number(),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().nullable().optional(),
  leaveType: z.string().nullable().optional(),
});

export type LeaveRecord = z.infer<typeof leaveRecordSchema>;

/** from/to: YYYY-MM-DD, both optional — omit to fetch every leave period on record. */
export function listLeave(therapistId: number, from?: string, to?: string): Promise<LeaveRecord[]> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const qs = params.toString();
  return apiFetch(`/therapists/availability/${therapistId}/leave${qs ? `?${qs}` : ''}`, {
    schema: z.object({ success: z.boolean(), data: z.array(leaveRecordSchema) }),
    rawEnvelope: true,
  }).then((res) => res.data);
}

/** startDate/endDate: YYYY-MM-DD, inclusive. */
export function createLeave(
  therapistId: number,
  startDate: string,
  endDate: string,
  reason?: string,
  leaveType?: string
): Promise<LeaveRecord> {
  return apiFetch(`/therapists/availability/${therapistId}/leave`, {
    method: 'POST',
    body: { startDate, endDate, reason, leaveType },
    schema: z.object({ success: z.boolean(), data: leaveRecordSchema }),
    rawEnvelope: true,
  }).then((res) => res.data);
}

export function deleteLeave(therapistId: number, leaveId: number): Promise<void> {
  return apiFetch(`/therapists/availability/${therapistId}/leave/${leaveId}`, {
    method: 'DELETE',
    schema: z.object({ success: z.boolean(), message: z.string().optional() }),
    rawEnvelope: true,
  }).then(() => undefined);
}
