/**
 * api/availability.ts — GET /therapists/availability/{therapistId}/slots
 * (backend-initial's therapist-availability Lambda). Real bookable-slot data
 * for Calendar's Slots tab and MiniCalendar tooltips, replacing the mock
 * hash-based availability in pages/calendar/mockData.ts.
 */
import { z } from 'zod';
import { apiFetch } from './client';

const timeSlotSchema = z.object({
  slotId: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  isAvailable: z.boolean(),
  isBooked: z.boolean(),
  appointmentId: z.string().optional(),
});

export type TimeSlot = z.infer<typeof timeSlotSchema>;

const daySlotsSchema = z.object({
  therapistId: z.number(),
  date: z.string(),
  slotsCount: z.number(),
  onLeave: z.boolean().optional(),
  slots: z.array(timeSlotSchema),
});

/** date: YYYY-MM-DD. Booked slots excluded by default (matches the UI's "open slots" use). */
export function getDaySlots(therapistId: number, date: string) {
  return apiFetch(`/therapists/availability/${therapistId}/slots?date=${date}`, {
    schema: z.object({ success: z.boolean(), data: daySlotsSchema }),
    rawEnvelope: true,
  }).then((res) => res.data);
}

const rangeEntrySchema = z.object({ date: z.string(), slots: z.array(timeSlotSchema) });

const rangeDataSchema = z.object({
  therapistId: z.number(),
  startDate: z.string(),
  endDate: z.string(),
  availability: z.array(rangeEntrySchema),
});

/** date/endDate: YYYY-MM-DD. One call for a whole week — used by MiniCalendar's tooltips. */
export function getSlotsRange(therapistId: number, date: string, endDate: string) {
  return apiFetch(`/therapists/availability/${therapistId}/slots?date=${date}&endDate=${endDate}`, {
    schema: z.object({ success: z.boolean(), data: rangeDataSchema }),
    rawEnvelope: true,
  }).then((res) => res.data.availability);
}

const blockedSlotSchema = z.object({
  id: z.number(),
  therapistId: z.number(),
  date: z.string(),
  startHour: z.number(),
  startMinute: z.number(),
  endHour: z.number(),
  endMinute: z.number(),
  reason: z.string().nullable().optional(),
});

export type BlockedSlot = z.infer<typeof blockedSlotSchema>;

export function getBlockedSlots(therapistId: number, date: string, endDate?: string) {
  const query = endDate ? `?date=${date}&endDate=${endDate}` : `?date=${date}`;
  return apiFetch(`/therapists/availability/${therapistId}/blocked-slots${query}`, {
    schema: z.object({ success: z.boolean(), data: z.array(blockedSlotSchema) }),
    rawEnvelope: true,
  }).then((res) => res.data);
}

export function createBlockedSlot(
  therapistId: number,
  date: string,
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number,
  reason?: string
) {
  return apiFetch(`/therapists/availability/${therapistId}/blocked-slots`, {
    method: 'POST',
    body: { date, startHour, startMinute, endHour, endMinute, reason },
    schema: z.object({ success: z.boolean(), data: blockedSlotSchema }),
    rawEnvelope: true,
  }).then((res) => res.data);
}

export function deleteBlockedSlot(therapistId: number, slotId: number) {
  return apiFetch(`/therapists/availability/${therapistId}/blocked-slots/${slotId}`, {
    method: 'DELETE',
    schema: z.object({ success: z.boolean() }),
    rawEnvelope: true,
  });
}

/**
 * GET /therapists/availability/{id} — the therapist's stored IANA timezone
 * (e.g. 'Asia/Kolkata'), which the backend uses to convert their weekly
 * working-hours schedule into correct UTC slot boundaries. This is a
 * profile setting the therapist confirms, not auto-derived from the
 * browser — see CalendarPage's timezone-mismatch prompt.
 */
export function getTherapistTimezone(therapistId: number) {
  return apiFetch(`/therapists/availability/${therapistId}`, {
    schema: z.object({ success: z.boolean(), data: z.object({ timezone: z.string() }) }),
    rawEnvelope: true,
  }).then((res) => res.data.timezone);
}

export function updateTherapistTimezone(therapistId: number, timezone: string) {
  return apiFetch(`/therapists/availability/${therapistId}`, {
    method: 'PUT',
    body: { timezone },
    schema: z.object({ success: z.boolean() }),
    rawEnvelope: true,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Weekly recurring schedule — Settings' "weekly working hours" grid.
//
// A different thing from `TimeSlot`/`getDaySlots` above (individual bookable
// slots on one calendar date) and from `getTherapistTimezone` (same route,
// narrower schema): this is the recurring per-day pattern
// (day -> {startTime,endTime,isAvailable,lunchStart?,lunchEnd?}) that the
// backend expands into slots. Real route, read carefully from source rather
// than guessed — backend-initial/src/lambdas/therapist-availability/src/
// handler.ts:277-327, backed by AvailabilityService.getTherapistAvailability
// / setWeeklySchedule (src/lib/availability-service.ts:41-121). Day keys are
// lowercase full weekday names ('monday'..'sunday') — see
// availability-service.ts's getDayName() and therapistApp's own
// ScheduleSettingsService._dayNames, which use the same vocabulary against
// the same route.
// ─────────────────────────────────────────────────────────────────────────────

const dayScheduleSchema = z.object({
  startTime: z.string(),
  endTime: z.string(),
  isAvailable: z.boolean(),
  lunchStart: z.string().optional(),
  lunchEnd: z.string().optional(),
  // Server-computed from lunchStart/lunchEnd (AvailabilityService.buildDayEntry)
  // — never sent by the client, only ever read back.
  segments: z.array(z.object({ startTime: z.string(), endTime: z.string() })).optional(),
});

/** One day's entry in a `WeeklySchedule`, exactly as the backend stores/returns it. */
export type DaySchedule = z.infer<typeof dayScheduleSchema>;

const weeklyScheduleSchema = z.record(z.string(), dayScheduleSchema);

/** day (lowercase full name) -> DaySchedule. Unset days are simply absent. */
export type WeeklySchedule = z.infer<typeof weeklyScheduleSchema>;

const therapistAvailabilitySchema = z.object({
  userId: z.number(),
  timezone: z.string(),
  weeklySchedule: weeklyScheduleSchema,
});

/**
 * GET /therapists/availability/{id} — full shape (timezone + weeklySchedule),
 * for the Settings weekly-schedule grid. `weeklySchedule` is `{}` for a
 * therapist who has never set one — not a 404 — so an empty object is a real,
 * valid "no days configured yet" response, not a load failure.
 */
export function getWeeklySchedule(therapistId: number) {
  return apiFetch(`/therapists/availability/${therapistId}`, {
    schema: z.object({ success: z.boolean(), data: therapistAvailabilitySchema }),
    rawEnvelope: true,
  }).then((res) => res.data);
}

/**
 * PUT /therapists/availability/{id} with `{ weeklySchedule }` — handler.ts:
 * 297-327, `if (body.weeklySchedule) { ... setWeeklySchedule(...) }`. Send
 * only startTime/endTime/isAvailable/lunchStart/lunchEnd per day; the backend
 * recomputes `segments` itself and would ignore a client-sent one anyway.
 */
export function putWeeklySchedule(therapistId: number, weeklySchedule: WeeklySchedule) {
  return apiFetch(`/therapists/availability/${therapistId}`, {
    method: 'PUT',
    body: { weeklySchedule },
    schema: z.object({ success: z.boolean(), message: z.string().optional() }),
    rawEnvelope: true,
  });
}
