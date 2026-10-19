// 決定用哪一版通訊員（docs/architecture.md 第 4.3 節）。
// 有設定 Supabase 就用 Supabase 版，沒有就用展示模式。
import type { ChatService } from './chat/ChatService';
import { LocalChatService } from './chat/LocalChatService';
import { SupabaseChatService } from './chat/SupabaseChatService';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export function createChatService(): ChatService {
  if (supabaseUrl && supabaseKey) return new SupabaseChatService(supabaseUrl, supabaseKey);
  return new LocalChatService();
}
