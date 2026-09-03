import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { getMyTherapistId } from '../../api/therapistMe';
import {
  listConversations,
  getMessages,
  markConversationRead,
  getBlockState,
  sendMessage as sendChatMessage,
  fromRealtimeEvent,
  type Conversation,
  type ChatMessage,
  type ChatBlockState,
} from '../../api/chat';
import { chatRealtime, chatChannel } from '../../lib/chatRealtime';

export function useMessages() {
  const user = useAuthStore((s) => s.user);
  const [therapistId, setTherapistId] = useState<number | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [conversationsError, setConversationsError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [nextToken, setNextToken] = useState<string | undefined>();
  const [blockState, setBlockState] = useState<ChatBlockState | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const id = await getMyTherapistId();
        if (cancelled) return;
        setTherapistId(id);
        const res = await listConversations(id);
        if (cancelled) return;
        setConversations(res.conversations);
      } catch (err) {
        if (!cancelled) setConversationsError(err instanceof Error ? err.message : 'Failed to load conversations');
      } finally {
        if (!cancelled) setConversationsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(
    () => conversations.find((c) => c.conversationId === selectedId) ?? null,
    [conversations, selectedId]
  );

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    setMessagesLoading(true);
    setMessagesError(null);
    setMessages([]);
    setNextToken(undefined);
    setBlockState(null);

    (async () => {
      try {
        const [msgsRes, block] = await Promise.all([getMessages(selectedId), getBlockState(selectedId)]);
        if (cancelled) return;
        setMessages(msgsRes.messages);
        setNextToken(msgsRes.nextToken);
        setBlockState(block);
        if (therapistId != null) markConversationRead(selectedId, therapistId).catch(() => {});
        setConversations((prev) => prev.map((c) => (c.conversationId === selectedId ? { ...c, unreadCount: 0 } : c)));
      } catch (err) {
        if (!cancelled) setMessagesError(err instanceof Error ? err.message : 'Failed to load messages');
      } finally {
        if (!cancelled) setMessagesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, therapistId]);

  useEffect(() => {
    if (!selectedId) return;
    let unsub: (() => void) | null = null;
    let cancelled = false;

    chatRealtime
      .subscribe(chatChannel(selectedId), (payload) => {
        if (payload.type === 'read_receipt') return;
        const msg = fromRealtimeEvent(payload);
        if (!msg || msg.conversationId !== selectedId) return;
        if (therapistId != null && msg.senderId === String(therapistId)) return; // already shown optimistically
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      })
      .then((fn) => {
        if (cancelled) fn();
        else unsub = fn;
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [selectedId, therapistId]);

  const loadOlder = useCallback(async () => {
    if (!selectedId || !nextToken) return;
    const res = await getMessages(selectedId, { nextToken });
    setMessages((prev) => [...res.messages, ...prev]);
    setNextToken(res.nextToken);
  }, [selectedId, nextToken]);

  const send = useCallback(
    async (content: string) => {
      if (!selected || therapistId == null || !user) return;
      const trimmed = content.trim();
      if (!trimmed) return;

      const clientId = selected.clientId ?? selected.userId;
      const senderId = String(therapistId);
      const senderName = user.name;
      const messageId = crypto.randomUUID();
      const optimistic: ChatMessage = {
        id: messageId,
        conversationId: selected.conversationId,
        senderId,
        senderName,
        content: trimmed,
        messageType: 'text',
        createdAt: new Date().toISOString(),
        status: 'sending',
      };
      setMessages((prev) => [...prev, optimistic]);
      setSending(true);
      try {
        const sent = await sendChatMessage({
          messageId,
          conversationId: selected.conversationId,
          clientId,
          therapistId: senderId,
          content: trimmed,
          senderId,
          senderName,
        });
        setMessages((prev) => prev.map((m) => (m.id === messageId ? sent : m)));
        setConversations((prev) =>
          prev.map((c) =>
            c.conversationId === selected.conversationId
              ? { ...c, lastMessage: trimmed, lastMessageTimestamp: Date.now() }
              : c
          )
        );
      } catch {
        setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, status: 'failed' } : m)));
      } finally {
        setSending(false);
      }
    },
    [selected, therapistId, user]
  );

  return {
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
    hasMore: !!nextToken,
    loadOlder,
    blockState,
    sending,
    send,
  };
}
