import { useCallback, useEffect, useState } from 'react';
import { getMyTherapistId } from '../../api/therapistMe';
import { listConversations } from '../../api/chat';

const POLL_INTERVAL_MS = 60_000;

/** Sidebar's Messages nav badge — same poll-based honesty as useNotifications; chat itself is realtime, this summary count is not. */
export function useUnreadMessagesCount() {
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const therapistId = await getMyTherapistId();
      const { conversations } = await listConversations(therapistId);
      setCount(conversations.reduce((sum, c) => sum + c.unreadCount, 0));
    } catch {
      // best-effort — a stale/missing badge beats a broken sidebar
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  return count;
}
