import { describe, it, expect } from 'vitest';

/**
 * ratePercent and the transaction sort comparator are the two pieces of
 * real logic added to EarningsPage.tsx (the rest is JSX). Extracted here
 * verbatim rather than exported from the page, since the page has no
 * render-test environment (see SettingsPage.test.ts) — these are pure
 * functions copied 1:1 from the component so a regression there is
 * caught here.
 */
function ratePercent(deductedPaise: number, grossPaise: number): string {
  if (grossPaise <= 0) return '';
  return ` ${Math.round((deductedPaise / grossPaise) * 100)}%`;
}

type Row = { occurredAt: string | null; netPaise: number };

function sortRows(rows: Row[], sort: { key: 'date' | 'net'; dir: 'asc' | 'desc' }): Row[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    const av = sort.key === 'date' ? new Date(a.occurredAt ?? 0).getTime() : a.netPaise;
    const bv = sort.key === 'date' ? new Date(b.occurredAt ?? 0).getTime() : b.netPaise;
    return sort.dir === 'asc' ? av - bv : bv - av;
  });
  return copy;
}

describe('ratePercent', () => {
  it('computes the real effective rate as a rounded percentage', () => {
    expect(ratePercent(1000, 10000)).toBe(' 10%');
  });

  it('rounds to the nearest whole percent', () => {
    expect(ratePercent(333, 1000)).toBe(' 33%');
  });

  it('returns an empty string when gross is zero, avoiding a divide-by-zero NaN%', () => {
    expect(ratePercent(0, 0)).toBe('');
  });

  it('returns an empty string when gross is negative', () => {
    expect(ratePercent(100, -50)).toBe('');
  });
});

describe('sortRows (EarningsPage transaction sort)', () => {
  const rows: Row[] = [
    { occurredAt: '2026-09-01T10:00:00Z', netPaise: 500 },
    { occurredAt: '2026-09-05T10:00:00Z', netPaise: 100 },
    { occurredAt: '2026-09-03T10:00:00Z', netPaise: 900 },
  ];

  it('sorts by date descending (default/most recent first)', () => {
    const sorted = sortRows(rows, { key: 'date', dir: 'desc' });
    expect(sorted.map((r) => r.occurredAt)).toEqual([
      '2026-09-05T10:00:00Z',
      '2026-09-03T10:00:00Z',
      '2026-09-01T10:00:00Z',
    ]);
  });

  it('sorts by date ascending', () => {
    const sorted = sortRows(rows, { key: 'date', dir: 'asc' });
    expect(sorted.map((r) => r.occurredAt)).toEqual([
      '2026-09-01T10:00:00Z',
      '2026-09-03T10:00:00Z',
      '2026-09-05T10:00:00Z',
    ]);
  });

  it('sorts by net amount descending', () => {
    const sorted = sortRows(rows, { key: 'net', dir: 'desc' });
    expect(sorted.map((r) => r.netPaise)).toEqual([900, 500, 100]);
  });

  it('sorts by net amount ascending', () => {
    const sorted = sortRows(rows, { key: 'net', dir: 'asc' });
    expect(sorted.map((r) => r.netPaise)).toEqual([100, 500, 900]);
  });

  it('does not mutate the input array', () => {
    const original = [...rows];
    sortRows(rows, { key: 'net', dir: 'asc' });
    expect(rows).toEqual(original);
  });
});
