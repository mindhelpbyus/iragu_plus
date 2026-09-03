/**
 * api/videoService.ts — real client for the video-service backend (separate
 * from backend-initial/billing_payment; see VIDEO_API_BASE_URL in client.ts).
 *
 * The one join contract that actually matters here is
 * POST /api/appointments/{appointmentId}/join — video-service's own source
 * describes it as "the ONLY join path video-service exposes for real
 * appointments" (src/routes/videoRoutes.ts). It verifies the appointment
 * against backend-initial (AppointmentReader/verifyAppointmentJoin) before
 * minting provider credentials, so a stray/expired/foreign appointmentId
 * fails server-side rather than silently joining the wrong room.
 *
 * Auth: the shared apiRequest layer already attaches the caller's Cognito
 * access token as `Authorization: Bearer` — video-service's own middleware
 * (src/middleware/auth.ts) verifies it directly (CognitoJwtVerifier), so no
 * extra wiring is needed here beyond passing baseUrl: VIDEO_API_BASE_URL.
 */
import { z } from 'zod';
import { apiFetch, VIDEO_API_BASE_URL } from './client';

// Design principle 6 (docs/specs/video-core-engine/design.md, backend-initial):
// every request-scoped action is logged with enough context to reconstruct
// what happened. video-service's requestContext middleware reads this
// specifically (req.header('x-client-platform')) — every other real client
// (community-app, therapistApp) already sends its own platform id.
const CLIENT_PLATFORM_HEADERS = { 'X-Client-Platform': 'iragu-plus-web' };

const featureFlagsSchema = z.object({
  audio: z.boolean(),
  video: z.boolean(),
  chat: z.boolean(),
  transcription: z.boolean().optional(),
  recording: z.boolean().optional(),
});

const bannerSchema = z.object({
  type: z.enum(['privacy', 'waiting', 'info', 'warning']),
  message: z.string(),
});

/**
 * JoinCredentials — video-service's src/domain/types.ts. `waitingRoom: true`
 * means `token` is deliberately empty ('') and must NOT be used to connect;
 * see shouldWait() in videoService.ts for when a client-role caller lands
 * here (no therapist/host/admin currently in the room yet).
 */
export const joinCredentialsSchema = z.object({
  roomId: z.string(),
  provider: z.enum(['livekit', 'zoom', 'jitsi', 'huddle01', 'google_meet', 'zoho_meeting']),
  roomName: z.string(),
  participantIdentity: z.string(),
  participantRole: z.string(),
  serverUrl: z.string().optional(),
  token: z.string(),
  uiMode: z.enum(['audio_call', 'video_call', 'meeting']),
  features: featureFlagsSchema,
  banner: bannerSchema,
  transcription: z.object({
    enabled: z.boolean(),
    languageCode: z.string(),
    provider: z.string(),
    realtime: z.boolean(),
  }),
  waitingRoom: z.boolean().optional(),
  waitingSince: z.string().optional(),
  waitingTimeoutSeconds: z.number().optional(),
  waitingAlertRaised: z.boolean().optional(),
  rescheduleOffered: z.boolean().optional(),
});

export type JoinCredentials = z.infer<typeof joinCredentialsSchema>;

export interface JoinAppointmentParams {
  displayName?: string;
  mode?: 'audio' | 'video';
}

export function joinAppointmentRoom(
  appointmentId: string,
  params: JoinAppointmentParams = {},
): Promise<JoinCredentials> {
  return apiFetch(`/api/appointments/${appointmentId}/join`, {
    method: 'POST',
    body: { displayName: params.displayName, mode: params.mode ?? 'video' },
    schema: joinCredentialsSchema,
    baseUrl: VIDEO_API_BASE_URL,
    headers: CLIENT_PLATFORM_HEADERS,
  });
}

const roomSchema = z.object({
  id: z.string(),
  provider: z.string(),
  type: z.string(),
  roomName: z.string(),
  title: z.string(),
  status: z.string(),
});

export type RoomType = 'instant_video_call' | 'instant_audio_call' | 'internal_meeting';

