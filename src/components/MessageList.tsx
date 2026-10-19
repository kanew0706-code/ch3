// 訊息列表：自動捲動、「有新訊息」、點引用跳到原訊息並標亮
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../chat/types';
import type { RoomState } from '../state/rooms';
import { Icon } from './Icon';
import { LongPressSheet } from './LongPressSheet';
import { MessageItem } from './MessageItem';
import { summarize, type ReactionSummary } from './ReactionBar';

const GROUP_MS = 5 * 60_000;
const NEAR_BOTTOM_PX = 80;
const FLASH_MS = 1_500;

interface Props {
  room: RoomState;
  myId: string;
  hidden: string[];
  touch: boolean;
}

export function MessageList({ room, myId, hidden, touch }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const [showNew, setShowNew] = useState(false);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{ msg: ChatMessage; reactions: ReactionSummary[] } | null>(null);

  const online = room.status === 'connected';
  const items = room.items.filter((it) => it.kind === 'sys' || !hidden.includes(it.msg.clientId));
  const last = items[items.length - 1];
  const lastKey = last ? (last.kind === 'msg' ? last.msg.id : last.id) : '';

  const scrollToBottom = (smooth = false) => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth && !prefersReducedMotion() ? 'smooth' : 'auto' });
    atBottom.current = true;
    setShowNew(false);
  };

  // 換房間：直接到最底
  useLayoutEffect(() => {
    scrollToBottom();
  }, [room.id]);

  // 新訊息：在底部就跟著捲；自己送的一律捲到底；否則顯示「有新訊息」
  useLayoutEffect(() => {
    if (!last) return;
    if (atBottom.current || (last.kind === 'msg' && last.own)) scrollToBottom();
    else setShowNew(true);
  }, [lastKey]);

  // 表情列出現時，內容會變高
  useLayoutEffect(() => {
    if (atBottom.current) scrollToBottom();
  }, [room.reactions]);

  useEffect(() => {
    if (!flashId) return;
    const t = setTimeout(() => setFlashId(null), FLASH_MS);
    return () => clearTimeout(t);
  }, [flashId]);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    if (atBottom.current) setShowNew(false);
  };

  const onQuoteClick = useCallback((id: string) => {
    const el = document.getElementById(`msg-${id}`);
    if (!el) return; // 原訊息不在畫面上：什麼都不做
    el.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    setFlashId(id);
  }, []);

  const onLongPress = useCallback((msg: ChatMessage, reactions: ReactionSummary[]) => {
    navigator.vibrate?.(10);
    setSheet({ msg, reactions });
  }, []);

  return (
    <div className="messages-wrap">
      <div className="messages" ref={ref} onScroll={onScroll} aria-live="polite" aria-relevant="additions">
        {items.length === 0 ? (
          <div className="empty">
            <Icon name="chat" size={38} />
            <b>還沒有訊息</b>
            <span>你進來之前的訊息不會顯示。</span>
          </div>
        ) : (
          items.map((it, i) => {
            if (it.kind === 'sys') {
              return (
                <div key={it.id} className="sys" role="separator">
                  {it.text}
                </div>
              );
            }
            const prev = items[i - 1];
            const grouped =
              !it.msg.replyTo &&
              prev?.kind === 'msg' &&
              prev.msg.clientId === it.msg.clientId &&
              it.at - prev.at < GROUP_MS;
            return (
              <MessageItem
                key={it.msg.id}
                msg={it.msg}
                at={it.at}
                own={it.own}
                grouped={grouped}
                flash={flashId === it.msg.id}
                touch={touch}
                online={online}
                reactions={summarize(room.reactions[it.msg.id], myId, hidden)}
                onQuoteClick={onQuoteClick}
                onLongPress={onLongPress}
              />
            );
          })
        )}
      </div>

      {showNew && (
        <button type="button" className="new-msgs" onClick={() => scrollToBottom(true)}>
          <Icon name="arrowDown" size={14} />
          有新訊息
        </button>
      )}

      {sheet && (
        <LongPressSheet
          msg={sheet.msg}
          reactions={summarize(room.reactions[sheet.msg.id], myId, hidden)}
          isOwn={sheet.msg.clientId === myId}
          online={online}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
