import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  listRequests,
  approveInquiry,
  declineInquiry,
  approveReschedule,
  declineReschedule,
  type RequestItem,
} from '../../api/requests';
import { ApiException } from '../../api/client';

export function useRequests() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFeatureDisabled, setIsFeatureDisabled] = useState(false);
  const [decidingId, setDecidingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsFeatureDisabled(false);
    try {
      setRequests(await listRequests('pending'));
    } catch (err) {
      // A 404 here means requests_workflow's FeatureConfig row is off — a
      // real, honest state (the route genuinely 404s server-side when
      // disabled), not a bug to mask with a generic error.
      if (err instanceof ApiException && err.status === 404) {
        setIsFeatureDisabled(true);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load requests');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(item: RequestItem, action: 'approve' | 'decline', reason?: string) {
    setDecidingId(item.id);
    try {
      if (item.kind === 'inquiry') {
        if (action === 'approve') {
          await approveInquiry(item.id);
          toast.success('Inquiry approved — a session was booked and the client was notified to pay.');
        } else {
          await declineInquiry(item.id, reason);
          toast.success('Inquiry declined.');
        }
      } else {
        if (action === 'approve') {
          await approveReschedule(item.id);
          toast.success('Reschedule approved — the session was moved.');
        } else {
          await declineReschedule(item.id, reason);
          toast.success('Reschedule declined.');
        }
      }
      // Decided items drop out of the pending list — re-fetch rather than
      // patch in place, since approving an inquiry changes server state
      // (a real Appointment now exists) this list doesn't otherwise reflect.
      setRequests((prev) => prev.filter((r) => !(r.kind === item.kind && r.id === item.id)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to decide this request');
    } finally {
      setDecidingId(null);
    }
  }

  return { requests, loading, error, isFeatureDisabled, decidingId, decide, reload: load };
}
