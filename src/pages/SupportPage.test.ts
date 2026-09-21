/**
 * SupportPage now has a real ticket-tracking backend
 * (backend_support_api, wired via src/api/support.ts) — the previous
 * version of this file deliberately pinned the OPPOSITE state: assertions
 * that this page never calls fetch/apiFetch/apiRequest and never mentions
 * "supportTickets", guarding against a fake ticket UI shipping against a
 * backend this repo couldn't reach. That backend is reachable now (same
 * shared API Gateway, same Cognito pool — see api/support.ts's module doc),
 * so those regression guards are inverted below: real ticket wiring is now
 * the expected, tested state, not a regression to prevent.
 *
 * This repo has no DOM test environment configured (jsdom/Testing Library
 * are installed but no vitest `environment: 'jsdom'` is set — see
 * SettingsPage.test.ts's own note) — so, matching this codebase's
 * established pattern, real logic is tested via SupportPage's exported pure
 * functions/constants directly, and the page's architecture (which real
 * modules it imports and composes) via a source-string check for anything
 * not otherwise exported. The detailed behavior (status/priority badge
 * mapping, the 72h reopen window, cursor pagination) lives in
 * ./support/ticketHelpers.ts and is unit-tested in
 * ./support/ticketHelpers.test.ts, not duplicated here.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { SUPPORT_CATEGORIES, SUPPORT_EMAIL, STATUS_FILTERS, formatDateTime } from './SupportPage';
import { buildSupportMailto } from './settings/settingsHelpers';
import { TICKET_STATUSES } from '../api/support';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(__dirname, 'SupportPage.tsx'), 'utf8');

describe('SUPPORT_CATEGORIES (mailto fallback section)', () => {
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

describe('STATUS_FILTERS', () => {
  it('is "all" plus exactly the real caller-visible ticket statuses, in order', () => {
    expect(STATUS_FILTERS).toEqual(['all', ...TICKET_STATUSES]);
  });

  it('never includes the agent-only "engineering" status a therapist can never actually see', () => {
    expect(STATUS_FILTERS).not.toContain('engineering');
  });
});

describe('formatDateTime', () => {
  it('formats a real ISO timestamp into a non-empty, valid display string', () => {
    const formatted = formatDateTime('2026-09-20T10:30:00.000Z');
    expect(formatted.length).toBeGreaterThan(0);
    expect(formatted).not.toMatch(/invalid/i);
  });
});

describe('SupportPage.tsx — real ticket integration wired', () => {
  it('composes the real ticket-list, ticket-detail, and new-ticket-form modules (inverse of the old "no wiring" guard)', () => {
    expect(source).toMatch(/useTicketList/);
    expect(source).toMatch(/useTicketDetail/);
    expect(source).toMatch(/NewTicketModal/);
  });

  it('imports its ticket types/constants from the real support API contract, not a fabricated one', () => {
    expect(source).toMatch(/from '\.\.\/api\/support'/);
  });

  it('keeps the mailto fallback card rather than deleting it outright (real tickets are primary, mailto stays as backup)', () => {
    expect(source).toMatch(/FallbackContactSection/);
    expect(source).toMatch(/buildSupportMailto/);
    expect(source).toMatch(/SUPPORT_CATEGORIES/);
  });

  it('offers a reopen action gated by the real 72h-window helper, not a hand-rolled duplicate check', () => {
    expect(source).toMatch(/canReopen/);
  });
});
