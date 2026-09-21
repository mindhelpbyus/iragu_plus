/**
 * pages/activity/useActivity.ts — merges five real, independent sources into
 * one chronological, filterable practice-wide activity feed:
 *
 *   Sessions  → GET /appointments/therapist (status=completed)   api/appointmentsBackend.ts
 *   Notes     → GET /clinical-notes/signed (date-ranged)         api/clinicalNotes.ts
 *   Payments  → GET .../transactions + GET .../payouts           api/billing.ts
 *   Messages  → GET /chat/conversations/{userId}                 api/chat.ts
 *   Clients   → GET /clients/activity-events                     api/clientActivity.ts
 *
 * IMPORTANT — Messages is lossy by construction: the conversations list
 * route only ever returns the single most recent message per conversation,
 * not a full log (there is no "list every message across every
 * conversation" route, nor should there be — that's every DM in the
 * practice). The UI must say this rather than imply a complete history; see
 * the note rendered in ActivityPage.
 *
 * This is NOT the Tasks feature's TaskActivityFeed.tsx (pages/dashboard) —
 * that is a checkbox/category to-do list. This is a read-only, practice-wide
 * timestamped log for oversight/audit, with no bearing on Tasks.
 *
 * The mapping/merge/filter functions below are pure and exported so they can
 * be unit-tested directly (see useActivity.test.ts) without mocking the
 * network — only the `useActivity` hook itself touches the API layer.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getMyTherapistId } from '../../api/therapistMe';
import { getMyAppointments, type RawAppointment } from '../../api/appointmentsBackend';
import { listSignedNotes, type ClinicalNoteRecord } from '../../api/clinicalNotes';
import { listTransactions, listPayouts, type TransactionRow, type PayoutRow } from '../../api/billing';
import { listConversations, type Conversation } from '../../api/chat';
import { getClientActivityEvents, type ClientActivityEvent } from '../../api/clientActivity';
import { getMyClients } from '../../api/clients';
import { formatPaise } from '../../lib/money';

export const ACTIVITY_CATEGORIES = ['Sessions', 'Notes', 'Payments', 'Messages', 'Clients'] as const;
export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];
export type ActivityFilter = 'all' | ActivityCategory;

export interface ActivityItem {
  /** Stable within one load — namespaced by source so ids can never collide across categories. */
  id: string;
  category: ActivityCategory;
  /** ISO 8601 — the merge/sort below relies on `new Date(timestamp)` parsing cleanly. */
  timestamp: string;
  /** Who/what the event is about — rendered bold, e.g. "Arjun Kapoor" or "You". */
  actor: string;
  /** The rest of the sentence, e.g. "completed a mood check-in (Happy)." */
  text: string;
  /** A `var(--token)` reference — never a literal hex, per globals.css convention. */
  dotColor: string;
}

const DOT: Record<ActivityCategory, string> = {
  Sessions: 'var(--lavender)',
  Notes: 'var(--action-dark)',
  Payments: 'var(--ochre)',
  Messages: 'var(--sage-dark)',
  Clients: 'var(--action)',
};
/** Overrides DOT.Clients for a missed check-in — a miss is worth flagging, not blending in. */
const DOT_MISSED = 'var(--danger)';

const SESSION_TYPE_LABEL: Record<string, string> = {
  individual: 'individual',
  couples: 'couples',
  family: 'family',
  group: 'group',
};

