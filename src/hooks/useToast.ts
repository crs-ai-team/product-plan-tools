'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/** 短暫顯示一行提示訊息，重複呼叫會重新計時。 */
export function useToast(durationMs = 2400) {
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const notify = useCallback(
    (text: string) => {
      setMessage(text)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setMessage(null), durationMs)
    },
    [durationMs],
  )

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  return { message, notify }
}
