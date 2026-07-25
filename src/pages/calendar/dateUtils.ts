/**
 * Real Date-based week/day helpers, replacing the old hardcoded July 13–19
 * mock scaffolding (WEEK_DAYS/dayWeekday day-number literals). Weeks are
 * Monday-first to match the mock UI's DOW_SHORT ordering.
 */
import { type LeaveRecord } from '../../api/leave';

export interface LeaveBlock {
  id: number;
  startHour: number;
  durationMin: number;
  reason: string;
}

export function getLeaveBlocksForDay(d: Date, leaves: LeaveRecord[]): LeaveBlock[] {
  const blocks: LeaveBlock[] = [];
  const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);

  for (const l of leaves) {
    const lStart = new Date(l.startDate);
    // End date is inclusive of the whole day
    const lEnd = new Date(new Date(l.endDate).getTime() + 24 * 60 * 60 * 1000);
    
    const intersectStart = new Date(Math.max(lStart.getTime(), dayStart.getTime()));
    const intersectEnd = new Date(Math.min(lEnd.getTime(), dayEnd.getTime()));

    if (intersectStart < intersectEnd) {
      const startHour = intersectStart.getHours() + intersectStart.getMinutes() / 60;
      const durationMin = (intersectEnd.getTime() - intersectStart.getTime()) / 60000;
      blocks.push({
        id: l.id,
        startHour,
        durationMin,
        reason: l.reason || l.leaveType || 'Vacation',
      });
    }
  }
  return blocks;
}

export function startOfWeek(d: Date): Date {
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day; // back up to Monday
  const out = new Date(d);
  out.setDate(d.getDate() + diff);
  out.setHours(0, 0, 0, 0);
  return out;
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

export function weekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** YYYY-MM-DD in local time (not UTC — avoids the off-by-one-day toISOString bug). */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDayShort(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
}

export function formatWeekRange(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === end.getMonth();
  const startStr = weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: sameMonth ? undefined : 'short' });
  const endStr = end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${startStr} – ${endStr}`;
}

export function formatDayFull(d: Date): string {
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function formatMonthYear(d: Date): string {
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

/** Decimal hour from an ISO datetime, e.g. 09:30 → 9.5, in local time. */
export function hourOfDay(iso: string): number {
  const d = new Date(iso);
  return d.getHours() + d.getMinutes() / 60;
}

export function minutesBetween(startIso: string, endIso: string): number {
  return (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000;
}

export function formatTimeRange(startIso: string, endIso: string): string {
  const fmt = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${fmt(new Date(startIso))} – ${fmt(new Date(endIso))}`;
}
