/**
 * api/orgContext.ts — GET /me/org-context (backend-initial's `org` Lambda).
 *
 * Resolves the caller's org role(s) and effective permissions so the UI never
 * hardcodes role-based logic — see docs/specs/org-roles-and-calendar/
 * design.md Component 5/6. Succeeds for ANY authenticated user, including one
 * with zero org grant at all (a plain therapist checking their own context).
 */
import { z } from 'zod';
import { apiFetch } from './client';

const orgRoleEntrySchema = z.object({
  role: z.enum(['org_owner', 'admin', 'full', 'billing']),
  roleLabel: z.string(),
  orgId: z.number(),
});

const orgContextSchema = z.object({
  hasTherapistProfile: z.boolean(),
  therapistId: z.number().nullable(),
  orgRoles: z.array(orgRoleEntrySchema),
  organizationId: z.number().nullable(),
  permissions: z.array(z.string()),
});

const orgContextEnvelopeSchema = z.object({
  success: z.boolean(),
  data: orgContextSchema,
});

export type OrgRoleEntry = z.infer<typeof orgRoleEntrySchema>;
export type OrgContext = z.infer<typeof orgContextSchema>;

export function getOrgContext(): Promise<OrgContext> {
  return apiFetch('/me/org-context', { schema: orgContextEnvelopeSchema, rawEnvelope: true }).then(
    (res) => res.data,
  );
}
