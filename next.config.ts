import path from 'node:path'
import type { NextConfig } from 'next'

const repo = 'product-plan-tools'
const isProd = process.env.NODE_ENV === 'production'

const nextConfig: NextConfig = {
  // 產生純靜態檔案到 out/，GitHub Pages 不需要 Node 伺服器。
  output: 'export',
  // GitHub Pages 把專案站台放在 /<repo>/ 底下，資源路徑必須跟著加上前綴。
  basePath: isProd ? `/${repo}` : '',
  assetPrefix: isProd ? `/${repo}/` : '',
  trailingSlash: true,
  // 靜態託管沒有圖片最佳化伺服器。
  images: { unoptimized: true },
  // 明確指定專案根目錄，避免 Turbopack 因為上層資料夾也有 lockfile 而猜錯。
  turbopack: { root: path.dirname(new URL(import.meta.url).pathname) },
}

export default nextConfig
