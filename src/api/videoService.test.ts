import { describe, it, expect } from 'vitest';
import { joinCredentialsSchema } from './videoService';

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
