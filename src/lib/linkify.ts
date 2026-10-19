// 把訊息切成「文字」和「網址」片段。畫面用文字節點和 <a> 顯示，絕不使用 innerHTML。
export type Segment = { type: 'text'; text: string } | { type: 'link'; text: string; href: string };

// 只吃英數和網址符號：中文常緊接在網址後面（「…/abc。還有」），遇到就停
const URL_RE = /https?:\/\/[A-Za-z0-9\-._~:/?#[\]@!$&()*+,;=%]+/g;
const TRAILING = /[)\].,;:!?]+$/;

export function linkify(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_RE)) {
    const start = match.index ?? 0;
    let raw = match[0];
    const trail = TRAILING.exec(raw);
    if (trail) raw = raw.slice(0, raw.length - trail[0].length);
    const href = safeHref(raw);
    if (!href) continue;
    if (start > last) out.push({ type: 'text', text: text.slice(last, start) });
    out.push({ type: 'link', text: raw, href });
    last = start + raw.length;
  }
  if (last < text.length) out.push({ type: 'text', text: text.slice(last) });
  return out;
}

/** 只接受 http: 和 https: */
function safeHref(raw: string): string | null {
  try {
    const u = new URL(raw);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}
