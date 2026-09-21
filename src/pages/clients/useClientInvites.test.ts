import { describe, it, expect, vi, afterEach } from 'vitest';
import { sortInvites, pendingInvitesCount, inviteStatusMeta, toInvitedClient } from './useClientInvites';
import type { InvitedClient, SentInvite } from '../../api/clientInvites';

function invite(overrides: Partial<InvitedClient>): InvitedClient {
  return {
    id: 'inv_1',
    name: 'Kavya Reddy',
    email: 'kavya@example.com',
    phone: null,
    status: 'invited',
    invitedAt: '2026-09-01T10:00:00Z',
    sentAt: '2026-09-01T10:00:05Z',
    expiresAt: '2026-09-15T10:00:00Z',
    emailSent: true,
    emailError: null,
    ...overrides,
  };
}

describe('sortInvites', () => {
  it('puts invited (pending) rows before accepted/revoked/expired rows', () => {
    const rows = [
      invite({ id: 'a', status: 'accepted', invitedAt: '2026-09-05T10:00:00Z' }),
      invite({ id: 'b', status: 'invited', invitedAt: '2026-09-01T10:00:00Z' }),
    ];
    expect(sortInvites(rows).map((r) => r.id)).toEqual(['b', 'a']);
  });

  it('orders same-status rows by most recently invited first', () => {
    const rows = [
      invite({ id: 'older', status: 'invited', invitedAt: '2026-09-01T10:00:00Z' }),
      invite({ id: 'newer', status: 'invited', invitedAt: '2026-09-10T10:00:00Z' }),
    ];
    expect(sortInvites(rows).map((r) => r.id)).toEqual(['newer', 'older']);
  });

  it('does not mutate the input array', () => {
    const rows = [invite({ id: 'a' }), invite({ id: 'b', invitedAt: '2026-09-10T10:00:00Z' })];
    const original = [...rows];
    sortInvites(rows);
    expect(rows).toEqual(original);
  });
});

describe('pendingInvitesCount', () => {
  it('counts only invited-status rows', () => {
    const rows = [
      invite({ id: 'a', status: 'invited' }),
      invite({ id: 'b', status: 'accepted' }),
      invite({ id: 'c', status: 'invited' }),
      invite({ id: 'd', status: 'revoked' }),
    ];
    expect(pendingInvitesCount(rows)).toBe(2);
  });

  it('returns 0 for an empty list', () => {
    expect(pendingInvitesCount([])).toBe(0);
  });
});

describe('inviteStatusMeta', () => {
  it('labels an invited row as Pending', () => {
    expect(inviteStatusMeta('invited').label).toBe('Pending');
  });

  it('labels an accepted row as Joined', () => {
    expect(inviteStatusMeta('accepted').label).toBe('Joined');
  });

  it('labels a revoked row as Withdrawn', () => {
    expect(inviteStatusMeta('revoked').label).toBe('Withdrawn');
  });

  it('labels an expired row as Expired', () => {
    expect(inviteStatusMeta('expired').label).toBe('Expired');
  });

  it('falls back to the raw status string for an unrecognised value', () => {
    expect(inviteStatusMeta('something_new').label).toBe('something_new');
  });
});

describe('toInvitedClient', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const sent: SentInvite = {
    id: 'inv_9',
    name: 'Dev Malhotra',
    email: 'dev@example.com',
    phone: null,
    status: 'invited',
    expiresAt: '2026-09-15T10:00:00Z',
    sentAt: '2026-09-01T10:00:05Z',
    emailSent: true,
  };

  it('carries every field the POST response provides straight through', () => {
    const row = toInvitedClient(sent);
    expect(row.id).toBe('inv_9');
    expect(row.name).toBe('Dev Malhotra');
    expect(row.email).toBe('dev@example.com');
    expect(row.status).toBe('invited');
    expect(row.sentAt).toBe('2026-09-01T10:00:05Z');
    expect(row.expiresAt).toBe('2026-09-15T10:00:00Z');
    expect(row.emailSent).toBe(true);
  });

  it('stamps invitedAt with the current time, since the POST response has no createdAt', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-20T12:00:00Z'));
    const row = toInvitedClient(sent);
    expect(row.invitedAt).toBe('2026-09-20T12:00:00.000Z');
  });

  it('normalises a missing emailError to null rather than undefined', () => {
    const row = toInvitedClient(sent);
    expect(row.emailError).toBeNull();
  });

  it('passes through a real emailError when the send failed', () => {
    const failed: SentInvite = { ...sent, emailSent: false, emailError: 'Could not deliver.', emailErrorCode: 'EMAIL_SEND_FAILED' };
    expect(toInvitedClient(failed).emailError).toBe('Could not deliver.');
  });
});
