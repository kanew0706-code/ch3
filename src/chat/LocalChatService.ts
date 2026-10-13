// 階段一：用瀏覽器內建的 BroadcastChannel，讓同一個瀏覽器的分頁互相傳訊。
// 模擬 Supabase 的 Broadcast（不會傳回給自己）和 Presence（誰在線上）。
import type { ChatService, RawChannel, RoomConnection } from './ChatService';
import { createRoomConnection } from './createRoomConnection';
import { parseMember } from './validate';
import type { ConnectionStatus, Me, Member } from './types';

const HEARTBEAT_MS = 10_000;
/** 背景分頁的計時器可能被瀏覽器放慢到 1 分鐘一次，所以給寬鬆一點 */
const PEER_TIMEOUT_MS = 90_000;

type Packet =
  | { t: 'bc'; event: string; payload: unknown }
  | { t: 'hello'; member: Member }
  | { t: 'hb'; member: Member }
  | { t: 'gone'; clientId: string };

class LocalRawChannel implements RawChannel {
  private bc: BroadcastChannel;
  private peers = new Map<string, { member: Member; lastSeen: number }>();
  private self: Member | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private broadcastCb: (event: string, payload: unknown) => void = () => {};
  private presenceCb: (present: unknown[]) => void = () => {};

  constructor(roomId: string) {
    this.bc = new BroadcastChannel(`anonchat:${roomId}`);
    this.bc.onmessage = (e: MessageEvent) => this.handle(e.data);
  }

  broadcast(event: string, payload: unknown): void {
    this.post({ t: 'bc', event, payload });
  }

  onBroadcast(cb: (event: string, payload: unknown) => void): void {
    this.broadcastCb = cb;
  }

  track(member: Member): void {
    this.self = member;
    this.post({ t: 'hello', member });
    this.sync();
    this.timer = setInterval(() => {
      if (this.self) this.post({ t: 'hb', member: this.self });
      this.sweep();
    }, HEARTBEAT_MS);
    window.addEventListener('pagehide', this.onPageHide);
    window.addEventListener('pageshow', this.onPageShow);
  }

  untrack(): void {
    if (this.self) this.post({ t: 'gone', clientId: this.self.clientId });
    this.self = null;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    window.removeEventListener('pagehide', this.onPageHide);
    window.removeEventListener('pageshow', this.onPageShow);
  }

  onPresenceSync(cb: (present: unknown[]) => void): void {
    this.presenceCb = cb;
  }

  onStatus(cb: (s: ConnectionStatus) => void): void {
    // 分頁之間的傳遞不會斷線
    queueMicrotask(() => cb('connected'));
  }

  close(): void {
    this.bc.close();
  }

  // 關掉或重新整理分頁：通知別人「我斷線了」（別人會套用 30 秒緩衝）
  private onPageHide = () => {
    if (this.self) this.post({ t: 'gone', clientId: this.self.clientId });
  };

  // 從瀏覽器的「上一頁快取」回來
  private onPageShow = (e: PageTransitionEvent) => {
    if (e.persisted && this.self) this.post({ t: 'hello', member: this.self });
  };

  private handle(data: unknown): void {
    if (typeof data !== 'object' || data === null) return;
    const p = data as Packet;
    switch (p.t) {
      case 'bc':
        if (typeof p.event === 'string') this.broadcastCb(p.event, p.payload);
        break;
      case 'hello':
        this.upsert(p.member);
        // 讓剛進來的人知道我在
        if (this.self) this.post({ t: 'hb', member: this.self });
        break;
      case 'hb':
        this.upsert(p.member);
        break;
      case 'gone':
        if (typeof p.clientId === 'string' && this.peers.delete(p.clientId)) this.sync();
        break;
    }
  }

  private upsert(raw: unknown): void {
    const m = parseMember(raw);
    if (!m || m.clientId === this.self?.clientId) return;
    const isNew = !this.peers.has(m.clientId);
    this.peers.set(m.clientId, { member: m, lastSeen: Date.now() });
    if (isNew) this.sync();
  }

  private sweep(): void {
    const now = Date.now();
    let changed = false;
    for (const [id, p] of this.peers) {
      if (now - p.lastSeen > PEER_TIMEOUT_MS) {
        this.peers.delete(id);
        changed = true;
      }
    }
    if (changed) this.sync();
  }

  private sync(): void {
    const list: Member[] = [...this.peers.values()].map((p) => p.member);
    if (this.self) list.unshift(this.self);
    this.presenceCb(list);
  }

  private post(p: Packet): void {
    try {
      this.bc.postMessage(p);
    } catch {
      /* 頻道已關閉 */
    }
  }
}

export class LocalChatService implements ChatService {
  readonly mode = 'local' as const;

  joinRoom(roomId: string, me: Me): RoomConnection {
    return createRoomConnection(new LocalRawChannel(roomId), me);
  }
}
