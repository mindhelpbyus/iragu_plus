import { useState } from 'react';
import { X } from 'lucide-react';
import { InputField } from '../../components/ui/input-field';
import { TextareaField } from '../../components/ui/textarea-field';
import { SelectField } from '../../components/ui/select-field';
import { Button } from '../../components/ui/button';
import {
  TICKET_PRODUCTS,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  type TicketProduct,
  type TicketCategory,
  type TicketPriority,
  type Ticket,
} from '../../api/support';
import { useCreateTicket } from './useSupportTickets';

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

interface NewTicketModalProps {
  onClose: () => void;
  onCreated: (ticket: Ticket) => void;
}

/** "New ticket" form — subject/body/product/category/priority, the exact
 *  vocabulary bedrock_support_center's own new-ticket form uses (same
 *  backend, same fields — an agent triaging either app's tickets sees one
 *  consistent set of values). Modal chrome mirrors this app's existing
 *  hand-rolled modals (see calendar/BlockTimeOffModal.tsx). */
export function NewTicketModal({ onClose, onCreated }: NewTicketModalProps) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [product, setProduct] = useState<TicketProduct>('Iragu+');
  const [category, setCategory] = useState<TicketCategory>('Technical Issue');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [validationError, setValidationError] = useState<string | null>(null);

  const { submit, submitting } = useCreateTicket(onCreated);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedSubject = subject.trim();
    const trimmedBody = body.trim();
    if (!trimmedSubject) {
      setValidationError('Subject is required.');
      return;
    }
    if (!trimmedBody) {
      setValidationError('Please describe the issue.');
      return;
    }
    setValidationError(null);
    await submit({ subject: trimmedSubject, body: trimmedBody, product, category, priority });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[3px]"
      onClick={onClose}
    >
      <div
        className="max-h-[calc(100vh-64px)] w-[520px] max-w-[calc(100vw-48px)] overflow-y-auto rounded-[18px] bg-surface p-7 shadow-[0_24px_60px_-12px_rgba(28,24,18,.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-start justify-between">
          <h3 className="text-lg font-semibold text-ink">New support ticket</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full text-muted-text hover:bg-action-light/60"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-5 text-[13px] leading-relaxed text-muted-text">
          We'll reply here and by email. Most tickets get a first response within one business day.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <InputField
            label="Subject"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Short summary of the issue"
            maxLength={200}
          />

          <TextareaField
            label="Describe the issue"
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What happened, when, and what you expected instead"
            rows={5}
          />

          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="Product"
              value={product}
              onValueChange={(v) => setProduct(v as TicketProduct)}
              options={TICKET_PRODUCTS.map((p) => ({ value: p, label: p }))}
            />
            <SelectField
              label="Priority"
              value={priority}
              onValueChange={(v) => setPriority(v as TicketPriority)}
              options={TICKET_PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p] }))}
            />
          </div>

          <SelectField
            label="Category"
            value={category}
            onValueChange={(v) => setCategory(v as TicketCategory)}
            options={TICKET_CATEGORIES.map((c) => ({ value: c, label: c }))}
          />

          {validationError && (
            <div className="rounded-lg border border-[#E5C6C6] bg-[#FBEFEF] px-3.5 py-2.5 text-sm text-[#8E4848]">
              {validationError}
            </div>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit ticket'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
