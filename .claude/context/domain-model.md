# Domain Model — iragu_plus

> Rebuilt 2026-09-21 against the actual current repo state — this repo had
> several agents landing real pages/API clients **concurrently** with this
> AI-skill scaffolding work (this file's first draft went stale within the
> same session: `AnalyticsPage`/`ActivityPage` went from placeholder to real,
> and `src/api/support.ts`, `clientActivity.ts`, `homework.ts` were added,
> all after the first draft was written). Always re-derive counts from
> `src/App.tsx` + `find src/api -maxdepth 1 -name "*.ts"` rather than trusting
> a stale number here — this repo's churn rate this session was unusually
> high. Maintained by the `ai-maintenance` skill — update one `change_type`
> at a time as real code lands. Do not silently invalidate a row; if a page
> moves to a different backend or a file is removed, use `ai-maintenance` to
> fix it.

This repo calls **four separate backend services** — see `CLAUDE.md`'s
Backend Map for the full wiring-pattern table. Every row below that names a
backend uses these short forms:
- **BI** = `backend-initial` (default `API_BASE_URL`, default Cognito access token, routes at root)
- **BP** = `billing_payment` (same `API_BASE_URL`, `/api/` path prefix, caller-supplied ID-token header)
- **VS** = `video_service` (separate `VIDEO_API_BASE_URL`, via `videoGet`/`videoPost`)
- **SA** = `backend_support_api` (same `API_BASE_URL` as BI, caller-supplied ID-token header like BP, but routes at root like BI — a third distinct sub-pattern; see `src/api/support.ts`'s `supportHeaders()`)
- **Cognito** = direct SDK call, no backend route at all (identity layer underneath all four)
- **none** = no backend call (static/local-only)

---

## Page → Feature Map

| Page | Route(s) | Feature | Backend(s) | Calls (via hook, where one exists) |
|---|---|---|---|---|
| `LoginPage` | `/login` | Email/password + TOTP MFA sign-in | Cognito | `api/auth.ts` → `lib/cognito.ts` (SRP, direct) |
| `SignupPage` | `/signup` | Registration + email verification | Cognito | `api/auth.ts` (`register`, `verifyEmail`, `resendConfirmationCode`, `login`) |
| `ProfileCompletionPage` | `/complete-profile` | Soft-nudge profile completion form (not a hard gate — see Key Business Rules) | BI | `api/therapistProfile.ts` |
| `GuestJoinPage` | `/telehealth/guest/:roomId`, `/g/:code` | Public, unauthenticated telehealth join via signed link/short code | VS | `api/videoService.ts` (`guestJoinRoom`, `resolveGuestLinkCode`) |
| `DashboardPage` | `/dashboard` | Metrics, today's schedule, compliance card, task/activity feed | BI | `pages/dashboard/useDashboardMetrics.ts` → `api/clients.ts`, `api/appointmentsBackend.ts`, `api/therapistMe.ts`, `api/moods.ts`; `pages/dashboard/useTasks.ts` → `api/tasks.ts` |
| `CalendarPage` | `/calendar` | Practice calendar — day/week/month, org multi-therapist view, book/block-time modals | BI | `pages/calendar/useMyAppointments.ts`, `useMyLeaves.ts`, `useMyBlockedSlots.ts`, `useAvailabilityRange.ts`, `useAutoSyncTimezone.ts`, `useOrgAppointments.ts`, `useOrgContext.ts` → `api/appointmentsBackend.ts`, `api/leave.ts`, `api/availability.ts`, `api/therapistMe.ts`, `api/orgContext.ts`; page itself also calls `api/orgTherapists.ts` directly |
| `ClientsPage` | `/clients` | Client roster, client invites (send/list/withdraw) | BI | `pages/clients/useClients.ts` → `api/clients.ts`, `api/appointmentsBackend.ts`, `api/therapistMe.ts`, `api/moods.ts`; `pages/clients/useClientInvites.ts` → `api/clientInvites.ts` |
| `ClientDetailPage` | `/clients/:clientId` | Single client profile — detail, notes, consent, appointments, mood history, homework | BI | `api/clientDetail.ts` (`getClientDetail`, `getClientNotes`, `getClientConsent`), `api/appointmentsBackend.ts` (`getClientAppointments`), `api/moods.ts` (`getClientMoods`), `api/homework.ts` (`listHomework`, `updateHomework`) — called directly, no dedicated hook |
| `RequestsPage` | `/requests` | Inquiry + reschedule request approve/decline queue | BI | `pages/requests/useRequests.ts` → `api/requests.ts` |
| `NotesPage` | `/notes` | Clinical notes list, edit, sign | BI | `pages/notes/useNotes.ts` → `api/therapistMe.ts`, `api/clients.ts`, `api/clinicalNotes.ts` |
| `MessagesPage` | `/messages` | Chat — conversation list, thread, block/unblock | BI | `pages/messages/useMessages.ts` → `api/therapistMe.ts`, `api/chat.ts` (+ `lib/chatRealtime.ts` for the AppSync Events subscribe side) |
| `TelehealthPage` | `/telehealth`, `/telehealth/:appointmentId` | Scheduled-session video call (LiveKit/Zoom/Jitsi provider) | BI + VS | Page itself: `api/appointmentsBackend.ts` (`getAppointmentDetails`), `api/clientDetail.ts` (`getClientDetail`) — both BI. Its `TelehealthSplitView` child: `api/videoService.ts` (`joinAppointmentRoom`, VS) + `api/clinicalNotes.ts` (`createClinicalNote`, BI) |
| `InstantRoomPage` | `/telehealth/room/:roomId` | Ad-hoc/instant video room, not tied to a scheduled appointment | BI + VS | Page itself: `api/videoService.ts` (`joinRoom`, VS). Its `InstantSessionPanel` child: `api/videoService.ts` (room notes/chat, VS) + `api/clients.ts`, `api/therapistMe.ts`, `api/appointmentsBackend.ts`, `api/clinicalNotes.ts` (all BI) |
| `EarningsPage` | `/billing` | Earnings summary + transaction list | BP + BI | `pages/earnings/useEarnings.ts` → `api/billing.ts` (`getEarningsSummary`, `listTransactions` — BP) + `api/appointmentsBackend.ts`, `api/therapistMe.ts` (BI) |
| `StatementsPage` | `/invoices` | Payout statement list + download | BP | `pages/statements/useStatements.ts` → `api/billing.ts` (`getEarningsSummary`, `listPayoutStatements`, `getInvoiceDownload`) |
| `PayoutsPage` | `/payments` | Payout history + bank details | BP | `pages/payouts/usePayouts.ts` → `api/billing.ts` (`getEarningsSummary`, `listPayouts`, `getBankDetails`) |
| `PlansPage` | `/plans` | Fee/commission breakdown | BP | `api/billing.ts` (`getFeeBreakdown`) — called directly, no dedicated hook |
| `AnalyticsPage` | `/analytics` | Revenue chart (6-month), session-mix breakdown, attendance rate — real, built this session | BP + BI | `pages/analytics/useAnalytics.ts` → `api/billing.ts` (`listTransactions` — BP) + `api/appointmentsBackend.ts`, `api/therapistMe.ts` (BI) |
| `ActivityPage` | `/activity` | Practice-wide, filterable, chronological activity log (Sessions/Notes/Payments/Messages/Clients) — real, built this session; merges 5 independent API modules client-side | BI + BP | `pages/activity/useActivity.ts` → `api/appointmentsBackend.ts`, `api/clinicalNotes.ts`, `api/chat.ts`, `api/clientActivity.ts`, `api/clients.ts` (all BI) + `api/billing.ts` (`listTransactions`, `listPayouts` — **BP**) |
| `SettingsPage` | `/settings`, `/settings/:section` | Account / Availability / Services / Notifications / Compliance tabs | BI + BP | `useSettingsProfile.ts` → `api/therapistProfile.ts` (BI); `useAccountSecurity.ts` → `api/auth.ts` (Cognito MFA/password, BI-adjacent); `useNotificationSettings.ts` → `api/notificationPreferences.ts` (BI); `useWeeklySchedule.ts` → `api/availability.ts`, `api/therapistMe.ts` (BI); `useComplianceStatus.ts` → `api/billing.ts` (`getBankDetails` — **BP**, the one billing_payment call inside Settings) |
| `SupportPage` | `/support` | Real support-ticket UI (list/create/reply/reopen/attachments) + static contact `mailto:` fallback — rebuilt this session once `backend_support_api` wiring was confirmed real | **SA** | `pages/support/useSupportTickets.ts` → `api/support.ts` (`createTicket`, `listTickets`, `getTicket`, `postTicketReply`, `reopenTicket`, `uploadTicketAttachment`) — the only page in this repo that calls backend_support_api. Still uses `pages/settings/settingsHelpers.ts`'s `buildSupportMailto` for the static contact-card fallback (local, no API) |

**Count: 21 routed page components** (24 `<Route>` entries — `GuestJoinPage`,
`TelehealthPage`, and `SettingsPage` each serve 2+ routes). **All 21 are now
real** — `AnalyticsPage` and `ActivityPage` were the last two `PlaceholderPage`s
and were both built out this session (concurrently with this AI-skill
scaffolding work, hence this file needing a rebuild mid-session).

---

## API Surface

> One row per `src/api/*.ts` file (21 backend-facing files + `client.ts`
> itself, the shared transport). Backend column uses the short forms defined
> above. "Key routes" is representative, not exhaustive — read the file for
> the full export list.

| File | Backend | Key routes / calls | Response validation |
|---|---|---|---|
| `client.ts` | *(transport, not a backend itself)* | `apiRequest`/`apiFetch`/`get`/`post`/`put`/`patch`/`del`, `videoGet`/`videoPost` (baseUrl override) | zod via `apiFetch`'s `schema` param |
| `auth.ts` | Cognito (direct SDK, no backend route) | Sign-in/up/out, TOTP MFA setup/verify/disable, password change — via `lib/cognito.ts` | N/A (Cognito SDK types) |
| `appointmentsBackend.ts` | BI | `GET/POST /appointments`, `GET /org/appointments`, per-client appointment list | zod |
| `availability.ts` | BI | `GET/PUT /therapists/availability/{id}`, `/slots`, `/blocked-slots` | zod |
| `chat.ts` | BI | `GET /chat/conversations/{userId}`, `GET /chat/messages/{conversationId}`, block/unblock, read-receipts; **send** bypasses REST entirely — publishes directly to AppSync Events with a raw ID token (not `apiFetch`) | zod |
| `clientDetail.ts` | BI | `GET /clients/{id}`, `GET /clinical-notes/client?clientId=`, `GET /clients/{id}/consent` | zod |
| `clientInvites.ts` | BI | `POST /clients/invite`, `GET /clients/invites`, `DELETE /clients/invites/{id}` | zod |
| `clients.ts` | BI | `GET /therapist/me/clients`, `GET /clients` (admin/org variant) | zod |
| `clientActivity.ts` | BI | `GET /clients/activity-events?startDate=&endDate=` (mood check-ins/missed days/intake completions across the caller's own client roster) | zod |
| `clinicalNotes.ts` | BI | `POST /clinical-notes`, list/update/sign therapist notes, `GET /clinical-notes/signed?startDate=&endDate=` | zod |
| `files.ts` | BI | `POST /files` (S3 presigned upload) | zod |
| `homework.ts` | BI | `POST/GET /homework`, `GET/PATCH/DELETE /homework/{id}` — tied to a real `appointmentId` (`assertAppointmentTie`), same discipline as `clinicalNotes.ts` | zod |
| `leave.ts` | BI | `GET/POST/DELETE /therapists/availability/{id}/leave` | zod |
| `moods.ts` | BI | Client daily-mood reads | zod |
| `notificationPreferences.ts` | BI | `GET/PUT /users/me/notification-preferences` | zod |
| `notifications.ts` | BI | `GET /notification-inbox`, mark-read, `POST /notification-inbox/read-all` | zod |
| `orgContext.ts` | BI | `GET /me/org-context` (caller's org role + permissions) | zod |
| `orgTherapists.ts` | BI | `GET /org/therapists?pageSize=100` | zod |
| `requests.ts` | BI | `GET /requests`, `POST /inquiries/{id}/approve\|decline`, `POST /reschedule-requests/{id}/approve\|decline` | zod |
| `tasks.ts` | BI | `GET/PUT /tasks` | zod |
| `therapistMe.ts` | BI | `GET /therapists/me` (id resolution — `getMyTherapistId()` used everywhere as the caller's own id) | zod |
| `therapistProfile.ts` | BI | `GET /therapists/me`, `PUT /therapists/me` (core + full profile variants) | zod |
| `billing.ts` | **BP** | `GET /api/therapists/me/earnings-summary`, `GET /api/therapists/me/bank-details`, `GET /api/invoices?type=therapist_payout_statement`, `POST /api/pricing/calc/payment`, payouts/transactions listing | zod, `rawEnvelope: true` (billing_payment's envelope shape varies by route — `{ok,data,pagination}` / `{ok,data}` / `{data}`) |
| `videoService.ts` | **VS** | `POST /api/rooms`, `GET/POST /api/rooms/{id}/join\|end\|guest-link\|guest-join`, `GET /api/guest-link/{code}`, `/api/rooms/{id}/messages`, `/api/rooms/{id}/notes`, `/api/appointments/{id}/join`, `/api/therapists/{id}/personal-room` | zod |
| `support.ts` | **SA** | `POST/GET /tickets`, `GET /tickets/{ticketNumber}`, `POST /tickets/{ticketNumber}/messages`, `POST /tickets/{ticketNumber}/reopen`, `POST /tickets/{ticketNumber}/attachments/presign`, `POST .../attachments/{id}/confirm`, `GET .../attachments/{id}/download` — routes at root (no `/api/` prefix), caller-supplied ID-token header like `billing.ts` | zod |

---

## Hook → API Map

| Hook | File | Calls |
|---|---|---|
| `useDashboardMetrics` | `pages/dashboard/useDashboardMetrics.ts` | `api/clients.ts`, `api/appointmentsBackend.ts`, `api/therapistMe.ts`, `api/moods.ts` (BI) |
| `useTasks` | `pages/dashboard/useTasks.ts` | `api/tasks.ts` (BI) |
| `useMyAppointments` | `pages/calendar/useMyAppointments.ts` | `api/appointmentsBackend.ts`, `api/therapistMe.ts` (BI) |
| `useMyLeaves` | `pages/calendar/useMyLeaves.ts` | `api/leave.ts`, `api/therapistMe.ts` (BI) |
| `useMyBlockedSlots` | `pages/calendar/useMyBlockedSlots.ts` | `api/availability.ts`, `api/therapistMe.ts` (BI) |
| `useAvailabilityRange` | `pages/calendar/useAvailabilityRange.ts` | `api/availability.ts`, `api/therapistMe.ts` (BI) |
| `useAutoSyncTimezone` | `pages/calendar/useAutoSyncTimezone.ts` | `api/availability.ts`, `api/therapistMe.ts` (BI) |
| `useOrgAppointments` | `pages/calendar/useOrgAppointments.ts` | `api/appointmentsBackend.ts` (BI) |
| `useOrgContext` | `pages/calendar/useOrgContext.ts` | `api/orgContext.ts` (BI) |
| `useClients` | `pages/clients/useClients.ts` | `api/clients.ts`, `api/appointmentsBackend.ts`, `api/therapistMe.ts`, `api/moods.ts` (BI) |
| `useClientInvites` | `pages/clients/useClientInvites.ts` | `api/clientInvites.ts` (BI) |
| `useRequests` | `pages/requests/useRequests.ts` | `api/requests.ts` (BI) |
| `useNotes` | `pages/notes/useNotes.ts` | `api/therapistMe.ts`, `api/clients.ts`, `api/clinicalNotes.ts` (BI) |
| `useMessages` | `pages/messages/useMessages.ts` | `api/therapistMe.ts`, `api/chat.ts` (BI) + `lib/chatRealtime.ts` |
| `useEarnings` | `pages/earnings/useEarnings.ts` | `api/billing.ts` (BP) + `api/appointmentsBackend.ts`, `api/therapistMe.ts` (BI) |
| `useStatements` | `pages/statements/useStatements.ts` | `api/billing.ts` (BP) |
| `usePayouts` | `pages/payouts/usePayouts.ts` | `api/billing.ts` (BP) |
| `useSettingsProfile` | `pages/settings/useSettingsProfile.ts` | `api/therapistProfile.ts` (BI) |
| `useAccountSecurity` | `pages/settings/useAccountSecurity.ts` | `api/auth.ts` (Cognito MFA/password) |
| `useNotificationSettings` | `pages/settings/useNotificationSettings.ts` | `api/notificationPreferences.ts` (BI) |
| `useWeeklySchedule` | `pages/settings/useWeeklySchedule.ts` | `api/availability.ts`, `api/therapistMe.ts` (BI) |
| `useComplianceStatus` | `pages/settings/useComplianceStatus.ts` | `api/billing.ts` (`getBankDetails` — **BP**) |
| `useNotifications` | `components/layout/useNotifications.ts` | `api/notifications.ts` (BI) — powers `NotificationBell`, mounted in `AppLayout` on every authenticated route, not page-scoped |

---

## Shared Components

| Component | File | Used by |
|---|---|---|
| `AppLayout` | `components/layout/AppLayout.tsx` | Every authenticated route (sidebar + outlet) |
| `AppSidebar` | `components/layout/AppSidebar.tsx` | `AppLayout` — hides settings:* sub-nav items unless caller's org-context permissions allow (see Key Business Rules) |
| `NotificationBell` + `useNotifications` | `components/layout/NotificationBell.tsx`, `useNotifications.ts` | `AppLayout` header — the one cross-cutting API call not scoped to a single page |
| `PageHeader` | `components/layout/PageHeader.tsx` | Most pages (`SupportPage`, etc.) |
| `ErrorBoundary` | `components/ErrorBoundary.tsx` | Wraps each route group in `App.tsx` |
| `Toaster` (sonner) | `components/ui/sonner.tsx` | Mounted once in `App.tsx` |
| `VideoCallFrame` | `components/telehealth/VideoCallFrame.tsx` | `TelehealthPage`'s `TelehealthSplitView`, `InstantRoomPage` |
| Provider adapters | `components/telehealth/providers/{LiveKitCall,ZoomCall,JitsiCall}.tsx` | `VideoCallFrame` — provider selected per room/appointment config |
| `PhotoPicker` | `components/PhotoPicker.tsx` | `ProfileCompletionPage`, `SettingsPage`'s `AccountTab` — uploads via `api/files.ts` (BI) |

---

## Key Business Rules

- **HIPAA §164.312(a)(2.iii) idle timeout**: `App.tsx` force-logs-out after
  15 minutes of inactivity. Do not relax without real compliance sign-off.
- **Role gate**: `RequireAuth` in `App.tsx` blocks a `client`-role login from
  this app (redirects to `/login?reason=wrong-app`) — this is the
  therapist/practice app; the mirror-image client app is `iragu`.
- **Profile-completion nudge is soft, not a hard gate.** Runs once per
  browser session (`sessionStorage` key), fails OPEN on any network/lookup
  error (a broken check must never trap a therapist), and only nudges a
  `therapist`-role user. See `lib/profileCompletionGate.ts`.
- **Settings has no route-level permission gate.** `RequireAuth` only excludes
  `client` role. `AppSidebar` hides settings sub-nav links unless the caller
  holds a `settings:*` permission (from `GET /me/org-context`, BI), but the
  five real Settings tabs (Account/Availability/Services/Notifications/
  Compliance) need NO such gate — each is the caller's own data, and
  Compliance is read-only. The `settings:*` permissions map to **org-admin**
  sub-features (team_members/payroll/online_payments/plan_info/demo_client)
  that are not built yet.
- **billing_payment needs the ID token, not the access token** — its Lambda
  reads `custom:therapistId` off Cognito claims, which only exist on the ID
  token. Every `billing.ts` call supplies its own `Authorization` header via
  `billingHeaders()`, overriding `apiFetch`'s default access-token
  attachment (`client.ts`'s "caller-supplied header wins" rule).
- **`chat.ts` send bypasses REST** — a message publishes directly to AppSync
  Events with a raw (no "Bearer" prefix) ID token, mirroring the mobile
  clients exactly. Only publish uses the ID token; REST reads use the
  default access token like every other BI call. Don't mistake this for a
  billing_payment-style backend — it's still backend-initial.
- **Guest telehealth join has no Cognito session at all.** `GuestJoinPage`
  (`/telehealth/guest/:roomId`, `/g/:code`) is deliberately outside
  `RequireAuth` — the room-scoped signed token in the URL is the only
  credential, verified server-side by video_service.
- **No mocked/fabricated data in shipped code** — standing platform rule.
  `SupportPage` was the canonical example of doing this right while
  `backend_support_api` wasn't reachable (real static content + real
  `mailto:` handoff instead of a fake ticket system) — that constraint no
  longer holds (`api/support.ts` now exists, real ticket UI is built,
  `mailto:` demoted to a fallback section), see the Page → Feature Map and
  API Surface rows above.

---

## File Scope by Domain

| Domain | Files |
|---|---|
| Auth/Identity | `src/lib/cognito.ts`, `src/api/auth.ts`, `src/store/authStore.ts`, `src/pages/LoginPage.tsx`, `src/pages/SignupPage.tsx` |
| Shell/Routing | `src/App.tsx`, `src/main.tsx`, `src/components/layout/*` |
| Dashboard | `src/pages/DashboardPage.tsx`, `src/pages/dashboard/*` |
| Calendar | `src/pages/CalendarPage.tsx`, `src/pages/calendar/*`, `src/api/appointmentsBackend.ts`, `src/api/availability.ts`, `src/api/leave.ts`, `src/api/orgContext.ts`, `src/api/orgTherapists.ts` |
| Clients | `src/pages/ClientsPage.tsx`, `src/pages/ClientDetailPage.tsx`, `src/pages/clients/*`, `src/api/clients.ts`, `src/api/clientDetail.ts`, `src/api/clientInvites.ts`, `src/api/moods.ts` |
| Requests | `src/pages/RequestsPage.tsx`, `src/pages/requests/*`, `src/api/requests.ts` |
| Notes | `src/pages/NotesPage.tsx`, `src/pages/notes/*`, `src/api/clinicalNotes.ts` |
| Messages | `src/pages/MessagesPage.tsx`, `src/pages/messages/*`, `src/api/chat.ts`, `src/lib/chatRealtime.ts` |
| Telehealth | `src/pages/TelehealthPage.tsx`, `src/pages/InstantRoomPage.tsx`, `src/pages/GuestJoinPage.tsx`, `src/components/telehealth/*`, `src/api/videoService.ts` |
| Billing/Money | `src/pages/EarningsPage.tsx`, `src/pages/StatementsPage.tsx`, `src/pages/PayoutsPage.tsx`, `src/pages/PlansPage.tsx`, `src/pages/earnings/*`, `src/pages/statements/*`, `src/pages/payouts/*`, `src/api/billing.ts` |
| Settings | `src/pages/SettingsPage.tsx`, `src/pages/settings/*`, `src/api/therapistProfile.ts`, `src/api/notificationPreferences.ts` |
| Support | `src/pages/SupportPage.tsx`, `src/pages/support/*` (`useSupportTickets.ts`, `ticketHelpers.ts`, `NewTicketModal.tsx`), `src/api/support.ts` |
| Profile completion | `src/pages/ProfileCompletionPage.tsx`, `src/lib/profileCompleteness.ts`, `src/lib/profileCompletionGate.ts`, `src/lib/profileDraft.ts` |
| Shared transport | `src/api/client.ts` — **never add a backend-specific header/URL override here; that belongs in the domain-specific `src/api/<domain>.ts` file, following `billing.ts`'s or `videoService.ts`'s pattern** |
| Design tokens | `src/styles/globals.css` — "Ink on Parchment" system, do not restyle ad hoc in components |

---

## Known Backend Gaps

- **`backend_support_api` is now wired (`src/api/support.ts`, `SA`) — but a
  real CORS-config dependency blocks it end-to-end in live dev until that
  service is redeployed.** `backend_support_api`'s Lambda-level CORS header
  (`createSupportHandler.js`'s `CORS_ALLOWED_ORIGIN`) previously
  allow-listed only `bedrock_support_center`'s own origin — fixed in that
  repo (now `CORS_ALLOWED_ORIGINS`, a real multi-origin allowlist including
  this app's `http://localhost:5173` / `https://dev.plus.iragu.co.in`), but
  the fix needs a real deploy of `backend_support_api` before calls from
  this app succeed against live dev (API Gateway's own CORS config already
  allows this app's origins; the Lambda-level header was the one layer that
  didn't). See `docs/design-gap-checklist.md`'s Support entry for the full
  writeup.
- **`AnalyticsPage` and `ActivityPage` are real, not `PlaceholderPage`s** —
  built out concurrently with earlier work this session (see the Page →
  Feature Map above for their real backend wiring). This bullet previously
  said they were unbuilt; that's no longer true, kept only as a reminder
  that page-status claims in this file drift fast and should be re-derived
  from `src/App.tsx` rather than trusted from prose.
