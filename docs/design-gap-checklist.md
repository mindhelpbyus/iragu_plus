# iragu_plus — design-fidelity checklist

Generated 2026-09-19 from a 6-agent audit comparing every live iragu_plus page/state
against `/Users/cvp/Downloads/design_handoff_iragu_platform/` (CRM shell + all tabs,
Login/Signup) and `/Users/cvp/Downloads/design_handoff_video_session_new/` (video
session). Design tokens (color/radius/spacing) were verified to already match at the
CSS-variable level in `src/styles/globals.css` — every gap below is structural
(missing elements/sections/pages), not a color/token problem.

Six pages are currently 5-line placeholders: **Requests, Notes, Settings, Support,
Analytics, Activity.** Their entries below are full build specs, not just gap notes.

## P0 — empty pages (biggest driver of "half cooked")

- [ ] **Settings** — full 5-panel build spec ready (Profile & security, Calendar &
      availability, Services, Notification preferences, Payment & compliance).
      240px nav + card shell, `App.tsx` routes already exist. Must wire a real
      permission gate on the route (currently `SettingsPage.test.ts` deliberately
      guards against zero API calls / zero permission checks) — existing
      `SETTINGS_PERMISSIONS` in `AppSidebar.tsx` don't map cleanly to the design's
      5 panel ids, needs reconciling.
- [ ] **Support** — full build spec ready (3 category tiles, new-ticket form,
      ticket list with status pills). Design is minimal and fully specified —
      no invented content needed.
- [x] **Notes — built 2026-09-19.** Two-column list+SOAP-detail page,
      real `listTherapistNotes`/`updateClinicalNote`/`signClinicalNote` API
      client added (`src/api/clinicalNotes.ts`), autosave-on-blur per SOAP
      field, Sign & lock wired to the real 409-on-already-signed/403-outside-
      48h server enforcement (client doesn't duplicate that logic, server is
      the source of truth). **Deliberate deviation from the design mock**:
      filter pills use the REAL `noteType` values present in the data
      (dynamic) instead of the design's fictional Progress/Risk/Intake
      labels, since the backend has no `'Risk'` noteType — fabricating that
      label would have been dishonest. "New note" doesn't open a creation
      modal — notes require a real `appointmentId` server-side
      (`assertAppointmentTie`), so it prompts the therapist to start from
      Calendar instead of building a parallel client-picker flow.
- [x] **Requests** — real backend built (Part H, 2026-09-20): new
      `ClientInquiry`/`RescheduleRequest` tables, 7 routes, notification
      fan-out, gated behind a `requests_workflow` FeatureConfig row (off by
      default). Real `api/requests.ts` + `useRequests` + rebuilt
      `RequestsPage.tsx` — pending/approved/declined pill filter, kind-badged
      request cards, real Approve/Decline actions. **Not the design's literal
      3-button layout** — "Suggest another time" dropped (no backend support
      for a counter-offer flow; would need its own real design), "Accept"
      renamed "Approve" to match the real action. Sidebar badge wired to the
      real pending count.
- [ ] **Analytics** — full build spec ready (6-month revenue bar chart, session-mix
      breakdown bars by appointment type, attendance-rate stat tile). Needs
      backend: monthly revenue rollup, appointment-type distribution %,
      completed-vs-no-show ratio with month-over-month delta.
- [ ] **Activity** — full build spec ready: a practice-wide, READ-ONLY, filterable
      audit timeline (Sessions/Notes/Payments/Messages/Clients), pulling from
      multiple existing backends into one feed. **Important distinction found**:
      this is a THIRD, different concept from two things already built —
      don't confuse or reuse them:
      1. Dashboard's small "Client activity" rail widget in the design (narrow,
         client-engagement-only) — already replaced in code by a Tasks feed.
      2. The existing `TaskActivityFeed.tsx` component — despite its name, this
         is the Tasks feature (checkboxes, categories), not Activity. Do not
         start from it.

## P1 — real pages, high-visual-impact gaps

### Sidebar / shell (affects every page)
- [ ] Nav count badges entirely missing — sage pill for general counts, clay pill
      specifically for unread messages. `NavItem` has no badge slot at all.
- [ ] Two nav items missing from the sidebar: **Tasks** (Clinical section) and
      **Notifications** (Communication section) — both named in the design,
      neither has a route or sidebar entry.
- [ ] No responsive breakpoints implemented anywhere in the shell/calendar
      (design specifies 5: 1300/1180/1150/900/800px).

