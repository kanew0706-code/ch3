// 收到的每一筆資料都要重新檢查（docs/architecture.md 第 9.1 節）。不合格就丟掉。
import { NAME_COLORS } from '../state/identity';
import { stripInvisible, textLength } from '../lib/textLength';
import { EMOJIS, LIMITS, type ByeEvent, type ChatMessage, type Member, type ReactionEvent } from './types';

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isId = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 64;
const isColor = (v: unknown): v is string => typeof v === 'string' && NAME_COLORS.includes(v);

function isNickname(v: unknown): v is string {
  if (typeof v !== 'string' || v.length > 64) return false;
  const n = textLength(v);
  return n >= 1 && n <= LIMITS.nickname && v.trim().length > 0 && stripInvisible(v) === v;
}

function isText(v: unknown, max: number, maxUnits: number): v is string {
  return typeof v === 'string' && v.length <= maxUnits && textLength(v) <= max;
}

export function parseMessage(p: unknown): ChatMessage | null {
  if (!isObj(p)) return null;
  const { id, clientId, nickname, color, text, replyTo } = p;
  if (!isId(id) || !isId(clientId) || !isNickname(nickname) || !isColor(color)) return null;
  if (!isText(text, LIMITS.message, 4000) || text.trim() === '') return null;
  const msg: ChatMessage = { id, clientId, nickname, color, text: stripInvisible(text) };
  if (replyTo !== undefined) {
    if (!isObj(replyTo)) return null;
    const r = replyTo;
    if (!isId(r.id) || !isNickname(r.nickname) || !isColor(r.color) || !isText(r.excerpt, LIMITS.excerpt + 1, 800)) return null;
    msg.replyTo = { id: r.id, nickname: r.nickname, color: r.color, excerpt: stripInvisible(r.excerpt) };
  }
  return msg;
}

export function parseReaction(p: unknown): ReactionEvent | null {
  if (!isObj(p)) return null;
  const { messageId, emoji, clientId, nickname, on } = p;
  if (!isId(messageId) || !isId(clientId) || !isNickname(nickname) || typeof on !== 'boolean') return null;
  if (!EMOJIS.includes(emoji as never)) return null;
  return { messageId, emoji: emoji as ReactionEvent['emoji'], clientId, nickname, on };
}

export function parseBye(p: unknown): ByeEvent | null {
  return isObj(p) && isId(p.clientId) ? { clientId: p.clientId } : null;
}

export function parseMember(p: unknown): Member | null {
  if (!isObj(p)) return null;
  const { clientId, nickname, color, joinedAt } = p;
  if (!isId(clientId) || !isNickname(nickname) || !isColor(color) || typeof joinedAt !== 'number') return null;
  return { clientId, nickname, color, joinedAt };
}
