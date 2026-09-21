/**
 * pages/support/ticketHelpers.ts — pure, exported functions for SupportPage:
 * status/priority badge mapping, the 72h reopen-window check, and cursor-
 * pagination state. Kept UI-framework-free so they're directly unit-testable
 * (see ticketHelpers.test.ts) rather than only reachable through a rendered
 * component.
 */
import type { Ticket, TicketPriority, TicketStatus } from '../../api/support';

// ─── Status badge ───────────────────────────────────────────────────────

export type BadgeVariant = 'green' | 'purple' | 'yellow' | 'blue' | 'neutral' | 'orange' | 'red';

export interface StatusBadgeMeta {
  label: string;
  variant: BadgeVariant;
}

const STATUS_BADGE_META: Record<TicketStatus, StatusBadgeMeta> = {
  open: { label: 'Open', variant: 'green' },
  in_progress: { label: 'In progress', variant: 'purple' },
  waiting: { label: 'Waiting on us', variant: 'yellow' },
  resolved: { label: 'Resolved', variant: 'blue' },
  closed: { label: 'Closed', variant: 'neutral' },
};

/** Maps a caller-visible ticket status to its badge label + color variant. */
export function statusBadgeMeta(status: TicketStatus): StatusBadgeMeta {
  return STATUS_BADGE_META[status];
}

// ─── Priority badge ─────────────────────────────────────────────────────

const PRIORITY_BADGE_META: Record<TicketPriority, StatusBadgeMeta> = {
  low: { label: 'Low', variant: 'neutral' },
  medium: { label: 'Medium', variant: 'yellow' },
  high: { label: 'High', variant: 'orange' },
  critical: { label: 'Critical', variant: 'red' },
};

/** Maps a ticket priority to its badge label + color variant. */
export function priorityBadgeMeta(priority: TicketPriority | undefined): StatusBadgeMeta {
  if (!priority) return { label: 'Not set', variant: 'neutral' };
  return PRIORITY_BADGE_META[priority];
}

// ─── Reopen window ──────────────────────────────────────────────────────
// Mirrors backend_support_api's tickets.controller.js REOPEN_WINDOW_HOURS /
// withinReopenWindow() exactly — for UX only (disabling the button, showing
// the right copy). The server re-checks this itself on every
// POST .../reopen and is the real gate; a client-side clock skew or a stale
// render here can never let an expired reopen through.
export const REOPEN_WINDOW_HOURS = 72;

/** Whether `resolvedAt` is still within the REOPEN_WINDOW_HOURS window as of `now`. */
export function isWithinReopenWindow(resolvedAt: string | null, now: Date = new Date()): boolean {
  if (!resolvedAt) return false;
  const hoursSince = (now.getTime() - new Date(resolvedAt).getTime()) / (1000 * 60 * 60);
  return hoursSince >= 0 && hoursSince <= REOPEN_WINDOW_HOURS;
}

/**
 * Whether the reopen action should be offered for this ticket at all —
 * only 'resolved' tickets, and only within the window. A 'closed' ticket
 * (auto-closed by the server's daily sweep once the same window elapses, or
 * closed directly) is never reopenable by the requester, matching the
 * server's own `existing.status !== 'resolved'` branch in
 * tickets.controller.js's POST .../reopen.
 */
export function canReopen(ticket: Pick<Ticket, 'status' | 'resolvedAt'>, now: Date = new Date()): boolean {
  return ticket.status === 'resolved' && isWithinReopenWindow(ticket.resolvedAt, now);
}

// ─── Cursor pagination ──────────────────────────────────────────────────
// backend_support_api's GET /tickets is cursor-paginated
// (`"<updatedAt-iso>,<id>"`, opaque — never parsed or constructed here, only
// round-tripped) rather than offset-paginated. This tracks a simple
// "cursors used to reach each page" stack so Back reuses the exact cursor
// that produced the earlier page (no server request needed to go back) and
// Next only advances when the server actually returned one (the last page
// has `nextCursor: null`).

export interface CursorPageState {
  /** cursorStack[0] is always null (first page). cursorStack[i] is the
   *  cursor that was sent to fetch page i. */
  cursorStack: (string | null)[];
  pageIndex: number;
}

export function initialCursorState(): CursorPageState {
  return { cursorStack: [null], pageIndex: 0 };
}

/** The cursor to send for the CURRENT page. */
export function currentCursor(state: CursorPageState): string | null {
  return state.cursorStack[state.pageIndex] ?? null;
}

export function canGoBack(state: CursorPageState): boolean {
  return state.pageIndex > 0;
}

export function canGoNext(nextCursor: string | null): boolean {
  return nextCursor !== null;
}

/**
 * Advances to the next page once the server has returned a real
 * `nextCursor` for the page just fetched. No-op (returns the same state) if
 * `nextCursor` is null — there is no next page to advance to.
 */
export function pushNextCursor(state: CursorPageState, nextCursor: string | null): CursorPageState {
  if (!nextCursor) return state;
  // Drop anything past the current page — e.g. having gone Back then
  // fetched a page with a different filter, any forward history from a
  // previous filter is now stale and must not be reused.
  const stack = state.cursorStack.slice(0, state.pageIndex + 1);
  stack.push(nextCursor);
  return { cursorStack: stack, pageIndex: stack.length - 1 };
}

/** Moves back one page (no-op at the first page). */
export function goToPreviousPage(state: CursorPageState): CursorPageState {
  if (!canGoBack(state)) return state;
  return { ...state, pageIndex: state.pageIndex - 1 };
}
