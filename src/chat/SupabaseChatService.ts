// 階段二：用 Supabase Realtime 的 Broadcast（訊息）和 Presence（誰在線上）。
// 驗證、速度限制、30 秒緩衝都在 createRoomConnection 裡，這裡只負責傳輸。
import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import type { ChatService, RawChannel, RoomConnection } from './ChatService';
import { createRoomConnection } from './createRoomConnection';
import type { ConnectionStatus, Me, Member } from './types';

const EVENTS = ['message', 'reaction', 'bye'] as const;
/** 還沒連上前送出的東西先排隊，連上後再送 */
const MAX_QUEUE = 20;

class SupabaseRawChannel implements RawChannel {
  private channel: RealtimeChannel;
  private self: Member | null = null;
  private joined = false;
  private everJoined = false;
  private closed = false;
  private queue: { event: string; payload: unknown }[] = [];
  private broadcastCb: (event: string, payload: unknown) => void = () => {};
  private presenceCb: (present: unknown[]) => void = () => {};
  private statusCb: (s: ConnectionStatus) => void = () => {};

  constructor(
    private client: SupabaseClient,
    roomId: string,
    clientId: string,
  ) {
    this.channel = client.channel(`room:${roomId}`, {
      config: {
        broadcast: { self: false },
        // 同一個 clientId（例如重新整理）只算一個人
        presence: { key: clientId },
      },
    });
    for (const event of EVENTS) {
      this.channel.on('broadcast', { event }, (msg) => this.broadcastCb(event, msg.payload));
    }
    this.channel.on('presence', { event: 'sync' }, () => {
      const state = this.channel.presenceState() as Record<string, unknown[]>;
      this.presenceCb(Object.values(state).flat());
    });
    this.channel.subscribe((status) => this.onSubscribeStatus(status));
    document.addEventListener('visibilitychange', this.onWake);
    window.addEventListener('online', this.onWake);
  }

  broadcast(event: string, payload: unknown): void {
    if (!this.joined) {
      if (this.queue.length < MAX_QUEUE) this.queue.push({ event, payload });
      return;
    }
    void this.channel.send({ type: 'broadcast', event, payload });
  }

  onBroadcast(cb: (event: string, payload: unknown) => void): void {
    this.broadcastCb = cb;
  }

  track(member: Member): void {
    this.self = member;
    if (this.joined) void this.channel.track(member);
  }

  untrack(): void {
    this.self = null;
    if (this.joined) void this.channel.untrack();
  }

  onPresenceSync(cb: (present: unknown[]) => void): void {
    this.presenceCb = cb;
  }

  onStatus(cb: (s: ConnectionStatus) => void): void {
    this.statusCb = cb;
  }

  close(): void {
    this.closed = true;
    document.removeEventListener('visibilitychange', this.onWake);
    window.removeEventListener('online', this.onWake);
    void this.client.removeChannel(this.channel);
  }

  private onSubscribeStatus(status: string): void {
    if (this.closed) return;
    if (status === 'SUBSCRIBED') {
      this.joined = true;
      this.everJoined = true;
      // 重新連上後，伺服器那邊的在線登記已經沒了，要重新登記
      if (this.self) void this.channel.track(this.self);
      for (const q of this.queue.splice(0)) void this.channel.send({ type: 'broadcast', ...q });
      this.statusCb('connected');
    } else {
      this.joined = false;
      // 第一次連線還沒成功前，畫面維持一般狀態，不顯示「連線中斷」
      if (this.everJoined) this.statusCb('reconnecting');
    }
  }

  // 手機從背景回來、網路恢復時，不等重試計時器，馬上試著連線
  private onWake = () => {
    if (this.closed || document.hidden) return;
    if (!this.client.realtime.isConnected()) this.client.realtime.connect();
  };
}

export class SupabaseChatService implements ChatService {
  readonly mode = 'supabase' as const;
  private client: SupabaseClient;

  constructor(url: string, publishableKey: string) {
    // 只用 Realtime；不用登入，所以不保存任何登入狀態
    this.client = createClient(url, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }

  joinRoom(roomId: string, me: Me): RoomConnection {
    return createRoomConnection(new SupabaseRawChannel(this.client, roomId, me.clientId), me);
  }
}
