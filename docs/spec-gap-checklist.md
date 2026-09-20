# iragu_plus — spec-vs-code gap checklist

Generated 2026-09-19 from a 4-agent audit (Video, Calendar, Notifications/Messaging,
Billing) comparing backend-initial/billing_payment/video-service specs against the
actual current iragu_plus code. Each "Evidence" cites the file the finding was
verified against — re-check before assuming a status is still current.

## P0 — time-sensitive / actively wrong

- [ ] **Chat `senderId` uses numeric `User.id`, not the Cognito sub.**
      `src/pages/messages/useMessages.ts` (and `src/api/chat.ts`'s appointment-card
      publish) sets `senderId = String(therapistId)`. The platform's hard rule
      requires a Cognito publisher's `senderId` to equal their own sub — the sub is
      already available as `user.id` in `authStore`. `CHAT_IDENTITY_ENFORCEMENT` is
      `warn` today; when it flips to `enforce` (already planned elsewhere in the
      codebase), every message/card sent from iragu_plus is silently dropped.
- [ ] **`publishChatEvent` only checks the AppSync HTTP ack, never persistence.**
      `src/api/chat.ts` — same false-success shape as the chat-card-publish-repair
      outage already fixed elsewhere in backend-initial. The UI can show "sent" for
      a message that never landed.
- [ ] **Chat cards render as raw JSON, not formatted widgets.**
      `src/pages/MessagesPage.tsx` renders `{m.content}` unconditionally — no
      branch on `messageType`. Payment/appointment/refund/session-summary cards
      (including the new F.6 payment-requested card) show as a raw
      `{"cardVersion":1,...}` blob instead of a card. Both mobile apps have
      distinct widgets per type; iragu_plus has none.

## P1 — real, user-visible gaps

- [ ] **Therapist personal rooms have no iragu_plus surface.** video-service's
      `GET/POST /therapists/:id/personal-room[/join|/start-hosting]` routes are
      live; zero references anywhere in iragu_plus.
- [ ] **`waitingAlertRaised`/`rescheduleOffered` are parsed and dropped.**
      `src/api/videoService.ts` parses both fields; nothing in the UI reads them.
- [ ] **Settings page is a placeholder** (`src/pages/SettingsPage.tsx`, ~5 lines).
      Blocks three unrelated things at once:
      - [ ] No video-provider preference / buffer-override UI (conferencing-calendar-whatsapp spec).
      - [ ] No WhatsApp opt-in UI — `WhatsAppChannel` exists server-side, never connected.
      - [ ] No bank-account edit UI (`POST/PUT/DELETE /billing/therapists/{id}/bank-details` exist, unused) or PAN/GSTIN collection.
- [ ] **WhatsApp reminders diverged to a manual `wa.me` link**
      (`src/components/whatsapp/WhatsAppDrawer.tsx`) instead of the spec'd
      automated, opt-in, server-triggered T-24h/T-1h reminder system.
- [ ] **Notification bell polls every 60s** (`src/components/layout/useNotifications.ts`)
      instead of using the real AppSync `notifications` channel +
      `notification-subscribe-authz`, which already exists and mobile apps use.
- [ ] **Block/unblock chat UI is a dead end.** `api/chat.ts` exports
      `blockConversation`/`unblockConversation`; nothing calls them.
      `MessagesPage.tsx` tells a blocked user to "unblock from Settings" — no such
      flow exists.
- [ ] **Transaction/payout date+status filters unwired.** `ListPayoutsFilters`/
      `ListTransactionsFilters` support them in `api/billing.ts`; `useEarnings.ts`/
      `usePayouts.ts` never pass them — only pagination is wired.

## P2 — minor / code-quality, not user-facing gaps

- [ ] Provider-dispatch conditional chains duplicated verbatim between
      `VideoCallFrame.tsx` and `GuestJoinPage.tsx` instead of one shared lookup —
      diverges from video-core-engine's own "provider-blind by construction" principle.
- [ ] No bulk/tax-year statement export in `StatementsPage.tsx` (admin already has
      FY-scoped CSV exports; no therapist-facing analogue).

## Confirmed correct / already fixed (no action needed)

- [x] Org/multi-therapist Practice Calendar — genuinely built, contradicts stale
      `org-roles-and-calendar/tasks.md`. Multi-column week view, permission gating,
      role model all real (`CalendarPage.tsx`, `WeekView.tsx`, `org/handler.ts`).
- [x] Drag-to-reschedule (`DayView.tsx`) — real, web-only, correctly disabled in
      multi-therapist Practice mode.
- [x] Guest links, split-view live-call+SOAP documentation, screen share/layout
      toggle — genuine desktop-appropriate capabilities, correctly LiveKit-scoped
      where the other providers don't support them.
- [x] Provider identity hidden from therapist/client (admin/org_owner only) —
      matches the explicit earlier platform decision.
- [x] Billing model matches reality — no fake subscription tiers, correct
      payout-cycle (not calendar-month) statements, commission rate read live
      from config.
- [x] Invoice cross-account read (therapist A reading therapist B's invoice) —
      confirmed fixed 2026-09-13 (`resolveInvoiceAccess.js`).
- [x] Calendar sync / collective meetings — unbuilt on both frontend and backend,
      but correctly so: the spec itself defers these to a later phase. Not slippage.
- [x] Captions / recording indicator — correctly unbuilt; the sarvam-session-capture
      spec (0/32 tasks) itself says the client indicator is a later, cosmetic task,
      not required for the core feature.
