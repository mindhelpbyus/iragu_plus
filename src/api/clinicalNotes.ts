/**
 * api/clinicalNotes.ts — POST /clinical-notes (backend-initial's clinical-notes
 * Lambda, src/lambdas/clinical-notes/src/handler.ts). therapistId must be the
 * caller's own id (assertSelf-enforced server-side); appointmentId is
 * required and validated to belong to that therapist/client pair
 * (assertAppointmentTie) before the note is created.
 */
import { z } from 'zod';
import { apiFetch } from './client';

export interface CreateClinicalNoteRequest {
  therapistId: string;
  clientId: string;
  appointmentId: string;
  noteType: 'SOAP' | 'DAP' | 'progress_note' | 'session_summary' | 'general' | 'quick_note';
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  content?: string;
}

const clinicalNoteResultSchema = z.object({
  id: z.number(),
  noteType: z.string(),
  isSigned: z.boolean(),
});

export function createClinicalNote(request: CreateClinicalNoteRequest) {
  return apiFetch('/clinical-notes', {
    method: 'POST',
    body: request,
    schema: z.object({ success: z.boolean(), data: clinicalNoteResultSchema }),
    rawEnvelope: true,
  }).then((res) => res.data);
}

/** Real backend.ClinicalNote shape — see backend-initial/prisma/schema.prisma. */
export const clinicalNoteSchema = z.object({
  id: z.number(),
  appointmentId: z.number(),
  therapistId: z.number(),
  clientId: z.number().nullable(),
  noteType: z.string(),
  content: z.string().nullable(),
  subjective: z.string().nullable(),
  objective: z.string().nullable(),
  assessment: z.string().nullable(),
  plan: z.string().nullable(),
  isSigned: z.boolean(),
  signedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ClinicalNoteRecord = z.infer<typeof clinicalNoteSchema>;

/** GET /clinical-notes/therapist?therapistId= — assertSelf-enforced server-side, always the caller's own notes. */
export function listTherapistNotes(therapistId: string, noteType?: string) {
  const params = new URLSearchParams({ therapistId });
  if (noteType) params.set('noteType', noteType);
  return apiFetch(`/clinical-notes/therapist?${params.toString()}`, {
    schema: z.object({ success: z.boolean(), data: z.array(clinicalNoteSchema) }),
    rawEnvelope: true,
  }).then((res) => res.data);
}

export interface ListSignedNotesFilters {
  /** Both must be given together — the server only engages the date-range
   *  query (getTherapistNotesByDateRange) when both are present; otherwise
   *  it falls back to its default "last 50 signed notes" behaviour. */
  startDate?: string;
  endDate?: string;
}

/**
 * GET /clinical-notes/signed?therapistId=&startDate=&endDate= —
 * assertSelf-enforced server-side, always the caller's own SIGNED notes.
 * Backs the Activity page's "Notes" filter: with a date range it returns
 * signed notes within that window; omitted, the last 50 regardless of age.
 */
export function listSignedNotes(therapistId: string, filters: ListSignedNotesFilters = {}) {
  const params = new URLSearchParams({ therapistId });
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  return apiFetch(`/clinical-notes/signed?${params.toString()}`, {
    schema: z.object({ success: z.boolean(), data: z.array(clinicalNoteSchema) }),
    rawEnvelope: true,
  }).then((res) => res.data);
}

export function getClinicalNote(id: number) {
  return apiFetch(`/clinical-notes/${id}`, {
    schema: z.object({ success: z.boolean(), data: clinicalNoteSchema }),
    rawEnvelope: true,
  }).then((res) => res.data);
}

export interface UpdateClinicalNoteRequest {
  content?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

/** 403s server-side outside the 48h edit window or once signed — this client doesn't pre-check either, the server is the source of truth. */
export function updateClinicalNote(id: number, patch: UpdateClinicalNoteRequest) {
  return apiFetch(`/clinical-notes/${id}`, {
    method: 'PUT',
    body: patch,
    schema: z.object({ success: z.boolean(), data: clinicalNoteSchema }),
    rawEnvelope: true,
  }).then((res) => res.data);
}

/** Caller-derived signer server-side — never pass who signed. */
export function signClinicalNote(id: number) {
  return apiFetch(`/clinical-notes/${id}/sign`, {
    method: 'POST',
    body: {},
    schema: z.object({ success: z.boolean(), data: clinicalNoteSchema }),
    rawEnvelope: true,
  }).then((res) => res.data);
}
