import { describe, it, expect } from 'vitest';
import {
  statusBadgeMeta,
  priorityBadgeMeta,
  isWithinReopenWindow,
  canReopen,
  REOPEN_WINDOW_HOURS,
  initialCursorState,
  currentCursor,
  pushNextCursor,
  goToPreviousPage,
  canGoBack,
  canGoNext,
} from './ticketHelpers';

describe('statusBadgeMeta', () => {
  it('maps every caller-visible status to a label + variant', () => {
    expect(statusBadgeMeta('open')).toEqual({ label: 'Open', variant: 'green' });
    expect(statusBadgeMeta('in_progress')).toEqual({ label: 'In progress', variant: 'purple' });
    expect(statusBadgeMeta('waiting')).toEqual({ label: 'Waiting on us', variant: 'yellow' });
    expect(statusBadgeMeta('resolved')).toEqual({ label: 'Resolved', variant: 'blue' });
    expect(statusBadgeMeta('closed')).toEqual({ label: 'Closed', variant: 'neutral' });
  });
});

describe('priorityBadgeMeta', () => {
  it('maps every priority to a label + variant', () => {
    expect(priorityBadgeMeta('low')).toEqual({ label: 'Low', variant: 'neutral' });
    expect(priorityBadgeMeta('medium')).toEqual({ label: 'Medium', variant: 'yellow' });
    expect(priorityBadgeMeta('high')).toEqual({ label: 'High', variant: 'orange' });
    expect(priorityBadgeMeta('critical')).toEqual({ label: 'Critical', variant: 'red' });
  });

  it('falls back to "Not set" rather than crashing when priority is missing from metadata', () => {
    expect(priorityBadgeMeta(undefined)).toEqual({ label: 'Not set', variant: 'neutral' });
  });
});

describe('isWithinReopenWindow', () => {
  it('is false when never resolved (resolvedAt is null)', () => {
    expect(isWithinReopenWindow(null)).toBe(false);
  });

  it('is true just inside the 72h window', () => {
    const now = new Date('2026-09-21T12:00:00.000Z');
    const resolvedAt = new Date(now.getTime() - (REOPEN_WINDOW_HOURS - 1) * 60 * 60 * 1000).toISOString();
    expect(isWithinReopenWindow(resolvedAt, now)).toBe(true);
  });

  it('is true exactly at the 72h boundary', () => {
    const now = new Date('2026-09-21T12:00:00.000Z');
    const resolvedAt = new Date(now.getTime() - REOPEN_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
    expect(isWithinReopenWindow(resolvedAt, now)).toBe(true);
  });

  it('is false just past the 72h boundary', () => {
    const now = new Date('2026-09-21T12:00:00.000Z');
    const resolvedAt = new Date(now.getTime() - (REOPEN_WINDOW_HOURS * 60 * 60 * 1000 + 1)).toISOString();
    expect(isWithinReopenWindow(resolvedAt, now)).toBe(false);
  });

  it('is false for a resolvedAt in the future (clock skew / bad data)', () => {
    const now = new Date('2026-09-21T12:00:00.000Z');
    const resolvedAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    expect(isWithinReopenWindow(resolvedAt, now)).toBe(false);
  });
});

describe('canReopen', () => {
  const now = new Date('2026-09-21T12:00:00.000Z');
  const recentlyResolvedAt = new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString();
  const staleResolvedAt = new Date(now.getTime() - (REOPEN_WINDOW_HOURS + 1) * 60 * 60 * 1000).toISOString();

  it('is true for a resolved ticket within the window', () => {
    expect(canReopen({ status: 'resolved', resolvedAt: recentlyResolvedAt }, now)).toBe(true);
  });

  it('is false for a resolved ticket past the window', () => {
    expect(canReopen({ status: 'resolved', resolvedAt: staleResolvedAt }, now)).toBe(false);
  });

  it('is false for a closed ticket even if it was resolved recently (server never allows reopening from closed for a requester)', () => {
    expect(canReopen({ status: 'closed', resolvedAt: recentlyResolvedAt }, now)).toBe(false);
  });

  it('is false for an open/in_progress/waiting ticket', () => {
    expect(canReopen({ status: 'open', resolvedAt: null }, now)).toBe(false);
    expect(canReopen({ status: 'in_progress', resolvedAt: null }, now)).toBe(false);
    expect(canReopen({ status: 'waiting', resolvedAt: null }, now)).toBe(false);
  });
});

describe('cursor pagination', () => {
  it('starts on page 0 with a null cursor and no way back', () => {
    const state = initialCursorState();
    expect(currentCursor(state)).toBeNull();
    expect(canGoBack(state)).toBe(false);
  });

  it('advances to a new page when the server returns a real nextCursor', () => {
    let state = initialCursorState();
    state = pushNextCursor(state, '2026-09-20T10:00:00.000Z,tkt_1');
    expect(state.pageIndex).toBe(1);
    expect(currentCursor(state)).toBe('2026-09-20T10:00:00.000Z,tkt_1');
    expect(canGoBack(state)).toBe(true);
  });

  it('is a no-op when nextCursor is null (last page — nothing to advance to)', () => {
    const state = initialCursorState();
    const next = pushNextCursor(state, null);
    expect(next).toEqual(state);
    expect(canGoNext(null)).toBe(false);
    expect(canGoNext('2026-09-20T10:00:00.000Z,tkt_1')).toBe(true);
  });

  it('going back reuses the exact cursor that produced the earlier page, without dropping forward history', () => {
    let state = initialCursorState();
    state = pushNextCursor(state, 'cursor-page-2');
    state = pushNextCursor(state, 'cursor-page-3');
    expect(currentCursor(state)).toBe('cursor-page-3');

    state = goToPreviousPage(state);
    expect(state.pageIndex).toBe(1);
    expect(currentCursor(state)).toBe('cursor-page-2');

    state = goToPreviousPage(state);
    expect(state.pageIndex).toBe(0);
    expect(currentCursor(state)).toBeNull();
    expect(canGoBack(state)).toBe(false);
  });

  it('going back then fetching a new next page truncates the stale forward history', () => {
    let state = initialCursorState();
    state = pushNextCursor(state, 'cursor-page-2-old');
    state = pushNextCursor(state, 'cursor-page-3-old'); // pageIndex 2, stale future
    state = goToPreviousPage(state); // back to pageIndex 1

    // A fresh fetch from here (e.g. after switching the status filter) returns
    // a DIFFERENT next cursor than the stale one recorded above.
    state = pushNextCursor(state, 'cursor-page-2-new');

    expect(state.pageIndex).toBe(2);
    expect(state.cursorStack).toEqual([null, 'cursor-page-2-old', 'cursor-page-2-new']);
  });

  it('goToPreviousPage is a no-op on the first page', () => {
    const state = initialCursorState();
    expect(goToPreviousPage(state)).toEqual(state);
  });
});
