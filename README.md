# 匿名聊天室

不用登入的匿名即時聊天室。規格見 `docs/architecture.md`，畫面設計見 `docs/design.md`。

目前是**階段二**：透過 Supabase Realtime 即時傳訊。
沒有設定 Supabase 時（沒有 `.env.local`），會自動改用**展示模式**：訊息只能在同一個瀏覽器的分頁之間傳遞。

## 新增功能

`docs/requirements.md` 的基本需求（輸入代號、即時聊天、線上名單、進出提示）之外，另外做了這些：

| 功能 | 怎麼使用 |
|---|---|
| 私人房間 | 左欄「＋ 開新房間」，建立後複製連結給別人。只有拿到連結的人進得來，一個人可以同時在好幾個房間，左欄顯示各房間的未讀數 |
| 表情回應（👍 ❤️ 😂 😮 😢） | 電腦：按訊息右側的「⋯」（或把滑鼠移到訊息上），出現表情按鈕。手機：長按訊息。訊息下方顯示「👍 3」，滑鼠移上去或長按可以看到是誰按的 |
| 回覆／引用訊息 | 電腦：按訊息右側的「⋯」（或把滑鼠移到訊息上），按「回覆」。手機：長按訊息，選「回覆」。送出的訊息上方會附上原訊息的前 50 字，點了會捲到原訊息並標亮 |
| 隱藏某人 | 點別人的名字，選「隱藏這個人」。只有自己看不到他的訊息、表情和進出通知；在線上名單按「取消隱藏」恢復 |
| 網址自動變成連結 | 訊息裡 `http://`、`https://` 開頭的網址可以點，在新分頁打開（其他開頭的不會變成連結） |
| 分頁標題未讀數＋提示音＋靜音 | 分頁在背景時收到訊息，標題變成「(3) 匿名聊天室」並播放提示音。頂端的鈴鐺可以靜音，設定會記住 |
| 斷線 30 秒緩衝 | 手機鎖螢幕、切換 App、重新整理，30 秒內回來別人不會看到進出通知，也不用重新輸入代號 |

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
