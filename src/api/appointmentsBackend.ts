/**
 * api/appointmentsBackend.ts — Appointments API
 *
 * ✅ All appointment operations call the Gravity Reunion backend.
 * ✅ No mock data, no hardcoded defaults.
 *
 * Backend (backend-initial — NO /api/ prefix):
 *   GET    /appointments
 *   POST   /appointments
 *   GET    /appointments/{appointmentId}
 *   PUT    /appointments/{appointmentId}   (NOT PATCH — confirmed against handler.ts)
 *   DELETE /appointments/{appointmentId}
 */

import { z } from 'zod';
import { get, post, put, del, apiRequest, apiFetch } from './client';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Real Appointment.type values (prisma/schema.prisma) — a clinical session type, not a video/audio/in-person medium. */
export type AppointmentType = 'individual' | 'couples' | 'family' | 'group';

/** Real Appointment.mode values — how this specific session is held. Defaults to 'video' server-side. */
export type AppointmentMode = 'video' | 'in_person';

export interface AppointmentDetails {
  id: string;
  therapistId: string;
  therapistName: string;
  clientId: string;
  clientName: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
  type: AppointmentType;
  mode: AppointmentMode;
  notes?: string;
  meetingLink?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppointmentRequest {
  /** Cognito sub or numeric id — POST /appointments resolves either. */
  therapistId: string;
  /** Cognito sub or numeric id — POST /appointments resolves either. */
  clientId: string;
  startTime: string;
  endTime: string;
  type: AppointmentType;
  mode?: AppointmentMode;
  notes?: string;
  /** Hex color (e.g. '#B06060') overriding the type-based default for this specific session — e.g. flagging by client priority. */
  colorOverride?: string;
}

export interface JoinLinkResponse {
  joinLink: string;
  sessionId: string;
}

export interface AppointmentFilters {
  startDate?: string;
  endDate?: string;
  status?: string;
  therapistId?: string;
  clientId?: string;
}

/**
 * Raw shape of GET /appointments and GET /appointments/therapist?therapistId=.
 * backend-initial's handler.ts includes the full client/therapist sub-objects
 * rather than the flattened clientName/therapistId strings AppointmentDetails
 * assumes — those two shapes come from different routes and shouldn't be
 * conflated.
 */
export interface RawAppointment {
  id: number;
  startTime: string;
  endTime: string;
  type: 'individual' | 'couples' | 'family' | 'group';
  mode: 'video' | 'in_person';
  status: 'initiated' | 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no-show';
  consultingReason: string | null;
  notes: string | null;
  videoRoomUrl: string | null;
  /** Hex color overriding the type-based default for this specific session, or null to use the default. */
  colorOverride: string | null;
  client: { id: number; email: string; firstName: string; lastName: string } | null;
  therapist: { id: number; email: string; firstName: string; lastName: string };
}

/**
 * GET /appointments/therapist?therapistId=<numeric> — the properly scoped
 * route (assertSelf-checked server-side). Requires the caller's numeric DB
 * id — see api/therapistMe.ts's getMyTherapistId(), which is how the
 * frontend obtains it (it only ever has the Cognito sub otherwise).
 */
export function getMyAppointments(therapistId: number, filters?: AppointmentFilters): Promise<RawAppointment[]> {
  const params = new URLSearchParams({ therapistId: String(therapistId), ...filters } as Record<string, string>);
  return apiRequest<{ success: boolean; data: { items: RawAppointment[] } }>(`/appointments/therapist?${params}`, {
    rawEnvelope: true,
  }).then((res) => res.data.items);
}

/**
 * Practice-wide appointment shape from GET /org/appointments (the `org`
 * Lambda's admin-service.ts-backed AppointmentRow) — flattened
 * clientName/therapistName strings, NOT the nested client/therapist
 * sub-objects `RawAppointment` (the single-therapist route) uses. The two
 * shapes come from different Lambdas/services and should not be conflated.
 */
export interface RawOrgAppointment {
  id: number;
  clientId: number;
  clientName: string;
  therapistId: number;
  therapistName: string;
  serviceType: string;
  scheduledAt: string;
  endTime: string;
  status: string;
  paymentStatus: string;
  bookedBy: string;
  price: number;
  type: AppointmentType;
  mode: AppointmentMode;
  consultingReason: string | null;
  notes: string | null;
  videoRoomUrl: string | null;
  colorOverride: string | null;
}

const orgAppointmentSchema = z.object({
  id: z.number(),
  clientId: z.number(),
  clientName: z.string(),
  therapistId: z.number(),
  therapistName: z.string(),
  serviceType: z.string(),
  scheduledAt: z.string(),
  endTime: z.string(),
  status: z.string(),
  paymentStatus: z.string(),
  bookedBy: z.string(),
  price: z.number(),
  type: z.enum(['individual', 'couples', 'family', 'group']),
  mode: z.enum(['video', 'in_person']),
  consultingReason: z.string().nullable(),
  notes: z.string().nullable(),
  videoRoomUrl: z.string().nullable(),
  colorOverride: z.string().nullable(),
});

const orgAppointmentsEnvelopeSchema = z.object({
  success: z.boolean(),
  data: z.object({
    data: z.array(orgAppointmentSchema),
    pagination: z.object({ page: z.number(), pageSize: z.number(), total: z.number(), totalPages: z.number() }),
  }),
});

export interface GetOrgAppointmentsParams {
  dateFrom?: string;
  dateTo?: string;
  therapistIds?: number[];
  status?: string;
  page?: number;
  pageSize?: number;
}

/**
 * GET /org/appointments (the `org` Lambda) — practice-wide, scoped to the
 * caller's org via their resolved UserOrgRole grant. `therapistIds` narrows
 * to a subset of the org's therapists; omitted means the whole org.
 */
export function getOrgAppointments(params: GetOrgAppointmentsParams = {}): Promise<RawOrgAppointment[]> {
  const qs = new URLSearchParams();
  if (params.dateFrom) qs.set('dateFrom', params.dateFrom);
  if (params.dateTo) qs.set('dateTo', params.dateTo);
  if (params.status) qs.set('status', params.status);
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  if (params.therapistIds?.length) qs.set('therapistIds', params.therapistIds.join(','));

  return apiFetch(`/org/appointments?${qs.toString()}`, { schema: orgAppointmentsEnvelopeSchema, rawEnvelope: true }).then(
    (res) => res.data.data,
  );
}

// ─── API Functions ────────────────────────────────────────────────────────────

export function getAppointments(filters?: AppointmentFilters): Promise<AppointmentDetails[]> {
  const params = filters ? '?' + new URLSearchParams(filters as Record<string, string>).toString() : '';
  return get<AppointmentDetails[]>(`/appointments${params}`);
}

export function createAppointment(request: CreateAppointmentRequest): Promise<AppointmentDetails> {
  return post<AppointmentDetails>('/appointments', request);
}

export function getAppointmentDetails(appointmentId: string): Promise<AppointmentDetails> {
  return get<AppointmentDetails>(`/appointments/${appointmentId}`);
}

export function getTherapistAppointments(
  therapistId: string,
  filters?: Omit<AppointmentFilters, 'therapistId'>
): Promise<AppointmentDetails[]> {
  return getAppointments({ ...filters, therapistId });
}

export function getClientAppointments(
  clientId: string,
  filters?: Omit<AppointmentFilters, 'clientId'>
): Promise<AppointmentDetails[]> {
  return getAppointments({ ...filters, clientId });
}

/** DELETE /appointments/{id} — the real cancel path (sets status='cancelled' + cancelledAt server-side). */
export function cancelAppointment(appointmentId: string): Promise<void> {
  return del<void>(`/appointments/${appointmentId}`);
}

export function updateAppointmentStatus(
  appointmentId: string,
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no-show'
): Promise<AppointmentDetails> {
  return put<AppointmentDetails>(`/appointments/${appointmentId}`, { status });
}

export function rescheduleAppointment(
  appointmentId: string,
  newStartTime: string,
  newEndTime: string
): Promise<AppointmentDetails> {
  return put<AppointmentDetails>(`/appointments/${appointmentId}`, {
    startTime: newStartTime,
    endTime: newEndTime,
  });
}

/** Sets or clears (pass null) this appointment's color override — not a locked field, so this works even on past/completed sessions. */
export function updateAppointmentColor(appointmentId: string, colorOverride: string | null): Promise<AppointmentDetails> {
  return put<AppointmentDetails>(`/appointments/${appointmentId}`, { colorOverride });
}

/** Changes the clinical session type (individual/couples/family/group) — a LOCKED field server-side once the session is completed/cancelled/no-show/already started (backend-initial's LOCKED_EDIT_FIELDS); the caller is expected to only offer this while the appointment is still editable. */
export function updateAppointmentType(appointmentId: string, type: AppointmentType): Promise<AppointmentDetails> {
  return put<AppointmentDetails>(`/appointments/${appointmentId}`, { type });
}

// TODO(backend): no dedicated join-link route on backend-initial yet; the link
// currently comes from the appointment record's `meetingLink`. Adjust when a
// /appointments/{id}/join-link route exists.
export function getAppointmentJoinLink(appointmentId: string): Promise<JoinLinkResponse> {
  return get<JoinLinkResponse>(`/appointments/${appointmentId}`).then((a: any) => ({
    joinLink: a?.meetingLink ?? '',
    sessionId: a?.id ?? appointmentId,
  }));
}

export function deleteAppointment(appointmentId: string): Promise<void> {
  return del<void>(`/appointments/${appointmentId}`);
}
