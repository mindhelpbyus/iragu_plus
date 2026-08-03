import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { getOrgContext, type OrgContext } from '../../api/orgContext';

/**
 * Caches GET /me/org-context per logged-in user for the session — this is
 * called from several places (sidebar, calendar mode switch, permission
 * gates) and the caller's org role/permissions don't change mid-session, so
 * there's no reason to refetch per-mount. Keyed by user id: a login as a
 * different user (id mismatch) invalidates the cache automatically, which
 * also covers logout→login since `user` is null in between.
 */
let cache: { userId: string; promise: Promise<OrgContext> } | null = null;

function fetchOrgContext(userId: string): Promise<OrgContext> {
  if (!cache || cache.userId !== userId) {
    cache = {
      userId,
      promise: getOrgContext().catch((err) => {
        cache = null; // allow retry on next call rather than caching a failure
        throw err;
      }),
    };
  }
  return cache.promise;
}

/** Call on logout — belt-and-suspenders alongside the userId-keying above
 *  (which already invalidates on a different user's login): forces the
 *  very next org-context read in this tab to be a fresh network call,
 *  never a value resolved before this session's logout. */
export function clearOrgContextCache(): void {
  cache = null;
}

export function useOrgContext() {
  const user = useAuthStore((s) => s.user);
  const [orgContext, setOrgContext] = useState<OrgContext | null>(null);
  const [loading, setLoading] = useState(!!user);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setOrgContext(null);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchOrgContext(user.id)
      .then((ctx) => {
        if (!cancelled) setOrgContext(ctx);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load org context');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { orgContext, loading, error };
}

/** Whether the caller's resolved permission set includes the given key. */
export function hasPermission(orgContext: OrgContext | null, permission: string): boolean {
  return orgContext?.permissions.includes(permission) ?? false;
}

/**
 * The caller's display role label. Reads the DB-provided `Role.label` off
 * their highest-privilege org grant — the ONLY hardcoded fallback is the
 * literal "Therapist" string used when `orgRoles` is empty (no `UserOrgRole`
 * row to read a label from, e.g. a solo practitioner or plain org therapist).
 * Every other label comes from the API response, never a local map.
 */
export function currentRoleLabel(orgContext: OrgContext | null): string {
  return orgContext?.orgRoles[0]?.roleLabel ?? 'Therapist';
}

/**
 * True only when there's an actual multi-person org to show — i.e. someone
 * with `calendar:view_org` AND a real `orgRoles` grant. A solo/independent
 * therapist gets `calendar:view_org` too (via the `OrgRulesConfig` implicit
 * elevation, scoped to themselves) but has no colleagues and no real grant
 * row, so the "Practice calendars" picker would be pointless for them; this
 * deliberately excludes that case by checking `orgRoles.length`, not just
 * the permission key.
 */
export function hasMultiTherapistCalendars(orgContext: OrgContext | null): boolean {
  return !!orgContext && orgContext.orgRoles.length > 0 && hasPermission(orgContext, 'calendar:view_org');
}