function clientFullName(client: { firstName: string; lastName: string } | null): string {
  if (!client) return 'a client';
  return `${client.firstName} ${client.lastName}`.trim() || 'a client';
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

// ─── Per-source mappers (pure — unit-tested) ───────────────────────────────

export function sessionToActivityItem(a: RawAppointment): ActivityItem {
  const durationMin = Math.max(
    0,
    Math.round((new Date(a.endTime).getTime() - new Date(a.startTime).getTime()) / 60_000),
  );
  const typeLabel = SESSION_TYPE_LABEL[a.type] ?? a.type;
  const modeLabel = a.mode === 'video' ? 'video' : 'in person';
  return {
    id: `session-${a.id}`,
    category: 'Sessions',
    timestamp: a.endTime,
    actor: 'You',
    text: `completed a ${typeLabel} session with ${clientFullName(a.client)} (${modeLabel}, ${durationMin} min).`,
    dotColor: DOT.Sessions,
  };
}

export function noteToActivityItem(n: ClinicalNoteRecord, clientNames: Record<number, string>): ActivityItem {
  const name = (n.clientId != null && clientNames[n.clientId]) || 'a client';
  return {
    id: `note-${n.id}`,
    category: 'Notes',
    timestamp: n.signedAt ?? n.createdAt,
    actor: 'You',
    text: `signed the ${n.noteType} note for ${name} (session #${n.appointmentId}).`,
    dotColor: DOT.Notes,
  };
}

export function transactionToActivityItem(
  t: TransactionRow,
  appointmentClientNames: Record<string, string>,
): ActivityItem {
  const amount = formatPaise(t.grossPaise);
  const name = t.appointmentId != null ? appointmentClientNames[String(t.appointmentId)] : undefined;
  return {
    id: `txn-${t.id}`,
    category: 'Payments',
    timestamp: t.occurredAt ?? t.createdAt ?? new Date(0).toISOString(),
    actor: 'Razorpay',
    text: name ? `captured ${amount} from ${name}.` : `captured ${amount}.`,
    dotColor: DOT.Payments,
  };
}

const PAYOUT_VERB: Record<string, string> = {
  completed: 'paid out',
  processing: 'is processing a payout of',
  pending: 'queued a payout of',
  failed: 'failed to pay out',
  on_hold: 'placed a payout of',
};

export function payoutToActivityItem(p: PayoutRow): ActivityItem {
  const amount = formatPaise(p.netAmountPaise);
  const verb = PAYOUT_VERB[p.status] ?? `recorded a payout of`;
  const suffix = p.status === 'on_hold' ? ' on hold' : '';
  return {
    id: `payout-${p.id}`,
    category: 'Payments',
    timestamp: p.completedAt ?? p.createdAt,
    actor: 'Iragu+',
    text: `${verb} ${amount}${suffix}${p.utr ? ` (UTR ${p.utr})` : ''}.`,
    dotColor: DOT.Payments,
  };
}

/**
 * Returns null when the conversation has no last message or no usable
 * timestamp — a conversation row with neither is not an event.
 *
 * LOSSY BY DESIGN: this is the single most recent message, not a full
 * thread — see the module doc comment and the note rendered in
 * ActivityPage.
 */
export function conversationToActivityItem(c: Conversation): ActivityItem | null {
  if (!c.lastMessage) return null;
  const timestamp = c.lastMessageTimestamp ? new Date(c.lastMessageTimestamp).toISOString() : c.updatedAt;
  if (!timestamp) return null;
  return {
    id: `msg-${c.conversationId}`,
    category: 'Messages',
    timestamp,
    actor: c.participantName,
    text: `— most recent message: "${truncate(c.lastMessage, 80)}"`,
    dotColor: DOT.Messages,
  };
}

export function clientEventToActivityItem(e: ClientActivityEvent): ActivityItem {
  const text =
    e.type === 'mood_checkin'
      ? `completed a mood check-in (${e.detail}).`
      : e.type === 'mood_missed'
        ? 'missed a scheduled mood check-in.'
        : `${e.detail}.`; // intake_completed
  return {
    id: `client-${e.type}-${e.clientId}-${e.timestamp}`,
    category: 'Clients',
    timestamp: e.timestamp,
    actor: e.clientName,
    text,
    dotColor: e.type === 'mood_missed' ? DOT_MISSED : DOT.Clients,
  };
}

// ─── Merge / sort / filter (pure — unit-tested) ────────────────────────────

export interface ActivitySources {
  sessions?: ActivityItem[];
  notes?: ActivityItem[];
  payments?: ActivityItem[];
  messages?: ActivityItem[];
  clients?: ActivityItem[];
}

/** Combines all five sources into one feed, newest first. Ties (identical
 *  timestamps) keep their source order, which is deterministic since Array#sort
 *  in every JS engine iragu_plus targets is stable. */
export function mergeActivity(sources: ActivitySources): ActivityItem[] {
  return [
    ...(sources.sessions ?? []),
    ...(sources.notes ?? []),
    ...(sources.payments ?? []),
    ...(sources.messages ?? []),
    ...(sources.clients ?? []),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function filterActivity(items: ActivityItem[], filter: ActivityFilter): ActivityItem[] {
  return filter === 'all' ? items : items.filter((item) => item.category === filter);
}

// ─── The hook ───────────────────────────────────────────────────────────

const DEFAULT_WINDOW_DAYS = 30;

export function useActivity(windowDays: number = DEFAULT_WINDOW_DAYS) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ActivityFilter>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
      const therapistId = await getMyTherapistId();

      const [sessionsRes, notesRes, txRes, payoutsRes, conversationsRes, clientEventsRes, clientsRes] =
        await Promise.allSettled([
          getMyAppointments(therapistId, { status: 'completed', startDate, endDate }),
          listSignedNotes(String(therapistId), { startDate, endDate }),
          listTransactions({ types: ['session_earning'], dateFrom: startDate, dateTo: endDate }),
          listPayouts({ dateFrom: startDate, dateTo: endDate }),
          listConversations(therapistId),
          getClientActivityEvents(startDate, endDate),
          getMyClients({ limit: 100 }),
        ]);

      const sessions = sessionsRes.status === 'fulfilled' ? sessionsRes.value : [];

      // appointmentId -> client name, so a Payments transaction (which only
      // carries an appointmentId) can still show who paid.
      const appointmentClientNames: Record<string, string> = {};
      for (const a of sessions) {
        if (a.client) appointmentClientNames[String(a.id)] = clientFullName(a.client);
      }

      const clientNames: Record<number, string> = {};
      if (clientsRes.status === 'fulfilled') {
        for (const c of clientsRes.value.data) {
          clientNames[c.id] = `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || 'Client';
        }
      }

      const merged = mergeActivity({
        sessions: sessions.map(sessionToActivityItem),
        notes: notesRes.status === 'fulfilled' ? notesRes.value.map((n) => noteToActivityItem(n, clientNames)) : [],
        payments: [
          ...(txRes.status === 'fulfilled'
            ? txRes.value.data.map((t) => transactionToActivityItem(t, appointmentClientNames))
            : []),
          ...(payoutsRes.status === 'fulfilled' ? payoutsRes.value.data.map(payoutToActivityItem) : []),
        ],
        messages:
          conversationsRes.status === 'fulfilled'
            ? conversationsRes.value.conversations
                .map(conversationToActivityItem)
                .filter((x): x is ActivityItem => x !== null)
            : [],
        clients: clientEventsRes.status === 'fulfilled' ? clientEventsRes.value.map(clientEventToActivityItem) : [],
      });

      setItems(merged);

      // A partial failure (e.g. billing_payment briefly down) should still
      // show whatever loaded rather than blanking the whole page — only
      // surface an error banner when literally every source failed.
      const sourceResults = [sessionsRes, notesRes, txRes, payoutsRes, conversationsRes, clientEventsRes];
      if (sourceResults.every((r) => r.status === 'rejected')) {
        setError('Failed to load activity.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  }, [windowDays]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => filterActivity(items, filter), [items, filter]);

  return {
    items: visible,
    totalCount: items.length,
    loading,
    error,
    filter,
    setFilter,
    reload: load,
  };
}
