/**
 * api/chat.ts — backend-initial's real chat backend (chat-messages Lambda
 * for REST reads/block-state, AppSync Events for send + realtime) — the
 * same system community-app and therapistApp already use, not a new
 * backend. See chat-handler/index.js + chat-messages/index.js.
 *
 * Send has no REST route: a message is published directly to AppSync
 * Events (chat-handler persists it as the channel's OnPublish handler).
 * REST reads use the normal Cognito access token (apiFetch default);
 * publish uses the ID token, raw (no "Bearer" prefix) — mirrors the mobile
 * clients' AppSyncService.publishMessage exactly.
 */
import { z } from 'zod';
import { apiFetch, ApiFetchError } from './client';
import { getIdToken } from '../lib/cognito';
import { APPSYNC_EVENTS_ENDPOINT } from '../config';

// ─── Conversations ──────────────────────────────────────────────────────

const conversationSchema = z
  .object({
    conversationId: z.string(),
    userId: z.string(),
    clientId: z.string().optional(),
    therapistId: z.string().optional(),
    role: z.enum(['client', 'therapist']),
    clientName: z.string().optional(),
    therapistName: z.string().optional(),
    participantName: z.string(),
    lastMessage: z.string().optional(),
    lastMessageTimestamp: z.number().optional(),
    updatedAt: z.string().optional(),
    unreadCount: z.number(),
    blockedByMe: z.boolean(),
  })
  .passthrough();
export type Conversation = z.infer<typeof conversationSchema>;

/** userId is the caller's own numeric backend id (getMyTherapistId()), not the Cognito sub. */
export async function listConversations(
  userId: number,
  opts: { limit?: number; nextToken?: string } = {}
): Promise<{ conversations: Conversation[]; nextToken?: string }> {
  const params = new URLSearchParams();
  params.set('limit', String(opts.limit ?? 50));
  if (opts.nextToken) params.set('nextToken', opts.nextToken);
  return apiFetch(`/chat/conversations/${userId}?${params.toString()}`, {
    schema: z.object({ conversations: z.array(conversationSchema), nextToken: z.string().optional() }),
  });
}

export async function markConversationRead(conversationId: string, userId: number): Promise<void> {
  await apiFetch(`/chat/conversations/${encodeURIComponent(conversationId)}/read`, {
    method: 'PATCH',
    body: { userId: String(userId) },
    schema: z.object({ success: z.boolean(), cleared: z.array(z.string()), noop: z.boolean() }),
  });
}

// ─── Messages ───────────────────────────────────────────────────────────

const attachmentSchema = z
  .object({
    url: z.string(),
    fileType: z.string(),
    fileName: z.string(),
    fileSize: z.number().optional(),
    thumbnailUrl: z.string().optional(),
  })
  .passthrough();

const messageRowSchema = z
  .object({
    conversationId: z.string(),
    id: z.string(),
    senderId: z.string(),
    senderName: z.string(),
    content: z.string(),
    type: z.string(),
    timestamp: z.string(),
    status: z.string(),
    attachments: z.array(attachmentSchema).optional(),
  })
  .passthrough();

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  messageType: string;
  createdAt: string;
  status: 'sending' | 'sent' | 'delivered' | 'failed';
  attachments?: z.infer<typeof attachmentSchema>[];
}

function fromRestRow(row: z.infer<typeof messageRowSchema>): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversationId,
    senderId: row.senderId,
    senderName: row.senderName,
    content: row.content,
    messageType: row.type,
    createdAt: row.timestamp,
    status: 'delivered',
    attachments: row.attachments,
  };
}

/** REST returns newest-first (DynamoDB GSI scan reversed) — reverse for display. */
export async function getMessages(
  conversationId: string,
  opts: { limit?: number; nextToken?: string } = {}
): Promise<{ messages: ChatMessage[]; nextToken?: string }> {
  const params = new URLSearchParams();
  params.set('limit', String(opts.limit ?? 50));
  if (opts.nextToken) params.set('nextToken', opts.nextToken);
  const res = await apiFetch(`/chat/messages/${encodeURIComponent(conversationId)}?${params.toString()}`, {
    schema: z.object({ messages: z.array(messageRowSchema), nextToken: z.string().optional() }),
  });
  return { messages: res.messages.map(fromRestRow).reverse(), nextToken: res.nextToken };
}

