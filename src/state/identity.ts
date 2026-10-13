// 臨時身分（docs/architecture.md 第 5.1 節）
import { LIMITS } from '../chat/types';
import { safeGet, safeSet } from '../lib/storage';
import { textLength } from '../lib/textLength';

export const NAME_COLORS = [
  '#ff8a7a', '#ffb547', '#e6d55a', '#7bdc6b', '#3ddc97', '#4fd6e0',
  '#5eb0ff', '#8b9dff', '#b98bff', '#f08bff', '#ff7fb6', '#c9a27a',
];

const CLIENT_ID_KEY = 'anonchat.clientId';
const NICKNAME_KEY = 'anonchat.nickname';

/** 一個分頁就是一個人：存在 sessionStorage，重新整理不變、開新分頁換新的 */
export function getClientId(): string {
  let id = safeGet(sessionStorage, CLIENT_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    safeSet(sessionStorage, CLIENT_ID_KEY, id);
  }
  return id;
}

export function colorFor(clientId: string): string {
  let sum = 0;
  for (let i = 0; i < clientId.length; i++) sum = (sum * 31 + clientId.charCodeAt(i)) >>> 0;
  return NAME_COLORS[sum % NAME_COLORS.length];
}

/** 代號規則：1～9 個字，空白也算字數，不能全部都是空白。合格回傳 null，否則回傳原因。 */
export function nicknameError(nickname: string): string | null {
  if (nickname.length === 0) return '請輸入代號';
  if (nickname.trim().length === 0) return '代號不能只有空白';
  if (textLength(nickname) > LIMITS.nickname) return `代號最多 ${LIMITS.nickname} 個字`;
  return null;
}

export function loadNickname(): string {
  return safeGet(localStorage, NICKNAME_KEY) ?? '';
}

export function saveNickname(nickname: string): void {
  safeSet(localStorage, NICKNAME_KEY, nickname);
}
