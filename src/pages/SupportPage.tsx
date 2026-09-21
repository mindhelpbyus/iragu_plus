/**
 * SupportPage — real ticket integration against backend_support_api (a
 * standalone peer service behind the same shared API Gateway iragu_plus
 * already calls — see src/api/support.ts for the full contract).
 *
 * Previously this page was static category tiles + a `mailto:` link only,
 * deliberately, because backend_support_api wasn't reachable from this repo
 * (no base URL configured, no wiring). That's no longer true — the base URL
 * is the SAME `VITE_API_BASE_URL` already used for backend-initial/
 * billing_payment, and backend_support_api's routes are mounted at the root
 * of that shared gateway. This page now shows a therapist's own tickets
 * (cursor-paginated), a "New ticket" form, a ticket detail + reply thread,
 * and a reopen action — real ticket tracking, not a promise of it.
 *
 * The static category tiles + mailto card are KEPT, not deleted — moved to
 * a secondary "Prefer email?" section below the real ticket UI. Real
 * tickets are the primary path now; mailto stays as a backup for anyone who
 * doesn't want to use the form (or hits an issue before signing in).
 */
import { useState } from 'react';
import { CreditCard, Video, CircleHelp, Mail, Plus, ChevronLeft, ChevronRight, ArrowLeft, Paperclip } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { TextareaField } from '../components/ui/textarea-field';
import { buildSupportMailto } from './settings/settingsHelpers';
import { NewTicketModal } from './support/NewTicketModal';
import { useTicketList, useTicketDetail } from './support/useSupportTickets';
import { statusBadgeMeta, priorityBadgeMeta, canReopen } from './support/ticketHelpers';
import { TICKET_STATUSES, type Ticket, type TicketStatus } from '../api/support';

export const SUPPORT_EMAIL = 'support@iragu.com';

export const SUPPORT_CATEGORIES = [
  { id: 'billing', label: 'Payout / billing issue', subject: 'Payout / billing issue', icon: CreditCard },
  { id: 'telehealth', label: 'Telehealth / tech issue', subject: 'Telehealth / tech issue', icon: Video },
  { id: 'other', label: 'Something else', subject: 'Support request', icon: CircleHelp },
] as const;

export const STATUS_FILTERS: readonly (TicketStatus | 'all')[] = ['all', ...TICKET_STATUSES];

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function statusFilterLabel(s: TicketStatus | 'all'): string {
  if (s === 'all') return 'All';
  return statusBadgeMeta(s).label;
}

// ─── Ticket list ────────────────────────────────────────────────────────

interface TicketListProps {
  onSelectTicket: (ticketNumber: string) => void;
  onNewTicket: () => void;
}

