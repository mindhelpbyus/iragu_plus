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
- [ ] **Requests** — full build spec ready (pending/accepted/declined pill filter +
      request cards with Accept/Suggest-time/Decline actions). **No backend
      exists for this** — no lambda, no "pending therapist review" appointment
      status (the 9-value status enum has no such state). Needs a real backend
      decision before frontend work, not just a UI build.
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
- [ ] **Chat cards (payment/appointment/refund/session-summary) render as raw
      JSON text** — `MessagesPage.tsx` renders `{m.content}` unconditionally
      with no `messageType` branch. Full concrete card spec now available (see
      "Card design spec" below) — this directly affects the F.6 payment card
      shipped this session.
- [ ] Thread header missing: "End-to-end encrypted" subtitle, video-call icon
      button, 3-dot overflow menu.
- [ ] Composer missing the paperclip/attachment button.
- [ ] Notification list items are 28px circles, single color regardless of
      type — design uses 36px rounded-square chips with a distinct color pair
      per notification type (payment=forest, note=ochre, reminder=lavender,
      etc.), and groups items by Today/Yesterday (currently a flat list).
- [ ] **Design note**: the design's real notifications surface is a dedicated
      full-page tab (not a dropdown) — see the P0 Notifications nav item above.
      The dropdown itself is a reasonable, functional addition beyond the
      design; don't remove it, but the full-page version doesn't exist yet.

### Money (Earnings / Statements / Payouts / Plans)
- [ ] Statements table has the wrong columns — should be Period/Sessions/Gross/
      Deductions/Net paid/Documents, currently Statement/Issued/Net paid/
      Status/Document. Missing the 3rd summary card ("Platform fees paid").
      Only 1 of 2 documents per row (missing the separate GST-invoice
      download). **No pagination at all.**
- [ ] Payouts table drops Period and Sessions columns (replaced by a single
      Date column). "Payout account" card missing its "Change" button. Third
      summary card shows a different metric (last payout vs. design's
      cumulative FY total).
- [ ] Earnings: deductions card/table headers omit the rate percentages ("12%
      platform fee", "1% TDS"). Column headers aren't clickable sort toggles.
      Pagination missing First/Last jump buttons and "Showing X–Y of Z" text.

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
- [ ] Side panel is not the spec'd fixed 400px — floats with viewport width in
      one place, fixed at 380px (not 400px) in another.
- [ ] Control bar missing whiteboard, recording, invite, diagnostics, and the
      distinct clay-toned Escalate button — design has ~10 controls, impl has
      at most 6.
- [ ] File/Check-in/Consent side-panel tabs lose their signature graphics: GAD-7
      bar chart, 10-segment mood bar, HIPAA/SOC2/DPDP compliance chip row —
      all reduced to plain text/lists.
- [ ] Notes tab is a plain 4-field editable form instead of the design's
      read-only Presenting-concern/Intervention/Homework eyebrow-labeled
      blocks.
- [ ] Chat bubbles use the wrong tint for incoming messages (sage/green instead
      of warm/cream), losing the "them vs. you" warm/cool contrast.
- [ ] Waiting room has 1 of 2 buttons and drops the "WhatsApp invite sent as
      backup" line from the status pill.

## P3 — Login / Signup

- [ ] **Signup step 5 (final profile) is missing the photo-upload UI entirely**
      — no avatar circle, no "Photo guidelines" copy.
- [ ] Signup step 5's preview card is restructured into a persistent 260px
      sidebar instead of a full-width card under the form, and drops the
      avatar/headline/fee line the design shows.
- [ ] Signup step 4 uses a native OS checkbox instead of the app's custom
      18px rounded checkbox — will look inconsistent across browsers and
      clash with every other custom-styled input on the page.
- [ ] Signup progress bar shows 5 segments instead of the design's 6 (missing
      the "Done" step segment).
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
