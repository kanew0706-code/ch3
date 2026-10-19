// 7.3 建立房間視窗
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { LIMITS } from '../chat/types';
import { canShare, copyText } from '../lib/clipboard';
import { roomDisplayName, shareUrl, type RoomRef } from '../lib/roomUrl';
import { cleanNickname, textLength, truncate } from '../lib/textLength';
import { store } from '../state/store';
import { Icon } from './Icon';

export function CreateRoomDialog({ onClose, touch }: { onClose: () => void; touch: boolean }) {
  const [name, setName] = useState('');
  const [room, setRoom] = useState<RoomRef | null>(null);
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  useEffect(() => {
    dialogRef.current?.querySelector<HTMLElement>('input, [data-autofocus]')?.focus();
  }, [room]);

  const create = (e: FormEvent) => {
    e.preventDefault();
    setRoom(store.createRoom(name));
  };

  const useShare = touch && canShare();
  const url = room ? shareUrl(room) : '';

  const copy = async () => {
    if (!room) return;
    if (useShare) {
      try {
        await navigator.share({ title: roomDisplayName(room), url });
      } catch {
        /* 使用者取消分享 */
      }
      return;
    }
    if (await copyText(url)) setCopied(true);
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-room-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog__head">
          <h2 id="create-room-title">{room ? '房間建立好了' : '開新房間'}</h2>
          <button type="button" className="icon-btn" aria-label="關閉" onClick={onClose}>
            <Icon name="x" size={14} />
          </button>
        </div>

        {!room ? (
          <form onSubmit={create}>
            <p className="dialog__desc">只有拿到連結的人進得來。房間不會出現在任何公開列表。</p>
            <div className="field-label">
              <label htmlFor="room-name">房間名稱（可不填）</label>
              <span className="counter">
                {textLength(name)} / {LIMITS.roomName}
              </span>
            </div>
            <input
              id="room-name"
              className="input input--md"
              value={name}
              placeholder="例如：週五讀書會"
              autoComplete="off"
              onChange={(e) => {
                const v = cleanNickname(e.target.value);
                setName((e.nativeEvent as InputEvent).isComposing ? v : truncate(v, LIMITS.roomName));
              }}
              onCompositionEnd={(e) => setName(truncate(cleanNickname(e.currentTarget.value), LIMITS.roomName))}
            />
            <p className="dialog__note">沒填的話會自動命名，例如「房間 k3f9」</p>
            <div className="dialog__actions">
              <button type="button" className="btn btn--ghost" onClick={onClose}>
                取消
              </button>
              <button type="submit" className="btn btn--primary">
                建立
              </button>
            </div>
          </form>
        ) : (
          <>
            <p className="dialog__desc">把連結傳給想邀請的人。你已經在這個房間裡了。</p>
            <div className="link-box">
              <code>{url}</code>
              <button type="button" className="btn btn--primary btn--sm" onClick={copy} data-autofocus>
                <Icon name={copied ? 'check' : useShare ? 'share' : 'link'} size={14} />
                {copied ? '已複製' : useShare ? '分享' : '複製連結'}
              </button>
            </div>
            <div className="dialog__actions">
              <button type="button" className="btn" onClick={onClose}>
                完成
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
