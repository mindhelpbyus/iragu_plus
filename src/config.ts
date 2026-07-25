/**
 * config.ts — runtime configuration sourced from VITE_* env.
 *
 * Backends (see .claude/context/domain-model.md):
 *   - VITE_API_BASE_URL        → shared HTTP API Gateway: backend-initial (no /api prefix)
 *                                 + billing_payment (/api/* prefix). No stage suffix.
 *   - VITE_VIDEO_API_BASE_URL  → video-service (LiveKit rooms/tokens/transcripts).
 * Auth is AWS Cognito (lib/cognito.ts) — there are NO backend /auth/* routes.
 */

const apiUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const videoApiUrl = (import.meta.env.VITE_VIDEO_API_BASE_URL || '').replace(/\/$/, '');

// AppSync Event API endpoint for real-time chat — same backend the mobile apps
// use (community-app / therapistApp). Defaults to the shared dev endpoint; can be
// overridden with VITE_APPSYNC_EVENTS_ENDPOINT per environment.
export const APPSYNC_EVENTS_ENDPOINT = (
  import.meta.env.VITE_APPSYNC_EVENTS_ENDPOINT ||
  'https://ibyqhrxdnrekjpznxdvfhruswm.appsync-api.ap-south-1.amazonaws.com/event'
).replace(/\/$/, '');

export const config = {
  api: {
    baseUrl: apiUrl,
    videoBaseUrl: videoApiUrl,
  },
  cognito: {
    region: import.meta.env.VITE_AWS_REGION || '',
    userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
    clientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '',
  },
  appsync: {
    eventsEndpoint: APPSYNC_EVENTS_ENDPOINT,
  },
};
