/**
 * SettingsPage — /settings and /settings/:section have no route-level
 * permission gate (App.tsx: RequireAuth only excludes the client role).
 * AppSidebar hides the nav link unless the caller holds a real settings:*
 * permission (see AppSidebar.test.ts), but that's nav-visibility, not
 * authorization — a therapist navigating here directly is not blocked by
 * the router.
 *
 * Found during a route-inventory pass, 2026-08-30: verified there is no
 * live data-exposure risk today because SettingsPage is currently a
 * placeholder with zero API calls and zero permission-gated content (see
 * App.tsx's route comment for the full writeup). This test pins that fact
 * down as a source-content guard, not a render test — this repo has no
 * DOM-testing environment configured yet (jsdom is installed but unwired;
 * every existing *.test.ts file is pure-logic, no @testing-library render
 * calls anywhere), and standing one up is a repo-wide decision bigger than
 * this one page warrants. If SettingsPage.tsx later grows a real fetch
 * call or imports something API-calling, this test breaks, forcing whoever
 * adds it to consciously add permission enforcement (via useOrgContext's
 * hasPermission) at that point rather than silently relying on nav-hiding
 * alone — same intent a render-based test would serve, without requiring
 * this repo to adopt a DOM environment just to prove it.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(__dirname, 'SettingsPage.tsx'), 'utf8');

describe('SettingsPage.tsx — placeholder, zero API surface (regression guard for the unauthorized-nav-access gap)', () => {
  it('does not call fetch, apiRequest, or apiFetch anywhere in its source', () => {
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toMatch(/\bapiRequest\s*\(/);
    expect(source).not.toMatch(/\bapiFetch\s*\(/);
  });

  it('does not import from the api/ client layer at all', () => {
    expect(source).not.toMatch(/from\s+['"]\.\.\/api\//);
  });

  it('does not check or reference org permissions — it has nothing to gate yet', () => {
    expect(source).not.toMatch(/hasPermission|useOrgContext/);
  });

  it('renders only the shared PlaceholderPage — still true today, so real settings content has not silently landed here ungated', () => {
    expect(source).toContain('PlaceholderPage');
    expect(source.split('\n').filter((l) => l.trim().length > 0).length).toBeLessThanOrEqual(6);
  });
});
