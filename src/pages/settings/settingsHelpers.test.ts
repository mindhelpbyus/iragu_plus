import { describe, it, expect } from 'vitest';
import {
  rupeesToPaise,
  paiseToRupeesInput,
  sessionTypeLabel,
  parseBufferMinutes,
  verificationStatusLabel,
  verificationIsApproved,
  validateNewPassword,
  normalizeTotpCode,
  buildSupportMailto,
  dayLabel,
  weeklyScheduleToRows,
  rowsToWeeklySchedule,
  validateScheduleRows,
  WEEKLY_SCHEDULE_DAYS,
  type DayScheduleRow,
} from './settingsHelpers';
import type { WeeklySchedule } from '../../api/availability';

describe('rupeesToPaise', () => {
  it('converts a plain rupee string to paise', () => {
    expect(rupeesToPaise('2500')).toBe(250000);
  });

  it('handles paise (decimal) input', () => {
    expect(rupeesToPaise('2500.50')).toBe(250050);
  });

  it('strips thousands separators', () => {
    expect(rupeesToPaise('12,500')).toBe(1250000);
  });

  it('rejects empty input', () => {
    expect(rupeesToPaise('')).toBeNull();
    expect(rupeesToPaise('   ')).toBeNull();
  });

  it('rejects negative amounts', () => {
    expect(rupeesToPaise('-50')).toBeNull();
  });

  it('rejects non-numeric input', () => {
    expect(rupeesToPaise('abc')).toBeNull();
    expect(rupeesToPaise('50rs')).toBeNull();
  });

  it('rejects more than 2 decimal places', () => {
    expect(rupeesToPaise('50.123')).toBeNull();
  });

  it('accepts zero', () => {
    expect(rupeesToPaise('0')).toBe(0);
  });
});

describe('paiseToRupeesInput', () => {
  it('formats paise as a plain rupee string', () => {
    expect(paiseToRupeesInput(250000)).toBe('2500');
  });

  it('formats fractional rupees', () => {
    expect(paiseToRupeesInput(250050)).toBe('2500.5');
  });

  it('returns empty string for null/undefined', () => {
    expect(paiseToRupeesInput(null)).toBe('');
    expect(paiseToRupeesInput(undefined)).toBe('');
  });

  it('round-trips with rupeesToPaise', () => {
    const paise = rupeesToPaise('3500');
    expect(paiseToRupeesInput(paise)).toBe('3500');
  });
});

describe('sessionTypeLabel', () => {
  it('maps known session types to real labels', () => {
    expect(sessionTypeLabel('online')).toBe('Online only');
    expect(sessionTypeLabel('in-person')).toBe('In-person only');
    expect(sessionTypeLabel('both')).toBe('Online & in-person');
  });

  it('falls back to the raw value for an unrecognised type rather than hiding it', () => {
    expect(sessionTypeLabel('hybrid')).toBe('hybrid');
  });

  it('reports "Not set" for null/undefined', () => {
    expect(sessionTypeLabel(null)).toBe('Not set');
    expect(sessionTypeLabel(undefined)).toBe('Not set');
  });
});

describe('parseBufferMinutes', () => {
  it('parses a valid whole number', () => {
    expect(parseBufferMinutes('10')).toBe(10);
  });

  it('treats blank as "clear the override" (null)', () => {
    expect(parseBufferMinutes('')).toBeNull();
    expect(parseBufferMinutes('   ')).toBeNull();
  });

  it('rejects negative values', () => {
    expect(parseBufferMinutes('-5')).toBeUndefined();
  });

  it('rejects values above the 120-minute sanity bound', () => {
    expect(parseBufferMinutes('121')).toBeUndefined();
  });

  it('accepts the boundary value', () => {
    expect(parseBufferMinutes('120')).toBe(120);
    expect(parseBufferMinutes('0')).toBe(0);
  });

  it('rejects non-integer input', () => {
    expect(parseBufferMinutes('10.5')).toBeUndefined();
    expect(parseBufferMinutes('ten')).toBeUndefined();
  });
});