function TicketListSection({ onSelectTicket, onNewTicket }: TicketListProps) {
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const { tickets, loading, error, hasNext, hasPrev, goNext, goPrev } = useTicketList(statusFilter);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[28px] font-medium tracking-tight text-ink">Help & Support</h2>
          <p className="mt-1 text-sm text-muted-text">Track your support tickets or start a new one.</p>
        </div>
        <Button size="sm" onClick={onNewTicket} className="h-9">
          <Plus className="h-4 w-4" />
          New ticket
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`h-8 rounded-full border px-3 text-xs font-medium capitalize transition-colors ${
              statusFilter === s
                ? 'border-action-border bg-action-light text-action-dark'
                : 'border-rule bg-surface text-[#48382E] hover:bg-action-light/40'
            }`}
          >
            {statusFilterLabel(s)}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-[#E5C6C6] bg-[#FBEFEF] px-4 py-2.5 text-sm text-[#8E4848]">
          {error}
        </div>
      )}

      {!error && loading && (
        <div className="rounded-[14px] border border-rule bg-surface p-10 text-center text-sm text-muted-text">
          Loading tickets…
        </div>
      )}

      {!error && !loading && tickets.length === 0 && (
        <div className="rounded-[14px] border border-rule bg-surface p-10 text-center text-sm text-muted-text">
          {statusFilter === 'all' ? "You haven't filed any support tickets yet." : `No ${statusFilterLabel(statusFilter).toLowerCase()} tickets.`}
        </div>
      )}

      {!error && !loading && tickets.length > 0 && (
        <div className="flex flex-col gap-3">
          {tickets.map((ticket) => {
            const status = statusBadgeMeta(ticket.status);
            const priority = priorityBadgeMeta(ticket.metadata.priority);
            return (
              <button
                key={ticket.id}
                type="button"
                onClick={() => onSelectTicket(ticket.ticketNumber)}
                className="flex w-full items-start justify-between gap-4 rounded-[14px] border border-rule bg-surface p-5 text-left transition-colors hover:border-action"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono text-muted-text">{ticket.ticketNumber}</span>
                    <Badge variant={status.variant}>{status.label}</Badge>
                    <Badge variant={priority.variant}>{priority.label}</Badge>
                  </div>
                  <div className="mt-1.5 text-[15px] font-semibold text-ink">{ticket.subject}</div>
                  <div className="mt-1 text-xs text-muted-text">
                    {ticket.metadata.product ?? 'Iragu+'}
                    {ticket.metadata.category ? ` · ${ticket.metadata.category}` : ''} · updated{' '}
                    {formatDateTime(ticket.updatedAt)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {!error && !loading && (hasNext || hasPrev) && (
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button size="sm" variant="outline" disabled={!hasPrev} onClick={goPrev} className="h-8 px-3 text-xs">
            <ChevronLeft className="h-3.5 w-3.5" />
            Prev
          </Button>
          <Button size="sm" variant="outline" disabled={!hasNext} onClick={goNext} className="h-8 px-3 text-xs">
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Ticket detail ──────────────────────────────────────────────────────

interface TicketDetailProps {
  ticketNumber: string;
  onBack: () => void;
}

function TicketDetailSection({ ticketNumber, onBack }: TicketDetailProps) {
  const { ticket, loading, error, replying, reopening, uploadingFile, reply, reopen, attachFile } =
    useTicketDetail(ticketNumber);
  const [replyBody, setReplyBody] = useState('');
  const [pendingAttachmentIds, setPendingAttachmentIds] = useState<string[]>([]);
  const [showReopenForm, setShowReopenForm] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

  async function handleSend() {
    if (!replyBody.trim() && pendingAttachmentIds.length === 0) return;
    const ok = await reply(replyBody, pendingAttachmentIds);
    if (ok) {
      setReplyBody('');
      setPendingAttachmentIds([]);
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const attachmentId = await attachFile(file);
    if (attachmentId) setPendingAttachmentIds((prev) => [...prev, attachmentId]);
  }

  async function handleReopenSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reopenReason.trim()) return;
    const ok = await reopen(reopenReason.trim());
    if (ok) {
      setShowReopenForm(false);
      setReopenReason('');
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-text hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        All tickets
      </button>

      {loading && (
        <div className="rounded-[14px] border border-rule bg-surface p-10 text-center text-sm text-muted-text">
          Loading ticket…
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-[#E5C6C6] bg-[#FBEFEF] px-4 py-2.5 text-sm text-[#8E4848]">{error}</div>
      )}

      {!loading && !error && ticket && (
        <>
          <div className="rounded-[14px] border border-rule bg-surface p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono text-muted-text">{ticket.ticketNumber}</span>
              <Badge variant={statusBadgeMeta(ticket.status).variant}>{statusBadgeMeta(ticket.status).label}</Badge>
              <Badge variant={priorityBadgeMeta(ticket.metadata.priority).variant}>
                {priorityBadgeMeta(ticket.metadata.priority).label}
              </Badge>
            </div>
            <h2 className="mt-2 text-xl font-semibold text-ink">{ticket.subject}</h2>
            <div className="mt-1 text-xs text-muted-text">
              {ticket.metadata.product ?? 'Iragu+'}
              {ticket.metadata.category ? ` · ${ticket.metadata.category}` : ''} · opened{' '}
              {formatDateTime(ticket.createdAt)}
            </div>

            {canReopen(ticket) && !showReopenForm && (
              <div className="mt-4">
                <Button size="sm" variant="outline" onClick={() => setShowReopenForm(true)}>
                  Not actually fixed? Reopen this ticket
                </Button>
              </div>
            )}

            {showReopenForm && (
              <form onSubmit={handleReopenSubmit} className="mt-4 flex flex-col gap-2 rounded-lg border border-rule bg-canvas p-3.5">
                <TextareaField
                  label="Why does this need to reopen?"
                  required
                  rows={2}
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  placeholder="Tell us what's still wrong"
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" size="sm" variant="ghost" onClick={() => setShowReopenForm(false)} disabled={reopening}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={reopening || !reopenReason.trim()}>
                    {reopening ? 'Reopening…' : 'Reopen ticket'}
                  </Button>
                </div>
              </form>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {ticket.messages.map((message) => {
              const sender = ticket.usersById[String(message.senderId)];
              const senderName = message.senderType === 'agent' ? sender ? `${sender.firstName} ${sender.lastName}`.trim() || 'Support' : 'Support' : 'You';
              const attachments = ticket.attachments.filter((a) => a.messageId === message.id && a.status === 'uploaded');
              return (
                <div
                  key={message.id}
                  className={`rounded-[14px] border p-4 ${
                    message.senderType === 'agent' ? 'border-action-border bg-action-light/40' : 'border-rule bg-surface'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-ink">{senderName}</span>
                    <span className="text-[11px] text-muted-text">{formatDateTime(message.createdAt)}</span>
                  </div>
                  {message.body && <p className="mt-1.5 whitespace-pre-wrap text-sm text-body-text">{message.body}</p>}
                  {attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {attachments.map((a) => (
                        <span
                          key={a.id}
                          className="inline-flex items-center gap-1.5 rounded-full border border-rule bg-surface px-2.5 py-1 text-[11px] text-muted-text"
                        >
                          <Paperclip className="h-3 w-3" />
                          {a.filename}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {ticket.status !== 'closed' && (
            <div className="mt-4 rounded-[14px] border border-rule bg-surface p-4">
              <TextareaField
                label="Reply"
                rows={3}
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder="Add a message…"
              />
              {pendingAttachmentIds.length > 0 && (
                <div className="mt-2 text-xs text-muted-text">{pendingAttachmentIds.length} file(s) attached</div>
              )}
              <div className="mt-2.5 flex items-center justify-between">
                <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-text hover:text-ink">
                  <Paperclip className="h-3.5 w-3.5" />
                  {uploadingFile ? 'Uploading…' : 'Attach file'}
                  <input type="file" className="hidden" onChange={handleFileSelect} disabled={uploadingFile} />
                </label>
                <Button
                  size="sm"
                  onClick={handleSend}
                  disabled={replying || uploadingFile || (!replyBody.trim() && pendingAttachmentIds.length === 0)}
                >
                  {replying ? 'Sending…' : 'Send reply'}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Fallback (mailto) section ──────────────────────────────────────────

function FallbackContactSection() {
  return (
    <div className="mt-8 border-t border-rule pt-6">
      <h3 className="text-sm font-semibold text-ink">Prefer email?</h3>
      <p className="mt-1 text-xs text-muted-text">
        Tickets above are the fastest way to get help and keep a record of the conversation — email works too.
      </p>

      <div className="mt-3 grid grid-cols-3 gap-3.5">
        {SUPPORT_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <a
              key={cat.id}
              href={buildSupportMailto(cat.subject, SUPPORT_EMAIL)}
              className="rounded-xl border border-rule bg-surface p-4 transition-colors hover:border-action"
            >
              <Icon className="h-[18px] w-[18px] text-action-dark" />
              <div className="mt-2 text-[13px] font-semibold text-ink">{cat.label}</div>
            </a>
          );
        })}
      </div>

      <div className="mt-3.5 rounded-[14px] border border-rule bg-surface p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] bg-action-light text-action-dark">
            <Mail className="h-[18px] w-[18px]" />
          </span>
          <div>
            <div className="text-[15px] font-semibold text-ink">Email us</div>
            <a href={buildSupportMailto('Support request', SUPPORT_EMAIL)} className="text-sm text-action-dark hover:underline">
              {SUPPORT_EMAIL}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────

type ViewMode = 'list' | 'detail';

export default function SupportPage() {
  const [view, setView] = useState<ViewMode>('list');
  const [selectedTicketNumber, setSelectedTicketNumber] = useState<string | null>(null);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  // Bumped to force TicketListSection to remount (and re-fetch page 0) after
  // a ticket is created or after returning from the detail view — simpler
  // than threading a reload callback through both list and detail state.
  const [listRefreshKey, setListRefreshKey] = useState(0);

  function openTicket(ticketNumber: string) {
    setSelectedTicketNumber(ticketNumber);
    setView('detail');
  }

  function backToList() {
    setView('list');
    setSelectedTicketNumber(null);
    setListRefreshKey((k) => k + 1);
  }

  function handleTicketCreated(ticket: Ticket) {
    setShowNewTicketModal(false);
    openTicket(ticket.ticketNumber);
  }

  return (
    <>
      <PageHeader title="Help & Support" />
      <main className="flex-1 overflow-y-auto p-7">
        <div className="mx-auto max-w-[820px]">
          {view === 'list' && (
            <TicketListSection key={listRefreshKey} onSelectTicket={openTicket} onNewTicket={() => setShowNewTicketModal(true)} />
          )}
          {view === 'detail' && selectedTicketNumber && (
            <TicketDetailSection ticketNumber={selectedTicketNumber} onBack={backToList} />
          )}

          {view === 'list' && <FallbackContactSection />}
        </div>
      </main>

      {showNewTicketModal && (
        <NewTicketModal onClose={() => setShowNewTicketModal(false)} onCreated={handleTicketCreated} />
      )}
    </>
  );
}
