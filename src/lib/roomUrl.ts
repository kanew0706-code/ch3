// 房間網址（docs/architecture.md 第 5.4 節）
//   大廳：     .../#/
//   私人房間：  .../#/r/<房間ID>?name=<房間名稱>
import { LIMITS } from '../chat/types';
import { cleanNickname, truncate } from './textLength';

export const LOBBY_ID = 'lobby';

export interface RoomRef {
  id: string;
  /** 沒取名時為空字串 */
  name: string;
}

const ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const ID_PATTERN = /^[A-Za-z0-9]{12}$/;

/** 12 個隨機英數字（約 71 bits），用拒絕取樣避免偏差 */
export function makeRoomId(): string {
  let id = '';
  while (id.length < 12) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    for (const b of bytes) {
      if (b < 248 && id.length < 12) id += ID_ALPHABET[b % 62];
    }
  }
  return id;
}

export function cleanRoomName(name: string): string {
  return truncate(cleanNickname(name).trim(), LIMITS.roomName);
}

export function roomDisplayName(room: RoomRef): string {
  if (room.id === LOBBY_ID) return '大廳';
  return room.name || `房間 ${room.id.slice(0, 4)}`;
}

/** 解析網址 # 後面的部分；不是私人房間就回傳 null（= 大廳） */
export function parseHash(hash: string): RoomRef | null {
  const m = /^#\/r\/([^?]+)(?:\?(.*))?$/.exec(hash);
  if (!m || !ID_PATTERN.test(m[1])) return null;
  const params = new URLSearchParams(m[2] ?? '');
  return { id: m[1], name: cleanRoomName(params.get('name') ?? '') };
}

export function hashFor(room: RoomRef): string {
  if (room.id === LOBBY_ID) return '#/';
  return room.name ? `#/r/${room.id}?name=${encodeURIComponent(room.name)}` : `#/r/${room.id}`;
}

export function shareUrl(room: RoomRef): string {
  return `${location.origin}${location.pathname}${hashFor(room)}`;
}
