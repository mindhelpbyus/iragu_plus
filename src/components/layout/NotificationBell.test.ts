import { describe, it, expect, vi, afterEach } from 'vitest';
import { dayGroupOf } from './NotificationBell';

describe('dayGroupOf', () => {
  afterEach(() => vi.useRealTimers());

  it('same calendar day is Today, even hours apart from now', () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-09-19T15:00:00'));
    expect(dayGroupOf(new Date('2026-09-19T02:00:00').getTime())).toBe('Today');
  });

  it('previous calendar day is Yesterday', () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-09-19T15:00:00'));
    expect(dayGroupOf(new Date('2026-09-18T23:00:00').getTime())).toBe('Yesterday');
  });

  it('two or more days back is Earlier', () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-09-19T15:00:00'));
    expect(dayGroupOf(new Date('2026-09-16T12:00:00').getTime())).toBe('Earlier');
  });
});
