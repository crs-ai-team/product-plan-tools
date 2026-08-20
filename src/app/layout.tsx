import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '隨機工時分配表',
  description: '為多個專案產生符合每日工時上下限的隨機工時分配表，可複製貼進試算表或下載 CSV / Excel。',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f7f9' },
    { media: '(prefers-color-scheme: dark)', color: '#0d0f12' },
  ],
}

/**
 * 在 React 接手前先套上主題，避免重新整理時閃一下白底。
 */
const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem('product-plan-tools:theme');
    var dark = stored ? stored === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
