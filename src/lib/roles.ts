/**
 * Role → permission model for Iragu+ (therapist/practice app).
 *
 *   org_owner   — owns the organization (practice-wide: billing, roster, all
 *                 clients/calendars/settings). Cognito group: SuperAdmin.
 *   org_admin   — manages one practice day-to-day: client list, billing,
 *                 therapist roster within their org. No real Cognito group
 *                 yet (see auth.ts) — forward-declared.
 *   admin       — platform-wide (cross-organization) support/ops access.
 *                 Cognito group: Admin.
 *   therapist   — own calendar/clients/earnings only. EXCEPT: a therapist
 *                 with no organizationId (independent solo practice) has no
 *                 wider org to defer to, so they get org_owner-level
 *                 permissions scoped to just their own data — this isn't a
 *                 privilege escalation, it removes the "ask your org_admin"
 *                 step that doesn't apply when you have no org.
 *   client      — no access to this portal at all; belongs in iragu_saas
 *                 (the separate client-facing app). See RequireAuth in App.tsx.
 */
import type { AuthUser, CanonicalRole } from '../api/auth';

export type Permission =
  | 'view_own_calendar'
  | 'view_org_calendars'
  | 'manage_client_roster'
  | 'manage_billing'
  | 'manage_therapist_roster'
  | 'manage_org_settings';

const ROLE_PERMISSIONS: Record<Exclude<CanonicalRole, 'client'>, Permission[]> = {
  org_owner: [
    'view_own_calendar',
    'view_org_calendars',
    'manage_client_roster',
    'manage_billing',
    'manage_therapist_roster',
    'manage_org_settings',
  ],
  org_admin: ['view_own_calendar', 'view_org_calendars', 'manage_client_roster', 'manage_billing', 'manage_therapist_roster'],
  admin: [
    'view_own_calendar',
    'view_org_calendars',
    'manage_client_roster',
    'manage_billing',
    'manage_therapist_roster',
    'manage_org_settings',
  ],
  therapist: ['view_own_calendar'],
};

/** A solo/independent therapist (no organizationId) acts as their own org_owner, scoped to just their own data. */
function effectiveRole(user: Pick<AuthUser, 'role' | 'organizationId'>): CanonicalRole {
  if (user.role === 'therapist' && !user.organizationId) return 'org_owner';
  return user.role;
}

export function getPermissions(user: Pick<AuthUser, 'role' | 'organizationId'> | null | undefined): Permission[] {
  if (!user || user.role === 'client') return [];
  return ROLE_PERMISSIONS[effectiveRole(user) as Exclude<CanonicalRole, 'client'>] ?? [];
}

export function can(user: Pick<AuthUser, 'role' | 'organizationId'> | null | undefined, permission: Permission): boolean {
  return getPermissions(user).includes(permission);
}

/**
 * True only when there's an actual multi-person org to show — i.e. someone
 * with view_org_calendars AND a real organizationId. A solo/independent
 * therapist has view_org_calendars (via the org_owner elevation, scoped to
 * themselves) but no colleagues, so the "Practice calendars" picker would be
 * pointless for them; this deliberately excludes that case.
 */
export function hasMultiTherapistCalendars(user: Pick<AuthUser, 'role' | 'organizationId'> | null | undefined): boolean {
  return !!user && !!user.organizationId && can(user, 'view_org_calendars');
}

const ROLE_LABELS: Record<CanonicalRole, string> = {
  org_owner: 'Org owner',
  org_admin: 'Org admin',
  admin: 'Admin',
  therapist: 'Therapist',
  client: 'Client',
};

/** Human-readable label for the raw (non-elevated) role — e.g. the sidebar user chip. */
export function roleLabel(role: CanonicalRole | undefined): string {
  return role ? (ROLE_LABELS[role] ?? role) : '';
}
