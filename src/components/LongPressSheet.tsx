// 手機長按訊息：選表情、回覆、看誰按了表情（docs/design.md 第 4.5 節）
import { useEffect } from 'react';
import { EMOJIS, EMOJI_LABELS, type ChatMessage } from '../chat/types';
import { store } from '../state/store';
import { Icon } from './Icon';
import { whoReacted, type ReactionSummary } from './ReactionBar';

interface Props {
  msg: ChatMessage;
  reactions: ReactionSummary[];
  isOwn: boolean;
  onClose: () => void;
}

export function LongPressSheet({ msg, reactions, isOwn, onClose }: Props) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  const mine = new Set(reactions.filter((r) => r.mine).map((r) => r.emoji));

  return (
    <div className="sheet-layer" onClick={onClose}>
      <div className="sheet" role="menu" aria-label="訊息操作" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__emojis">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              role="menuitem"
              className={mine.has(e) ? 'sheet__emoji sheet__emoji--mine' : 'sheet__emoji'}
              aria-label={EMOJI_LABELS[e]}
              aria-pressed={mine.has(e)}
              onClick={() => {
                store.toggleReaction(msg.id, e);
                onClose();
              }}
            >
              {e}
            </button>
          ))}
        </div>
        <button
          type="button"
          role="menuitem"
          className="sheet__item"
          onClick={() => {
            store.setReplyTo(msg);
            onClose();
          }}
        >
          <Icon name="reply" size={18} />
          回覆
        </button>
        {!isOwn && (
          <button
            type="button"
            role="menuitem"
            className="sheet__item sheet__item--danger"
            onClick={() => {
              store.hide(msg.clientId);
              onClose();
            }}
          >
            <Icon name="ban" size={18} />
            隱藏 {msg.nickname}
          </button>
        )}
        {reactions.map((r) => (
          <div key={r.emoji} className="sheet__who">
            {whoReacted(r)}
          </div>
        ))}
      </div>
    </div>
  );
}
