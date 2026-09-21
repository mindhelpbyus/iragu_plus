import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { SUPPORT_CATEGORIES, SUPPORT_EMAIL } from './SupportPage';
import { buildSupportMailto } from './settings/settingsHelpers';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(__dirname, 'SupportPage.tsx'), 'utf8');

describe('SUPPORT_CATEGORIES', () => {
  it('has the 3 real category tiles from the design, each with a real mailto subject', () => {
    expect(SUPPORT_CATEGORIES.map((c) => c.id)).toEqual(['billing', 'telehealth', 'other']);
    for (const cat of SUPPORT_CATEGORIES) {
      expect(cat.subject.length).toBeGreaterThan(0);
    }
  });

  it('every category resolves to a well-formed mailto link', () => {
    for (const cat of SUPPORT_CATEGORIES) {
      const link = buildSupportMailto(cat.subject, SUPPORT_EMAIL);
      expect(link).toMatch(/^mailto:support@iragu\.com\?subject=/);
    }
  });
});

describe('SupportPage.tsx — no fake ticket backend', () => {
  it('never calls fetch/apiRequest/apiFetch — this page has no reachable ticket backend to call', () => {
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toMatch(/\bapiRequest\s*\(/);
    expect(source).not.toMatch(/\bapiFetch\s*\(/);
  });

  it('does not fabricate a ticket list or submission success state', () => {
    expect(source).not.toMatch(/supportTickets/i);
    expect(source).not.toMatch(/ticket submitted/i);
  });
});