/**
 * Creates an ad-hoc room not tied to any scheduled appointment — an instant
 * call or an internal team meeting. admin/staff/therapist-only server-side
 * (requireRole in video-service's videoRoutes.ts), which matches every real
 * iragu_plus user.
 */
export function createRoom(type: RoomType, title: string): Promise<{ id: string; roomName: string }> {
  return apiFetch('/api/rooms', {
    method: 'POST',
    body: { type, title, provider: 'livekit' },
    schema: z.object({ room: roomSchema }),
    rawEnvelope: true,
    baseUrl: VIDEO_API_BASE_URL,
    headers: CLIENT_PLATFORM_HEADERS,
  }).then((res) => ({ id: res.room.id, roomName: res.room.roomName }));
}

/** Joins a room directly by id — the ad-hoc-meeting counterpart to joinAppointmentRoom. */
export function joinRoom(roomId: string, params: JoinAppointmentParams = {}): Promise<JoinCredentials> {
  return apiFetch(`/api/rooms/${roomId}/join`, {
    method: 'POST',
    body: { displayName: params.displayName, mode: params.mode ?? 'video' },
    schema: joinCredentialsSchema,
    baseUrl: VIDEO_API_BASE_URL,
    headers: CLIENT_PLATFORM_HEADERS,
  });
}

/**
 * Therapist/admin/staff-only — ends the room for everyone (POST /rooms/{id}/end).
 * A client leaving just disconnects their own SDK session locally; there's no
 * client-callable "leave" endpoint because leaving isn't a server-tracked event.
 */
export function endRoom(roomId: string): Promise<void> {
  return apiFetch(`/api/rooms/${roomId}/end`, {
    method: 'POST',
    schema: z.unknown(),
    baseUrl: VIDEO_API_BASE_URL,
    headers: CLIENT_PLATFORM_HEADERS,
  }).then(() => undefined);
}

/**
 * Mints a signed, room-scoped, time-limited guest-join token, PLUS a short
 * numeric code that resolves to it server-side (video-service's POST
 * /rooms/{id}/guest-link) — the real "copy link" flow. Therapist/admin/
 * staff-only server-side. The token itself is opaque here; the frontend
 * embeds the SHORT CODE into the shareable link
 * (/g/{code}), not the full token — the token is what made the old link
 * long (header + payload + HMAC signature, all base64), and moving it
 * server-side is what actually shortens the URL. GuestJoinPage resolves
 * the code back to {roomId, token} via resolveGuestLinkCode before calling
 * guestJoinRoom below with the real token, so the underlying credential and
 * verification are completely unchanged.
 */
export function createGuestLink(roomId: string): Promise<{ roomId: string; token: string; code: string }> {
  return apiFetch(`/api/rooms/${roomId}/guest-link`, {
    method: 'POST',
    schema: z.object({ roomId: z.string(), token: z.string(), code: z.string() }),
    baseUrl: VIDEO_API_BASE_URL,
    headers: CLIENT_PLATFORM_HEADERS,
  });
}

/**
 * Resolves a short guest-link code to its underlying {roomId, token} — the
 * public lookup step behind a short link like /g/482913077. No auth
 * required (same reason guest-join itself needs none: the recipient has no
 * iragu_plus account); the token this returns is the exact same signed JWT
 * guestJoinRoom has always verified.
 */
export function resolveGuestLinkCode(code: string): Promise<{ roomId: string; token: string }> {
  return apiFetch(`/api/guest-link/${code}`, {
    schema: z.object({ roomId: z.string(), token: z.string() }),
    baseUrl: VIDEO_API_BASE_URL,
    headers: CLIENT_PLATFORM_HEADERS,
  });
}

export interface GuestJoinParams {
  token: string;
  displayName: string;
  mode?: 'audio' | 'video';
}

/**
 * The public counterpart to joinRoom — no Cognito session required. Backing
 * route is deliberately outside video-service's normal auth gate; the
 * signed token itself is the only credential. Never call this with a
 * user-supplied roomId/token pair you haven't gotten from a real deep link —
 * there is no server-side confirmation step before this mints real
 * provider-scoped join credentials.
 */
