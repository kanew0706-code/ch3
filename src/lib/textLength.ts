// 用「肉眼看到的字」計算字數：中文、英文、emoji（包含組合 emoji）都算 1 個字。
const segmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter('zh-Hant', { granularity: 'grapheme' })
    : null;

export function graphemes(text: string): string[] {
  if (segmenter) return Array.from(segmenter.segment(text), (s) => s.segment);
  return Array.from(text);
}

export function textLength(text: string): number {
  return graphemes(text).length;
}

export function truncate(text: string, max: number): string {
  const g = graphemes(text);
  return g.length <= max ? text : g.slice(0, max).join('');
}

// 看不見的控制字元、會讓文字反向顯示的字元（但保留 emoji 需要的 ZWJ U+200D）
const INVISIBLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F​‎‏‪-‮⁠-⁤⁦-⁩﻿]/g;

export function stripInvisible(text: string): string {
  return text.replace(INVISIBLE, '');
}

/** 代號：移除控制字元與換行 */
export function cleanNickname(text: string): string {
  return stripInvisible(text).replace(/[\r\n\t]/g, ' ');
}
