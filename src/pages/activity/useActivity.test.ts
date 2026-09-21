import { describe, it, expect } from 'vitest';
import {
  mergeActivity,
  filterActivity,
  sessionToActivityItem,
  noteToActivityItem,
  transactionToActivityItem,
  payoutToActivityItem,
  conversationToActivityItem,
  clientEventToActivityItem,
  type ActivityItem,
} from './useActivity';
import type { RawAppointment } from '../../api/appointmentsBackend';
import type { ClinicalNoteRecord } from '../../api/clinicalNotes';
import type { TransactionRow, PayoutRow } from '../../api/billing';
import type { Conversation } from '../../api/chat';
import type { ClientActivityEvent } from '../../api/clientActivity';

// ─── Fixtures ───────────────────────────────────────────────────────────

function item(overrides: Partial<ActivityItem>): ActivityItem {
  return {
    id: 'x-1',
    category: 'Sessions',
    timestamp: '2026-07-01T10:00:00Z',
    actor: 'You',
    text: 'did a thing.',
    dotColor: 'var(--lavender)',
    ...overrides,
  };
}

function appointment(overrides: Partial<RawAppointment> = {}): RawAppointment {
  return {
    id: 42,
    startTime: '2026-07-01T09:00:00Z',
    endTime: '2026-07-01T09:50:00Z',
    type: 'individual',
    mode: 'video',
    status: 'completed',
    consultingReason: null,
    notes: null,
    videoRoomUrl: null,
    colorOverride: null,
    client: { id: 9, email: 'arjun@example.com', firstName: 'Arjun', lastName: 'Kapoor' },
    therapist: { id: 5, email: 't@example.com', firstName: 'Priya', lastName: 'Rao' },
    ...overrides,
  };
}

function note(overrides: Partial<ClinicalNoteRecord> = {}): ClinicalNoteRecord {
  return {
    id: 1,
    appointmentId: 42,
    therapistId: 5,
    clientId: 9,
    noteType: 'SOAP',
    content: null,
    subjective: null,
    objective: null,
    assessment: null,
    plan: null,
    isSigned: true,
    signedAt: '2026-07-01T11:00:00Z',
    createdAt: '2026-07-01T10:30:00Z',
    updatedAt: '2026-07-01T11:00:00Z',
    ...overrides,
  };
}

function transaction(overrides: Partial<TransactionRow> = {}): TransactionRow {
  return {
    id: 'txn_1',
    type: 'session_earning',
    occurredAt: '2026-07-01T09:55:00Z',
    createdAt: '2026-07-01T09:55:00Z',
    appointmentId: 42,
    currency: 'INR',
    status: 'captured',
    grossPaise: 250000,
    deductionsPaise: 5000,
    netPaise: 245000,
    ...overrides,
  };
}

function payout(overrides: Partial<PayoutRow> = {}): PayoutRow {
  return {
    id: 'payout_1',
    status: 'completed',
    grossAmountPaise: 2610000,
    commissionPaise: 100000,
    tdsPaise: 50000,
    clawbackPaise: 0,
    deductionsPaise: 150000,
    netAmountPaise: 2460000,
    currency: 'INR',
    createdAt: '2026-07-08T05:00:00Z',
    completedAt: '2026-07-08T06:00:00Z',
    failureReason: null,
    utr: 'UTR123456',
    batchId: 'batch_1',
    payoutMethod: 'bank_transfer',
    ...overrides,
  };
}

function conversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    conversationId: 'conv_1',
    userId: '9',
    role: 'client',
    participantName: 'Arjun Kapoor',
    lastMessage: 'See you Friday',
    lastMessageTimestamp: new Date('2026-07-01T12:00:00Z').getTime(),
    unreadCount: 0,
    blockedByMe: false,
    ...overrides,
  };
}

function clientEvent(overrides: Partial<ClientActivityEvent> = {}): ClientActivityEvent {
  return {
    type: 'mood_checkin',
    clientId: 9,
    clientName: 'Arjun Kapoor',
    timestamp: '2026-07-01T08:00:00Z',
    detail: 'Happy',
    ...overrides,
  };
}

// ─── mergeActivity ──────────────────────────────────────────────────────

