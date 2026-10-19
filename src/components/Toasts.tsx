// 浮動進出通知（docs/design.md 第 4.2 節「浮動通知」）
import type { Toast } from '../state/rooms';
import { store } from '../state/store';
import { Icon } from './Icon';

function who(t: Toast) {
  if (t.people.length >= 3) return <b>{t.people.length} 人</b>;
  return t.people.map((p, i) => (
    <span key={i}>
      {i > 0 && '、'}
      <b style={{ color: p.color }}>{p.nickname}</b>
    </span>
  ));
}

export function Toasts({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.kind}`}>
          <span className="toast__dot" aria-hidden="true" />
          <span className="toast__text">
            {who(t)}
            {t.people.length >= 3 ? '' : ' '}
            {t.kind === 'join' ? '進入了' : '離開了'} <span className="toast__room">{t.roomName}</span>
          </span>
          <button type="button" className="icon-btn icon-btn--sm" aria-label="關閉通知" onClick={() => store.dismissToast(t.id)}>
            <Icon name="x" size={11} />
          </button>
        </div>
      ))}
    </div>
  );
}
