import { describe, it, expect } from 'vitest';
import { isValidInviteEmail } from './clientInvites';

describe('isValidInviteEmail', () => {
  it('accepts a plain valid address', () => {
    expect(isValidInviteEmail('priya@example.com')).toBe(true);
  });

  it('accepts an address with a subdomain and plus-tag', () => {
    expect(isValidInviteEmail('priya+client@mail.example.co.in')).toBe(true);
  });

  it('rejects an empty string', () => {
    expect(isValidInviteEmail('')).toBe(false);
  });

  it('rejects an address with no @', () => {
    expect(isValidInviteEmail('priya.example.com')).toBe(false);
  });

  it('rejects an address with no domain suffix', () => {
    expect(isValidInviteEmail('priya@example')).toBe(false);
  });

  it('rejects an address containing whitespace', () => {
    expect(isValidInviteEmail('priya @example.com')).toBe(false);
  });

  it('trims surrounding whitespace before validating', () => {
    expect(isValidInviteEmail('  priya@example.com  ')).toBe(true);
  });

  it('rejects an address over 254 characters', () => {
    const long = `${'a'.repeat(250)}@example.com`; // > 254 chars total
    expect(isValidInviteEmail(long)).toBe(false);
  });
});
