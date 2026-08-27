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
