/**
 * api/files.ts — presigned file upload (`file-upload` Lambda).
 *
 * No client wrapper for this existed anywhere in src/ before this file —
 * grepped `upload-url`/`file-upload` across src/ first; the only hits were
 * SignupPage.tsx's header comment documenting the contract without wiring
 * it (no session existed at that point in the wizard — see that file).
 *
 * Three-step contract, all real (backend-initial's
 * src/lambdas/file-upload/src/handler.ts +
 * src/shared/storage/{document-classes,storage-service}.ts):
 *   1. GET  /files/upload-url  — presign a PUT for this exact file.
 *   2. PUT  the bytes straight to S3, with the ticket's `requiredHeaders`.
 *   3. POST /files             — register the now-uploaded object.
 */
import { z } from 'zod';
import { apiFetch } from './client';

const uploadTicketSchema = z.object({
  uploadUrl: z.string(),
  s3Key: z.string(),
  /** Headers the PUT MUST send for S3 to accept the signature — e.g. KMS
   *  encryption headers for a private class. */
  requiredHeaders: z.record(z.string(), z.string()),
  expiresInSeconds: z.number(),
  classId: z.string(),
  keyPrefix: z.string(),
});

export type UploadTicket = z.infer<typeof uploadTicketSchema>;

const fileRecordSchema = z
  .object({
    id: z.string(),
    s3Key: z.string(),
    /** Canonical URL for a public class, or the bare key for a private one
     *  (`servesPermanentUrl` on the backend) — display value only. */
    url: z.string(),
    mimeType: z.string(),
    sizeBytes: z.number(),
    context: z.string(),
    /** Minted per-read by the register call; not persisted server-side. */
    downloadUrl: z.string().optional(),
  })
  .passthrough();

export type UploadedFile = z.infer<typeof fileRecordSchema>;

/**
 * `'profile_picture'` is the documented WIRE value apps should send — the
 * server resolves it to `therapist_photo` / `client_photo` from the
 * CALLER's own role (`FileUploadService.resolveWireClass`), which is what
 * stops a caller naming a document class their role isn't entitled to write.
 * It is the only context this app currently has a use for.
 */
export type UploadContext = 'profile_picture';

export interface RequestUploadUrlParams {
  filename: string;
  mimeType: string;
  context: UploadContext;
  sizeBytes?: number;
}

/** GET /files/upload-url — presign a PUT for a new object. */
export function requestUploadUrl(params: RequestUploadUrlParams): Promise<UploadTicket> {
  const qs = new URLSearchParams({
    filename: params.filename,
    mimeType: params.mimeType,
    context: params.context,
    ...(params.sizeBytes !== undefined ? { sizeBytes: String(params.sizeBytes) } : {}),
  });
  return apiFetch(`/files/upload-url?${qs.toString()}`, {
    schema: z.object({ success: z.boolean(), data: uploadTicketSchema }),
    rawEnvelope: true,
  }).then((res) => res.data);
}

/**
 * PUT the file bytes straight to S3 using the presigned ticket.
 *
 * Deliberately NOT routed through apiFetch/apiRequest (api/client.ts) — this
 * request goes to S3, not backend-initial's API Gateway, and must send ONLY
 * the headers the signature was computed over (`ticket.requiredHeaders`).
 * apiRequest would add a Cognito `Authorization: Bearer` header and
 * `Content-Type: application/json`, either of which invalidates the
 * signature and gets the PUT rejected by S3 with a 403.
 */
export async function uploadFileToS3(ticket: UploadTicket, file: File): Promise<void> {
  const res = await fetch(ticket.uploadUrl, {
    method: 'PUT',
    headers: ticket.requiredHeaders,
    body: file,
  });
  if (!res.ok) {
    throw new Error(`Photo upload to storage failed (HTTP ${res.status})`);
  }
}

/** POST /files — register the now-uploaded object as a FileRecord. */
export function registerFile(params: {
  s3Key: string;
  mimeType: string;
  sizeBytes: number;
  context: UploadContext;
}): Promise<UploadedFile> {
  return apiFetch('/files', {
    method: 'POST',
    body: params,
    schema: z.object({ success: z.boolean(), data: fileRecordSchema }),
    rawEnvelope: true,
  }).then((res) => res.data);
}

/**
 * Full presign -> PUT -> register flow for a picked file.
 *
 * The returned `s3Key` is the stable value to persist (e.g. as
 * `updateTherapistCore({ profilePhoto: result.s3Key })`); `url`/`downloadUrl`
 * are display values only and must never be written back — see
 * backend-initial's `isPersistablePhotoKey`, which silently drops a URL
 * arriving on a write rather than storing an expiring string.
 */
export async function uploadFile(file: File, context: UploadContext): Promise<UploadedFile> {
  const ticket = await requestUploadUrl({
    filename: file.name,
    mimeType: file.type,
    context,
    sizeBytes: file.size,
  });
  await uploadFileToS3(ticket, file);
  return registerFile({ s3Key: ticket.s3Key, mimeType: file.type, sizeBytes: file.size, context });
}
