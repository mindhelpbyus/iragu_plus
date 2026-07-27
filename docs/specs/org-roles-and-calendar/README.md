# Org Roles Cleanup + Practice-Wide Calendar

**Canonical spec lives in `backend-initial`:**
`backend-initial/docs/specs/org-roles-and-calendar/{requirements,design,tasks}.md`

It lives there (not here) because `backend-initial` owns the spec-workflow tooling
(`spec-requirements` → `spec-design` → `spec-tasks` → `spec-impl` KFC skills, per its
`CLAUDE.md`) and the foundational schema/migration/auth work. This repo
(`iragu_plus_saas`) is the primary product surface and does most of the visible
frontend work in that plan (Groups F–I of `tasks.md`), but the source of truth for
requirements/design/tasks is the copy in `backend-initial`.

If you're working from this repo, open the linked files directly — don't duplicate
or fork this doc set here.

## What this affects in this repo

- **Severs platform-operator identity from this app entirely.** `src/api/auth.ts`
  no longer aliases Cognito's `SuperAdmin`/`Admin` groups to anything — those are
  Bedrock's own platform-operator groups and have zero meaning here going forward.
  Two new, dedicated Cognito groups (`OrgOwner`, `PracticeAdmin`) drive the
  `org_owner`/`admin` canonical roles instead.
- Deletes the dead `org_admin` role from `src/api/auth.ts` and `src/lib/roles.ts`.
  Final role set: `org_owner`, `admin`, `therapist`, `client` (client stays blocked
  from this app, unchanged).
- **Permissions are no longer hardcoded here.** `lib/roles.ts`'s `ROLE_PERMISSIONS`/
  `can()`/`getPermissions()` are deleted. The app calls the backend
  (`GET /me/org-context`, served by a new dedicated `org` Lambda — NOT `/admin/*`)
  and consumes whatever `permissions: string[]` it returns via `hasPermission()`.
- Adds `useOrgContext` / `useOrgAppointments` hooks and a "My Calendar" / "Practice
  Calendar" mode switch to `CalendarPage.tsx`, for users who hold an org-wide
  `org_owner`/`admin` grant in addition to (or instead of) a personal therapist
  identity.