### Calendar
- [x] Panel-toggle moved into the toolbar (first item, before search) — fixed 2026-09-19.
- [x] "Slots" side-tab now shows "Practice calendars" per-therapist checkboxes
      in Practice mode, wired to the same selection state as the toolbar's
      TherapistFilter — fixed 2026-09-19. **Not done**: the filled/light/grey
      availability bar-strip visualization (needs per-colleague hour-level
      availability data + a new visual component) — deferred, genuinely
      separate scope from the checkbox filter.
- [ ] Multi-therapist team colors (event chip = owner color) — deprioritized:
      Practice mode already renders one column per therapist, which solves
      the same distinguishability problem the design's color-coding solves,
      per the original audit's own "mitigated somewhat" note.
- [x] Month view: added "Blocked" tag + muted cell background for leave days,
      and dropped the per-cell chip limit from 3 to 2 per design — fixed 2026-09-19.
- [x] **Not a UI bug — confirmed a backend gap.** Booking modal's 4 appointment
      types (Individual/Couple/Group/Family) are the FULL real set the backend
      accepts (`VALID_APPOINTMENT_TYPES` in backend-initial). The design's extra
      3 options (Intake/Internal/External/Break) have no backend representation
      at all — adding them to the picker would 400 a real booking. Left as-is;
      flagged for a backend-initial spec decision, not an iragu_plus fix.
- [x] Left-panel collapse gap now animates 20px→0px with the panel width —
      fixed 2026-09-19.

