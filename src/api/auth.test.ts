import { describe, it, expect } from 'vitest';
import { normalizeRole, roleFromGroups } from './auth';

describe('normalizeRole', () => {
  it('maps the OrgOwner Cognito group to org_owner', () => {
    expect(normalizeRole('OrgOwner')).toBe('org_owner');
    expect(normalizeRole('orgowner')).toBe('org_owner');
  });

  it('maps the PracticeAdmin Cognito group to admin', () => {
    expect(normalizeRole('PracticeAdmin')).toBe('admin');
    expect(normalizeRole('practiceadmin')).toBe('admin');
  });

  it('maps Therapists/Clients groups (plural, as Cognito names them)', () => {
    expect(normalizeRole('Therapists')).toBe('therapist');
    expect(normalizeRole('Clients')).toBe('client');
  });

  it('has no alias for SuperAdmin/Admin/platform-operator group names — falls back to client', () => {
    expect(normalizeRole('SuperAdmin')).toBe('client');
    expect(normalizeRole('superadmin')).toBe('client');
    expect(normalizeRole('super_admin')).toBe('client');
    expect(normalizeRole('Admin')).toBe('client');
    expect(normalizeRole('admin')).toBe('client');
    expect(normalizeRole('platform_admin')).toBe('client');
    expect(normalizeRole('account_owner')).toBe('client');
  });

  it('has no alias for the removed org_admin canonical role', () => {
    expect(normalizeRole('org_admin')).toBe('client');
    expect(normalizeRole('organization_admin')).toBe('client');
  });

  it('falls back to client for non-string/unrecognized input', () => {
    expect(normalizeRole(undefined)).toBe('client');
    expect(normalizeRole(null)).toBe('client');
    expect(normalizeRole(42)).toBe('client');
    expect(normalizeRole('something-unknown')).toBe('client');
  });
});

describe('roleFromGroups — SuperAdmin/Admin-only token fallback (Requirement 0.4)', () => {
  it('a token carrying ONLY SuperAdmin resolves to client', () => {
    expect(roleFromGroups(['SuperAdmin'])).toBe('client');
  });

  it('a token carrying ONLY Admin (platform) resolves to client', () => {
    expect(roleFromGroups(['Admin'])).toBe('client');
  });

  it('a token carrying SuperAdmin AND Admin, with no OrgOwner/PracticeAdmin/Therapists/Clients, still resolves to client', () => {
    expect(roleFromGroups(['SuperAdmin', 'Admin'])).toBe('client');
  });

  it('OrgOwner wins over Admin (platform) when both are present on the same token', () => {
    expect(roleFromGroups(['Admin', 'OrgOwner'])).toBe('org_owner');
  });

  it('PracticeAdmin wins over a bare Therapists group', () => {
    expect(roleFromGroups(['Therapists', 'PracticeAdmin'])).toBe('admin');
  });

  it('org_owner outranks admin per ROLE_PRECEDENCE when a user somehow holds both', () => {
    expect(roleFromGroups(['PracticeAdmin', 'OrgOwner'])).toBe('org_owner');
  });

  it('empty/missing groups resolves to client', () => {
    expect(roleFromGroups([])).toBe('client');
    expect(roleFromGroups(undefined)).toBe('client');
    expect(roleFromGroups(null)).toBe('client');
  });

  it('a single non-array group value is still handled', () => {
    expect(roleFromGroups('OrgOwner')).toBe('org_owner');
  });
});
