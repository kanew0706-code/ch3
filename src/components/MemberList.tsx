// 線上名單（電腦版右欄；手機版展開面板）
import type { Member } from '../chat/types';
import { initialOf } from '../lib/format';
import { store } from '../state/store';

interface Props {
  members: Member[];
  myId: string;
  hidden: string[];
  showTitle?: boolean;
  id?: string;
}

export function MemberList({ members, myId, hidden, showTitle = true, id }: Props) {
  return (
    <div className="members" id={id}>
      {showTitle && <h2 className="caption">線上 — {members.length} 人</h2>}
      <ul className="members__list" aria-label="線上名單">
        {members.map((m) => {
          const isMe = m.clientId === myId;
          const isHidden = hidden.includes(m.clientId);
          return (
            <li key={m.clientId} className={isHidden ? 'member member--hidden' : 'member'}>
              <span className="avatar avatar--sm avatar--online" style={isHidden ? undefined : { background: m.color }} aria-hidden="true">
                {initialOf(m.nickname)}
              </span>
              <span className="member__name" style={isHidden ? undefined : { color: m.color }}>
                {m.nickname}
              </span>
              {isMe && <span className="member__you">（你）</span>}
              {isHidden && (
                <button type="button" className="chip-btn" onClick={() => store.unhide(m.clientId)}>
                  取消隱藏
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