describe('verificationStatusLabel', () => {
  it('maps real backend verificationStatus values to human labels', () => {
    expect(verificationStatusLabel('approved')).toBe('Verified');
    expect(verificationStatusLabel('pending')).toBe('Under review');
    expect(verificationStatusLabel('suspended')).toBe('Suspended');
  });

  it('falls back to the raw value for an unmapped status', () => {
    expect(verificationStatusLabel('mystery_status')).toBe('mystery_status');
  });

  it('reports "Unknown" for null/undefined', () => {
    expect(verificationStatusLabel(null)).toBe('Unknown');
  });
});

describe('verificationIsApproved', () => {
  it('is true only for the approved status', () => {
    expect(verificationIsApproved('approved')).toBe(true);
    expect(verificationIsApproved('pending')).toBe(false);
    expect(verificationIsApproved(null)).toBe(false);
  });
});

describe('validateNewPassword', () => {
  it('rejects passwords under 8 characters', () => {
    expect(validateNewPassword('short1', 'short1')).toMatch(/at least 8/);
  });

  it('rejects a mismatched confirmation', () => {
    expect(validateNewPassword('longenough1', 'different1')).toMatch(/do not match/);
  });

  it('accepts a valid, matching password', () => {
    expect(validateNewPassword('longenough1', 'longenough1')).toBeNull();
  });
});

describe('normalizeTotpCode', () => {
  it('accepts a plain 6-digit code', () => {
    expect(normalizeTotpCode('123456')).toBe('123456');
  });

  it('strips spaces some authenticator apps display', () => {
    expect(normalizeTotpCode('123 456')).toBe('123456');
  });

  it('rejects a code that is not 6 digits', () => {
    expect(normalizeTotpCode('12345')).toBeNull();
    expect(normalizeTotpCode('1234567')).toBeNull();
  });

  it('rejects non-numeric input', () => {
    expect(normalizeTotpCode('abcdef')).toBeNull();
  });
});

describe('buildSupportMailto', () => {
  it('builds a mailto link with an encoded subject', () => {
    expect(buildSupportMailto('Payout / billing issue', 'support@iragu.com')).toBe(
      'mailto:support@iragu.com?subject=Payout%20%2F%20billing%20issue'
    );
  });
});

describe('dayLabel', () => {
  it('capitalises the day key', () => {
    expect(dayLabel('monday')).toBe('Monday');
    expect(dayLabel('sunday')).toBe('Sunday');
  });
});

function makeRow(overrides: Partial<DayScheduleRow> = {}): DayScheduleRow {
  return {
    day: 'monday',
    isAvailable: true,
    startTime: '09:00',
    endTime: '17:00',
    lunchStart: '',
    lunchEnd: '',
    ...overrides,
  };
}

describe('weeklyScheduleToRows', () => {
  it('produces all 7 days in Monday-first order', () => {
    const rows = weeklyScheduleToRows(undefined);
    expect(rows.map((r) => r.day)).toEqual([...WEEKLY_SCHEDULE_DAYS]);
  });

  it('maps a configured day from the real API shape', () => {
    const schedule: WeeklySchedule = {
      monday: { startTime: '10:00', endTime: '18:00', isAvailable: true, lunchStart: '13:00', lunchEnd: '14:00' },
    };
    const rows = weeklyScheduleToRows(schedule);
    const monday = rows.find((r) => r.day === 'monday')!;
    expect(monday).toEqual({
      day: 'monday',
      isAvailable: true,
      startTime: '10:00',
      endTime: '18:00',
      lunchStart: '13:00',
      lunchEnd: '14:00',
    });
  });

  it('defaults a day absent from the API map to unavailable with sane default times', () => {
    const rows = weeklyScheduleToRows({});
    const tuesday = rows.find((r) => r.day === 'tuesday')!;
    expect(tuesday.isAvailable).toBe(false);
    expect(tuesday.startTime).toBe('09:00');
    expect(tuesday.endTime).toBe('17:00');
    expect(tuesday.lunchStart).toBe('');
    expect(tuesday.lunchEnd).toBe('');
  });

  it('treats null the same as an empty schedule', () => {
    expect(weeklyScheduleToRows(null)).toEqual(weeklyScheduleToRows({}));
  });
});

