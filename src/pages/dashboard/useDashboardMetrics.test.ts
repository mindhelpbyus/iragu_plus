import { describe, it, expect } from 'vitest';
import { formatSessionsDelta } from './useDashboardMetrics';

describe('formatSessionsDelta', () => {
  it('formats a positive delta with a leading +', () => {
    expect(formatSessionsDelta(12, 9)).toBe('+3 vs last week');
  });

  it('formats a negative delta without a double minus sign (diff is already negative)', () => {
    expect(formatSessionsDelta(7, 10)).toBe('-3 vs last week');
  });

  it('reports no change as "Same as last week" rather than "+0 vs last week"', () => {
    expect(formatSessionsDelta(5, 5)).toBe('Same as last week');
  });

  it('returns null when last week\'s fetch failed, instead of fabricating a 0 baseline', () => {
    expect(formatSessionsDelta(5, null)).toBeNull();
  });
});
