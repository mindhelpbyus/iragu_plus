/**
 * SettingsPage now has a real API surface (see ./settings/ for the per-tab
 * hooks and their backend evidence) — the previous version of this file
 * deliberately guarded against that NOT happening, pinning the placeholder
 * state until permission enforcement was consciously added alongside real
 * content. That comment's own condition ("when a real sub-feature is built
 * here, it must check the caller's specific settings:<x> permission") does
 * not apply to the five tabs built now: Account/Availability/Services/
 * Notification-preferences/Compliance are all the caller's OWN data (any
 * therapist may read/edit their own profile regardless of org role) — see
 * SettingsPage.tsx's module doc for the full reasoning, and App.tsx's route
 * comment (updated alongside this file) for why no route-level or
 * `useOrgContext` gate was added for these specific tabs.
 *
 * What's left to test without a DOM environment (this repo has none — see
 * that removed comment) is the page's pure routing logic: which :section
 * values are recognised and what an invalid one falls back to.
 */
import { describe, it, expect } from 'vitest';
import { resolveSettingsTab, SETTINGS_TABS } from './SettingsPage';

describe('SETTINGS_TABS', () => {
  it('has exactly the 5 real tabs, no more, no less', () => {
    expect(SETTINGS_TABS.map((t) => t.id)).toEqual([
      'account',
      'availability',
      'services',
      'notifications-settings',
      'insurance',
    ]);
  });
});

describe('resolveSettingsTab', () => {
  it('resolves a known section id to itself', () => {
    expect(resolveSettingsTab('services')).toBe('services');
    expect(resolveSettingsTab('insurance')).toBe('insurance');
  });

  it('falls back to "account" for an unknown section', () => {
    expect(resolveSettingsTab('bogus')).toBe('account');
  });

  it('falls back to "account" when no section is given', () => {
    expect(resolveSettingsTab(undefined)).toBe('account');
  });
});
