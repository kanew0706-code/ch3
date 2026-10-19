// 整個聊天室的狀態都在這裡；畫面只讀取狀態、呼叫這裡的方法。
// 這裡只透過 ChatService 介面通訊，不直接碰 BroadcastChannel 或 Supabase。
import { useSyncExternalStore } from 'react';
import type { ChatService, RoomConnection } from '../chat/ChatService';
import { LIMITS, type ChatMessage, type ConnectionStatus, type Emoji, type Member, type ReactionEvent } from '../chat/types';
import { createChatService } from '../config';
import { playNotify, setUnreadTitle, unlockAudio } from '../lib/notify';
import { createRateLimiter } from '../lib/rateLimit';
import { LOBBY_ID, cleanRoomName, hashFor, makeRoomId, parseHash, roomDisplayName, type RoomRef } from '../lib/roomUrl';
import { safeGet, safeRemove, safeSet } from '../lib/storage';
import { graphemes, stripInvisible, textLength } from '../lib/textLength';
import { colorFor, getClientId, nicknameError, saveNickname } from './identity';
import type { ChatState, RoomState, SendResult, Toast, TimelineItem } from './rooms';
import { loadMuted, saveMuted } from './settings';

const SESSION_KEY = 'anonchat.session';
const MAX_ITEMS = 500;
const TOAST_MS = 4_000;
const TOAST_MERGE_MS = 2_000;
const MAX_TOASTS = 3;

interface SavedSession {
  nickname: string;
  rooms: RoomRef[];
  active: string;
}

function excerptOf(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  const g = graphemes(flat);
  return g.length > LIMITS.excerpt ? g.slice(0, LIMITS.excerpt).join('') + '…' : flat;
}

export class ChatStore {
  private state: ChatState;
  private listeners = new Set<() => void>();
  private service: ChatService = createChatService();
  private conns = new Map<string, RoomConnection>();
  private limiter = createRateLimiter(LIMITS.sendIntervalMs);
  private titleUnread = 0;
  private seq = 0;
  private toastTimers = new Map<number, ReturnType<typeof setTimeout>>();

  constructor() {
    this.state = {
      screen: 'entry',
      me: null,
      mode: this.service.mode,
      pendingRoom: parseHash(location.hash),
      rooms: {},
      order: [],
      active: LOBBY_ID,
      hidden: [],
      muted: loadMuted(),
      toasts: [],
    };
    window.addEventListener('hashchange', this.onHashChange);
    document.addEventListener('visibilitychange', this.onVisibility);
    // 重新整理後自動回到聊天室；提示音要等使用者第一次操作才能啟用
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    this.restoreSession();
  }

  // ---------- 給 React 用 ----------
  getState = (): ChatState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  // ---------- 進入／離開 ----------
  enter(nickname: string): void {
    if (nicknameError(nickname)) return;
    saveNickname(nickname);
    unlockAudio();
    this.start(nickname, [], this.state.pendingRoom, LOBBY_ID);
  }

  /** 「離開」按鈕：離開所有房間，回到輸入代號畫面 */
  leaveAll(): void {
    for (const conn of this.conns.values()) conn.leave();
    this.conns.clear();
    for (const t of this.toastTimers.values()) clearTimeout(t);
    this.toastTimers.clear();
    safeRemove(sessionStorage, SESSION_KEY);
    history.replaceState(null, '', '#/');
    this.titleUnread = 0;
    setUnreadTitle(0);
    this.set({ screen: 'entry', me: null, rooms: {}, order: [], active: LOBBY_ID, hidden: [], toasts: [], pendingRoom: null });
  }

  // ---------- 房間 ----------
  createRoom(name: string): RoomRef {
    const ref: RoomRef = { id: makeRoomId(), name: cleanRoomName(name) };
    this.joinRoom(ref);
    this.setActive(ref.id);
    return ref;
  }

  setActive(id: string): void {
    const room = this.state.rooms[id];
    if (!room) return;
    this.set((s) => ({ active: id, rooms: { ...s.rooms, [id]: { ...room, unread: 0 } } }));
    if (location.hash !== hashFor(room)) history.replaceState(null, '', hashFor(room));
    this.saveSession();
  }

  /** 單獨離開一個私人房間（大廳不能離開） */
  leaveRoom(id: string): void {
    if (id === LOBBY_ID) return;
    this.conns.get(id)?.leave();
    this.conns.delete(id);
    const wasActive = this.state.active === id;
    this.set((s) => {
      const rooms = { ...s.rooms };
      delete rooms[id];
      return { rooms, order: s.order.filter((r) => r !== id), toasts: s.toasts.filter((t) => t.roomId !== id) };
    });
    if (wasActive) this.setActive(LOBBY_ID);
    else this.saveSession();
  }

