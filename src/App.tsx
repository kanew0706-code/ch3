// 沒有代號 → 輸入代號畫面；有代號 → 聊天畫面
import { ChatLayout } from './components/ChatLayout';
import { NicknameScreen } from './components/NicknameScreen';
import { useChatState } from './state/store';

export function App() {
  const state = useChatState();
  if (state.screen === 'entry' || !state.me) {
    return <NicknameScreen pendingRoom={state.pendingRoom} demo={state.mode === 'local'} />;
  }
  return <ChatLayout state={state} />;
}
