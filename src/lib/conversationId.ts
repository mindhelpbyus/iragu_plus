/**
 * Deterministic chat conversation/message IDs — TypeScript port of
 * backend-initial's src/shared/chat/conversation-id.ts, which is itself one
 * leg of a three-way contract with community-app's and therapistApp's Dart
 * copies (chat_utils.dart). All must stay byte-for-byte identical: a
 * different algorithm here means iragu_plus computes a DIFFERENT
 * conversationId for the same client/therapist pair than the mobile apps
 * do, silently splitting one conversation's history into two.
 *
 * Ported using Web Crypto (crypto.subtle.digest) since this runs in the
 * browser, not Node — the hashing algorithm and hex-to-UUID formatting
 * (including the deliberate, load-bearing hex[12]-skipping quirk) are
 * otherwise unchanged from the backend original.
 */

const VARIANT_NIBBLES = new Set(['8', '9', 'a', 'b']);

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** NOTE: the `13, 16` slice below is deliberate — see conversation-id.ts. Do not "fix" it. */
function formatAsUuidV4(hex: string): string {
  const g1 = hex.substring(0, 8);
  const g2 = hex.substring(8, 12);
  const g3 = `4${hex.substring(13, 16)}`;
  const v = hex[16];
  const varChar = VARIANT_NIBBLES.has(v) ? v : '8';
  const g4 = `${varChar}${hex.substring(17, 20)}`;
  const g5 = hex.substring(20, 32);
  return `${g1}-${g2}-${g3}-${g4}-${g5}`;
}

/** Sorted so the same pair maps to the same conversation regardless of who initiated it. */
export async function generateConversationId(clientId: string, therapistId: string): Promise<string> {
  const id1 = String(clientId ?? '').trim();
  const id2 = String(therapistId ?? '').trim();
  if (!id1 || !id2) throw new Error('Both clientId and therapistId must be non-empty');

  const sorted = [id1, id2].sort();
  const hex = (await sha256Hex(`${sorted[0]}_${sorted[1]}`)).substring(0, 32);
  return formatAsUuidV4(hex);
}
