import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 的網址是 https://<帳號>.github.io/<repo 名稱>/，
// 所以打包後的檔案路徑要加上 repo 名稱（見 docs/architecture.md 第 12 節）。
export default defineConfig({
  base: '/ch3/',
  plugins: [react()],
});
