'use client'

import { LIMITS, type GeneratorOptions, type ValidationError } from '@/lib/generator'
import { useState } from 'react'
import { seedFromString, seedToString } from '@/lib/rng'
import { NumberField } from './NumberField'

interface ControlPanelProps {
  options: GeneratorOptions
  errors: ValidationError[]
  onChange: (patch: Partial<GeneratorOptions>) => void
  onSeedChange: (seed: number) => void
  onGenerate: () => void
  onReset: () => void
}

export function ControlPanel({ options, errors, onChange, onSeedChange, onGenerate, onReset }: ControlPanelProps) {
  const capacity = options.numProjects * options.maxPerProject
  const blocked = errors.length > 0

  return (
    <div className="card p-5 space-y-6">
      <div className="space-y-1">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted">參數設定</h2>
        <p className="text-xs text-muted">調整後按下產生，或直接拖動滑桿再產生一次。</p>
      </div>

      <div className="space-y-5">
        <NumberField
          label="專案數量"
          hint={`表格列數 · ${LIMITS.numProjects.min}–${LIMITS.numProjects.max}`}
          value={options.numProjects}
          min={LIMITS.numProjects.min}
          max={LIMITS.numProjects.max}
          onChange={(value) => onChange({ numProjects: value })}
        />

        <NumberField
          label="天數"
          hint={`表格欄數 · ${LIMITS.numDays.min}–${LIMITS.numDays.max}`}
          value={options.numDays}
          min={LIMITS.numDays.min}
          max={LIMITS.numDays.max}
          onChange={(value) => onChange({ numDays: value })}
        />
      </div>

      <div className="space-y-5 border-t border-subtle pt-5">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted">每日工時</h3>
          <span className="text-[11px] text-muted">上限容量 {capacity} 小時</span>
        </div>

        <NumberField
          label="最小工時"
          hint="每天所有專案加總的下限"
          value={options.minHours}
          min={LIMITS.hours.min}
          max={LIMITS.hours.max}
          onChange={(value) => onChange({ minHours: value, maxHours: Math.max(value, options.maxHours) })}
        />

        <NumberField
          label="最大工時"
          hint="每天所有專案加總的上限"
          value={options.maxHours}
          min={LIMITS.hours.min}
          max={LIMITS.hours.max}
          onChange={(value) => onChange({ maxHours: value, minHours: Math.min(value, options.minHours) })}
        />

        <NumberField
          label="單案每日上限"
          hint="單一專案一天最多幾小時"
          value={options.maxPerProject}
          min={LIMITS.maxPerProject.min}
          max={LIMITS.maxPerProject.max}
          onChange={(value) => onChange({ maxPerProject: value })}
        />
      </div>

      <div className="space-y-2 border-t border-subtle pt-5">
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor="seed" className="text-sm font-semibold text-strong">
            亂數種子
          </label>
          <span className="text-[11px] text-muted">相同種子 = 相同結果</span>
        </div>
        <SeedInput seed={options.seed} onSeedChange={onSeedChange} />
        <p className="text-[11px] text-muted">貼上別人的種子就能重現同一張表。</p>
      </div>

      {blocked && (
        <ul className="space-y-1 rounded-lg border border-subtle surface-muted p-3">
          {errors.map((error) => (
            <li key={`${error.field}-${error.message}`} className="text-xs text-danger">
              {error.message}
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2 border-t border-subtle pt-5">
        <button type="button" onClick={onGenerate} disabled={blocked} className="btn btn-primary flex-1">
          <SparkIcon />
          產生工時分配
        </button>
        <button type="button" onClick={onReset} className="btn btn-ghost" title="還原預設參數">
          重設
        </button>
      </div>
    </div>
  )
}

/**
 * 種子輸入框。
 *
 * 使用者輸入到一半的字串（例如剛清空）不能直接倒推成數字，
 * 所以編輯期間保留自己的草稿，只有解析成功時才往上通知。
 */
function SeedInput({ seed, onSeedChange }: { seed: number; onSeedChange: (seed: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null)

  return (
    <input
      id="seed"
      className="field-input !text-left font-mono tracking-widest uppercase"
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
  )
}

function SparkIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
    </svg>
  )
}
