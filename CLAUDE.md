# CLAUDE.md — iragu_plus

> **Read this first.** This file is the authoritative starting context for every AI skill session in this repository. `.claude/context/domain-model.md` is the second required read — it has the real, per-page API surface this file only summarizes.

---

## What this is

**Iragu+** — the therapist/practice-facing web CRM. As distinct from `iragu` (the
client-facing sibling app) and the mobile `therapistApp` — this is the web
counterpart for a therapist or a practice's admin staff, built as a real
per-screen React Router app (not a tab-switching single-page shell).

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript + Vite (SWC plugin) |
| Routing | `react-router-dom` v7 — real nested `<Route>`s under `<AppLayout>`, lazy-loaded per screen (see `src/App.tsx`) |
| Styling | Tailwind v4 (`@tailwindcss/vite`, JIT). **"Ink on Parchment" design tokens** in `src/styles/globals.css` — warm cream surfaces (`--canvas`, `--surface`), forest-green action color (`--action: #1E7048`), sage secondary accent, Inter body font (self-hosted via `@fontsource/inter`), Fraunces serif for sparing decorative accents only. This is a **different** palette from `iragu`'s "Warm Parchment" (terracotta) system — confirmed by reading both repos' `globals.css`, not assumed from the shared naming. |
| State | Zustand (`src/store/`) for auth/session; TanStack Query (`src/lib/queryClient.ts`) available; most pages use local `useState` + a page-local `use<Thing>.ts` hook |
| Auth | AWS Cognito, direct browser SRP via `amazon-cognito-identity-js` — **no backend `/auth/*` route**. `src/lib/cognito.ts` holds the SDK config (`VITE_COGNITO_*` env); `src/api/auth.ts` wraps it. The resulting **access token** is attached as `Authorization: Bearer` on every request by default (`src/api/client.ts`); a caller can override with its own header (see Backend Map below — billing_payment and backend_support_api need the **ID** token instead) |
| Video | LiveKit (`@livekit/components-react`, `livekit-client`) is the primary telehealth provider; Zoom SDK and Jitsi are alternate providers under `src/components/telehealth/providers/` |
| Forms/validation | `react-hook-form` + `zod` — every real API response is validated against a zod schema at the boundary (`apiFetch` in `src/api/client.ts`), not just parsed as `any` |
| Tests | Vitest + Testing Library + jsdom |

## Local dev

```bash
npm install
npm run dev          # http://localhost:5173 (Vite default — CORS-allowlisted on the dev API Gateway)
npm run typecheck    # tsc --noEmit
npm run build         # vite build → build/
npm test              # vitest run
npm run test:coverage # vitest run --coverage (report-only — no threshold configured yet)
```

`.env.local` is real (not a placeholder): shared Cognito pool/app-client with
`iragu` and `therapistApp`, shared API Gateway base URL, and a separate
`VITE_VIDEO_API_BASE_URL` for video-service. See "Backend Map" below for how
each of the four backends is actually reached through these two base URLs.

---

## Backend Map — FOUR separate backend services

Unlike `iragu` (which calls one backend directly), **iragu_plus calls four
separate backend services**, each with a different real wiring pattern. Get
this wrong and a client silently 401s against a backend that's actually
working fine — always check which row applies before writing a new
`src/api/<domain>.ts` call.

