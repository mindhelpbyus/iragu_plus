import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatAgo, itemName, itemSubtitle } from './RequestsPage';
import type { RequestItem } from '../api/requests';

const inquiry: RequestItem = {
  kind: 'inquiry',
  id: 1,
  therapistId: 10,
  prospectClientUserId: 20,
  prospectName: 'Kavya Reddy',
  message: 'Looking for CBT support for work stress.',
  requestedStartTime: '2026-09-25T10:00:00Z',
  requestedEndTime: '2026-09-25T11:00:00Z',
  requestedMode: 'video',
  requestedType: 'individual',
  status: 'pending',
  resultingAppointmentId: null,
  declineReason: null,
  createdAt: '2026-09-20T10:00:00Z',
};

const reschedule: RequestItem = {
  kind: 'reschedule',
  id: 2,
  appointmentId: 30,
  clientName: 'Dev Malhotra',
  requestedBy: 'client',
  currentStartTime: '2026-09-22T11:00:00Z',
  currentEndTime: '2026-09-22T12:00:00Z',
  requestedStartTime: '2026-09-22T14:00:00Z',
  requestedEndTime: '2026-09-22T15:00:00Z',
  reason: 'Work conflict',
  status: 'pending',
  declineReason: null,
  createdAt: '2026-09-20T10:00:00Z',
};

describe('itemName', () => {
  it('uses prospectName for an inquiry', () => {
    expect(itemName(inquiry)).toBe('Kavya Reddy');
  });

  it('falls back honestly when an inquiry has no linked prospect name', () => {
    expect(itemName({ ...inquiry, prospectName: null })).toBe('A prospective client');
  });

  it('uses clientName for a reschedule request', () => {
    expect(itemName(reschedule)).toBe('Dev Malhotra');
  });

  it('falls back honestly when a reschedule request has no client name', () => {
    expect(itemName({ ...reschedule, clientName: null })).toBe('A client');
  });
});

describe('itemSubtitle', () => {
  it('shows the inquiry message', () => {
    expect(itemSubtitle(inquiry)).toBe('Looking for CBT support for work stress.');
  });

  it('shows the reschedule reason when given', () => {
    expect(itemSubtitle(reschedule)).toBe('Work conflict');
  });

  it('falls back to a generic line when no reschedule reason was given', () => {
    expect(itemSubtitle({ ...reschedule, reason: null })).toBe('Would like to move this session');
  });
});

describe('formatAgo', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows minutes for anything under an hour', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-20T10:30:00Z'));
    expect(formatAgo('2026-09-20T10:15:00Z')).toBe('15m ago');
  });

  it('shows hours for anything under a day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-20T15:00:00Z'));
    expect(formatAgo('2026-09-20T10:00:00Z')).toBe('5h ago');
  });

  it('shows days beyond 24 hours', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-23T10:00:00Z'));
    expect(formatAgo('2026-09-20T10:00:00Z')).toBe('3d ago');
  });
});