  // ---------- 訊息 ----------
  send(text: string): SendResult {
    const { me, active } = this.state;
    const room = this.state.rooms[active];
    const conn = this.conns.get(active);
    if (!me || !room || !conn) return 'offline';
    if (room.status !== 'connected') return 'offline';
    if (text.trim() === '') return 'empty';
    if (textLength(text) > LIMITS.message) return 'too-long';
    if (!this.limiter.tryHit()) return 'too-fast';

    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      clientId: me.clientId,
      nickname: me.nickname,
      color: me.color,
      text: stripInvisible(text),
    };
    if (room.replyTo) {
      msg.replyTo = {
        id: room.replyTo.id,
        nickname: room.replyTo.nickname,
        color: room.replyTo.color,
        excerpt: excerptOf(room.replyTo.text),
      };
    }
    conn.sendMessage(msg);
    this.updateRoom(active, (r) => ({
      ...r,
      replyTo: null,
      items: pushItem(r.items, { kind: 'msg', msg, at: Date.now(), own: true }),
    }));
    return 'ok';
  }

  setReplyTo(msg: ChatMessage | null): void {
    this.updateRoom(this.state.active, (r) => ({ ...r, replyTo: msg }));
  }

  toggleReaction(messageId: string, emoji: Emoji): void {
    const { me, active } = this.state;
    const room = this.state.rooms[active];
    if (!me || !room || room.status !== 'connected') return;
    const on = !room.reactions[messageId]?.[emoji]?.[me.clientId];
    const ev: ReactionEvent = { messageId, emoji, clientId: me.clientId, nickname: me.nickname, on };
    this.applyReaction(active, ev);
    this.conns.get(active)?.sendReaction(ev);
  }

  // ---------- 設定 ----------
  hide(clientId: string): void {
    if (clientId === this.state.me?.clientId || this.state.hidden.includes(clientId)) return;
    this.set((s) => ({ hidden: [...s.hidden, clientId] }));
  }

  unhide(clientId: string): void {
    this.set((s) => ({ hidden: s.hidden.filter((id) => id !== clientId) }));
  }

  toggleMute(): void {
    const muted = !this.state.muted;
    saveMuted(muted);
    this.set({ muted });
  }

  dismissToast(id: number): void {
    clearTimeout(this.toastTimers.get(id));
    this.toastTimers.delete(id);
    this.set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  }

  // ---------- 內部 ----------
  private start(nickname: string, rooms: RoomRef[], target: RoomRef | null, active: string): void {
    const clientId = getClientId();
    this.set({ screen: 'chat', me: { clientId, nickname, color: colorFor(clientId) }, pendingRoom: null });
    this.joinRoom({ id: LOBBY_ID, name: '' });
    for (const r of rooms) this.joinRoom(r);
    if (target) this.joinRoom(target);
    const next = target?.id ?? active;
    this.setActive(this.state.rooms[next] ? next : LOBBY_ID);
  }

  private restoreSession(): void {
    const raw = safeGet(sessionStorage, SESSION_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as SavedSession;
      if (typeof saved.nickname !== 'string' || nicknameError(saved.nickname)) return;
      const rooms = Array.isArray(saved.rooms)
        ? saved.rooms.map((r) => parseHash(hashFor(r))).filter((r): r is RoomRef => r !== null)
        : [];
      this.start(saved.nickname, rooms, this.state.pendingRoom, String(saved.active));
    } catch {
      safeRemove(sessionStorage, SESSION_KEY);
    }
  }

  private saveSession(): void {
    const { me, order, rooms, active } = this.state;
    if (!me) return;
    const saved: SavedSession = {
      nickname: me.nickname,
      rooms: order.filter((id) => id !== LOBBY_ID).map((id) => ({ id, name: rooms[id].name })),
      active,
    };
    safeSet(sessionStorage, SESSION_KEY, JSON.stringify(saved));
  }

  private joinRoom(ref: RoomRef): void {
    const me = this.state.me;
    if (!me || this.conns.has(ref.id)) return;
    const conn = this.service.joinRoom(ref.id, me);
    this.conns.set(ref.id, conn);
    const room: RoomState = {
      ...ref,
      items: [],
      members: [],
      reactions: {},
      unread: 0,
      status: 'connecting',
      wasDisconnected: false,
      replyTo: null,
    };
    this.set((s) => ({ rooms: { ...s.rooms, [ref.id]: room }, order: [...s.order, ref.id] }));

    conn.onMessage((m) => this.receive(ref.id, m));
    conn.onReaction((r) => this.applyReaction(ref.id, r));
    conn.onPresence((members) => this.updateRoom(ref.id, (r) => ({ ...r, members })));
    conn.onMemberJoin((m) => this.toast('join', ref.id, m));
    conn.onMemberLeave((m) => this.toast('leave', ref.id, m));
    conn.onStatus((s) => this.onStatus(ref.id, s));
    this.saveSession();
  }

  private receive(roomId: string, msg: ChatMessage): void {
    const isHidden = this.state.hidden.includes(msg.clientId);
    const isActive = roomId === this.state.active;
    this.updateRoom(roomId, (r) => ({
      ...r,
      items: pushItem(r.items, { kind: 'msg', msg, at: Date.now(), own: false }),
      unread: r.unread + (!isActive && !isHidden ? 1 : 0),
    }));
    if (isHidden || !document.hidden) return;
    this.titleUnread++;
    setUnreadTitle(this.titleUnread);
    if (!this.state.muted) playNotify();
  }

  private applyReaction(roomId: string, ev: ReactionEvent): void {
    this.updateRoom(roomId, (r) => {
      if (!r.items.some((it) => it.kind === 'msg' && it.msg.id === ev.messageId)) return r;
      const forMsg = { ...r.reactions[ev.messageId] };
      const users = { ...forMsg[ev.emoji] };
      if (ev.on) users[ev.clientId] = ev.nickname;
      else delete users[ev.clientId];
      forMsg[ev.emoji] = users;
      return { ...r, reactions: { ...r.reactions, [ev.messageId]: forMsg } };
    });
  }

  private onStatus(roomId: string, status: ConnectionStatus): void {
    this.updateRoom(roomId, (r) => {
      // 從來沒連上過就不算「中斷期間」，連上後不插入灰字
      if (status === 'reconnecting') return { ...r, status, wasDisconnected: r.wasDisconnected || r.status === 'connected' };
      if (r.wasDisconnected) {
        const sys: TimelineItem = { kind: 'sys', id: `sys-${++this.seq}`, text: '連線中斷期間的訊息無法顯示', at: Date.now() };
        return { ...r, status, wasDisconnected: false, items: pushItem(r.items, sys) };
      }
      return { ...r, status };
    });
  }

  private toast(kind: Toast['kind'], roomId: string, m: Member): void {
    const room = this.state.rooms[roomId];
    if (!room || m.clientId === this.state.me?.clientId || this.state.hidden.includes(m.clientId)) return;
    const now = Date.now();
    const person = { nickname: m.nickname, color: m.color };
    const existing = this.state.toasts.find((t) => t.kind === kind && t.roomId === roomId && now - t.at < TOAST_MERGE_MS);

    if (existing) {
      this.set((s) => ({
        toasts: s.toasts.map((t) => (t.id === existing.id ? { ...t, people: [...t.people, person], at: now } : t)),
      }));
      this.scheduleToast(existing.id);
      return;
    }

    const toast: Toast = { id: ++this.seq, kind, roomId, roomName: roomDisplayName(room), people: [person], at: now };
    const toasts = [...this.state.toasts, toast];
    while (toasts.length > MAX_TOASTS) {
      const old = toasts.shift()!;
      clearTimeout(this.toastTimers.get(old.id));
      this.toastTimers.delete(old.id);
    }
    this.set({ toasts });
    this.scheduleToast(toast.id);
  }

  private scheduleToast(id: number): void {
    clearTimeout(this.toastTimers.get(id));
    this.toastTimers.set(id, setTimeout(() => this.dismissToast(id), TOAST_MS));
  }

  private onHashChange = (): void => {
    const ref = parseHash(location.hash);
    if (this.state.screen === 'entry') {
      this.set({ pendingRoom: ref });
      return;
    }
    if (ref) this.joinRoom(ref);
    this.setActive(ref?.id ?? LOBBY_ID);
  };

  private onVisibility = (): void => {
    if (!document.hidden) {
      this.titleUnread = 0;
      setUnreadTitle(0);
    }
  };

  private updateRoom(id: string, fn: (r: RoomState) => RoomState): void {
    const room = this.state.rooms[id];
    if (!room) return;
    const next = fn(room);
    if (next !== room) this.set((s) => ({ rooms: { ...s.rooms, [id]: next } }));
  }

  private set(patch: Partial<ChatState> | ((s: ChatState) => Partial<ChatState>)): void {
    const p = typeof patch === 'function' ? patch(this.state) : patch;
    this.state = { ...this.state, ...p };
    for (const l of this.listeners) l();
  }
}

function pushItem(items: TimelineItem[], item: TimelineItem): TimelineItem[] {
  const next = [...items, item];
  return next.length > MAX_ITEMS ? next.slice(next.length - MAX_ITEMS) : next;
}

export const store = new ChatStore();

export function useChatState(): ChatState {
  return useSyncExternalStore(store.subscribe, store.getState);
}
