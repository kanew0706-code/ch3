// 房間列表（電腦版左欄；手機版抽屜內容）
import { LOBBY_ID, roomDisplayName } from '../lib/roomUrl';
import { initialOf } from '../lib/format';
import type { ChatState } from '../state/rooms';
import { store } from '../state/store';
import { Icon } from './Icon';

interface Props {
  state: ChatState;
  onPick?: () => void;
  onCreate: () => void;
  onClose?: () => void;
}

export function RoomList({ state, onPick, onCreate, onClose }: Props) {
  const me = state.me!;
  return (
    <nav className="rooms" aria-label="房間列表">
      <div className="rooms__brand">
        <span className="logo">
          <Icon name="chat" size={15} />
        </span>
        <span className="rooms__brand-name">匿名聊天室</span>
        {onClose && (
          <button type="button" className="icon-btn icon-btn--touch" aria-label="關閉房間列表" onClick={onClose}>
            <Icon name="x" size={16} />
          </button>
        )}
      </div>

      <h2 className="caption">房間</h2>
      <ul className="rooms__list">
        {state.order.map((id) => {
          const room = state.rooms[id];
          const active = id === state.active;
          const name = roomDisplayName(room);
          const cls = ['room'];
          if (active) cls.push('room--active');
          if (room.unread > 0) cls.push('room--unread');
          return (
            <li key={id} className={cls.join(' ')}>
              <button
                type="button"
                className="room__btn"
                aria-current={active ? 'page' : undefined}
                onClick={() => {
                  store.setActive(id);
                  onPick?.();
                }}
              >
                <Icon name={id === LOBBY_ID ? 'hash' : 'lock'} size={15} />
                <span className="room__name">{name}</span>
                {room.unread > 0 && (
                  <span className="badge" aria-label={`${room.unread} 則未讀`}>
                    {room.unread > 99 ? '99+' : room.unread}
                  </span>
                )}
              </button>
              {id !== LOBBY_ID && (
                <button type="button" className="room__close" aria-label={`離開${name}`} onClick={() => store.leaveRoom(id)}>
                  <Icon name="x" size={12} />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <button type="button" className="new-room" onClick={onCreate}>
        <Icon name="plus" size={15} />
        開新房間
      </button>

      <div className="me-card">
        <span className="avatar avatar--sm" style={{ background: me.color }} aria-hidden="true">
          {initialOf(me.nickname)}
        </span>
        <div className="me-card__text">
          <b>{me.nickname}</b>
          <span>這是你</span>
        </div>
      </div>
    </nav>
  );
}
