/**
 * AppSync Events realtime — chat channel subscription.
 *
 * Ported from therapistApp's RealtimeChannelService (the newer, real
 * implementation — community-app still uses an older per-conversation
 * WebSocket pattern). One shared WebSocket connection, multiplexed
 * subscriptions per channel, matching the mobile client's protocol exactly:
 * raw WebSocket (not Amplify Pub/Sub), auth via the `header-<base64url(...)>`
 * Sec-WebSocket-Protocol subprotocol at connect time, then a per-channel
 * `subscribe` frame carrying the same Cognito ID token again.
 *
 * AppSync Events auth is the ID token (it reads custom:* / cognito:groups
 * claims), not the access token apiRequest attaches by default — same
 * reason api/billing.ts uses getIdToken() instead of getAccessToken().
 */
import { getIdToken } from './cognito';
import { APPSYNC_EVENTS_ENDPOINT } from '../config';

const KEEPALIVE_TIMEOUT_MS = 60_000;
const RECONNECT_DELAY_MS = 3_000;

function toBase64Url(s: string): string {
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function amzDate(): string {
  return new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function realtimeHost(): string {
  return new URL(APPSYNC_EVENTS_ENDPOINT).host;
}

function realtimeWsUrl(): string {
  const host = realtimeHost().replace('appsync-api', 'appsync-realtime-api');
  return `wss://${host}/event/realtime`;
}

export type ChatRealtimeEvent = Record<string, unknown>;
type Listener = (event: ChatRealtimeEvent) => void;

/**
 * Single multiplexed connection shared by every subscribed channel. Lazily
 * connects on the first subscribe() and tears down when the last channel
 * unsubscribes.
 */
class ChatRealtimeService {
  private ws: WebSocket | null = null;
  private connecting: Promise<void> | null = null;
  private acked = false;
  private listeners = new Map<string, Set<Listener>>(); // channel -> listeners
  private subIds = new Map<string, string>(); // channel -> subscription id
  private keepaliveTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;

  private resetKeepaliveWatch() {
    if (this.keepaliveTimer) clearTimeout(this.keepaliveTimer);
    this.keepaliveTimer = setTimeout(() => {
      this.ws?.close();
    }, KEEPALIVE_TIMEOUT_MS);
  }

  private async ensureConnected(): Promise<void> {
    if (this.ws && this.acked) return;
    if (this.connecting) return this.connecting;

    this.connecting = (async () => {
      const idToken = await getIdToken();
      if (!idToken) throw new Error('Not authenticated');

      const header = toBase64Url(JSON.stringify({ host: realtimeHost(), Authorization: idToken }));
      const ws = new WebSocket(realtimeWsUrl(), ['aws-appsync-event-ws', `header-${header}`]);
      this.ws = ws;
      this.acked = false;

      await new Promise<void>((resolve, reject) => {
        const onError = () => reject(new Error('Chat realtime connection failed'));
        ws.addEventListener('error', onError, { once: true });

        ws.addEventListener('open', () => {
          ws.send(JSON.stringify({ type: 'connection_init' }));
        });

        ws.addEventListener('message', (evt) => {
          let frame: Record<string, unknown>;
          try {
            frame = JSON.parse(evt.data as string);
          } catch {
            return;
          }
          this.resetKeepaliveWatch();

          if (frame.type === 'connection_ack') {
            this.acked = true;
            ws.removeEventListener('error', onError);
            resolve();
            // Replay any channels that were subscribed before this (re)connect.
            for (const channel of this.listeners.keys()) this.sendSubscribe(channel);
            return;
          }
          if (frame.type === 'data') {
            this.dispatch(frame);
          }
        });

        ws.addEventListener('close', () => {
          this.ws = null;
          this.acked = false;
          this.connecting = null;
          if (this.keepaliveTimer) clearTimeout(this.keepaliveTimer);
          if (!this.intentionalClose && this.listeners.size > 0) {
            this.reconnectTimer = setTimeout(() => {
              this.ensureConnected().catch(() => {});
            }, RECONNECT_DELAY_MS);
          }
        });
      });
    })();

    try {
      await this.connecting;
    } finally {
      this.connecting = null;
    }
  }

  private dispatch(frame: Record<string, unknown>) {
    const subId = frame.id as string | undefined;
    const channel = subId ? [...this.subIds.entries()].find(([, id]) => id === subId)?.[0] : undefined;
    if (!channel) return;

    const raw = frame.event;
    let payload: ChatRealtimeEvent;
    try {
      payload = typeof raw === 'string' ? JSON.parse(raw) : (raw as ChatRealtimeEvent);
    } catch {
      return;
    }
    for (const listener of this.listeners.get(channel) ?? []) listener(payload);
  }

  private async sendSubscribe(channel: string) {
    if (!this.ws || !this.acked) return;
    const idToken = await getIdToken();
    if (!idToken) return;
    const subId = this.subIds.get(channel) ?? crypto.randomUUID();
    this.subIds.set(channel, subId);
    this.ws.send(
      JSON.stringify({
        id: subId,
        type: 'subscribe',
        channel,
        authorization: { host: realtimeHost(), 'x-amz-date': amzDate(), authorization: idToken },
      })
    );
  }

  /** Subscribe to a chat conversation channel (e.g. "chat/channel/<conversationId>", no leading slash). */
  async subscribe(channel: string, listener: Listener): Promise<() => void> {
    this.intentionalClose = false;
    if (!this.listeners.has(channel)) this.listeners.set(channel, new Set());
    this.listeners.get(channel)!.add(listener);

    await this.ensureConnected();
    await this.sendSubscribe(channel);

    return () => {
      const set = this.listeners.get(channel);
      set?.delete(listener);
      if (set && set.size === 0) {
        this.listeners.delete(channel);
        this.subIds.delete(channel);
        if (this.listeners.size === 0) {
          this.intentionalClose = true;
          if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
          this.ws?.close();
        }
      }
    };
  }
}

export const chatRealtime = new ChatRealtimeService();

export function chatChannel(conversationId: string): string {
  return `chat/channel/${conversationId}`;
}
