import { describe, it, expect } from 'vitest';
import { isDayBlocked } from './MonthView';
import type { LeaveRecord } from '../../api/leave';

function leave(id: number, startDate: string, endDate: string): LeaveRecord {
  return { id, therapistId: 1, startDate, endDate, reason: null, leaveType: null };
}

describe('isDayBlocked', () => {
  it('is not blocked when there are no leave records at all (leaves is undefined)', () => {
    expect(isDayBlocked(new Date('2026-03-10T00:00:00'), undefined)).toBe(false);
  });

  it('is not blocked for an empty leaves array', () => {
    expect(isDayBlocked(new Date('2026-03-10T00:00:00'), [])).toBe(false);
  });

  it('is blocked when a leave record overlaps the day', () => {
    const leaves = [leave(1, '2026-03-10T00:00:00', '2026-03-10T00:00:00')];
    expect(isDayBlocked(new Date('2026-03-10T00:00:00'), leaves)).toBe(true);
  });

  it('is not blocked when the only leave record is on a different day', () => {
    const leaves = [leave(1, '2026-03-09T00:00:00', '2026-03-09T00:00:00')];
    expect(isDayBlocked(new Date('2026-03-10T00:00:00'), leaves)).toBe(false);
  });

  it('is blocked when the day falls inside a multi-day leave span', () => {
    const leaves = [leave(1, '2026-03-08T00:00:00', '2026-03-12T00:00:00')];
    expect(isDayBlocked(new Date('2026-03-10T00:00:00'), leaves)).toBe(true);
  });

  it('is not blocked the day immediately after a leave ends (endDate covers only its own day)', () => {
    const leaves = [leave(1, '2026-03-08T00:00:00', '2026-03-09T00:00:00')];
    expect(isDayBlocked(new Date('2026-03-10T00:00:00'), leaves)).toBe(false);
  });
});
