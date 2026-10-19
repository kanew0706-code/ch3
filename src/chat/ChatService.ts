// 「通訊員」的規格（docs/architecture.md 第 4.3 節）。
// 畫面只透過這個介面通訊；階段一用 LocalChatService，階段二換成 SupabaseChatService。
import type { ChatMessage, ConnectionStatus, Me, Member, ReactionEvent } from './types';

export type Unsubscribe = () => void;

export interface RoomConnection {
  sendMessage(msg: ChatMessage): void;
  sendReaction(r: ReactionEvent): void;
  /** 主動離開：通知別人，停止接收 */
  leave(): void;
  onMessage(cb: (m: ChatMessage) => void): Unsubscribe;
  onReaction(cb: (r: ReactionEvent) => void): Unsubscribe;
  /** 線上名單（含 30 秒緩衝中的人） */
  onPresence(cb: (members: Member[]) => void): Unsubscribe;
  /** 已套用 30 秒緩衝；剛加入時已在房內的人不會觸發 */
  onMemberJoin(cb: (m: Member) => void): Unsubscribe;
  onMemberLeave(cb: (m: Member) => void): Unsubscribe;
  onStatus(cb: (s: ConnectionStatus) => void): Unsubscribe;
}

export interface ChatService {
  /** local = 展示模式（同瀏覽器分頁互傳） */
  readonly mode: 'local' | 'supabase';
  joinRoom(roomId: string, me: Me): RoomConnection;
}

/**
 * 每種傳輸方式只需要實作這個「底層頻道」，
 * 驗證、速度限制、30 秒緩衝等規則都在 createRoomConnection 裡共用。
 */
export interface RawChannel {
  broadcast(event: string, payload: unknown): void;
  onBroadcast(cb: (event: string, payload: unknown) => void): void;
  /** 登記自己的在線狀態 */
  track(member: Member): void;
  untrack(): void;
  /** 每次在線名單變動時，給出「目前所有在線的人」（不含緩衝） */
  onPresenceSync(cb: (present: unknown[]) => void): void;
  onStatus(cb: (s: ConnectionStatus) => void): void;
  close(): void;
}
