/**
 * api/clientDetail.ts — single-client profile + clinical notes + consent,
 * backing /clients/:id. All backend-initial (clients + clinical-notes Lambdas).
 */
import { z } from 'zod';
import { apiFetch } from './client';

const clientDetailSchema = z.object({
  id: z.number(),
  email: z.string(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  createdAt: z.string(),
  hasConfirmedBooking: z.boolean(),
  clientProfile: z
    .object({
      emergencyContactName: z.string().nullable().optional(),
      emergencyContactPhone: z.string().nullable().optional(),
      preferredSessionLength: z.number().nullable().optional(),
      preferredTherapyType: z.string().nullable().optional(),
      location: z.string().nullable().optional(),
      preferredLanguages: z.array(z.string()).optional(),
    })
    .nullable()
    .optional(),
});

export type ClientDetail = z.infer<typeof clientDetailSchema>;

export function getClientDetail(clientId: string) {
  return apiFetch(`/clients/${clientId}`, {
    schema: z.object({ success: z.boolean(), data: clientDetailSchema }),
    rawEnvelope: true,
  }).then((res) => res.data);
}

const clinicalNoteSchema = z.object({
  id: z.number(),
  noteType: z.string(),
  content: z.string().nullable().optional(),
  clientSummary: z.string().nullable().optional(),
  isSigned: z.boolean(),
  createdAt: z.string(),
});

export type ClinicalNote = z.infer<typeof clinicalNoteSchema>;

export function getClientNotes(clientId: string) {
  return apiFetch(`/clinical-notes/client?clientId=${clientId}`, {
    schema: z.object({ success: z.boolean(), data: z.array(clinicalNoteSchema) }),
    rawEnvelope: true,
  }).then((res) => res.data);
}

const consentSchema = z.object({
  consentGiven: z.boolean(),
  consentGivenAt: z.string().nullable(),
  consentVersion: z.string().nullable(),
});

export function getClientConsent(clientId: string) {
  return apiFetch(`/clients/${clientId}/consent`, {
    schema: z.object({ success: z.boolean(), data: consentSchema }),
    rawEnvelope: true,
  }).then((res) => res.data);
}
