// 畫面需要的狀態形狀
import type { ChatMessage, ConnectionStatus, Emoji, Me, Member } from '../chat/types';
import type { RoomRef } from '../lib/roomUrl';

export type TimelineItem =
  | { kind: 'msg'; msg: ChatMessage; at: number; own: boolean }
  | { kind: 'sys'; id: string; text: string; at: number };

/** messageId → emoji → clientId → nickname */
export type ReactionMap = Record<string, Partial<Record<Emoji, Record<string, string>>>>;

export interface RoomState extends RoomRef {
  items: TimelineItem[];
  members: Member[];
  reactions: ReactionMap;
  unread: number;
  status: ConnectionStatus;
  wasDisconnected: boolean;
  replyTo: ChatMessage | null;
}

export interface Toast {
  id: number;
  kind: 'join' | 'leave';
  roomId: string;
  roomName: string;
  people: { nickname: string; color: string }[];
  at: number;
}

export interface ChatState {
  screen: 'entry' | 'chat';
  me: Me | null;
  mode: 'local' | 'supabase';
  /** 從私人房間連結進來、還沒輸入代號時，要前往的房間 */
  pendingRoom: RoomRef | null;
  rooms: Record<string, RoomState>;
  order: string[];
  active: string;
  /** 被自己隱藏的 clientId（只在這次進入期間有效） */
  hidden: string[];
  muted: boolean;
  toasts: Toast[];
}

export type SendResult = 'ok' | 'empty' | 'too-long' | 'too-fast' | 'offline';
