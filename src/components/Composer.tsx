// 輸入區（docs/design.md 第 4.2 節「輸入區」）
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { LIMITS, type ChatMessage } from '../chat/types';
import { textLength } from '../lib/textLength';
import type { SendResult } from '../state/rooms';
import { store } from '../state/store';
import { Icon } from './Icon';

const COUNTER_FROM = 250;
const MAX_LINES_PX = 6 * 22 + 12;
const HINT_MS = 2_000;

interface Props {
  roomId: string;
  replyTo: ChatMessage | null;
  online: boolean;
  touch: boolean;
}

export function Composer({ roomId, replyTo, online, touch }: Props) {
  const [text, setText] = useState('');
  const [hint, setHint] = useState<SendResult | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  const count = textLength(text);
  const tooLong = count > LIMITS.message;
  const canSend = online && text.trim() !== '' && !tooLong;

  // 換房間時清空草稿
  useEffect(() => {
    setText('');
    setHint(null);
  }, [roomId]);

  useEffect(() => {
    if (replyTo) ref.current?.focus();
  }, [replyTo]);

  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => setHint(null), HINT_MS);
    return () => clearTimeout(t);
  }, [hint]);

  // 自動長高，最多 6 行
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_LINES_PX)}px`;
  }, [text]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const result = store.send(text);
    if (result === 'ok') setText('');
    else if (result !== 'empty') setHint(result);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // 手機：Enter 換行；電腦：Enter 送出、Shift+Enter 換行；輸入法選字中的 Enter 不算
    if (e.key === 'Enter' && !e.shiftKey && !touch && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
    if (e.key === 'Escape' && replyTo) store.setReplyTo(null);
  };

  const counterCls = tooLong ? 'counter counter--over' : 'counter counter--warn';

  return (
    <form className="composer" onSubmit={submit}>
      {replyTo && (
        <div className="replying">
          <Icon name="reply" size={14} />
          <span className="replying__text">
            回覆 <b style={{ color: replyTo.color }}>{replyTo.nickname}</b>：{replyTo.text.replace(/\s+/g, ' ')}
          </span>
          <button type="button" className="icon-btn icon-btn--sm" aria-label="取消回覆" onClick={() => store.setReplyTo(null)}>
            <Icon name="x" size={12} />
          </button>
        </div>
      )}
      <div className={['composer__box', replyTo ? 'composer__box--reply' : '', tooLong ? 'composer__box--over' : ''].join(' ')}>
        <label htmlFor="composer-input" className="sr-only">
          訊息內容
        </label>
        <textarea
          id="composer-input"
          ref={ref}
          rows={1}
          value={text}
          placeholder={online ? '輸入訊息…' : '連線中斷，暫時不能送出'}
          enterKeyHint={touch ? 'enter' : 'send'}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
        />
        {count >= COUNTER_FROM && (
          <span className={counterCls} aria-live="polite">
            {count} / {LIMITS.message}
          </span>
        )}
        <button type="submit" className="send-btn" aria-label="送出" disabled={!canSend}>
          <Icon name="send" size={touch ? 18 : 17} />
        </button>
      </div>
      {hint === 'too-fast' ? (
        <p className="composer__hint composer__hint--warn" role="status">
          <Icon name="clock" size={13} />
          送太快了，請稍等
        </p>
      ) : hint === 'offline' ? (
        <p className="composer__hint composer__hint--warn" role="status">
          連線中斷，暫時不能送出
        </p>
      ) : (
        !touch && <p className="composer__hint">Enter 送出 · Shift+Enter 換行</p>
      )}
    </form>
  );
}
