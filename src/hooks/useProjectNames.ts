'use client'

import { useCallback, useEffect, useState } from 'react'

const NAMES_KEY = 'product-plan-tools:names'

/**
 * 專案名稱，兩種模式共用同一份，改一次兩邊都會跟著變。
 */
export function useProjectNames() {
  const [names, setNames] = useState<string[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(NAMES_KEY)
      if (stored) setNames(JSON.parse(stored) as string[])
    } catch {
      // 名稱只是輔助資訊，解析失敗就退回預設命名。
    }
  }, [])

  const rename = useCallback((index: number, value: string) => {
    setNames((current) => {
      const next = [...current]
      while (next.length <= index) next.push('')
      next[index] = value.trim()
      try {
        localStorage.setItem(NAMES_KEY, JSON.stringify(next))
      } catch {
        // storage 不可用時只影響下次載入。
      }
      return next
    })
  }, [])

  const reset = useCallback(() => {
    setNames([])
    try {
      localStorage.removeItem(NAMES_KEY)
    } catch {
      // 同上。
    }
  }, [])

  /** 補齊到指定長度，沒有自訂名稱的位置用 `Project N`。 */
  const resolve = useCallback(
    (count: number) => Array.from({ length: count }, (_, index) => names[index] || `Project ${index + 1}`),
    [names],
  )

  return { resolve, rename, reset }
}
