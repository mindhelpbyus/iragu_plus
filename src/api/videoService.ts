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