describe('mergeActivity', () => {
  it('combines all five sources into one list', () => {
    const merged = mergeActivity({
      sessions: [item({ id: 's1', category: 'Sessions' })],
      notes: [item({ id: 'n1', category: 'Notes' })],
      payments: [item({ id: 'p1', category: 'Payments' })],
      messages: [item({ id: 'm1', category: 'Messages' })],
      clients: [item({ id: 'c1', category: 'Clients' })],
    });
    expect(merged.map((x) => x.id).sort()).toEqual(['c1', 'm1', 'n1', 'p1', 's1']);
  });

  it('sorts newest first across sources, not just within one source', () => {
    const merged = mergeActivity({
      sessions: [item({ id: 'old-session', timestamp: '2026-07-01T08:00:00Z' })],
      payments: [item({ id: 'new-payment', category: 'Payments', timestamp: '2026-07-03T08:00:00Z' })],
      notes: [item({ id: 'mid-note', category: 'Notes', timestamp: '2026-07-02T08:00:00Z' })],
    });
    expect(merged.map((x) => x.id)).toEqual(['new-payment', 'mid-note', 'old-session']);
  });

  it('treats missing sources as empty without throwing', () => {
    expect(mergeActivity({})).toEqual([]);
  });

  it('does not mutate the input arrays', () => {
    const sessions = [item({ id: 'a', timestamp: '2026-07-01T08:00:00Z' }), item({ id: 'b', timestamp: '2026-07-03T08:00:00Z' })];
    const originalOrder = sessions.map((x) => x.id);
    mergeActivity({ sessions });
    expect(sessions.map((x) => x.id)).toEqual(originalOrder);
  });
});

// ─── filterActivity ─────────────────────────────────────────────────────

describe('filterActivity', () => {
  const items = [
    item({ id: 's1', category: 'Sessions' }),
    item({ id: 'n1', category: 'Notes' }),
    item({ id: 'p1', category: 'Payments' }),
  ];

  it('returns everything for "all"', () => {
    expect(filterActivity(items, 'all')).toHaveLength(3);
  });

  it('returns only the matching category', () => {
    expect(filterActivity(items, 'Notes').map((x) => x.id)).toEqual(['n1']);
  });

  it('returns an empty array when nothing matches', () => {
    expect(filterActivity(items, 'Clients')).toEqual([]);
  });
});

// ─── sessionToActivityItem ──────────────────────────────────────────────

describe('sessionToActivityItem', () => {
  it('maps a completed session to a Sessions event with computed duration', () => {
    const result = sessionToActivityItem(appointment());
    expect(result.category).toBe('Sessions');
    expect(result.timestamp).toBe('2026-07-01T09:50:00Z'); // endTime
    expect(result.text).toBe('completed a individual session with Arjun Kapoor (video, 50 min).');
  });

  it('labels an in_person session correctly', () => {
    const result = sessionToActivityItem(appointment({ mode: 'in_person' }));
    expect(result.text).toContain('in person');
  });

  it('falls back to "a client" when the client relation is null', () => {
    const result = sessionToActivityItem(appointment({ client: null }));
    expect(result.text).toContain('with a client');
  });
});

// ─── noteToActivityItem ─────────────────────────────────────────────────

describe('noteToActivityItem', () => {
  it('resolves the client name from the lookup map and uses signedAt as the timestamp', () => {
    const result = noteToActivityItem(note(), { 9: 'Arjun Kapoor' });
    expect(result.category).toBe('Notes');
    expect(result.timestamp).toBe('2026-07-01T11:00:00Z');
    expect(result.text).toBe('signed the SOAP note for Arjun Kapoor (session #42).');
  });

  it('falls back to createdAt when signedAt is null', () => {
    const result = noteToActivityItem(note({ signedAt: null }), { 9: 'Arjun Kapoor' });
    expect(result.timestamp).toBe('2026-07-01T10:30:00Z');
  });

  it('falls back to "a client" when the id is not in the lookup map', () => {
    const result = noteToActivityItem(note(), {});
    expect(result.text).toContain('for a client');
  });

  it('falls back to "a client" when clientId is null', () => {
    const result = noteToActivityItem(note({ clientId: null }), { 9: 'Arjun Kapoor' });
    expect(result.text).toContain('for a client');
  });
});

// ─── transactionToActivityItem ──────────────────────────────────────────

