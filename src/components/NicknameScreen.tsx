// 7.1 輸入代號畫面
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { LIMITS } from '../chat/types';
import { roomDisplayName, type RoomRef } from '../lib/roomUrl';
import { cleanNickname, textLength, truncate } from '../lib/textLength';
import { loadNickname, nicknameError } from '../state/identity';
import { store } from '../state/store';
import { DemoBanner } from './Banners';
import { Icon } from './Icon';

export function NicknameScreen({ pendingRoom, demo }: { pendingRoom: RoomRef | null; demo: boolean }) {
  const [nickname, setNickname] = useState(() => truncate(cleanNickname(loadNickname()), LIMITS.nickname));
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const error = nicknameError(nickname);
  // 還沒輸入過時不要一打開就顯示「請輸入代號」
  const showError = error !== null && (touched || nickname.length > 0);
  const count = textLength(nickname);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!error) store.enter(nickname);
  };

  return (
    <div className="entry">
      {demo && <DemoBanner />}
      <div className="entry__body">
        <form className="entry-card" onSubmit={submit} noValidate>
          <div className="logo logo--lg">
            <Icon name="chat" size={24} />
          </div>
          <h1 className="entry-card__title">匿名聊天室</h1>
          <p className="entry-card__desc">不用註冊，取個代號就能聊。訊息不會被保存，只看得到你進來之後的對話。</p>

          {pendingRoom && (
            <div className="entry-card__dest">
              <Icon name="lock" size={15} />
              <span>
                你將進入：<b>{roomDisplayName(pendingRoom)}</b>
              </span>
            </div>
          )}

          <div className="field-label">
            <label htmlFor="nickname">你的代號</label>
            <span className={count >= LIMITS.nickname ? 'counter counter--warn' : 'counter'}>
              {count} / {LIMITS.nickname}
            </span>
          </div>
          <input
            ref={inputRef}
            id="nickname"
            className={showError ? 'input input--error' : 'input'}
            value={nickname}
            autoComplete="off"
            enterKeyHint="go"
            aria-invalid={showError}
            aria-describedby={showError ? 'nickname-error' : undefined}
            onChange={(e) => {
              // 中文輸入法選字中不要截斷，選完字再截
              const v = cleanNickname(e.target.value);
              setNickname((e.nativeEvent as InputEvent).isComposing ? v : truncate(v, LIMITS.nickname));
            }}
            onCompositionEnd={(e) => setNickname(truncate(cleanNickname(e.currentTarget.value), LIMITS.nickname))}
          />
          {showError && (
            <p id="nickname-error" className="field-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn--primary btn--block" disabled={error !== null}>
            進入聊天室
          </button>

          <p className="entry-card__privacy">
            <Icon name="shield" size={14} />
            請勿傳送個人資料或機密，拿到連結的人都能進入房間。
          </p>
        </form>
      </div>
    </div>
  );
}
