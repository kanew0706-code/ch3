// 把「底層頻道」包裝成畫面使用的 RoomConnection。
// 檢查資料、擋洗版、30 秒緩衝都在這裡，所以階段二只要再寫一個 RawChannel。
import type { RawChannel, RoomConnection, Unsubscribe } from './ChatService';
import { PresenceGrace } from './presenceGrace';
import { parseBye, parseMember, parseMessage, parseReaction } from './validate';
import type { ChatMessage, ConnectionStatus, Me, Member, ReactionEvent } from './types';

/** 同一個人 1 秒內送超過 1 則，只顯示第一則（留一點網路誤差） */
const RECEIVE_INTERVAL_MS = 900;

class Emitter<T> {
  private set = new Set<(v: T) => void>();
  on(cb: (v: T) => void): Unsubscribe {
    this.set.add(cb);
    return () => this.set.delete(cb);
  }
  emit(v: T): void {
    for (const cb of this.set) cb(v);
  }
  clear(): void {
    this.set.clear();
  }
}

export function createRoomConnection(raw: RawChannel, me: Me): RoomConnection {
  const message = new Emitter<ChatMessage>();
  const reaction = new Emitter<ReactionEvent>();
  const presence = new Emitter<Member[]>();
  const join = new Emitter<Member>();
  const leave = new Emitter<Member>();
  const status = new Emitter<ConnectionStatus>();
  const lastReceived = new Map<string, number>();
  let closed = false;

  const self: Member = { ...me, joinedAt: Date.now() };
  const grace = new PresenceGrace(self, {
    onChange: (members) => presence.emit(members),
    onJoin: (m) => join.emit(m),
    onLeave: (m) => leave.emit(m),
  });

  raw.onBroadcast((event, payload) => {
    if (closed) return;
    if (event === 'message') {
      const m = parseMessage(payload);
      if (!m || m.clientId === me.clientId) return;
      const now = Date.now();
      const last = lastReceived.get(m.clientId);
      if (last !== undefined && now - last < RECEIVE_INTERVAL_MS) return;
      lastReceived.set(m.clientId, now);
      message.emit(m);
    } else if (event === 'reaction') {
      const r = parseReaction(payload);
      if (r && r.clientId !== me.clientId) reaction.emit(r);
    } else if (event === 'bye') {
      const b = parseBye(payload);
      if (b) grace.bye(b.clientId);
    }
  });

  raw.onPresenceSync((list) => {
    if (closed) return;
    grace.sync(list.map(parseMember).filter((m): m is Member => m !== null));
  });

  raw.onStatus((s) => {
    if (!closed) status.emit(s);
  });

  raw.track(self);

  return {
    sendMessage: (msg) => {
      if (!closed) raw.broadcast('message', msg);
    },
    sendReaction: (r) => {
      if (!closed) raw.broadcast('reaction', r);
    },
    leave: () => {
      if (closed) return;
      raw.broadcast('bye', { clientId: me.clientId });
      raw.untrack();
      closed = true;
      grace.dispose();
      raw.close();
      for (const e of [message, reaction, presence, join, leave, status]) e.clear();
    },
    onMessage: (cb) => message.on(cb),
    onReaction: (cb) => reaction.on(cb),
    onPresence: (cb) => presence.on(cb),
    onMemberJoin: (cb) => join.on(cb),
    onMemberLeave: (cb) => leave.on(cb),
    onStatus: (cb) => status.on(cb),
  };
}