### Dashboard
- [ ] Revenue metric card dropped (3 cards instead of the design's 4) —
      deliberate per an existing code comment, but leaves the card row visibly
      asymmetric at desktop width vs. the design's fixed 4-up.
- [ ] No metric card ever shows a trend delta ("+N vs last week") — the prop
      exists (`MetricCard`'s `delta`), nothing computes a value for it.
- [ ] "Today's schedule" subheader drops the urgency clause ("Next in 18 min").
- [ ] Right-rail second card is a Tasks feed, not the design's "Client activity"
      feed (client mood/message/booking events) — confirm this is an
      intentional product pivot, not an oversight, since the design's concept
      has no equivalent anywhere in the app.

### Clients / Client detail
- [x] "At risk" safety flag now renders (a warning-triangle badge next to the
      status pill, using the real `safetyRisk` field already fetched) —
      fixed 2026-09-19.
- [x] Client detail's 3-stat row now shows real Sessions completed / Next
      session / Latest mood, computed from the client's real appointment
      list (already fetched, previously unused) — fixed 2026-09-19. Moved
      "Preferred therapy" (real data, previously a stat card) into the
      Details panel instead of dropping it.
- [x] **Confirmed not fixable honestly — not a UI bug.** Consent panel showing
      only DPDP is the real limit of what the backend exposes to this
      frontend (`getClientConsent` returns exactly one consent record, no
      separate Informed/Telehealth fields exist anywhere in the API). Adding
      2 more consent checkmarks would be fabricated data. Left as-is;
      flagged for a backend-initial decision if 3 separate consents are
      genuinely wanted.
- [x] Client list search now filters the currently-loaded page by name/email
      — fixed 2026-09-19. **Not full parity**: this is client-side only,
      since backend-initial's `clients` Lambda has no server-side `search`
      param — a real backend gap, not a frontend oversight. No Tags filter,
      no Sort control, non-clickable column headers — deferred, lower
      impact than the search fix.
- [ ] Client detail header still drops the diagnosis/specialty line; Session
      fee + Payment method were not added to Details (no confirmed
      per-client data source for either — would need backend investigation,
      not fabrication).

### Messages / Notifications
- [x] **Chat cards now render as real cards** (`src/components/chat/ChatCard.tsx`,
      new) instead of raw JSON — payment/appointment/refund/session-summary
      types get a colored icon chip, title, label/value rows, and a "View in
      calendar" link; unknown types fall back to the old plain-text render
      rather than crashing. Fixed 2026-09-19 — this directly affects the F.6
      payment-requested card shipped earlier this session.
- [x] Thread header: added the "End-to-end encrypted" line and a video-call
      icon button (navigates to Telehealth). **Not done**: 3-dot overflow
      menu — no clear real action to wire it to yet (no block/mute/archive
      UI exists), left out rather than adding a decorative dead-end menu.
- [x] Composer: added the paperclip button — shows an honest "coming soon"
      toast (no attachment upload backend wired for this chat context),
      matching the same pattern the video-call UI already uses for its own
      not-yet-built captions toggle.
- [x] Notification items now use 36px rounded-square chips with a real
      color pair per type, and group by Today/Yesterday/Earlier — fixed
      2026-09-19.
- [ ] **Design note, unchanged**: the design's real notifications surface is
      a dedicated full-page tab (not a dropdown) — see the P0 Notifications
      nav item. The dropdown is a reasonable, functional addition beyond the
      design; the full-page version still doesn't exist.

### Money (Earnings / Statements / Payouts / Plans)
- [x] Statements — added the 3rd summary card ("Platform fees paid",
      computed from real `ytd_gross/net/tds` figures, not hardcoded) and
      widened the grid to 3-up (2026-09-19). **Left unchanged, confirmed via
      real backend source** (`billing_payment`'s `buildTherapistPayoutStatement`,
      `finance.controller.js`'s `GET /api/invoices`, and `pgStore.js`'s literal
      `invoices.list()` SQL): no Period/Sessions/Gross/Deductions columns exist
      in the list response (only id/type/docNumber/amount/status/dates), and
      there is no 2nd "GST invoice" document type — the single
      `therapist_payout_statement` already IS the tax invoice (confirmed by the
      design's own footer note). No offset/cursor pagination exists either
      (flat `limit` cap of 500) — not fabricated.
- [x] Payouts — replaced the 3rd summary card with "Paid out · this financial
      year" using real `summary.ytd_net_paise`, kept last-payout-date as a
      secondary line (2026-09-19). Period/Sessions columns and the "Change"
      button on the Payout account card were **not** added — no destination to
      change to exists yet (Settings page is still a placeholder) and no
      period/session breakdown exists in the real payout row shape; adding
      either would mean fabricating data the backend doesn't return.
- [x] Earnings — added a real, computed `ratePercent()` helper (deducted ÷
      gross, not a hardcoded "12%"/"1%") wired into the deductions card
      caption; made Date and "Your net" column headers clickable sort toggles
      (client-side, current-page-only — confirmed via `api/billing.ts` that
      `ListTransactionsFilters` has no server-side `sortBy` param); added
      "Showing X–Y of Z" text and First/Last pagination jump buttons
      (2026-09-19).

## P2 — video session (see also functional gaps in spec-gap-checklist.md)

Token-level fidelity here is excellent (colors/radii/shadows match closely where
implemented) — every gap below is a missing structural element, not a wrong value.

- [ ] **Live state has no custom chrome** — no self-tile PIP, no quality pill
      ("Mumbai · 1080p · 42ms"), no animated name pill, no live-transcript
      card. The provider SDK's own default UI fills the stage instead. This is
      the most-seen state during an actual session — highest priority in this
      section.
- [ ] **Ended state** missing the 4-card KPI grid (duration/transports/
      recording/mood) and the transport log card; only 1 of 3 action buttons.
- [ ] **Failover state** drops the signature 4-row fallback-chain list (Zoom
      dropped → LiveKit negotiating → Jitsi queued → WhatsApp standby),
      replaced by one generic message; missing the "Run diagnostics" button.
- [x] Side panel width — fixed to 400px in both `TelehealthSplitView.tsx`
      (was a fluid 5/12 grid column) and `InstantRoomPage.tsx` (was 380px)
      (2026-09-19).
- [ ] Control bar missing whiteboard, recording, invite, diagnostics, and the
      distinct clay-toned Escalate button — design has ~10 controls, impl has
      at most 6.
- [ ] File/Check-in/Consent side-panel tabs lose their signature graphics: GAD-7
      bar chart, 10-segment mood bar, HIPAA/SOC2/DPDP compliance chip row —
      all reduced to plain text/lists.
- [ ] Notes tab is a plain 4-field editable form instead of the design's
      read-only Presenting-concern/Intervention/Homework eyebrow-labeled
      blocks.
- [x] Chat bubbles — incoming messages switched from `bg-surface-sage` to
      `bg-surface-warm` in both `SessionPanel.tsx` and `InstantSessionPanel.tsx`,
      restoring the "them vs. you" warm/cool contrast (2026-09-19).
- [~] Waiting room status pill now shows "they've been notified you're
      waiting" once video-service's real `waitingAlertRaised` flag goes true
      (the actual threshold-based signal behind the design's "WhatsApp invite
      sent as backup" line — confirmed via `waiting-room-alert-sweeper`'s real
      alert-dispatch mechanism, which fans out to push+email+WhatsApp on the
      same threshold). Copy says "notified", not "via WhatsApp" specifically,
      since WhatsApp only fires if the recipient has opted in with a verified
      phone (2026-09-19). **Still missing**: the 2nd button (design:
      "Send a reminder" for therapist / "Leave the room" for client) — no
      manual "send now" endpoint exists on video-service (the sweeper is
      cron-only), and there's no defined destination for a guest "leave"
      action without a real account to return to. Needs backend work, not a
      frontend-only fix — flagged, not built here.

## P3 — Login / Signup

- [x] **Signup step 5 photo-upload UI — built 2026-09-20.** Real 88px dashed
      avatar circle (Camera icon + "Add photo", matching the design's hover/
      colors) + "Photo guidelines" copy, wired to a real file picker with
      local preview (`URL.createObjectURL`, revoked on replace/unmount) and
      real client-side validation (`validatePhotoFile`: image/* mime, 10 MB
      cap — the exact same limits as backend-initial's `therapist_photo`
      document class). **Does not upload anywhere yet, and says so in code**:
      backend-initial's real presign contract (`GET /files/upload-url` →
      PUT → `POST /files`, see `file-upload` lambda) requires a Cognito
      Bearer token, but this wizard's step 1 only calls Cognito `signUp`
      (account stays `pending_confirmation`, no session) and never collects
      an email-confirmation code before step 5 — wiring the real upload call
      here would 401. Needs either an email-verification step added before
      step 5, or moving photo upload to post-login (e.g. Settings) — a
      product decision, flagged in `SignupPage.tsx`'s file header rather than
      faked.
- [x] Signup step 5's preview — rebuilt 2026-09-20 as a full-width card under
      the form (not a persistent 260px sidebar), with the avatar circle
      (real photo or initials), headline, real selected-languages line, and a
      fee line sourced from the first selected service's real configured fee
      (`SERVICES`/`services` state) — never a hardcoded number. Two design
      mock values were deliberately NOT reproduced since nothing in the
      wizard holds real state for them: years-of-practice (uncontrolled input,
      no state) and the design's fixed "₹2,500"/"12 yrs" example text.
- [x] Signup step 4 — swapped the native `<input type="checkbox">` for the
      app's real `Checkbox` primitive (`src/components/ui/checkbox.tsx`,
      Radix-based), sized to the design's 18px/5px-radius treatment. Colors
      come from the component's existing `--interaction-*`/`--action-primary-*`
      tokens (already defined in `globals.css`), not new hardcoded hex.
- [x] Signup progress bar — now renders all 6 segments (`stepSegments()`,
      `STEP_NAMES.length`), fixing the dropped "Done" segment. Regression-
      guarded in `SignupPage.test.ts`.
- [ ] Signup step 6's status checklist loses its icon distinction (check/clock/
      empty-circle) and ochre "in-progress" color, reduced to plain dots.
- [ ] Several copy strings paraphrased rather than verbatim across steps 3–5
      (field labels, intro paragraphs) — low priority, listed for completeness.
- [ ] Login page matches closely — no material gaps found. (The README's
      "Google/Apple/Phone" 3-button claim doesn't match the actual design
      source, which only has 2 OAuth buttons + an Email/Phone toggle;
      iragu_plus correctly matches the real design, not the README summary.)

## Card design spec (for the Messages P1 item above)

The design source has no literal rendered example of a payment/appointment/refund
card — this is extrapolated from the closest same-system patterns that do exist
(notification-list icon-chip coloring, client-detail label/value rows, existing
status-pill component), not invented from scratch:

- **Container**: neutral surface card, not a colored bubble — `bg:#FDFCF9`,
  `border:1px solid #E8E0D4`, `border-radius:12-14px`, ~280-320px wide, aligned
  like a normal bubble but never filled forest/white.
- **Header row**: 36×36 rounded-10px icon chip, color pair per type — payment
  `bg:#E8F2EB/fg:#175C3B` (₹), appointment `bg:#EFEDF5/fg:#6B6490` (lavender,
  clock), refund/cancellation `bg:#F4E3E3/fg:#8E4848` (clay), session-summary
  `bg:#FAF3E2/fg:#8A6A28` (ochre) — plus a bold title ("Payment received",
  "Appointment confirmed", etc.).
- **Body**: label/value rows (muted label left, ink value right) — reuse the
  existing status-pill component verbatim where a status is shown.
- **Action**: one forest-colored text link ("View in calendar" / "View
  receipt") — nothing more elaborate is implied by the source.
- **Timestamp**: stays outside/below the card like a normal bubble, not inside it.
