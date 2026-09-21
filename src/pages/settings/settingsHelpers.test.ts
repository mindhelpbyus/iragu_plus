import { describe, it, expect } from 'vitest';
import {
  rupeesToPaise,
  paiseToRupeesInput,
  sessionTypeLabel,
  parseBufferMinutes,
  verificationStatusLabel,
  verificationIsApproved,
  validateNewPassword,
  normalizeTotpCode,
  buildSupportMailto,
} from './settingsHelpers';

describe('rupeesToPaise', () => {
  it('converts a plain rupee string to paise', () => {
    expect(rupeesToPaise('2500')).toBe(250000);
  });

  it('handles paise (decimal) input', () => {
    expect(rupeesToPaise('2500.50')).toBe(250050);
  });

  it('strips thousands separators', () => {
    expect(rupeesToPaise('12,500')).toBe(1250000);
  });

  it('rejects empty input', () => {
    expect(rupeesToPaise('')).toBeNull();
    expect(rupeesToPaise('   ')).toBeNull();
  });

  it('rejects negative amounts', () => {
    expect(rupeesToPaise('-50')).toBeNull();
  });

  it('rejects non-numeric input', () => {
    expect(rupeesToPaise('abc')).toBeNull();
    expect(rupeesToPaise('50rs')).toBeNull();
  });

  it('rejects more than 2 decimal places', () => {
    expect(rupeesToPaise('50.123')).toBeNull();
  });

  it('accepts zero', () => {
    expect(rupeesToPaise('0')).toBe(0);
  });
});

describe('paiseToRupeesInput', () => {
  it('formats paise as a plain rupee string', () => {
    expect(paiseToRupeesInput(250000)).toBe('2500');
  });

  it('formats fractional rupees', () => {
    expect(paiseToRupeesInput(250050)).toBe('2500.5');
  });

  it('returns empty string for null/undefined', () => {
    expect(paiseToRupeesInput(null)).toBe('');
    expect(paiseToRupeesInput(undefined)).toBe('');
  });

  it('round-trips with rupeesToPaise', () => {
    const paise = rupeesToPaise('3500');
    expect(paiseToRupeesInput(paise)).toBe('3500');
  });
});

describe('sessionTypeLabel', () => {
  it('maps known session types to real labels', () => {
    expect(sessionTypeLabel('online')).toBe('Online only');
    expect(sessionTypeLabel('in-person')).toBe('In-person only');
    expect(sessionTypeLabel('both')).toBe('Online & in-person');
  });

  it('falls back to the raw value for an unrecognised type rather than hiding it', () => {
    expect(sessionTypeLabel('hybrid')).toBe('hybrid');
  });

  it('reports "Not set" for null/undefined', () => {
    expect(sessionTypeLabel(null)).toBe('Not set');
    expect(sessionTypeLabel(undefined)).toBe('Not set');
  });
});

describe('parseBufferMinutes', () => {
  it('parses a valid whole number', () => {
    expect(parseBufferMinutes('10')).toBe(10);
  });

  it('treats blank as "clear the override" (null)', () => {
    expect(parseBufferMinutes('')).toBeNull();
    expect(parseBufferMinutes('   ')).toBeNull();
  });

  it('rejects negative values', () => {
    expect(parseBufferMinutes('-5')).toBeUndefined();
  });

  it('rejects values above the 120-minute sanity bound', () => {
    expect(parseBufferMinutes('121')).toBeUndefined();
  });

  it('accepts the boundary value', () => {
    expect(parseBufferMinutes('120')).toBe(120);
    expect(parseBufferMinutes('0')).toBe(0);
  });

  it('rejects non-integer input', () => {
    expect(parseBufferMinutes('10.5')).toBeUndefined();
    expect(parseBufferMinutes('ten')).toBeUndefined();
  });
});

describe('verificationStatusLabel', () => {
  it('maps real backend verificationStatus values to human labels', () => {
    expect(verificationStatusLabel('approved')).toBe('Verified');
    expect(verificationStatusLabel('pending')).toBe('Under review');
    expect(verificationStatusLabel('suspended')).toBe('Suspended');
  });

  it('falls back to the raw value for an unmapped status', () => {
    expect(verificationStatusLabel('mystery_status')).toBe('mystery_status');
  });

  it('reports "Unknown" for null/undefined', () => {
    expect(verificationStatusLabel(null)).toBe('Unknown');
  });
});

describe('verificationIsApproved', () => {
  it('is true only for the approved status', () => {
    expect(verificationIsApproved('approved')).toBe(true);
    expect(verificationIsApproved('pending')).toBe(false);
    expect(verificationIsApproved(null)).toBe(false);
  });
});

describe('validateNewPassword', () => {
  it('rejects passwords under 8 characters', () => {
    expect(validateNewPassword('short1', 'short1')).toMatch(/at least 8/);
  });

  it('rejects a mismatched confirmation', () => {
    expect(validateNewPassword('longenough1', 'different1')).toMatch(/do not match/);
  });

  it('accepts a valid, matching password', () => {
    expect(validateNewPassword('longenough1', 'longenough1')).toBeNull();
  });
});

describe('normalizeTotpCode', () => {
  it('accepts a plain 6-digit code', () => {
    expect(normalizeTotpCode('123456')).toBe('123456');
  });

  it('strips spaces some authenticator apps display', () => {
    expect(normalizeTotpCode('123 456')).toBe('123456');
  });

  it('rejects a code that is not 6 digits', () => {
    expect(normalizeTotpCode('12345')).toBeNull();
    expect(normalizeTotpCode('1234567')).toBeNull();
  });

  it('rejects non-numeric input', () => {
    expect(normalizeTotpCode('abcdef')).toBeNull();
  });
});

describe('buildSupportMailto', () => {
  it('builds a mailto link with an encoded subject', () => {
    expect(buildSupportMailto('Payout / billing issue', 'support@iragu.com')).toBe(
      'mailto:support@iragu.com?subject=Payout%20%2F%20billing%20issue'
    );
  });
});
