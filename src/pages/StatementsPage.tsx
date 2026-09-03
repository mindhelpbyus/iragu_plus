import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '../components/layout/PageHeader';
import { formatPaise } from '../lib/money';
import { useStatements } from './statements/useStatements';
import { getInvoiceDownload, type InvoiceRow } from '../api/billing';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatusPill({ status }: { status: string }) {
  const isReady = status === 'generated';
  return (
    <span
      className="inline-flex h-[22px] items-center rounded-full px-2.5 text-[11px] font-medium capitalize"
      style={isReady ? { background: '#E8F2EB', color: '#175C3B' } : { background: '#F2EAE0', color: '#6B5545' }}
    >
      {isReady ? 'Ready' : status.replace('_', ' ')}
    </span>
  );
}

export default function StatementsPage() {
  const { summary, statements, loading, error } = useStatements();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  async function handleDownload(statement: InvoiceRow) {
    setDownloadingId(statement.id);
    try {
      const result = await getInvoiceDownload(statement.id);
      if (result.downloadUrl) {
        window.open(result.downloadUrl, '_blank', 'noopener,noreferrer');
      } else if (result.pdfStatus === 'failed') {
        toast.error(result.pdfFailureReason || 'This statement failed to generate. Contact support.');
      } else {
        toast.info('This statement is still being generated — try again shortly.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to fetch the download link');
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <>
      <PageHeader title="Statements" />

      <main className="flex-1 overflow-y-auto p-7">
        <div className="mx-auto max-w-[1000px]">
          <div className="mb-5">
            <p className="text-sm text-muted-text">
              A statement for each payout cycle, with its tax (GST) breakdown built in — clients pay Iragu+, Iragu+
              pays you per cycle minus the platform fee, and this is Iragu+'s tax invoice to you for that fee.
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-lg border border-[#E0B4B4] bg-[#FBEEEE] px-4 py-3 text-sm text-[#B06060]">
              {error}
            </div>
          )}

          {loading && !summary && <div className="p-10 text-center text-sm text-muted-text">Loading statements…</div>}

          {summary && (
            <div className="mb-5 grid grid-cols-2 gap-5">
              <div className="rounded-[14px] border border-[#C8E1CF] bg-gradient-to-br from-action-light to-[#DCEBE0] p-5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-action-dark">
                  Net earned this financial year
                </div>
                <div className="mt-2 text-[28px] font-medium text-[#0A3220]">{formatPaise(summary.ytd_net_paise)}</div>
                <div className="mt-1 text-xs font-medium text-action-dark">
                  {summary.ytd_session_count} session{summary.ytd_session_count === 1 ? '' : 's'} since April
                </div>
              </div>
              <div className="rounded-[14px] border border-rule bg-surface p-5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-text">
                  TDS deposited (26AS)
                </div>
                <div className="mt-2 text-[26px] font-medium text-ink">{formatPaise(summary.ytd_tds_deducted_paise)}</div>
                <div className="mt-1 text-xs text-muted-text">Withheld under §194-O · reflected in Form 26AS</div>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-[14px] border border-rule bg-surface shadow-[0_1px_2px_0_rgba(28,24,18,.04)]">
            <div className="border-b border-rule px-5 py-4">
              <div className="text-[15px] font-semibold text-ink">Payout statements</div>
              <div className="mt-0.5 text-xs text-muted-text">One statement per payout cycle</div>
            </div>

            <div
              className="grid gap-3 border-b border-rule bg-canvas px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-text"
              style={{ gridTemplateColumns: '1.3fr 1fr 1fr .8fr .8fr' }}
            >
              <span>Statement</span>
              <span>Issued</span>
              <span>Net paid</span>
              <span>Status</span>
              <span className="text-right">Document</span>
            </div>

            {!loading && statements.length === 0 && (
              <div className="p-10 text-center text-sm text-muted-text">No statements yet.</div>
            )}

            {statements.map((s) => (
              <div
                key={s.id}
                className="grid items-center gap-3 border-b border-action-light px-5 py-3 text-[13px] text-[#48382E] last:border-b-0"
                style={{ gridTemplateColumns: '1.3fr 1fr 1fr .8fr .8fr' }}
              >
                <span className="truncate font-medium text-ink">{s.docNumber ?? s.id}</span>
                <span>{formatDate(s.createdAt)}</span>
                <span className="font-semibold text-action-dark">
                  {s.totalPaise != null ? formatPaise(s.totalPaise) : '—'}
                </span>
                <span>
                  <StatusPill status={s.pdfStatus ?? 'pending'} />
                </span>
                <span className="text-right">
                  <button
                    type="button"
                    onClick={() => handleDownload(s)}
                    disabled={downloadingId === s.id}
                    className="h-[30px] rounded-lg border border-rule bg-surface px-2.5 text-xs font-medium text-ink transition-colors hover:bg-action-light/40 disabled:opacity-50"
                  >
                    {downloadingId === s.id ? 'Fetching…' : 'Download'}
                  </button>
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
