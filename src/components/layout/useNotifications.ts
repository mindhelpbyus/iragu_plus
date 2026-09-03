import { useCallback, useEffect, useState } from 'react';
import { listNotifications, markNotificationRead, markAllNotificationsRead, type Notification } from '../../api/notifications';

const POLL_INTERVAL_MS = 60_000;

/** No realtime channel for this inbox yet — polls, same honest tradeoff as the in-call chat panel. */
export function useNotifications() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await listNotifications({ limit: 30 });
      setItems(res.items);
      setUnreadCount(res.unreadCount);
    } catch {
      // best-effort — a bell failing silently beats a broken sidebar
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  const markRead = useCallback(async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await markNotificationRead(id);
    } catch {
      load(); // reconcile with the server on failure
    }
  }, [load]);

  const markAllRead = useCallback(async () => {
    const prevItems = items;
    const prevCount = unreadCount;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch {
      setItems(prevItems);
      setUnreadCount(prevCount);
    }
  }, [items, unreadCount]);

  return { items, unreadCount, loading, markRead, markAllRead };
}