describe('rowsToWeeklySchedule', () => {
  it('sends every day, including unavailable ones', () => {
    const rows = WEEKLY_SCHEDULE_DAYS.map((day) => makeRow({ day, isAvailable: day === 'monday' }));
    const schedule = rowsToWeeklySchedule(rows);
    expect(Object.keys(schedule).sort()).toEqual([...WEEKLY_SCHEDULE_DAYS].sort());
    expect(schedule.tuesday.isAvailable).toBe(false);
  });

  it('omits lunchStart/lunchEnd when no lunch break is set', () => {
    const schedule = rowsToWeeklySchedule([makeRow()]);
    expect(schedule.monday).toEqual({ startTime: '09:00', endTime: '17:00', isAvailable: true });
    expect(schedule.monday.lunchStart).toBeUndefined();
    expect(schedule.monday.lunchEnd).toBeUndefined();
  });

  it('includes lunchStart/lunchEnd when both are set', () => {
    const schedule = rowsToWeeklySchedule([makeRow({ lunchStart: '13:00', lunchEnd: '14:00' })]);
    expect(schedule.monday.lunchStart).toBe('13:00');
    expect(schedule.monday.lunchEnd).toBe('14:00');
  });

  it('round-trips with weeklyScheduleToRows for a fully configured week', () => {
    const rows = WEEKLY_SCHEDULE_DAYS.map((day) =>
      makeRow({ day, lunchStart: '13:00', lunchEnd: '14:00' })
    );
    const schedule = rowsToWeeklySchedule(rows);
    expect(weeklyScheduleToRows(schedule)).toEqual(rows);
  });
});

describe('validateScheduleRows', () => {
  it('accepts a valid available day', () => {
    expect(validateScheduleRows([makeRow()])).toBeNull();
  });

  it('ignores times on an unavailable day entirely', () => {
    const row = makeRow({ isAvailable: false, startTime: '', endTime: '' });
    expect(validateScheduleRows([row])).toBeNull();
  });

  it('rejects a start time at or after the end time', () => {
    const row = makeRow({ startTime: '17:00', endTime: '17:00' });
    expect(validateScheduleRows([row])).toMatch(/start time must be before end time/);

    const inverted = makeRow({ startTime: '18:00', endTime: '09:00' });
    expect(validateScheduleRows([inverted])).toMatch(/start time must be before end time/);
  });

  it('rejects a lunch start without a matching lunch end and vice versa', () => {
    expect(validateScheduleRows([makeRow({ lunchStart: '13:00' })])).toMatch(/both a lunch start and end/);
    expect(validateScheduleRows([makeRow({ lunchEnd: '14:00' })])).toMatch(/both a lunch start and end/);
  });

  it('rejects a lunch break outside working hours', () => {
    const before = makeRow({ startTime: '10:00', endTime: '17:00', lunchStart: '08:00', lunchEnd: '09:00' });
    expect(validateScheduleRows([before])).toMatch(/within working hours/);

    const after = makeRow({ startTime: '09:00', endTime: '17:00', lunchStart: '17:30', lunchEnd: '18:00' });
    expect(validateScheduleRows([after])).toMatch(/within working hours/);
  });

  it('rejects an inverted lunch break', () => {
    const row = makeRow({ lunchStart: '14:00', lunchEnd: '13:00' });
    expect(validateScheduleRows([row])).toMatch(/lunch start must be before lunch end/);
  });

  it('accepts a valid lunch break within working hours', () => {
    const row = makeRow({ lunchStart: '13:00', lunchEnd: '14:00' });
    expect(validateScheduleRows([row])).toBeNull();
  });

  it('checks every row, not just the first', () => {
    const rows = [makeRow({ day: 'monday' }), makeRow({ day: 'tuesday', startTime: '17:00', endTime: '09:00' })];
    expect(validateScheduleRows(rows)).toMatch(/Tuesday/);
  });
});
