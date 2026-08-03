/**
 * Adapts practice-wide appointments (RawOrgAppointment, from GET
 * /org/appointments) into the same CalEvent shape appointmentAdapter.ts
 * builds for the caller's own appointments — but grouped by BOTH date AND
 * therapistId, since Practice mode renders one column per therapist per day
 * (WeekView/DayView) rather than a single list.
 *
 * Mirrors appointmentAdapter.ts's toCalEvent/groupAppointmentsByDate logic;
 * kept as a separate function (not a shared helper) because RawOrgAppointment
 * is a flat shape (clientName as a string) vs RawAppointment's nested
 * client/therapist sub-objects — the two adapters read different fields even
 * though they build the same CalEvent output.
 */
import type { RawOrgAppointment } from '../../api/appointmentsBackend';
import { PALETTE, type CalEvent, type EventColors, initialsOf } from './calendarConstants';
import { hourOfDay, minutesBetween, formatTimeRange, toDateKey } from './dateUtils';

function colorsFromHex(hex: string): EventColors {
  const full = hex.length === 4 ? hex.replace(/^#(.)(.)(.)$/, '#$1$1$2$2$3$3') : hex;
  const n = parseInt(full.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const tint = (c: number) => Math.round(c + (255 - c) * 0.82);
  const shade = (c: number) => Math.round(c * 0.55);
  const toHex = (c: number) => c.toString(16).padStart(2, '0');
  const bg = `#${toHex(tint(r))}${toHex(tint(g))}${toHex(tint(b))}`;
  const fg = `#${toHex(shade(r))}${toHex(shade(g))}${toHex(shade(b))}`;
  return { bg, border: full, fg };
}

const TYPE_LABEL: Record<RawOrgAppointment['type'], string> = {
  individual: 'Individual',
  couples: 'Couples',
  family: 'Family',
  group: 'Group',
};

const TYPE_COLOR: Record<RawOrgAppointment['type'], CalEvent['colors']> = {
  individual: PALETTE.green,
  couples: PALETTE.lavender,
  family: PALETTE.amber,
  group: PALETTE.sage,
};

/** Same exclusion as appointmentAdapter.ts's HIDDEN_STATUSES — cancelled/no-show aren't shown, everything else (including the common 'initiated' default) is a real booking. */
const HIDDEN_STATUSES: string[] = ['cancelled', 'no-show', 'no_show'];

export function toOrgCalEvent(a: RawOrgAppointment): CalEvent {
  return {
    id: a.id,
    startHour: hourOfDay(a.scheduledAt),
    durationMin: minutesBetween(a.scheduledAt, a.endTime),
    time: formatTimeRange(a.scheduledAt, a.endTime),
    name: a.clientName,
    type: [TYPE_LABEL[a.type], a.consultingReason].filter(Boolean).join(' · '),
    colors: a.colorOverride ? colorsFromHex(a.colorOverride) : (TYPE_COLOR[a.type] ?? PALETTE.green),
    owner: a.therapistId,
    showJoin: !!a.videoRoomUrl && (a.status === 'confirmed' || a.status === 'in_progress'),
    clientInitials: initialsOf(a.clientName),
    startTimeIso: a.scheduledAt,
    endTimeIso: a.endTime,
    clientId: a.clientId,
    rawType: a.type,
    notes: a.notes ?? undefined,
    status: a.status as CalEvent['status'],
    colorOverride: a.colorOverride ?? undefined,
  };
}

/**
 * Groups practice-wide appointments by the viewer's own local date AND by
 * therapistId — Record<dateKey, Record<therapistId, CalEvent[]>>. WeekView/
 * DayView (task 35/36) read the inner Record to render one column per
 * therapist for a given day.
 */
export function groupOrgAppointmentsByDateAndTherapist(
  appointments: RawOrgAppointment[],
): Record<string, Record<number, CalEvent[]>> {
  const out: Record<string, Record<number, CalEvent[]>> = {};
  for (const a of appointments) {
    if (HIDDEN_STATUSES.includes(a.status)) continue;
    const dateKey = toDateKey(new Date(a.scheduledAt));
    const byTherapist = (out[dateKey] ??= {});
    (byTherapist[a.therapistId] ??= []).push(toOrgCalEvent(a));
  }
  return out;
}
