/**
 * Split out from ZoomCall.tsx so this pure parsing logic can be unit tested
 * without importing @zoom/meetingsdk — that package executes browser-only
 * code (canvas/WebRTC bindings) at module load time and crashes outside a
 * real browser/jsdom environment, which would otherwise make this untestable
 * in the node test environment this repo's other unit tests run under.
 */
export function parseZoomJoinUrl(joinUrl: string): { meetingNumber: string; password?: string } {
  const url = new URL(joinUrl);
  const match = url.pathname.match(/\/j\/(\d+)/);
  if (!match) throw new Error(`Could not parse a Zoom meeting number from join URL: ${joinUrl}`);
  return { meetingNumber: match[1], password: url.searchParams.get('pwd') || undefined };
}
