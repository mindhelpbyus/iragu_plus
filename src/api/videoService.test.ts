import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { joinCredentialsSchema, roomSchema } from './videoService';

// video-service's real JoinCredentials shape (src/domain/types.ts / callProvider.ts),
// as returned by POST /api/appointments/{id}/join — asserted here so a real
// backend shape drift fails this test loudly instead of silently breaking the
// join flow at runtime (apiFetch throws ApiSchemaError on a mismatch).
const REAL_LIVEKIT_JOIN_RESPONSE = {
  roomId: 'room_abc123',
  provider: 'livekit',
  roomName: 'internal_meeting_org_1_clinical_team_standup',
  participantIdentity: 'therapist_therapist_42',
  participantRole: 'therapist',
  serverUrl: 'wss://your-livekit.example.com',
  token: 'livekit_participant_token',
  uiMode: 'meeting',
  features: { audio: true, video: true, chat: true, transcription: false, recording: false },
  banner: { type: 'info', message: 'Meeting room is ready.' },
  transcription: { enabled: false, languageCode: 'hi-IN', provider: 'mock', realtime: true },
};

describe('joinCredentialsSchema', () => {
  it('accepts a real LiveKit join response', () => {
    const result = joinCredentialsSchema.safeParse(REAL_LIVEKIT_JOIN_RESPONSE);
    expect(result.success).toBe(true);
  });

  it('accepts a waiting-room response with an empty token', () => {
    const result = joinCredentialsSchema.safeParse({
      ...REAL_LIVEKIT_JOIN_RESPONSE,
      token: '',
      waitingRoom: true,
      waitingSince: '2026-08-27T10:00:00.000Z',
      waitingTimeoutSeconds: 600,
      waitingAlertRaised: false,
      rescheduleOffered: false,
    });
    expect(result.success).toBe(true);
  });

  it('accepts every real provider name video-service can return', () => {
    for (const provider of ['livekit', 'zoom', 'jitsi', 'huddle01', 'google_meet', 'zoho_meeting']) {
      const result = joinCredentialsSchema.safeParse({ ...REAL_LIVEKIT_JOIN_RESPONSE, provider });
      expect(result.success, `provider "${provider}" should be valid`).toBe(true);
    }
  });

  it('rejects a response missing the required token field', () => {
    const { token: _token, ...withoutToken } = REAL_LIVEKIT_JOIN_RESPONSE;
    const result = joinCredentialsSchema.safeParse(withoutToken);
    expect(result.success).toBe(false);
  });

  it('rejects an unknown provider name (would indicate a backend contract change)', () => {
    const result = joinCredentialsSchema.safeParse({ ...REAL_LIVEKIT_JOIN_RESPONSE, provider: 'webex' });
    expect(result.success).toBe(false);
  });

  it('allows serverUrl to be absent (Google Meet/Zoho token model has no server-issued token)', () => {
    const { serverUrl: _serverUrl, token: _t, ...rest } = REAL_LIVEKIT_JOIN_RESPONSE;
    const result = joinCredentialsSchema.safeParse({ ...rest, provider: 'google_meet', token: '' });
    expect(result.success).toBe(true);
  });
});

// video-service's real Room shape (src/domain/types.ts) for a therapist's
// personal room, as returned by GET /api/therapists/{therapistId}/personal-room
// (getOrCreateTherapistPersonalRoom in videoService.ts, backed by
// video-service's VideoService.getOrCreateTherapistPersonalRoom,
// src/services/videoService.ts:565-586). Room carries many more fields than
// roomSchema declares (orgId, ownerUserId, consent, banner, features, ...) —
// roomSchema intentionally asserts only the subset any current caller
// actually reads (id, provider, type, roomName, title, status), so this
// test's real job is confirming those still parse out of a REAL full Room
// payload without the extra fields tripping zod, and that a real backend
// contract change (a field getOrCreateTherapistPersonalRoom depends on going
// missing) fails loudly instead of silently.
const REAL_PERSONAL_ROOM_RESPONSE = {
  room: {
    id: 'room_personal_42',
    orgId: 'default',
    provider: 'livekit',
    type: 'therapist_personal_room',
    roomName: 'therapist_personal_room_org_default_therapist_42',
    title: 'Therapist Personal Room',
    ownerUserId: 'cognito-sub-therapist-42',
    therapistId: 'cognito-sub-therapist-42',
    status: 'waiting',
    features: { audio: true, video: true, chat: true },
    defaultLanguage: 'auto',
    banner: { type: 'waiting', message: 'Personal room is open. Please wait for the therapist to admit you.' },
    consent: { transcript: false, recording: false },
    createdAt: '2026-08-27T10:00:00.000Z',
  },
};

describe('roomSchema (GET /therapists/{id}/personal-room)', () => {
  it('accepts a real therapist personal room response', () => {
    const result = z.object({ room: roomSchema }).safeParse(REAL_PERSONAL_ROOM_RESPONSE);
    expect(result.success).toBe(true);
  });

  it('rejects a response missing roomName — getOrCreateTherapistPersonalRoom reads it directly off the parsed result', () => {
    const { roomName: _roomName, ...withoutRoomName } = REAL_PERSONAL_ROOM_RESPONSE.room;
    const result = z.object({ room: roomSchema }).safeParse({ room: withoutRoomName });
    expect(result.success).toBe(false);
  });

  it('rejects a response missing id — getOrCreateTherapistPersonalRoom reads it directly off the parsed result', () => {
    const { id: _id, ...withoutId } = REAL_PERSONAL_ROOM_RESPONSE.room;
    const result = z.object({ room: roomSchema }).safeParse({ room: withoutId });
    expect(result.success).toBe(false);
  });
});
