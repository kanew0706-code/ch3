// 單則訊息（docs/design.md 第 4.2 節「訊息」）
import { memo, useEffect, useRef, useState } from 'react';
import { EMOJIS, EMOJI_LABELS, type ChatMessage } from '../chat/types';
import { formatTime, initialOf } from '../lib/format';
import { linkify } from '../lib/linkify';
import { store } from '../state/store';
import { Icon } from './Icon';
import { ReactionBar, type ReactionSummary } from './ReactionBar';

interface Props {
  msg: ChatMessage;
  at: number;
  own: boolean;
  grouped: boolean;
  flash: boolean;
  touch: boolean;
  reactions: ReactionSummary[];
  onQuoteClick: (id: string) => void;
  onLongPress: (msg: ChatMessage, reactions: ReactionSummary[]) => void;
}

const LONG_PRESS_MS = 500;

export const MessageItem = memo(function MessageItem({
  msg, at, own, grouped, flash, touch, reactions, onQuoteClick, onLongPress,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };

  const touchHandlers = touch
    ? {
        onTouchStart: () => {
          cancelPress();
          pressTimer.current = setTimeout(() => {
            pressTimer.current = null;
            onLongPress(msg, reactions);
          }, LONG_PRESS_MS);
        },
        onTouchMove: cancelPress,
        onTouchEnd: cancelPress,
        onTouchCancel: cancelPress,
        onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
      }
    : {};

  const cls = ['msg'];
  if (own) cls.push('msg--own');
  if (grouped) cls.push('msg--grouped');
  if (flash) cls.push('msg--flash');
  if (touch) cls.push('msg--touch');

  return (
    <article id={`msg-${msg.id}`} className={cls.join(' ')} aria-label={`${msg.nickname} ${formatTime(at)}`} {...touchHandlers}>
      {grouped ? (
        <time className="msg__side-time" dateTime={new Date(at).toISOString()}>
          {formatTime(at)}
        </time>
      ) : (
        <div className="avatar" style={{ background: msg.color }} aria-hidden="true">
          {initialOf(msg.nickname)}
        </div>
      )}

      <div className="msg__body">
        {msg.replyTo && (
          <button type="button" className="quote" onClick={() => onQuoteClick(msg.replyTo!.id)}>
            <Icon name="reply" size={14} />
            <b style={{ color: msg.replyTo.color }}>{msg.replyTo.nickname}</b>
            <span className="quote__text">{msg.replyTo.excerpt}</span>
          </button>
        )}

        {!grouped && (
          <div className="msg__meta">
            {own ? (
              <span className="msg__who" style={{ color: msg.color }}>
                {msg.nickname}
              </span>
            ) : (
              <NameButton msg={msg} open={menuOpen} setOpen={setMenuOpen} />
            )}
            {own && <span className="msg__you">（你）</span>}
            <time className="msg__time" dateTime={new Date(at).toISOString()}>
              {formatTime(at)}
            </time>
          </div>
        )}

        <div className="msg__text">
          {linkify(msg.text).map((seg, i) =>
            seg.type === 'link' ? (
              <a key={i} href={seg.href} target="_blank" rel="noopener noreferrer">
                {seg.text}
              </a>
            ) : (
              <span key={i}>{seg.text}</span>
            ),
          )}
        </div>

        <ReactionBar messageId={msg.id} summary={reactions} />
      </div>

      {!touch && (
        <div className="msg__actions" role="toolbar" aria-label="訊息操作">
          <button type="button" className="msg__reply" onClick={() => store.setReplyTo(msg)}>
            <Icon name="reply" size={14} />
            回覆
          </button>
          <span className="msg__sep" aria-hidden="true" />
          {EMOJIS.map((e) => (
            <button key={e} type="button" className="msg__emoji" aria-label={EMOJI_LABELS[e]} onClick={() => store.toggleReaction(msg.id, e)}>
              {e}
            </button>
          ))}
        </div>
      )}
    </article>
  );
});

/** 點別人的名字：出現「隱藏這個人」 */
function NameButton({ msg, open, setOpen }: { msg: ChatMessage; open: boolean; setOpen: (v: boolean) => void }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open, setOpen]);

  return (
    <span className="name-menu-wrap" ref={ref}>
      <button
        type="button"
        className="msg__who msg__who--btn"
        style={{ color: msg.color }}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {msg.nickname}
      </button>
      {open && (
        <div className="menu" role="menu">
          <div className="menu__head">
            <span className="avatar avatar--xs" style={{ background: msg.color }} aria-hidden="true">
              {initialOf(msg.nickname)}
            </span>
            <b style={{ color: msg.color }}>{msg.nickname}</b>
          </div>
          <button
            type="button"
            role="menuitem"
            className="menu__item menu__item--danger"
            autoFocus
            onClick={() => {
              setOpen(false);
              store.hide(msg.clientId);
            }}
          >
            <Icon name="ban" size={14} />
            隱藏這個人
          </button>
        </div>
      )}
    </span>
  );
}