export function guestJoinRoom(roomId: string, params: GuestJoinParams): Promise<JoinCredentials> {
  return apiFetch(`/api/rooms/${roomId}/guest-join`, {
    method: 'POST',
    body: { token: params.token, displayName: params.displayName, mode: params.mode ?? 'video' },
    schema: joinCredentialsSchema,
    baseUrl: VIDEO_API_BASE_URL,
    headers: CLIENT_PLATFORM_HEADERS,
  });
}

/**
 * In-call chat — video-service's src/domain/types.ts ChatMessage, backed by
 * a real persisted store (POST/GET /rooms/{id}/messages). Poll-based, not
 * WebSocket: there is no realtime push channel for this from video-service
 * today, so the panel polls listMessages on an interval (see SessionPanel).
 */
export const chatMessageSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  roomId: z.string(),
  senderUserId: z.string(),
  senderIdentity: z.string(),
  messageType: z.enum(['text', 'system', 'file']),
  body: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

export function listMessages(roomId: string): Promise<ChatMessage[]> {
  return apiFetch(`/api/rooms/${roomId}/messages`, {
    method: 'GET',
    schema: z.object({ messages: z.array(chatMessageSchema) }),
    rawEnvelope: true,
    baseUrl: VIDEO_API_BASE_URL,
    headers: CLIENT_PLATFORM_HEADERS,
  }).then((res) => res.messages);
}

export function postMessage(roomId: string, body: string): Promise<ChatMessage> {
  return apiFetch(`/api/rooms/${roomId}/messages`, {
    method: 'POST',
    body: { body, messageType: 'text' },
    schema: z.object({ message: chatMessageSchema }),
    rawEnvelope: true,
    baseUrl: VIDEO_API_BASE_URL,
    headers: CLIENT_PLATFORM_HEADERS,
  }).then((res) => res.message);
}

/**
 * Per-room draft note — video-service's own `notes` table, used ONLY for
 * ad-hoc/instant calls that have no backend-initial Appointment to tie a
 * real ClinicalNote to. Never itself a clinical record: `data` is cleared
 * server-side the moment status flips to 'submitted' (video-service's own
 * upsertNote), so this must never be treated as a place clinical content
 * durably lives — the real record is the ClinicalNote created via
 * createClinicalNote (api/clinicalNotes.ts) at submit time. Scheduled-
 * appointment sessions never touch this — see SessionPanel.tsx's SOAP tab,
 * which writes straight to createClinicalNote instead.
 */
export const noteSchema = z.object({
  roomId: z.string(),
  data: z.record(z.string(), z.unknown()),
  status: z.enum(['draft', 'submitted']),
  submittedClinicalNoteId: z.string().nullable(),
  updatedAt: z.string(),
});

export type RoomNote = z.infer<typeof noteSchema>;

export function getRoomNote(roomId: string): Promise<RoomNote> {
  return apiFetch(`/api/rooms/${roomId}/notes`, {
    method: 'GET',
    schema: noteSchema,
    baseUrl: VIDEO_API_BASE_URL,
    headers: CLIENT_PLATFORM_HEADERS,
  });
}

export function saveRoomNoteDraft(roomId: string, content: string): Promise<RoomNote> {
  return apiFetch(`/api/rooms/${roomId}/notes`, {
    method: 'PUT',
    body: { data: { content } },
    schema: noteSchema,
    baseUrl: VIDEO_API_BASE_URL,
    headers: CLIENT_PLATFORM_HEADERS,
  });
}

export function markRoomNoteSubmitted(roomId: string, submittedClinicalNoteId: string): Promise<RoomNote> {
  return apiFetch(`/api/rooms/${roomId}/notes`, {
    method: 'PUT',
    body: { status: 'submitted', submittedClinicalNoteId },
    schema: noteSchema,
    baseUrl: VIDEO_API_BASE_URL,
    headers: CLIENT_PLATFORM_HEADERS,
  });
}
