# Practice Plan Subscription (Phase A: entitlement model)

**Canonical spec lives in `backend-initial`:**
`backend-initial/docs/specs/practice-plan-subscription/{requirements,design,tasks}.md`

Same convention as `docs/specs/org-roles-and-calendar/` in this repo — `backend-initial`
owns the spec-workflow tooling and all schema/migration/auth work for this slice.

## What this affects in this repo

**Nothing, in Phase A.** This slice replaces what determines the value of
`canCreateOrganization` on the backend (a `Plan`/`Subscription` record instead of a
bare `User.canCreateOrganization` boolean) but does not change `GET /me/org-context`'s
response shape at all. The planned "Create my practice" UI
(`docs/specs/org-roles-and-calendar/tasks.md` task 46) reads `canCreateOrganization`
exactly as already scoped — build it against that field with no awareness of what's
behind it.

Phase B (real Razorpay recurring billing, self-service plan upgrade/checkout UI) is
explicitly future work and would touch this repo — see Requirement 8 in the canonical
spec's `requirements.md`. Not started.
