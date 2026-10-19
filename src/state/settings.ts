// 個人設定：靜音（記在瀏覽器裡）
import { safeGet, safeSet } from '../lib/storage';

const MUTED_KEY = 'anonchat.muted';

export function loadMuted(): boolean {
  return safeGet(localStorage, MUTED_KEY) === '1';
}

export function saveMuted(muted: boolean): void {
  safeSet(localStorage, MUTED_KEY, muted ? '1' : '0');
}
