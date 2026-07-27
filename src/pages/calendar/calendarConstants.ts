/**
 * Week/Day/Month grid data, Agenda, and Block-time-off all now come from
 * real backend-initial data (see useMyAppointments.ts, appointmentAdapter.ts,
 * api/leave.ts). What remains here is shared visual constants only (palette,
 * sizing helpers, CalEvent's shape).
 */

export interface EventColors {
  bg: string;
  border: string;
  fg: string;
}

/** Palette F/L/O/S from the prototype's calWeekData()/monthGrid(). */
export const PALETTE = {
  green: { bg: 'linear-gradient(135deg, #E8F2EB, #DCEBE0)', border: '#1E7048', fg: '#175C3B' },
  lavender: { bg: 'linear-gradient(135deg, #EFEDF5, #E5E1F0)', border: '#9A90B8', fg: '#6B6490' },
  amber: { bg: 'linear-gradient(135deg, #FAF3E2, #F4E9CC)', border: '#C49840', fg: '#8A6A28' },
  sage: { bg: 'linear-gradient(135deg, #F2F6F3, #E3ECE6)', border: '#7A9E88', fg: '#4A6F59' },
  tan: { bg: '#F2EAE0', border: '#C9BEAD', fg: '#48382E' },
} as const satisfies Record<string, EventColors>;

export interface CalEvent {
  /** Real appointment id — every CalEvent is now backend-sourced (see appointmentAdapter.ts). */
  id?: number;
  /** Hour + fraction, e.g. 9.5 = 09:30 */
  startHour: number;
  durationMin: number;
  time: string;
  name: string;
  type: string;
  colors: EventColors;
  /** Legacy multi-therapist owner index — unused now that events are always the caller's own; kept at 0. */
  owner: number;
  showJoin?: boolean;
  clientInitials?: string;
  /** Raw fields carried through for the detail/edit modal — not used by the grid renderers themselves. */
  startTimeIso?: string;
  endTimeIso?: string;
  clientId?: number;
  rawType?: 'individual' | 'couples' | 'family' | 'group';
  notes?: string;
  status?: 'initiated' | 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no-show';
  /** Raw hex override (e.g. '#B06060'), or undefined if this event uses the default type color. */
  colorOverride?: string;
}

export function initialsOf(name: string): string {
  return name
    .replace(/[^A-Za-z& ]/g, '')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export const HOUR_PX = 80;

export function topForHour(hour: number): number {
  return hour * HOUR_PX;
}

export function heightForMinutes(min: number): number {
  return (min / 60) * HOUR_PX;
}

export type CalView = 'day' | 'week' | 'month';
