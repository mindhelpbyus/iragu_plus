/**
 * api/billing.ts — billing_payment's therapist-facing money routes
 * (GET /api/therapists/me/{payouts,transactions,earnings-summary,bank-details}).
 *
 * billing_payment's Lambda authorizes via `resolveTherapistId`, which reads
 * `custom:therapistId` off the JWT — that claim only exists on the Cognito
 * ID token, not the access token apiRequest attaches by default. Every call
 * here supplies its own `Authorization: Bearer <idToken>` header, which
 * apiRequest's caller-supplied-header-wins rule (see client.ts) honors.
 *
 * Response envelopes vary by route (`{ok,data,pagination}` / `{ok,data}` /
 * `{data}`) — every call uses `rawEnvelope: true` and the schema encodes the
 * real per-route shape instead of assuming a single uniform envelope.
 */
import { z } from 'zod';
import { apiFetch } from './client';
import { getIdToken } from '../lib/cognito';

async function billingHeaders(): Promise<Record<string, string>> {
  const idToken = await getIdToken();
  return idToken ? { Authorization: `Bearer ${idToken}` } : {};
}

const paginationSchema = z.object({
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

// ─── Earnings summary ─────────────────────────────────────────────────────

export const earningsSummarySchema = z.object({
  current_period_start: z.string(),
  current_period_end: z.string(),
  next_payout_date: z.string(),
  current_period_sessions: z.number(),
  current_period_gross_paise: z.number(),
  current_period_commission_paise: z.number(),
  current_period_tds_paise: z.number(),
  current_period_net_paise: z.number(),
  accrued_unpaid_gross_paise: z.number(),
  accrued_unpaid_net_paise: z.number(),
  accrued_unpaid_tds_paise: z.number(),
  accrued_session_count: z.number(),
  ytd_gross_paise: z.number(),
  ytd_net_paise: z.number(),
  ytd_tds_deducted_paise: z.number(),
  ytd_session_count: z.number(),
  last_payout_amount_paise: z.number().nullable(),
  last_payout_date: z.string().nullable(),
  on_hold_paise: z.number(),
  on_hold_reason: z.string().nullable(),
  failed_paise: z.number(),
  payout_blocked_reason: z.string().nullable(),
  currency: z.string(),
});
export type EarningsSummary = z.infer<typeof earningsSummarySchema>;

export async function getEarningsSummary(): Promise<EarningsSummary> {
  const res = await apiFetch('/api/therapists/me/earnings-summary', {
    schema: z.object({ ok: z.boolean(), data: earningsSummarySchema }),
    rawEnvelope: true,
    headers: await billingHeaders(),
  });
  return res.data;
}

// ─── Payouts ──────────────────────────────────────────────────────────────

export const PAYOUT_STATUSES = ['pending', 'processing', 'completed', 'failed', 'on_hold'] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

const payoutRowSchema = z.object({
  id: z.union([z.string(), z.number()]),
  status: z.string(),
  grossAmountPaise: z.number(),
  commissionPaise: z.number(),
  tdsPaise: z.number(),
  clawbackPaise: z.number(),
  deductionsPaise: z.number(),
  netAmountPaise: z.number(),
  currency: z.string(),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
  failureReason: z.string().nullable(),
  utr: z.string().nullable(),
  batchId: z.union([z.string(), z.number()]).nullable(),
  payoutMethod: z.string(),
});
export type PayoutRow = z.infer<typeof payoutRowSchema>;

export interface ListPayoutsFilters {
  statuses?: PayoutStatus[];
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: z.infer<typeof paginationSchema>;
}

export async function listPayouts(filters: ListPayoutsFilters = {}): Promise<PaginatedResult<PayoutRow>> {
  const params = new URLSearchParams();
  if (filters.statuses?.length) params.set('status', filters.statuses.join(','));
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  const qs = params.toString();

  const res = await apiFetch(`/api/therapists/me/payouts${qs ? `?${qs}` : ''}`, {
    schema: z.object({ ok: z.boolean(), data: z.array(payoutRowSchema), pagination: paginationSchema }),
    rawEnvelope: true,
    headers: await billingHeaders(),
  });
  return { data: res.data, pagination: res.pagination };
}

// ─── Transactions (per-session earnings ledger) ──────────────────────────

export const TRANSACTION_TYPES = ['session_earning', 'refund', 'adjustment'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

const transactionRowSchema = z.object({
  id: z.union([z.string(), z.number()]),
  type: z.enum(TRANSACTION_TYPES),
  occurredAt: z.string().nullable(),
  createdAt: z.string().nullable(),
  appointmentId: z.union([z.string(), z.number()]).nullable(),
  currency: z.string(),
  status: z.string(),
  sessionStatus: z.string().nullable().optional(),
  grossPaise: z.number(),
  deductionsPaise: z.number(),
  reservePaise: z.number().optional(),
  tdsPaise: z.number().optional(),
  gatewayFeePaise: z.number().optional(),
  netPaise: z.number(),
  platformCommissionPaise: z.number().optional(),
  platformCommissionGstPaise: z.number().optional(),
  clientPaidPaise: z.number().optional(),
  reason: z.string().nullable().optional(),
  entryType: z.string().nullable().optional(),
});
export type TransactionRow = z.infer<typeof transactionRowSchema>;

export interface ListTransactionsFilters {
  types?: TransactionType[];
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export async function listTransactions(
  filters: ListTransactionsFilters = {}
): Promise<PaginatedResult<TransactionRow>> {
  const params = new URLSearchParams();
  if (filters.types?.length) params.set('type', filters.types.join(','));
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  const qs = params.toString();

  const res = await apiFetch(`/api/therapists/me/transactions${qs ? `?${qs}` : ''}`, {
    schema: z.object({ ok: z.boolean(), data: z.array(transactionRowSchema), pagination: paginationSchema }),
    rawEnvelope: true,
    headers: await billingHeaders(),
  });
  return { data: res.data, pagination: res.pagination };
}

// ─── Bank details (payout account) ────────────────────────────────────────

const bankDetailsSchema = z
  .object({
    active: z.boolean(),
    bank_verified: z.boolean(),
    bank_registered_name: z.string().nullable(),
    payout_mode: z.string().nullable(),
    verification_status: z.string(),
    failure_code: z.string().nullable(),
    failure_message: z.string().nullable(),
    cooling_period_ends_at: z.string().nullable(),
    attempts_remaining: z.number().nullable(),
    retry_allowed: z.boolean(),
    account_last_4: z.string().optional(),
    ifsc_code: z.string().nullable().optional(),
  })
  .passthrough();
export type BankDetails = z.infer<typeof bankDetailsSchema>;

export async function getBankDetails(): Promise<BankDetails> {
  const res = await apiFetch('/api/therapists/me/bank-details', {
    schema: z.object({ data: bankDetailsSchema }),
    rawEnvelope: true,
    headers: await billingHeaders(),
  });
  return res.data;
}

// ─── Invoices / statements ─────────────────────────────────────────────────
// GET /api/invoices returns a plain array (no {ok,data} envelope) and, for a
// non-admin caller, is scoped server-side to the caller's own recipientId
// when none is supplied (see billing_payment's resolveInvoiceAccess.js) —
// deliberately NOT passing recipientId/recipientType here lets that
// auto-scoping apply instead of guessing the caller's own numeric id.

const invoiceRowSchema = z
  .object({
    id: z.string(),
    type: z.string(),
    docNumber: z.string().nullable().optional(),
    batchId: z.union([z.string(), z.number()]).nullable().optional(),
    recipientType: z.string(),
    recipientId: z.union([z.string(), z.number()]),
    totalPaise: z.number().nullable().optional(),
    title: z.string().nullable().optional(),
    status: z.string(),
    currency: z.string().nullable().optional(),
    pdfStatus: z.string().nullable().optional(),
    pdfFailureReason: z.string().nullable().optional(),
    generatedAt: z.string().nullable().optional(),
    createdAt: z.string(),
  })
  .passthrough();
export type InvoiceRow = z.infer<typeof invoiceRowSchema>;

/** Real, current statement type — a bi-weekly payout-cycle statement (its own
 *  built-in tax/GST breakdown included), not a calendar-month rollup. */
export async function listPayoutStatements(): Promise<InvoiceRow[]> {
  return apiFetch('/api/invoices?type=therapist_payout_statement', {
    schema: z.array(invoiceRowSchema),
    headers: await billingHeaders(),
  });
}

const invoiceDownloadSchema = z.object({
  downloadUrl: z.string().nullable(),
  pdfStatus: z.string(),
  pdfFailureReason: z.string().nullable().optional(),
});
export type InvoiceDownload = z.infer<typeof invoiceDownloadSchema>;

export async function getInvoiceDownload(invoiceId: string): Promise<InvoiceDownload> {
  return apiFetch(`/api/invoices/${encodeURIComponent(invoiceId)}/download`, {
    schema: invoiceDownloadSchema,
    headers: await billingHeaders(),
  });
}

// ─── Pricing (real commission/GST rates — read, never hardcoded) ─────────
// POST /api/pricing/calc/payment is a read-only ops calculator (no DB
// writes, no caller-specific data) — reused here to surface the real,
// currently-configured BillingConfig rates for PlansPage instead of
// inventing a parallel "read config" endpoint.

const feeBreakdownSchema = z
  .object({
    rates: z.object({
      platformFeeRatePct: z.number(),
      gatewayFeeRatePct: z.number(),
      gstRatePct: z.number(),
    }),
    clientCharges: z.object({
      sessionAmount: z.number(),
      platformFee: z.number(),
      platformFeeGst: z.number(),
      totalChargedPaise: z.number(),
    }),
    therapistReceives: z.object({
      amountPaise: z.number(),
    }),
  })
  .passthrough();
export type FeeBreakdown = z.infer<typeof feeBreakdownSchema>;

export async function getFeeBreakdown(sessionAmountPaise: number): Promise<FeeBreakdown> {
  return apiFetch('/api/pricing/calc/payment', {
    method: 'POST',
    body: { sessionAmount: sessionAmountPaise },
    schema: feeBreakdownSchema,
    headers: await billingHeaders(),
  });
}
