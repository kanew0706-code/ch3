# 匿名聊天室

不用登入的匿名即時聊天室。規格見 `docs/architecture.md`，畫面設計見 `docs/design.md`。

目前是**階段二**：透過 Supabase Realtime 即時傳訊。
沒有設定 Supabase 時（沒有 `.env.local`），會自動改用**展示模式**：訊息只能在同一個瀏覽器的分頁之間傳遞。

## Supabase 設定

複製 `.env.example` 成 `.env.local`，填入 Project URL 和 publishable key（見架構文件第 8 節）。
上線版本讀的是 repo 的 **Settings → Secrets and variables → Actions → Variables**。

## 在自己電腦上執行

需要 Node.js 20 以上。

```bash
npm install        # 第一次才需要
npm run dev        # 開發模式，改程式會自動更新：http://localhost:5173/ch3/
npm run build      # 打包到 dist/
npm run preview    # 預覽打包結果：http://localhost:4173/ch3/
```

## 部署

推到 `main` 分支後，GitHub Actions 會自動部署到 GitHub Pages（見 `.github/workflows/deploy.yml`）。
第一次要到 repo 的 **Settings → Pages**，把 **Source** 設成 **GitHub Actions**。

repo 名稱如果不是 `ch3`，要一起修改 `vite.config.ts` 裡的 `base`。
