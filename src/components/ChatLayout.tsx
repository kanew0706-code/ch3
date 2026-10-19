// 7.2 聊天主畫面：電腦版三欄、手機版單欄＋抽屜／面板
import { useCallback, useEffect, useState } from 'react';
import { copyText } from '../lib/clipboard';
import { LOBBY_ID, roomDisplayName, shareUrl } from '../lib/roomUrl';
import { useIsMobile, useIsTouch } from '../lib/useMediaQuery';
import type { ChatState } from '../state/rooms';
import { store } from '../state/store';
import { ConnectionBanner, DemoBanner } from './Banners';
import { Composer } from './Composer';
import { CreateRoomDialog } from './CreateRoomDialog';
import { Icon } from './Icon';
import { MemberList } from './MemberList';
import { MessageList } from './MessageList';
import { RoomList } from './RoomList';
import { Toasts } from './Toasts';

const COPIED_MS = 2_000;

export function ChatLayout({ state }: { state: ChatState }) {
  const isMobile = useIsMobile();
  const touch = useIsTouch();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const me = state.me!;
  const room = state.rooms[state.active];
  const isLobby = state.active === LOBBY_ID;
  const otherUnread = state.order.some((id) => id !== state.active && state.rooms[id].unread > 0);

  // 換房間或改成電腦版時，收起手機的抽屜／面板
  useEffect(() => {
    setMembersOpen(false);
    setCopied(false);
  }, [state.active]);
  useEffect(() => {
    if (!isMobile) {
      setDrawerOpen(false);
      setMembersOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(t);
  }, [copied]);

  useEffect(() => {
    if (!drawerOpen && !membersOpen) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false);
        setMembersOpen(false);
      }
    };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [drawerOpen, membersOpen]);

  const openCreate = useCallback(() => {
    setDrawerOpen(false);
    setCreating(true);
  }, []);
  const closeCreate = useCallback(() => setCreating(false), []);

  if (!room) return null;

  const copyLink = async () => {
    if (await copyText(shareUrl(room))) setCopied(true);
  };

  return (
    <div className="chat-app">
      {!isMobile && <RoomList state={state} onCreate={openCreate} />}

      <main className="chat">
        {state.mode === 'local' && <DemoBanner />}

        <header className="topbar">
          {isMobile && (
            <button
              type="button"
              className="icon-btn icon-btn--touch topbar__menu"
              aria-label={otherUnread ? '房間列表（有未讀）' : '房間列表'}
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}
            >
              <Icon name="menu" size={20} />
              {otherUnread && <span className="dot" aria-hidden="true" />}
            </button>
          )}
          <div className="topbar__title">
            {!isMobile && <Icon name={isLobby ? 'hash' : 'lock'} size={16} />}
            <h1>{roomDisplayName(room)}</h1>
            {!isMobile && !isLobby && <span className="topbar__sub">私人房間</span>}
          </div>
          {!isLobby &&
            (isMobile ? (
              <button type="button" className="icon-btn icon-btn--touch" aria-label={copied ? '已複製' : '複製連結'} onClick={copyLink}>
                <Icon name={copied ? 'check' : 'link'} size={18} />
              </button>
            ) : (
              <button type="button" className="outline-btn" onClick={copyLink}>
                <Icon name={copied ? 'check' : 'link'} size={14} />
                {copied ? '已複製' : '複製連結'}
              </button>
            ))}
          <button
            type="button"
            className={isMobile ? 'icon-btn icon-btn--touch' : 'icon-btn'}
            aria-label={state.muted ? '取消靜音' : '靜音'}
            aria-pressed={state.muted}
            onClick={() => store.toggleMute()}
          >
            <Icon name={state.muted ? 'bellOff' : 'bell'} size={isMobile ? 18 : 17} />
          </button>
          <button type="button" className="leave-btn" onClick={() => store.leaveAll()}>
            離開
          </button>
        </header>

        {isMobile && (
          <div className="online-bar">
            <button
              type="button"
              className={membersOpen ? 'online-pill online-pill--open' : 'online-pill'}
              aria-expanded={membersOpen}
              aria-controls="mobile-members"
              onClick={() => setMembersOpen((v) => !v)}
            >
              <span className="online-pill__dot" aria-hidden="true" />
              <Icon name="users" size={14} />
              {room.members.length} 人在線
              {membersOpen && <Icon name="chevronUp" size={12} />}
            </button>
          </div>
        )}

        {room.status === 'reconnecting' && <ConnectionBanner />}

        <div className="chat__main">
          <MessageList room={room} myId={me.clientId} hidden={state.hidden} touch={touch} />
          <Toasts toasts={state.toasts} />
          {isMobile && membersOpen && (
            <div className="panel-layer" onClick={() => setMembersOpen(false)}>
              <div className="panel" onClick={(e) => e.stopPropagation()}>
                <MemberList id="mobile-members" members={room.members} myId={me.clientId} hidden={state.hidden} showTitle={false} />
              </div>
            </div>
          )}
        </div>

        <Composer roomId={room.id} replyTo={room.replyTo} online={room.status === 'connected'} touch={touch} />
      </main>

      {!isMobile && (
        <aside className="side-members" aria-label="線上名單">
          <MemberList members={room.members} myId={me.clientId} hidden={state.hidden} />
        </aside>
      )}

      {isMobile && drawerOpen && (
        <div className="drawer-layer" onClick={() => setDrawerOpen(false)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <RoomList state={state} onPick={() => setDrawerOpen(false)} onCreate={openCreate} onClose={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      {creating && <CreateRoomDialog onClose={closeCreate} touch={touch} />}
    </div>
  );
}
