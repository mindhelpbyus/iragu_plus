/**
 * api/support.ts — backend_support_api's therapist-facing ticket routes
 * (`/tickets`, `/tickets/{ticketNumber}`, `/tickets/{ticketNumber}/messages`,
 * `/tickets/{ticketNumber}/reopen`, and the attachment presign/confirm/
 * download trio).
 *
 * backend_support_api is a standalone peer service behind the SAME shared
 * API Gateway iragu_plus already calls (billing_payment, backend-initial) —
 * `VITE_API_BASE_URL` needs no change, routes are mounted at the root
 * (`/tickets`, not `/api/tickets`). Its Lambda re-verifies the Cognito JWT
 * itself and reads `custom:*`-adjacent claims the same way billing_payment's
 * does, so — exactly like api/billing.ts — every call here supplies its own
 * `Authorization: Bearer <idToken>` header rather than the access token
 * apiRequest attaches by default (see client.ts's caller-supplied-header-
 * wins rule).
 *
 * Every mutating call (POST/PATCH) requires an `Idempotency-Key` header
 * (backend_support_api's createSupportHandler.js 400s with
 * IDEMPOTENCY_KEY_REQUIRED otherwise) — supplied via apiFetch's
 * `idempotencyKey` option, a fresh UUID per logical action.
 *
 * Response shapes are copied from the one other real caller of this service,
 * bedrock_support_center (lib/api/tickets.ts, app/_components/actions.ts,
 * app/tickets/[id]/_components/actions.ts) — not re-derived from guesswork.
 */
import { z } from 'zod';
import { apiFetch } from './client';
import { getIdToken } from '../lib/cognito';

async function supportHeaders(): Promise<Record<string, string>> {
  const idToken = await getIdToken();
  return idToken ? { Authorization: `Bearer ${idToken}` } : {};
}

// ─── Ticket vocabulary (UI convention, not schema-enforced) ────────────────
// Copied verbatim from bedrock_support_center/lib/api/types.ts — the one
// other real client of this service — so a ticket filed from either app
// lands in the same product/category/priority vocabulary an agent sees.

export const TICKET_PRODUCTS = ['Iragu', 'Iragu+'] as const;
export type TicketProduct = (typeof TICKET_PRODUCTS)[number];

export const TICKET_CATEGORIES = [
  'Technical Issue',
  'Billing',
  'Account Access',
  'Feature Request',
  'Data & Privacy',
  'Other',
] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const TICKET_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

// The caller-visible status set. `engineering` exists in the DB enum
// (backend_support_api's tickets.controller.js VALID_STATUSES) but is
// ALWAYS aliased to `in_progress` for a non-agent caller server-side
// (presentTicketForCaller) — a therapist can never actually receive it, so
// it's deliberately excluded here rather than modeled and never hit.
export const TICKET_STATUSES = ['open', 'in_progress', 'waiting', 'resolved', 'closed'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];
const ticketStatusSchema = z.enum(TICKET_STATUSES);

// ─── Ticket ─────────────────────────────────────────────────────────────
// Ticket/TicketMessage/TicketAttachment models: backend-initial/prisma/
// schema.prisma:1201-1236. product/category/priority have no dedicated
// columns — they live in `metadata` (JSONB), passed through as-is.

const ticketMetadataSchema = z
  .object({
    product: z.string().optional(),
    category: z.string().optional(),
    priority: z.enum(TICKET_PRIORITIES).optional(),
  })
  .passthrough();

