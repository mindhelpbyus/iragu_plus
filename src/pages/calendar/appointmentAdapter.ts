/**
 * Adapts real backend-initial appointments (RawAppointment) into the CalEvent
 * shape WeekView/DayView already render, so the visual grid code didn't need
 * to change — only the data feeding it.
 *
 * Times are read in the viewer's own browser-local timezone (via
 * dateUtils.ts's hourOfDay/toDateKey), matching how the grid is meant to
 * display them — like Google Calendar, a session shows at its correct
 * wall-clock moment for whoever is looking, not pinned to India time
 * regardless of viewer. Storage is UTC (Postgres timestamptz) underneath,
 * so this is safe: every viewer converts the same absolute instant to their
 * own local display independently.
 */
import type { RawAppointment } from '../../api/appointmentsBackend';
import { PALETTE, type CalEvent, type EventColors, initialsOf } from './calendarConstants';
import { hourOfDay, minutesBetween, formatTimeRange, toDateKey } from './dateUtils';

/**
 * Builds a chip color triple (bg/border/fg) from a single therapist-picked
 * hex, matching the palette's visual weight — a light tint background, the
 * chosen hue as the left border, and a darkened version of it for readable
 * text (chip backgrounds here are pale, so a full-saturation fg would be
 * too low-contrast).
 */
function colorsFromHex(hex: string): EventColors {
  const full = hex.length === 4 ? hex.replace(/^#(.)(.)(.)$/, '#$1$1$2$2$3$3') : hex;
  const n = parseInt(full.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const tint = (c: number) => Math.round(c + (255 - c) * 0.82); // toward-white blend for the bg
  const shade = (c: number) => Math.round(c * 0.55); // toward-black blend for readable fg text
  const toHex = (c: number) => c.toString(16).padStart(2, '0');
  const bg = `#${toHex(tint(r))}${toHex(tint(g))}${toHex(tint(b))}`;
  const fg = `#${toHex(shade(r))}${toHex(shade(g))}${toHex(shade(b))}`;
  return { bg, border: full, fg };
}

const TYPE_LABEL: Record<RawAppointment['type'], string> = {
  individual: 'Individual',
  couples: 'Couples',
  family: 'Family',
  group: 'Group',
};

const TYPE_COLOR: Record<RawAppointment['type'], CalEvent['colors']> = {
  individual: PALETTE.green,
  couples: PALETTE.lavender,
  family: PALETTE.amber,
  group: PALETTE.sage,
};

function clientName(a: RawAppointment): string {
  if (!a.client) return 'Client';
  return `${a.client.firstName ?? ''} ${a.client.lastName ?? ''}`.trim() || a.client.email;
}

/**
 * Only cancelled/no-show appointments are excluded — everything else still
 * represents a real booking on the calendar. Prisma's default status is
 * 'initiated' (schema.prisma: @default("initiated")) and most real
 * appointments in the dev DB never progress past it (no payment-confirmation
 * flow completing in this sandbox) — excluding it would hide the majority
 * of real bookings, which is exactly what happened until this was caught by
 * live testing (a freshly booked session showed "0 sessions" on its own day).
 */
const HIDDEN_STATUSES: RawAppointment['status'][] = ['cancelled', 'no-show'];

export function toCalEvent(a: RawAppointment): CalEvent {
  return {
    id: a.id,
    startHour: hourOfDay(a.startTime),
    durationMin: minutesBetween(a.startTime, a.endTime),
    time: formatTimeRange(a.startTime, a.endTime),
    name: clientName(a),
    type: [TYPE_LABEL[a.type], a.consultingReason].filter(Boolean).join(' · '),
    colors: a.colorOverride ? colorsFromHex(a.colorOverride) : (TYPE_COLOR[a.type] ?? PALETTE.green),
    owner: 0, // real appointments are always the caller's own — no multi-therapist owner index yet
    showJoin: !!a.videoRoomUrl && (a.status === 'confirmed' || a.status === 'in_progress'),
    clientInitials: initialsOf(clientName(a)),
    startTimeIso: a.startTime,
    endTimeIso: a.endTime,
    clientId: a.client?.id,
    rawType: a.type,
    notes: a.notes ?? undefined,
    status: a.status,
    colorOverride: a.colorOverride ?? undefined,
  };
}

/** Groups real appointments by the viewer's own local date (YYYY-MM-DD) for the week grid. */
export function groupAppointmentsByDate(appointments: RawAppointment[]): Record<string, CalEvent[]> {
  const out: Record<string, CalEvent[]> = {};
  for (const a of appointments) {
    if (HIDDEN_STATUSES.includes(a.status)) continue;
    const key = toDateKey(new Date(a.startTime));
    (out[key] ??= []).push(toCalEvent(a));
  }
  return out;
}
