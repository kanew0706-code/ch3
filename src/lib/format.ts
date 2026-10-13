import { graphemes } from './textLength';

export function formatTime(at: number): string {
  const d = new Date(at);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 頭像上的字：代號的第一個字（略過開頭空白） */
export function initialOf(nickname: string): string {
  return graphemes(nickname.trim())[0] ?? '?';
}
