/**
 * api/orgTherapists.ts — GET /org/therapists (the `org` Lambda) — the
 * caller's org's therapist roster, for the Practice Calendar's
 * TherapistFilter (docs/specs/org-roles-and-calendar/design.md Component 9).
 */
import { z } from 'zod';
import { apiFetch } from './client';

const therapistSummarySchema = z.object({
  id: z.number(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  isActive: z.boolean(),
});

const orgTherapistsEnvelopeSchema = z.object({
  success: z.boolean(),
  data: z.object({
    data: z.array(therapistSummarySchema),
    pagination: z.object({ page: z.number(), pageSize: z.number(), total: z.number(), totalPages: z.number() }),
  }),
});

export type TherapistSummary = z.infer<typeof therapistSummarySchema>;

export function getOrgTherapists(): Promise<TherapistSummary[]> {
  // pageSize=100 — practice rosters are small in Phase-1-era orgs; a
  // dedicated paginated picker isn't warranted yet for this dropdown.
  return apiFetch('/org/therapists?pageSize=100', { schema: orgTherapistsEnvelopeSchema, rawEnvelope: true }).then(
    (res) => res.data.data,
  );
}
