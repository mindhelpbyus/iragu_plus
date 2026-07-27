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

import { get, post, put, del, apiRequest } from './client';

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
