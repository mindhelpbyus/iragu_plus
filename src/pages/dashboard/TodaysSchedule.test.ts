import { describe, it, expect, vi, afterEach } from 'vitest';
import { nextInMinutes } from './TodaysSchedule';
import type { RawAppointment } from '../../api/appointmentsBackend';

function apptAt(iso: string): RawAppointment {
  return { startTime: iso } as RawAppointment;
}

describe('nextInMinutes', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the whole-minute countdown to the next upcoming session', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-19T10:00:00.000Z'));
    expect(nextInMinutes([apptAt('2026-09-19T10:45:00.000Z')])).toBe(45);
  });

  it('picks the earliest still-upcoming session when several remain today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-19T10:00:00.000Z'));
    const appointments = [apptAt('2026-09-19T11:00:00.000Z'), apptAt('2026-09-19T10:10:00.000Z')];
    expect(nextInMinutes(appointments)).toBe(10);
  });

  it('rounds to the nearest whole minute', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-19T10:00:00.000Z'));
    expect(nextInMinutes([apptAt('2026-09-19T10:01:40.000Z')])).toBe(2); // 100s = 1.67m
  });

  it('skips an already-started session and returns the next one that has not started yet', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-19T10:00:00.000Z'));
    const appointments = [apptAt('2026-09-19T09:30:00.000Z'), apptAt('2026-09-19T10:20:00.000Z')];
    expect(nextInMinutes(appointments)).toBe(20);
  });

  it('returns null when the only session today has already started', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-19T10:00:00.000Z'));
    expect(nextInMinutes([apptAt('2026-09-19T09:30:00.000Z')])).toBeNull();
  });

  it('returns null for an empty appointment list', () => {
    expect(nextInMinutes([])).toBeNull();
  });
});
