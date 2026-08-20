'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'product-plan-tools:theme'

export function ThemeToggle() {
  const [dark, setDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // layout 裡的 inline script 已經決定好主題，這裡只是把狀態同步回 React。
    setDark(document.documentElement.classList.contains('dark'))
    setMounted(true)
  }, [])

  const toggle = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light')
    } catch {
      // storage 被停用時忽略，主題仍會在本次瀏覽中生效。
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="btn btn-ghost h-9 w-9 !px-0"
      aria-label={dark ? '切換為淺色主題' : '切換為深色主題'}
      title={dark ? '切換為淺色主題' : '切換為深色主題'}
    >
      {/* 未掛載前不渲染圖示，避免伺服器與瀏覽器輸出不一致。 */}
      {mounted && (dark ? <SunIcon /> : <MoonIcon />)}
    </button>
  )
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  )
}