describe('transactionToActivityItem', () => {
  it('names the client via the appointmentId lookup map', () => {
    const result = transactionToActivityItem(transaction(), { '42': 'Arjun Kapoor' });
    expect(result.category).toBe('Payments');
    expect(result.actor).toBe('Razorpay');
    expect(result.text).toBe('captured ₹2,500 from Arjun Kapoor.');
    expect(result.timestamp).toBe('2026-07-01T09:55:00Z');
  });

  it('omits the client name when the appointment is not in the lookup map', () => {
    const result = transactionToActivityItem(transaction(), {});
    expect(result.text).toBe('captured ₹2,500.');
  });

  it('falls back to createdAt when occurredAt is null', () => {
    const result = transactionToActivityItem(transaction({ occurredAt: null, createdAt: '2026-07-02T00:00:00Z' }), {});
    expect(result.timestamp).toBe('2026-07-02T00:00:00Z');
  });
});

// ─── payoutToActivityItem ───────────────────────────────────────────────

describe('payoutToActivityItem', () => {
  it('describes a completed payout with its UTR', () => {
    const result = payoutToActivityItem(payout());
    expect(result.actor).toBe('Iragu+');
    expect(result.text).toBe('paid out ₹24,600 (UTR UTR123456).');
    expect(result.timestamp).toBe('2026-07-08T06:00:00Z'); // completedAt
  });

  it('falls back to createdAt when not yet completed', () => {
    const result = payoutToActivityItem(payout({ status: 'processing', completedAt: null }));
    expect(result.timestamp).toBe('2026-07-08T05:00:00Z');
    expect(result.text).toContain('is processing a payout of');
  });

  it('flags an on_hold payout distinctly', () => {
    const result = payoutToActivityItem(payout({ status: 'on_hold', completedAt: null, utr: null }));
    expect(result.text).toBe('placed a payout of ₹24,600 on hold.');
  });
});

// ─── conversationToActivityItem ─────────────────────────────────────────

describe('conversationToActivityItem', () => {
  it('maps a conversation with a last message', () => {
    const result = conversationToActivityItem(conversation());
    expect(result).not.toBeNull();
    expect(result!.category).toBe('Messages');
    expect(result!.actor).toBe('Arjun Kapoor');
    expect(result!.text).toContain('See you Friday');
    expect(result!.timestamp).toBe(new Date(conversation().lastMessageTimestamp!).toISOString());
  });

  it('returns null when there is no last message — not a fabricated event', () => {
    expect(conversationToActivityItem(conversation({ lastMessage: undefined }))).toBeNull();
  });

  it('falls back to updatedAt when lastMessageTimestamp is absent', () => {
    const result = conversationToActivityItem(
      conversation({ lastMessageTimestamp: undefined, updatedAt: '2026-07-02T00:00:00Z' }),
    );
    expect(result!.timestamp).toBe('2026-07-02T00:00:00Z');
  });

  it('returns null when neither timestamp field is available', () => {
    expect(
      conversationToActivityItem(conversation({ lastMessageTimestamp: undefined, updatedAt: undefined })),
    ).toBeNull();
  });

  it('truncates a very long last message', () => {
    const long = 'x'.repeat(200);
    const result = conversationToActivityItem(conversation({ lastMessage: long }));
    expect(result!.text.length).toBeLessThan(120);
    expect(result!.text).toContain('…');
  });
});

// ─── clientEventToActivityItem ──────────────────────────────────────────

describe('clientEventToActivityItem', () => {
  it('describes a mood check-in with its detail', () => {
    const result = clientEventToActivityItem(clientEvent());
    expect(result.category).toBe('Clients');
    expect(result.text).toBe('completed a mood check-in (Happy).');
    expect(result.dotColor).toBe('var(--action)');
  });

  it('describes a missed check-in with a distinct (danger) dot color', () => {
    const result = clientEventToActivityItem(clientEvent({ type: 'mood_missed', detail: 'Missed scheduled mood check-in' }));
    expect(result.text).toBe('missed a scheduled mood check-in.');
    expect(result.dotColor).toBe('var(--danger)');
  });

  it('describes an intake completion using the server-provided detail', () => {
    const result = clientEventToActivityItem(
      clientEvent({ type: 'intake_completed', detail: 'Completed intake form' }),
    );
    expect(result.text).toBe('Completed intake form.');
  });
});
