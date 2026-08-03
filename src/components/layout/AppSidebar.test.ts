import { describe, it, expect } from 'vitest';
import { isNavItemVisible } from './AppSidebar';
import type { OrgContext } from '../../api/orgContext';

const SETTINGS_PERMISSIONS = [
  'settings:plan_info',
  'settings:team_members',
  'settings:demo_client',
  'settings:online_payments',
  'settings:payroll',
];

function orgContextWith(permissions: string[]): OrgContext {
  return {
    hasTherapistProfile: true,
    therapistId: 1,
    orgRoles: [],
    organizationId: null,
    permissions,
  };
}

describe('isNavItemVisible — Settings nav gated by settings:* permissions (task 40)', () => {
  const gatedItem = { to: '/settings', label: 'Settings', icon: () => null, requiresAnyPermission: SETTINGS_PERMISSIONS };
  const ungatedItem = { to: '/calendar', label: 'Calendar', icon: () => null };

  it('an ungated item is always visible, regardless of orgContext', () => {
    expect(isNavItemVisible(ungatedItem, null, false)).toBe(true);
    expect(isNavItemVisible(ungatedItem, orgContextWith([]), false)).toBe(true);
  });

  it('a gated item is visible when the caller holds ANY one of the required permission keys', () => {
    expect(isNavItemVisible(gatedItem, orgContextWith(['settings:payroll']), false)).toBe(true);
    expect(isNavItemVisible(gatedItem, orgContextWith(['settings:plan_info']), false)).toBe(true);
  });

  it('a gated item is hidden when the caller holds none of the required permission keys (e.g. admin, which excludes all 5 settings keys)', () => {
    expect(isNavItemVisible(gatedItem, orgContextWith(['clients:create', 'billing:edit_fees']), false)).toBe(false);
  });

  it('a gated item is hidden for a null orgContext once loading has finished (e.g. fetch failed)', () => {
    expect(isNavItemVisible(gatedItem, null, false)).toBe(false);
  });

  it('a gated item defaults to VISIBLE while orgContext is still loading, to avoid pop-in for the common solo-therapist case', () => {
    expect(isNavItemVisible(gatedItem, null, true)).toBe(true);
    expect(isNavItemVisible(gatedItem, orgContextWith([]), true)).toBe(true);
  });

  it('a gated item is hidden for an empty permissions array once loading is done', () => {
    expect(isNavItemVisible(gatedItem, orgContextWith([]), false)).toBe(false);
  });
});
