// 通訊約定：docs/architecture.md 第 5 節。兩種 ChatService 都使用這些格式。

export const EMOJIS = ['👍', '❤️', '😂', '😮', '😢'] as const;
export type Emoji = (typeof EMOJIS)[number];

export const EMOJI_LABELS: Record<Emoji, string> = {
  '👍': '按讚',
  '❤️': '愛心',
  '😂': '大笑',
  '😮': '驚訝',
  '😢': '難過',
};

export const LIMITS = {
  nickname: 9,
  message: 300,
  roomName: 20,
  excerpt: 50,
  graceMs: 30_000,
  sendIntervalMs: 1_000,
} as const;

/** 自己的臨時身分 */
export interface Me {
  clientId: string;
  nickname: string;
  color: string;
}

/** 在線狀態（Presence） */
export interface Member extends Me {
  joinedAt: number;
}

/** 事件 message */
export interface ChatMessage {
  id: string;
  clientId: string;
  nickname: string;
  color: string;
  text: string;
  replyTo?: {
    id: string;
    nickname: string;
    color: string;
    excerpt: string;
  };
}

/** 事件 reaction */
export interface ReactionEvent {
  messageId: string;
  emoji: Emoji;
  clientId: string;
  nickname: string;
  on: boolean;
}

/** 事件 bye */
export interface ByeEvent {
  clientId: string;
}

/** connecting = 剛進入、還沒連上（不顯示中斷提示，但不能送出） */
export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting';