export const ticketSchema = z
  .object({
    id: z.string(),
    ticketNumber: z.string(),
    userId: z.number(),
    subject: z.string(),
    status: ticketStatusSchema,
    assignedTo: z.number().nullable(),
    metadata: ticketMetadataSchema,
    resolvedAt: z.string().nullable(),
    closedAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  // `SELECT *` also returns archivedAt/archivedBy — passthrough rather than
  // enumerated, since no caller-facing flow here reads them.
  .passthrough();
export type Ticket = z.infer<typeof ticketSchema>;

// ─── Message ────────────────────────────────────────────────────────────

export const ticketMessageSchema = z
  .object({
    id: z.string(),
    ticketId: z.string(),
    senderType: z.enum(['user', 'agent']),
    senderId: z.number(),
    // Null when a message is attachment-only (no text) — messages.controller.js
    // accepts `body: undefined` as long as at least one attachmentId is present.
    body: z.string().nullable(),
    createdAt: z.string(),
  })
  .passthrough();
export type TicketMessage = z.infer<typeof ticketMessageSchema>;

// ─── Attachment ─────────────────────────────────────────────────────────

export const ticketAttachmentSchema = z
  .object({
    id: z.string(),
    ticketId: z.string(),
    uploadedBy: z.number(),
    filename: z.string(),
    contentType: z.string().nullable(),
    sizeBytes: z.number().nullable(),
    status: z.enum(['pending', 'uploaded', 'failed']),
    messageId: z.string().nullable(),
    createdAt: z.string(),
  })
  .passthrough();
export type TicketAttachment = z.infer<typeof ticketAttachmentSchema>;

// ─── User ref (ticket detail's usersById) ──────────────────────────────────

const userRefSchema = z.object({
  id: z.number(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
});
export type TicketUserRef = z.infer<typeof userRefSchema>;

// ─── Ticket detail ──────────────────────────────────────────────────────

export const ticketDetailSchema = ticketSchema.extend({
  messages: z.array(ticketMessageSchema),
  attachments: z.array(ticketAttachmentSchema),
  // JSON object keys serialize as strings even though the DB id is
  // numeric — usersById[String(userId)] is how every caller reads it
  // (see bedrock_support_center/lib/api/tickets.ts).
  usersById: z.record(z.string(), userRefSchema),
});
export type TicketDetail = z.infer<typeof ticketDetailSchema>;

// ─── Create ticket ──────────────────────────────────────────────────────

export interface CreateTicketInput {
  subject: string;
  body: string;
  product: TicketProduct;
  category: TicketCategory;
  priority: TicketPriority;
}

export async function createTicket(input: CreateTicketInput): Promise<Ticket> {
  return apiFetch('/tickets', {
    method: 'POST',
    headers: await supportHeaders(),
    idempotencyKey: crypto.randomUUID(),
    body: {
      subject: input.subject,
      body: input.body,
      metadata: { product: input.product, category: input.category, priority: input.priority },
    },
    schema: ticketSchema,
  });
}

// ─── List tickets (own tickets, cursor-paginated) ───────────────────────

const listTicketsResponseSchema = z.object({
  tickets: z.array(ticketSchema),
  nextCursor: z.string().nullable(),
});
export type ListTicketsResponse = z.infer<typeof listTicketsResponseSchema>;

export interface ListTicketsOptions {
  status?: TicketStatus;
  /** Opaque `"<updatedAt-iso>,<id>"` cursor — round-tripped, never parsed here. */
  cursor?: string | null;
  limit?: number;
}

export async function listTickets(opts: ListTicketsOptions = {}): Promise<ListTicketsResponse> {
  const params = new URLSearchParams();
  if (opts.status) params.set('status', opts.status);
  if (opts.cursor) params.set('cursor', opts.cursor);
  params.set('limit', String(opts.limit ?? 20));

  return apiFetch(`/tickets?${params.toString()}`, {
    headers: await supportHeaders(),
    schema: listTicketsResponseSchema,
  });
}

// ─── Ticket detail (messages + attachments + usersById) ─────────────────

export async function getTicket(ticketNumber: string): Promise<TicketDetail> {
  return apiFetch(`/tickets/${encodeURIComponent(ticketNumber)}`, {
    headers: await supportHeaders(),
    schema: ticketDetailSchema,
  });
}

// ─── Reply ────────────────────────────────────────────────────────────────
// A reply needs text OR at least one attachment — never both empty
// (messages.controller.js's VALIDATION_ERROR otherwise).

export async function postTicketReply(
  ticketNumber: string,
  input: { body?: string; attachmentIds?: string[] }
): Promise<TicketMessage> {
  const body = input.body?.trim();
  return apiFetch(`/tickets/${encodeURIComponent(ticketNumber)}/messages`, {
    method: 'POST',
    headers: await supportHeaders(),
    idempotencyKey: crypto.randomUUID(),
    body: { body: body || undefined, attachmentIds: input.attachmentIds ?? [] },
    schema: ticketMessageSchema,
  });
}

// ─── Reopen ─────────────────────────────────────────────────────────────
// Server is the real gate (72h from resolvedAt for a non-agent caller,
// REOPEN_WINDOW_EXPIRED past that) — see pages/support/ticketHelpers.ts's
// isWithinReopenWindow for the client-side UX mirror of the same window.

export async function reopenTicket(ticketNumber: string, reason: string): Promise<Ticket> {
  return apiFetch(`/tickets/${encodeURIComponent(ticketNumber)}/reopen`, {
    method: 'POST',
    headers: await supportHeaders(),
    idempotencyKey: crypto.randomUUID(),
    body: { reason },
    schema: ticketSchema,
  });
}

// ─── Attachments (presign → client PUT to S3 → confirm) ────────────────
// The browser PUTs file bytes straight to S3 using the presigned URL —
// never through this API — so a large file is never buffered through
// iragu_plus's own origin. 20MB/file, 100MB/ticket caps enforced server-side
// (backend_support_api's s3Presign.js / attachments.controller.js).

const presignResponseSchema = z.object({
  attachmentId: z.string(),
  uploadUrl: z.string(),
});
export type PresignAttachmentResponse = z.infer<typeof presignResponseSchema>;

export async function presignTicketAttachment(
  ticketNumber: string,
  input: { filename: string; contentType: string; sizeBytes: number }
): Promise<PresignAttachmentResponse> {
  return apiFetch(`/tickets/${encodeURIComponent(ticketNumber)}/attachments/presign`, {
    method: 'POST',
    headers: await supportHeaders(),
    idempotencyKey: crypto.randomUUID(),
    body: input,
    schema: presignResponseSchema,
  });
}

export async function confirmTicketAttachment(
  ticketNumber: string,
  attachmentId: string
): Promise<TicketAttachment> {
  return apiFetch(
    `/tickets/${encodeURIComponent(ticketNumber)}/attachments/${encodeURIComponent(attachmentId)}/confirm`,
    {
      method: 'POST',
      headers: await supportHeaders(),
      idempotencyKey: crypto.randomUUID(),
      body: {},
      schema: ticketAttachmentSchema,
    }
  );
}

const downloadResponseSchema = z.object({
  downloadUrl: z.string(),
  shareUrl: z.string(),
  filename: z.string(),
  contentType: z.string().nullable(),
});
export type TicketAttachmentDownload = z.infer<typeof downloadResponseSchema>;

/**
 * Minted fresh on every call — never cached. backend_support_api re-verifies
 * ticket access every time and returns a presigned S3 URL that expires in
 * 15 minutes; attachments may carry PII (a client billing screenshot, an ID
 * document), so this is deliberately called only at the moment someone
 * clicks to view/download, matching bedrock_support_center's own comment on
 * why this is never stored.
 */
export async function getTicketAttachmentDownloadUrl(
  ticketNumber: string,
  attachmentId: string
): Promise<TicketAttachmentDownload> {
  return apiFetch(
    `/tickets/${encodeURIComponent(ticketNumber)}/attachments/${encodeURIComponent(attachmentId)}/download`,
    {
      headers: await supportHeaders(),
      schema: downloadResponseSchema,
    }
  );
}

/**
 * Uploads one File directly to S3 via a presigned PUT, then confirms it
 * server-side (which HeadObjects the key to verify the upload actually
 * landed before flipping status to 'uploaded'). Mirrors
 * bedrock_support_center/lib/uploadAttachment.ts's uploadAttachment().
 */
export async function uploadTicketAttachment(
  ticketNumber: string,
  file: File
): Promise<{ ok: true; attachment: TicketAttachment } | { ok: false; error: string }> {
  let presigned: PresignAttachmentResponse;
  try {
    presigned = await presignTicketAttachment(ticketNumber, {
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not start the upload.' };
  }

  const put = await fetch(presigned.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });
  if (!put.ok) return { ok: false, error: 'Upload failed. Please try again.' };

  try {
    const attachment = await confirmTicketAttachment(ticketNumber, presigned.attachmentId);
    return { ok: true, attachment };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not confirm the upload.' };
  }
}
