import { describe, it, expect } from 'vitest';
import {
  lastSixMonths,
  aggregateMonthlyRevenue,
  bucketSessionMix,
  countIntroSessions,
  computeAttendance,
  formatAttendanceDelta,
} from './useAnalytics';

describe('lastSixMonths', () => {
  it('returns 6 months ending with the current month, oldest first', () => {
    const months = lastSixMonths(new Date('2026-09-21T10:00:00Z'));
    expect(months).toEqual([
      { year: 2026, month: 3 }, // Apr
      { year: 2026, month: 4 }, // May
      { year: 2026, month: 5 }, // Jun
      { year: 2026, month: 6 }, // Jul
      { year: 2026, month: 7 }, // Aug
      { year: 2026, month: 8 }, // Sep
    ]);
  });

  it('rolls back across a year boundary', () => {
    const months = lastSixMonths(new Date('2026-02-10T10:00:00Z'));
    expect(months).toEqual([
      { year: 2025, month: 8 }, // Sep 2025
      { year: 2025, month: 9 },
      { year: 2025, month: 10 },
      { year: 2025, month: 11 },
      { year: 2026, month: 0 }, // Jan 2026
      { year: 2026, month: 1 }, // Feb 2026
    ]);
  });
});

describe('aggregateMonthlyRevenue', () => {
  const months = [
    { year: 2026, month: 6 }, // Jul
    { year: 2026, month: 7 }, // Aug
    { year: 2026, month: 8 }, // Sep
  ];

  it('sums grossPaise per calendar month', () => {
    const transactions = [
      { occurredAt: '2026-07-05T10:00:00Z', grossPaise: 100000 },
      { occurredAt: '2026-07-20T10:00:00Z', grossPaise: 50000 },
      { occurredAt: '2026-08-01T10:00:00Z', grossPaise: 200000 },
    ];
    const result = aggregateMonthlyRevenue(transactions, months);
    expect(result).toEqual([
      { year: 2026, month: 6, label: 'Jul', grossPaise: 150000 },
      { year: 2026, month: 7, label: 'Aug', grossPaise: 200000 },
      { year: 2026, month: 8, label: 'Sept', grossPaise: 0 },
    ]);
  });

  it('ignores transactions with a null occurredAt rather than crashing', () => {
    const transactions = [{ occurredAt: null, grossPaise: 99999 }];
    const result = aggregateMonthlyRevenue(transactions, months);
    expect(result.every((m) => m.grossPaise === 0)).toBe(true);
  });

  it('returns zero for every month when there are no transactions', () => {
    const result = aggregateMonthlyRevenue([], months);
    expect(result.map((m) => m.grossPaise)).toEqual([0, 0, 0]);
  });
});

describe('bucketSessionMix', () => {
  it('buckets by the real appointment type and rounds percentages', () => {
    const appointments = [
      { type: 'individual' as const },
      { type: 'individual' as const },
      { type: 'individual' as const },
      { type: 'couples' as const },
      { type: 'group' as const },
    ];
    const result = bucketSessionMix(appointments);
    expect(result).toEqual([
      { type: 'individual', label: 'Individual', count: 3, percent: 60 },
      { type: 'couples', label: 'Couples', count: 1, percent: 20 },
      { type: 'group', label: 'Group', count: 1, percent: 20 },
      { type: 'family', label: 'Family', count: 0, percent: 0 },
    ]);
  });

  it('returns 0% for every bucket rather than dividing by zero when there are no sessions', () => {
    const result = bucketSessionMix([]);
    expect(result.every((b) => b.percent === 0 && b.count === 0)).toBe(true);
  });

  it('always orders and includes all 4 real appointment types, even ones absent from the data', () => {
    const result = bucketSessionMix([{ type: 'family' as const }]);
    expect(result.map((b) => b.type)).toEqual(['individual', 'couples', 'group', 'family']);
  });
});

describe('countIntroSessions', () => {
  it('counts only sessionCategory "intro"', () => {
    const appointments = [
      { sessionCategory: 'intro' as const },
      { sessionCategory: 'regular' as const },
      { sessionCategory: 'intro' as const },
      { sessionCategory: undefined },
    ];
    expect(countIntroSessions(appointments)).toBe(2);
  });

  it('returns 0 for an empty list', () => {
    expect(countIntroSessions([])).toBe(0);
  });
});

describe('computeAttendance', () => {
  it('computes rate as completed / (completed + no-show)', () => {
    const appointments = [
      { status: 'completed' },
      { status: 'completed' },
      { status: 'completed' },
      { status: 'no_show' },
    ];
    expect(computeAttendance(appointments)).toEqual({ completed: 3, noShow: 1, rate: 75 });
  });

  it('matches the legacy hyphenated "no-show" spelling defensively', () => {
    const appointments = [{ status: 'completed' }, { status: 'no-show' }];
    expect(computeAttendance(appointments)).toEqual({ completed: 1, noShow: 1, rate: 50 });
  });

  it('ignores statuses that are neither completed nor no-show', () => {
    const appointments = [{ status: 'completed' }, { status: 'cancelled' }, { status: 'scheduled' }];
    expect(computeAttendance(appointments)).toEqual({ completed: 1, noShow: 0, rate: 100 });
  });

  it('returns a null rate rather than NaN when there is no completed+no-show data', () => {
    expect(computeAttendance([])).toEqual({ completed: 0, noShow: 0, rate: null });
    expect(computeAttendance([{ status: 'scheduled' }])).toEqual({ completed: 0, noShow: 0, rate: null });
  });
});

describe('formatAttendanceDelta', () => {
  it('formats a positive delta', () => {
    expect(formatAttendanceDelta(94, 92)).toBe('+2% vs last month');
  });

  it('formats a negative delta', () => {
    expect(formatAttendanceDelta(88, 94)).toBe('-6% vs last month');
  });

  it('formats no change', () => {
    expect(formatAttendanceDelta(90, 90)).toBe('Same as last month');
  });

  it('returns null when the current rate is unavailable', () => {
    expect(formatAttendanceDelta(null, 90)).toBeNull();
  });

  it('returns null when the previous rate is unavailable, rather than fabricating a comparison', () => {
    expect(formatAttendanceDelta(90, null)).toBeNull();
  });
});
