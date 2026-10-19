// 30 秒緩衝規則（docs/architecture.md 第 6.3、6.4 節），兩種 ChatService 共用。
//
// - 有人從在線名單消失 → 先進入「疑似離開」，仍留在名單上
// - 30 秒內回來 → 什麼都不發生
// - 超過 30 秒 → 發出「離開了」
// - 收到 bye 且 Supabase 也確認斷線 → 立刻發出「離開了」（只有 bye 不算，避免被冒用）
import { LIMITS, type Member } from './types';

const BYE_VALID_MS = 10_000;
/** 剛加入時陸續收到的「本來就在房內的人」不算新進來 */
const QUIET_AFTER_JOIN_MS = 1_500;

export interface PresenceEvents {
  onChange(members: Member[]): void;
  onJoin(m: Member): void;
  onLeave(m: Member): void;
}

export class PresenceGrace {
  private visible = new Map<string, Member>();
  private pending = new Map<string, ReturnType<typeof setTimeout>>();
  private byeAt = new Map<string, number>();
  private quietUntil = Date.now() + QUIET_AFTER_JOIN_MS;

  constructor(
    private self: Member,
    private events: PresenceEvents,
    private graceMs: number = LIMITS.graceMs,
  ) {
    this.visible.set(self.clientId, self);
  }

  /** 收到「目前所有在線的人」 */
  sync(present: Member[]): void {
    const now = Date.now();
    const current = new Map<string, Member>();
    for (const m of present) {
      const prev = current.get(m.clientId);
      if (!prev || m.joinedAt < prev.joinedAt) current.set(m.clientId, m);
    }

    for (const [id, m] of current) {
      if (id === this.self.clientId) continue;
      const timer = this.pending.get(id);
      if (timer !== undefined) {
        // 30 秒內回來：取消離開，不發任何通知
        clearTimeout(timer);
        this.pending.delete(id);
        this.visible.set(id, m);
      } else if (!this.visible.has(id)) {
        this.visible.set(id, m);
        if (now >= this.quietUntil) this.events.onJoin(m);
      } else {
        this.visible.set(id, m);
      }
    }

    for (const id of [...this.visible.keys()]) {
      if (id === this.self.clientId || current.has(id) || this.pending.has(id)) continue;
      const bye = this.byeAt.get(id);
      if (bye !== undefined && now - bye < BYE_VALID_MS) {
        this.finalize(id, false);
      } else {
        this.pending.set(id, setTimeout(() => this.finalize(id), this.graceMs));
      }
    }

    this.emit();
  }

  /** 收到 bye：如果這個人已經斷線，立刻離開；否則等斷線通知 */
  bye(clientId: string): void {
    if (clientId === this.self.clientId) return;
    this.byeAt.set(clientId, Date.now());
    if (this.pending.has(clientId)) this.finalize(clientId);
  }

  dispose(): void {
    for (const t of this.pending.values()) clearTimeout(t);
    this.pending.clear();
  }

  private finalize(id: string, emitChange = true): void {
    const timer = this.pending.get(id);
    if (timer !== undefined) clearTimeout(timer);
    this.pending.delete(id);
    this.byeAt.delete(id);
    const m = this.visible.get(id);
    if (!m) return;
    this.visible.delete(id);
    this.events.onLeave(m);
    if (emitChange) this.emit();
  }

  private emit(): void {
    const others = [...this.visible.values()]
      .filter((m) => m.clientId !== this.self.clientId)
      .sort((a, b) => a.joinedAt - b.joinedAt);
    this.events.onChange([this.self, ...others]);
  }
}
