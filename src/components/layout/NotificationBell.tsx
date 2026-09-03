import { Bell, MessageSquare, Wallet, CalendarClock, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from '../ui/dropdown-menu';
import { useNotifications } from './useNotifications';
import type { Notification } from '../../api/notifications';

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  message: MessageSquare,
  payment_received: Wallet,
  payment_required: Wallet,
  appointment_reminder: CalendarClock,
};

function formatRelativeTime(ms: number): string {
  const diffMin = (Date.now() - ms) / 60000;
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${Math.floor(diffMin)}m`;
  if (diffMin < 24 * 60) return `${Math.floor(diffMin / 60)}h`;
  return new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function NotificationBell() {
  const navigate = useNavigate();
  const { items, unreadCount, loading, markRead, markAllRead } = useNotifications();

  function handleSelect(n: Notification) {
    if (!n.read) markRead(n.id);
    if (n.link) navigate(n.link);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title="Notifications"
          className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-muted-text transition-colors hover:bg-action-light/60"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute right-0.5 top-0.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-action px-[3px] text-[9px] font-semibold leading-none text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[340px] p-0">
        <div className="flex items-center justify-between border-b border-rule px-4 py-3">
          <span className="text-sm font-semibold text-ink">Notifications</span>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                markAllRead();
              }}
              className="text-xs font-medium text-action-dark hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-[420px] overflow-y-auto">
          {loading && <div className="p-6 text-center text-sm text-muted-text">Loading…</div>}
          {!loading && items.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-text">No notifications yet.</div>
          )}
          {!loading &&
            items.map((n) => {
              const Icon = TYPE_ICON[n.type] ?? Info;
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleSelect(n)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-canvas ${
                    n.read ? '' : 'bg-action-light/30'
                  }`}
                >
                  <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-action-light text-action-dark">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] font-medium text-ink">{n.who}</span>
                      <span className="flex-shrink-0 text-[11px] text-[#8E7563]">{formatRelativeTime(n.createdAt)}</span>
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-text">{n.what}</span>
                  </span>
                  {!n.read && <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-action" />}
                </button>
              );
            })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
