import { IndianRupee, CalendarClock, Undo2, FileText, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Renders backend-initial's system chat cards (payment/appointment/refund/
 * session-summary — see publish-appointment-card.ts, billing-event-consumer's
 * handleInvoicePdfReady) as real cards instead of raw JSON text. The design
 * handoff has no literal example of these — this shape is extrapolated from
 * the platform's own notification-icon-chip convention (payment=forest,
 * appointment=lavender, refund=clay, session-summary=ochre) and the
 * client-detail label/value row pattern, not invented from scratch.
 */

const TYPE_STYLE: Record<string, { bg: string; fg: string; icon: ReactNode; title: string }> = {
  payment: { bg: '#E8F2EB', fg: '#175C3B', icon: <IndianRupee className="h-4 w-4" />, title: 'Payment' },
  appointment: { bg: '#EFEDF5', fg: '#6B6490', icon: <CalendarClock className="h-4 w-4" />, title: 'Appointment' },
  refund: { bg: '#F4E3E3', fg: '#8E4848', icon: <Undo2 className="h-4 w-4" />, title: 'Refund' },
  sessionSummary: { bg: '#FAF3E2', fg: '#8A6A28', icon: <FileText className="h-4 w-4" />, title: 'Session summary' },
};

const STATUS_LABEL: Record<string, string> = {
  success: 'Confirmed',
  pending: 'Pending',
  confirmed: 'Confirmed',
  requested: 'Requested',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

function formatSessionDate(iso?: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return null;
  }
}

export interface ChatCardProps {
  messageType: string;
  content: string;
  onOpen?: (appointmentId: string) => void;
}

/** True for any messageType this component knows how to render as a real card. */
export function isRenderableCard(messageType: string): boolean {
  return messageType in TYPE_STYLE;
}

export function ChatCard({ messageType, content, onOpen }: ChatCardProps) {
  const style = TYPE_STYLE[messageType];
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(content);
  } catch {
    // Not real JSON — fall through to a bare card with no rows rather than crashing.
  }
  if (!style) return <>{content}</>;

  const amount = typeof data.amount === 'number' ? data.amount : null;
  const currency = typeof data.currency === 'string' ? data.currency : 'INR';
  const status = typeof data.status === 'string' ? data.status : typeof data.event === 'string' ? data.event : null;
  const therapistName = typeof data.therapistName === 'string' ? data.therapistName : null;
  const clientName = typeof data.clientName === 'string' ? data.clientName : null;
  const sessionDate = formatSessionDate(
    (typeof data.sessionDate === 'string' && data.sessionDate) ||
      (typeof data.scheduledDateTime === 'string' && data.scheduledDateTime) ||
      null,
  );
  const appointmentId =
    (typeof data.appointmentId === 'string' && data.appointmentId) ||
    (typeof data.sessionId === 'string' && data.sessionId) ||
    null;

  const rows: [string, string][] = [];
  if (amount !== null) rows.push(['Amount', currency === 'INR' ? `₹${amount.toLocaleString('en-IN')}` : `${currency} ${amount}`]);
  if (therapistName) rows.push(['Therapist', therapistName]);
  if (clientName) rows.push(['Client', clientName]);
  if (sessionDate) rows.push(['Session', sessionDate]);

  return (
    <div className="w-[280px] max-w-full overflow-hidden rounded-[14px] border border-rule bg-surface">
      <div className="flex items-center gap-2.5 border-b border-rule px-3.5 py-2.5">
        <span
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px]"
          style={{ background: style.bg, color: style.fg }}
        >
          {style.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-ink">{style.title}</div>
          {status && (
            <div className="text-[11px] font-medium" style={{ color: style.fg }}>
              {STATUS_LABEL[status] ?? status}
            </div>
          )}
        </div>
      </div>

      {rows.length > 0 && (
        <div className="flex flex-col gap-1.5 px-3.5 py-3">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3 text-[12.5px]">
              <span className="text-muted-text">{label}</span>
              <span className="text-right font-medium text-ink">{value}</span>
            </div>
          ))}
        </div>
      )}

      {appointmentId && onOpen && (
        <button
          type="button"
          onClick={() => onOpen(appointmentId)}
          className="flex w-full items-center justify-between gap-1 border-t border-rule px-3.5 py-2 text-[12.5px] font-medium text-action-dark transition-colors hover:bg-action-light/40"
        >
          View in calendar
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
