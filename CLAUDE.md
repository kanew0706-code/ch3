# CLAUDE.md

不用登入的匿名即時聊天室：前端放在 GitHub Pages，訊息透過 Supabase Realtime（Broadcast + Presence）即時傳遞，不保存任何聊天紀錄。

## 開始任何工作前
- 先讀 `docs/architecture.md`。功能規格、通訊約定、畫面清單、驗證清單都以這份文件為準。
- 需求的原始說明在 `docs/requirements.md`。

## 目前進度：階段一
- 只做前端，用 `LocalChatService`（BroadcastChannel）讓同一個瀏覽器的分頁互聊。
- **還不要接 Supabase**，也不要安裝 Supabase 相關套件。
- 畫面元件只能透過 `ChatService` 介面通訊，不可直接呼叫 BroadcastChannel 或 Supabase（見架構文件 4.3 節）。

## 金鑰規則
- **絕對不可以把金鑰檔案 commit 進 git**：`.env`、`.env.local`、任何 `.env.*`（`.env.example` 除外，且裡面只能放空值）。
- Supabase 的 secret key（`sb_secret_…` / `service_role`）完全不使用，不得出現在 repo 任何地方。
- commit 前確認 `git status` 裡沒有 `.env` 開頭的檔案。
