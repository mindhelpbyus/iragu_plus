import { describe, it, expect } from 'vitest';
import { resolveDisconnectView } from './useVideoCallState';

describe('resolveDisconnectView', () => {
  it('routes a deliberate user leave to ended, regardless of connection history', () => {
    expect(resolveDisconnectView('user-left', true)).toEqual({ view: 'ended', error: null });
    expect(resolveDisconnectView('user-left', false)).toEqual({ view: 'ended', error: null });
  });

  it('routes a therapist-initiated end to ended', () => {
    expect(resolveDisconnectView('ended-by-therapist', true)).toEqual({ view: 'ended', error: null });
  });

  it('routes an unexpected disconnect AFTER a real connection to failover, not error', () => {
    expect(resolveDisconnectView('connection-lost', true)).toEqual({ view: 'failover', error: null });
  });

  it('routes an unexpected disconnect BEFORE ever connecting to error, with the reason surfaced', () => {
    expect(resolveDisconnectView('connection-lost', false)).toEqual({
      view: 'error',
      error: 'connection-lost',
    });
  });

  it('falls back to a generic message when no reason is given and never connected', () => {
    expect(resolveDisconnectView(undefined, false)).toEqual({
      view: 'error',
      error: 'Connection lost before the call could start.',
    });
  });
});