| Backend | How it's reached | Real example |
|---|---|---|
| `backend-initial` | Default `API_BASE_URL` (`VITE_API_BASE_URL`), **no special header** — the default Cognito **access** token `apiFetch` attaches automatically. Routes mount at root (`/clients`, `/appointments`, ...) | `src/api/clients.ts`, `src/api/appointmentsBackend.ts`, and 20 of this repo's 25 `src/api/*.ts` files |
| `billing_payment` | **SAME** `API_BASE_URL` (shares the gateway), distinguished by a **`/api/` path prefix** on every route (`/api/therapists/me/...`) + a **caller-supplied ID-token** `Authorization` header (its Lambda reads `custom:therapistId` off the JWT, a claim that only exists on the Cognito **ID** token, not the access token) | `src/api/billing.ts` — see its `billingHeaders()` helper, which calls `getIdToken()` from `src/lib/cognito.ts` |
| `video_service` | **Separate base URL**, `VITE_VIDEO_API_BASE_URL` (`VIDEO_API_BASE_URL` in `src/api/client.ts`), via the dedicated `videoGet`/`videoPost` helpers (`src/api/client.ts:184-190`) — same default access token, different host | `src/api/videoService.ts` |
| `backend_support_api` | **Real and wired.** SAME `API_BASE_URL` as backend-initial (same shared gateway, same Cognito pool), **caller-supplied ID-token** header like billing_payment — but routes mount at **root** (`/tickets`, `/tickets/{ticketNumber}/...`), NOT under a `/api/` prefix like billing_payment. A third distinct sub-pattern: same-gateway + ID-token like billing_payment, root-mounted paths like backend-initial. Every mutating call also requires a fresh-UUID `Idempotency-Key` header (the Lambda 400s without one) | `src/api/support.ts` — see its `supportHeaders()` helper (same shape as `billing.ts`'s `billingHeaders()`) |

`src/api/client.ts` is the shared transport for all four: `apiRequest`/`apiFetch`
take an optional `baseUrl` override (used for video_service) and honor a
caller-supplied `Authorization` header over the default access token (used for
billing_payment and backend_support_api).

One wrinkle worth knowing: `src/api/chat.ts` (backend-initial) also calls
`getIdToken()`, but only for a single AppSync Events publish call that bypasses
`apiFetch` entirely — its REST reads still use the default access token. Don't
mistake that for a billing_payment-style backend; grep for `VIDEO_API_BASE_URL`
and `getIdToken` together with what the ID token is actually used for before
classifying a new api file (see `.claude/context/domain-model.md`'s API Surface
table for the fully worked-out classification of every existing file).

---

## Real screen count (verify yourself before trusting this — it drifts)

As of this session: **21 routed page components** in `src/App.tsx`, and now
**all 21 are real** — `AnalyticsPage.tsx` (real charts via `useAnalytics`)
and `ActivityPage.tsx` (real cross-backend activity feed via `useActivity`)
were both built out during this session, concurrently with this AI-skill
scaffolding work; neither is a `PlaceholderPage` anymore. Re-derive this by
reading `src/App.tsx`'s route list and checking each `src/pages/*.tsx` file
for a `PlaceholderPage` import before trusting any number in this file —
this repo had multiple agents landing real pages concurrently this session
and the count has already changed twice.

Full page-by-page breakdown with API surface: `.claude/context/domain-model.md`.

---

## AI Skill Workflow

**Entry point: always invoke `spec-orchestrator` first.** It classifies the
task into Tier 1–4 and runs only the KFC skills needed. See
`.claude/skills/kfc/` — seeded from `iragu`'s KFC system (2026-09-21, itself
seeded from `backend-initial`'s original set) and adapted for this repo's
**four-backend** cross-repo model (see Backend Map above) instead of `iragu`'s
single-backend one. `api-contract-validator`/`lambda-generator`/
`prisma-migration` were deliberately NOT copied — this repo has no Lambda or
Prisma of its own.

Feature specs live in `docs/specs/<feature-name>/`, same convention as the
rest of the workspace.

## Hard Rules

- **No mocked or fabricated data, ever, in code that ships.** If a screen
  needs data a backend doesn't return, that's a real, trackable gap — record
  it via `ai-maintenance`'s `backend-dependency` change type, naming which of
  the four backends it belongs to. Don't fake it client-side. `SupportPage.tsx`
  is a real, live example of doing this right when it mattered: for most of
  this session `backend_support_api` had no client wiring, so the page shipped
  as static contact info + `mailto:` links rather than a fake ticket UI — it
  was only rebuilt into a real ticket UI (`src/api/support.ts`,
  `src/pages/support/*`) once that backend's real routes were confirmed.
- **Design files are reference, not literal spec.** `.dc.html` design handoff
  files under `/Users/cvp/Downloads/design_handoff_iragu_platform/designs/`
  are prototyping reference (intended screens/flows), not something to port
  as literal markup. Where the real backend doesn't support something a
  design shows, say so explicitly — see `docs/design-gap-checklist.md` for
  the established pattern and examples from this repo's own build.
- **Match the backend's real wiring pattern.** A new `src/api/<domain>.ts`
  call must use the auth/base-URL pattern for whichever of the four backends
  it targets (see Backend Map) — never assume backend-initial's default
  access-token path is universal.
- **HIPAA §164.312(a)(2)(iii)**: the 15-minute idle-timeout auto-logout in
  `App.tsx` is a compliance requirement, not a UX nicety — don't relax it
  without a real compliance sign-off.

## What's real right now

- Full routing, auth (Cognito + MFA/TOTP), idle timeout, and all 21 routed
  screens with live API wiring across **all four** backends (backend-initial,
  billing_payment, video_service, backend_support_api).
- Real design-fidelity work tracked in `docs/design-gap-checklist.md` and
  `docs/spec-gap-checklist.md` — read these for known gaps between the
  `.dc.html` handoff and what's actually buildable against real backends.

## What's NOT here yet

- No CI/CD before this session — `.github/workflows/pr-check.yml` (added this
  session) runs `npm run typecheck`, `npm run build`, and `npm test` as
  blocking gates, plus `npm run test:coverage` as a report-only step (no
  coverage threshold exists yet — don't invent one).
- `backend_support_api` has no repo checked out in this workspace (unlike
  backend-initial), so its endpoints can be exercised against the real dev
  API but not verified by reading its own handler source from here — treat
  any task changing that backend's contract as unverifiable from this repo
  alone, even though the client-side call site (`src/api/support.ts`) is real.
