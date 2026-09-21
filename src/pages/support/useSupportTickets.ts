import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  createTicket,
  getTicket,
  listTickets,
  postTicketReply,
  reopenTicket,
  uploadTicketAttachment,
  type CreateTicketInput,
  type Ticket,
  type TicketDetail,
  type TicketStatus,
} from '../../api/support';
import { ApiFetchError, UnauthorizedError } from '../../api/client';
import { initialCursorState, currentCursor, pushNextCursor, goToPreviousPage, type CursorPageState } from './ticketHelpers';

const PAGE_SIZE = 20;

function errorMessage(err: unknown): string {
  if (err instanceof ApiFetchError) return err.message;
  if (err instanceof UnauthorizedError) return 'Your session expired — please sign in again.';
  return err instanceof Error ? err.message : 'Something went wrong. Please try again.';
}

/**
 * List state for SupportPage's "My tickets" panel — cursor-paginated,
 * optionally filtered by status. Re-fetches from page 0 whenever the status
 * filter changes (the cursor stack from one filter is meaningless for
 * another).
 */
export function useTicketList(statusFilter: TicketStatus | 'all') {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursorState, setCursorState] = useState<CursorPageState>(initialCursorState());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (state: CursorPageState) => {
      setLoading(true);
      setError(null);
      try {
        const res = await listTickets({
          status: statusFilter === 'all' ? undefined : statusFilter,
          cursor: currentCursor(state),
          limit: PAGE_SIZE,
        });
        setTickets(res.tickets);
        setNextCursor(res.nextCursor);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [statusFilter]
  );

  // Status filter changed — reset to page 0 with a fresh cursor stack.
  useEffect(() => {
    const fresh = initialCursorState();
    setCursorState(fresh);
    fetchPage(fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const goNext = useCallback(() => {
    if (!nextCursor) return;
    const next = pushNextCursor(cursorState, nextCursor);
    setCursorState(next);
    fetchPage(next);
  }, [cursorState, nextCursor, fetchPage]);

  const goPrev = useCallback(() => {
    const prev = goToPreviousPage(cursorState);
    setCursorState(prev);
    fetchPage(prev);
  }, [cursorState, fetchPage]);

  const reload = useCallback(() => fetchPage(cursorState), [cursorState, fetchPage]);

  return {
    tickets,
    loading,
    error,
    hasNext: nextCursor !== null,
    hasPrev: cursorState.pageIndex > 0,
    goNext,
    goPrev,
    reload,
  };
}

/** Create-ticket form submission. */
export function useCreateTicket(onCreated: (ticket: Ticket) => void) {
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(
    async (input: CreateTicketInput) => {
      setSubmitting(true);
      try {
        const ticket = await createTicket(input);
        toast.success(`Ticket ${ticket.ticketNumber} created.`);
        onCreated(ticket);
        return ticket;
      } catch (err) {
        toast.error(errorMessage(err));
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [onCreated]
  );

  return { submit, submitting };
}

/** Ticket detail view: load, reply, reopen, attach. */
export function useTicketDetail(ticketNumber: string | null) {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replying, setReplying] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const load = useCallback(async () => {
    if (!ticketNumber) {
      setTicket(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setTicket(await getTicket(ticketNumber));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [ticketNumber]);

  useEffect(() => {
    load();
  }, [load]);

  const reply = useCallback(
    async (body: string, attachmentIds: string[] = []) => {
      if (!ticketNumber) return false;
      setReplying(true);
      try {
        await postTicketReply(ticketNumber, { body, attachmentIds });
        await load();
        return true;
      } catch (err) {
        toast.error(errorMessage(err));
        return false;
      } finally {
        setReplying(false);
      }
    },
    [ticketNumber, load]
  );

  const reopen = useCallback(
    async (reason: string) => {
      if (!ticketNumber) return false;
      setReopening(true);
      try {
        await reopenTicket(ticketNumber, reason);
        toast.success('Ticket reopened.');
        await load();
        return true;
      } catch (err) {
        toast.error(errorMessage(err));
        return false;
      } finally {
        setReopening(false);
      }
    },
    [ticketNumber, load]
  );

  const attachFile = useCallback(
    async (file: File) => {
      if (!ticketNumber) return null;
      setUploadingFile(true);
      try {
        const result = await uploadTicketAttachment(ticketNumber, file);
        if (!result.ok) {
          toast.error(result.error);
          return null;
        }
        return result.attachment.id;
      } finally {
        setUploadingFile(false);
      }
    },
    [ticketNumber]
  );

  return { ticket, loading, error, replying, reopening, uploadingFile, reply, reopen, attachFile, reload: load };
}
