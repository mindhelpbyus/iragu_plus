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
  }).then((res) => ({ id: res.room.id, roomName: res.room.roomName }));
}

/** Joins a room directly by id — the ad-hoc-meeting counterpart to joinAppointmentRoom. */
export function joinRoom(roomId: string, params: JoinAppointmentParams = {}): Promise<JoinCredentials> {
  return apiFetch(`/api/rooms/${roomId}/join`, {
    method: 'POST',
    body: { displayName: params.displayName, mode: params.mode ?? 'video' },
    schema: joinCredentialsSchema,
    baseUrl: VIDEO_API_BASE_URL,
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
  }).then(() => undefined);
}

/**
 * Mints a signed, room-scoped, time-limited guest-join token
 * (video-service's POST /rooms/{id}/guest-link) — the real "copy link" flow.
 * Therapist/admin/staff-only server-side. The token itself is opaque here;
 * the frontend embeds it into an in-app deep link
 * (/telehealth/guest/{roomId}?token=...), never a raw provider URL.
 */
export function createGuestLink(roomId: string): Promise<{ roomId: string; token: string }> {
  return apiFetch(`/api/rooms/${roomId}/guest-link`, {
    method: 'POST',
    schema: z.object({ roomId: z.string(), token: z.string() }),
    baseUrl: VIDEO_API_BASE_URL,
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
  });
}