/** Raw AppSync publish/subscribe event shape (messageId/messageType/createdAt), distinct from the REST shape above. */
export function fromRealtimeEvent(payload: Record<string, unknown>): ChatMessage | null {
  const messageId = payload.messageId ?? payload.id;
  const content = payload.content;
  if (typeof messageId !== 'string' || typeof content !== 'string' || !content) return null;
  return {
    id: messageId,
    conversationId: String(payload.conversationId ?? ''),
    senderId: String(payload.senderId ?? ''),
    senderName: typeof payload.senderName === 'string' ? payload.senderName : 'Unknown',
    content,
    messageType: typeof payload.messageType === 'string' ? payload.messageType : 'text',
    createdAt: typeof payload.createdAt === 'string' ? payload.createdAt : new Date().toISOString(),
    status: 'delivered',
  };
}

// ─── Blocking ───────────────────────────────────────────────────────────

export const CHAT_BLOCK_REASON_CODES = [
  'harassment',
  'inappropriate_content',
  'spam',
  'boundary_violation',
  'safety_concern',
  'not_my_client',
  'other',
] as const;
export type ChatBlockReasonCode = (typeof CHAT_BLOCK_REASON_CODES)[number];

export interface ChatBlockState {
  canSend: boolean;
  blockedByMe: boolean;
  blockedByPeer: boolean;
  blockedAt?: string;
}

const blockStateSchema = z.object({
  canSend: z.boolean(),
  blockedByMe: z.boolean(),
  blockedByPeer: z.boolean(),
  blockedAt: z.string().optional(),
});

/** A 404 means "no conversation row yet" — fails open (canSend: true), matching the mobile client's convention. */
export async function getBlockState(conversationId: string): Promise<ChatBlockState> {
  try {
    const res = await apiFetch(`/chat/conversations/${encodeURIComponent(conversationId)}/block`, {
      schema: z.object({ blockState: blockStateSchema }),
    });
    return res.blockState;
  } catch (err) {
    if (err instanceof ApiFetchError && err.status === 404) {
      return { canSend: true, blockedByMe: false, blockedByPeer: false };
    }
    throw err;
  }
}

/** reasonCode is required when the caller is a therapist (enforced server-side). */
export async function blockConversation(
  conversationId: string,
  opts: { reasonCode?: ChatBlockReasonCode; reason?: string } = {}
): Promise<void> {
  await apiFetch(`/chat/conversations/${encodeURIComponent(conversationId)}/block`, {
    method: 'POST',
    body: opts,
    schema: z.object({}).passthrough(),
  });
}

export async function unblockConversation(conversationId: string): Promise<void> {
  await apiFetch(`/chat/conversations/${encodeURIComponent(conversationId)}/block`, {
    method: 'DELETE',
    schema: z.object({}).passthrough(),
  });
}

// ─── Send (AppSync Events publish — no REST route) ─────────────────────

async function publishChatEvent(channel: string, event: Record<string, unknown>): Promise<void> {
  const idToken = await getIdToken();
  if (!idToken) throw new Error('Not authenticated');

  const res = await fetch(APPSYNC_EVENTS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: idToken },
    body: JSON.stringify({ channel, events: [JSON.stringify(event)] }),
  });
  if (!res.ok) {
    throw new Error(`Failed to send message (HTTP ${res.status})`);
  }
}

export interface SendMessageInput {
  conversationId: string;
  clientId: string;
  therapistId: string;
  content: string;
  senderId: string;
  senderName: string;
  messageType?: string;
  /** Pass the id already used for an optimistic local bubble so the caller can reconcile by id once this resolves. Defaults to a fresh uuid. */
  messageId?: string;
}

/** Optimistic-send shape: caller should render the returned message immediately (status 'sent' once this resolves, 'failed' if it throws). */
export async function sendMessage(input: SendMessageInput): Promise<ChatMessage> {
  const messageId = input.messageId ?? crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const channel = `/chat/channel/${input.conversationId}`;

  await publishChatEvent(channel, {
    messageId,
    conversationId: input.conversationId,
    clientId: input.clientId,
    therapistId: input.therapistId,
    content: input.content,
    channelName: channel,
    createdAt,
    messageType: input.messageType ?? 'text',
    senderId: input.senderId,
    senderName: input.senderName,
  });

  return {
    id: messageId,
    conversationId: input.conversationId,
    senderId: input.senderId,
    senderName: input.senderName,
    content: input.content,
    messageType: input.messageType ?? 'text',
    createdAt,
    status: 'sent',
  };
}
