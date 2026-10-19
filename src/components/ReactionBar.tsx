// 訊息下方的表情列：「👍 3」，自己按過的會標亮；滑鼠移上去（或聚焦）顯示是誰按的
import { EMOJIS, type Emoji } from '../chat/types';
import type { ReactionMap } from '../state/rooms';
import { store } from '../state/store';

export interface ReactionSummary {
  emoji: Emoji;
  names: string[];
  mine: boolean;
}

export function summarize(
  reactions: ReactionMap[string] | undefined,
  myId: string,
  hidden: string[],
): ReactionSummary[] {
  if (!reactions) return [];
  const out: ReactionSummary[] = [];
  for (const emoji of EMOJIS) {
    const users = reactions[emoji];
    if (!users) continue;
    const ids = Object.keys(users).filter((id) => !hidden.includes(id));
    if (ids.length === 0) continue;
    // 自己排第一個
    ids.sort((a, b) => (a === myId ? -1 : b === myId ? 1 : 0));
    out.push({
      emoji,
      names: ids.map((id) => (id === myId ? `${users[id]}（你）` : users[id])),
      mine: ids.includes(myId),
    });
  }
  return out;
}

export function whoReacted(s: ReactionSummary): string {
  return `${s.names.join('、')} 按了 ${s.emoji}`;
}

// 斷線中用 aria-disabled 而不是 disabled，滑鼠移上去仍看得到是誰按的
export function ReactionBar({ messageId, summary, online }: { messageId: string; summary: ReactionSummary[]; online: boolean }) {
  if (summary.length === 0) return null;
  return (
    <div className="reactions">
      {summary.map((s) => (
        <button
          key={s.emoji}
          type="button"
          className={s.mine ? 'react react--mine' : 'react'}
          aria-pressed={s.mine}
          aria-disabled={!online}
          aria-label={`${whoReacted(s)}，共 ${s.names.length} 人`}
          onClick={() => store.toggleReaction(messageId, s.emoji)}
        >
          <span aria-hidden="true">{s.emoji}</span>
          <b>{s.names.length}</b>
          <span className="tooltip" role="tooltip">
            {whoReacted(s)}
          </span>
        </button>
      ))}
    </div>
  );
}
