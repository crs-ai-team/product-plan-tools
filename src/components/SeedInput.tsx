'use client'

import { useState } from 'react'
import { seedFromString, seedToString } from '@/lib/rng'

/**
 * 種子輸入框。
 *
 * 使用者輸入到一半的字串（例如剛清空）不能直接倒推成數字，
 * 所以編輯期間保留自己的草稿，只有解析成功時才往上通知。
 */
export function SeedInput({ seed, onSeedChange }: { seed: number; onSeedChange: (seed: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null)

  return (
    <div className="flex items-center justify-between gap-2">
      <label htmlFor="seed" className="text-strong" title="相同種子加相同參數，必定產生同一張表">
        亂數種子
      </label>
      <input
        id="seed"
        className="input w-[7.5rem] tracking-wider"
        value={draft ?? seedToString(seed)}
        spellCheck={false}
        maxLength={8}
        onChange={(event) => {
          const next = event.target.value.replace(/[^0-9a-fA-F]/g, '').toUpperCase()
          setDraft(next)
          const parsed = seedFromString(next)
          if (parsed !== null) onSeedChange(parsed)
        }}
        onBlur={() => setDraft(null)}
        aria-label="亂數種子"
      />
    </div>
  )
}
