import { useMemo, useState } from 'react';
import { Search, Send, ShieldAlert } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { initialsOf } from './calendar/calendarConstants';
import { useMessages } from './messages/useMessages';
import type { Conversation } from '../api/chat';

function threadName(c: Conversation): string {
  return c.participantName || c.clientName || c.therapistName || 'Unknown';
}

function formatRelativeTime(ms: number | undefined): string {
  if (!ms) return '';
  const diffMin = (Date.now() - ms) / 60000;
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${Math.floor(diffMin)}m`;
  if (diffMin < 24 * 60) return `${Math.floor(diffMin / 60)}h`;
  return new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function MessagesPage() {
  const {
    therapistId,
    conversations,
    conversationsLoading,
    conversationsError,
    selectedId,
    setSelectedId,
    selected,
    messages,
    messagesLoading,
    messagesError,
    hasMore,
    loadOlder,
    blockState,
    sending,
    send,
  } = useMessages();
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => threadName(c).toLowerCase().includes(q));
  }, [conversations, search]);

  const blocked = blockState ? !blockState.canSend : false;

  async function handleSend() {
    if (!draft.trim() || blocked || sending) return;
    const content = draft;
    setDraft('');
    await send(content);
  }

  return (
    <>
      <PageHeader title="Messages" />

      <main className="flex-1 overflow-y-auto p-7">
        <div
          className="mx-auto grid overflow-hidden rounded-[14px] border border-rule bg-surface shadow-[0_1px_2px_0_rgba(28,24,18,.04)]"
          style={{ maxWidth: 1200, gridTemplateColumns: '320px 1fr', height: 'calc(100vh - 176px)', minHeight: 480 }}
        >
          <div className="flex min-h-0 flex-col border-r border-rule">
            <div className="border-b border-action-light p-3.5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-text" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search conversations"
                  className="h-9 w-full rounded-[9px] border border-transparent bg-canvas pl-[34px] pr-2.5 text-[13px] text-ink outline-none transition-colors focus:border-action focus:bg-surface"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {conversationsLoading && <div className="p-8 text-center text-sm text-muted-text">Loading…</div>}
              {conversationsError && <div className="p-8 text-center text-sm text-[#B06060]">{conversationsError}</div>}
              {!conversationsLoading && !conversationsError && filtered.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-text">No conversations yet.</div>
              )}
              {filtered.map((c) => (
                <button
                  key={c.conversationId}
                  type="button"
                  onClick={() => setSelectedId(c.conversationId)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-canvas ${
                    c.conversationId === selectedId ? 'bg-action-light/50' : ''
                  }`}
                >
                  <span className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-full bg-action-light text-[13px] font-semibold text-action-dark">
                    {initialsOf(threadName(c))}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between">
                      <span className="truncate text-[13px] font-semibold text-ink">{threadName(c)}</span>
                      <span className="flex-shrink-0 text-[11px] text-[#8E7563]">
                        {formatRelativeTime(c.lastMessageTimestamp)}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-text">{c.lastMessage || 'No messages yet'}</span>
                  </span>
                  {c.unreadCount > 0 && (
                    <span className="h-2 w-2 flex-shrink-0 rounded-full bg-action" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex min-h-0 flex-col">
            {!selected && (
              <div className="flex flex-1 items-center justify-center text-sm text-muted-text">
                Select a conversation to view messages
              </div>
            )}

            {selected && (
              <>
                <div className="flex items-center gap-3 border-b border-action-light px-5 py-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-action-light text-[13px] font-semibold text-action-dark">
                    {initialsOf(threadName(selected))}
                  </span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-ink">{threadName(selected)}</div>
                    <div className="text-[11px] text-muted-text capitalize">{selected.role}</div>
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-3 overflow-y-auto bg-canvas p-5">
                  {messagesLoading && <div className="text-center text-sm text-muted-text">Loading messages…</div>}
                  {messagesError && <div className="text-center text-sm text-[#B06060]">{messagesError}</div>}
                  {hasMore && !messagesLoading && (
                    <button
                      type="button"
                      onClick={() => loadOlder()}
                      className="mx-auto rounded-lg border border-rule bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-action-light/40"
                    >
                      Load earlier messages
                    </button>
                  )}
                  {!messagesLoading &&
                    !messagesError &&
                    messages.map((m) => {
                      const mine = therapistId != null && m.senderId === String(therapistId);
                      return (
                        <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                          <div
                            className={`max-w-[64%] rounded-[14px] border px-3.5 py-2.5 text-sm leading-relaxed ${
                              mine
                                ? 'border-action bg-action text-white'
                                : 'border-rule bg-surface text-ink'
                            } ${m.status === 'failed' ? 'opacity-60' : ''}`}
                          >
                            {m.content}
                          </div>
                          <div className="mt-1 text-[11px] text-[#8E7563]">
                            {m.status === 'sending' ? 'Sending…' : m.status === 'failed' ? 'Failed to send' : formatMessageTime(m.createdAt)}
                          </div>
                        </div>
                      );
                    })}
                </div>

                {blocked ? (
                  <div className="flex items-center gap-2 border-t border-action-light bg-surface px-5 py-3.5 text-sm text-[#8E5A3D]">
                    <ShieldAlert className="h-4 w-4 flex-shrink-0" />
                    {blockState?.blockedByMe
                      ? "You've blocked this conversation — unblock from Settings to send messages."
                      : 'This conversation is blocked and cannot receive new messages.'}
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 border-t border-action-light bg-surface px-5 py-3.5">
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="Write a message…"
                      className="h-10 flex-1 rounded-[10px] border border-transparent bg-canvas px-3.5 text-sm text-ink outline-none transition-colors focus:border-action focus:bg-surface"
                    />
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={!draft.trim() || sending}
                      className="inline-flex h-10 items-center gap-1.5 rounded-[10px] bg-action px-4 text-[13px] font-medium text-white transition-colors hover:bg-action-dark disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Send
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
