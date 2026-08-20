'use client'

import { LIMITS } from '@/lib/generator'
import { NumberField } from './NumberField'

interface HoursFieldsProps {
  minHours: number
  maxHours: number
  maxPerProject: number
  /** 專案數量 × 單案上限，也就是一天理論上排得下的工時。 */
  capacity: number
  onChange: (patch: { minHours?: number; maxHours?: number; maxPerProject?: number }) => void
}

/** 兩種模式共用的每日工時設定，改動下限時會順手把上限往上推，避免出現無效區間。 */
export function HoursFields({ minHours, maxHours, maxPerProject, capacity, onChange }: HoursFieldsProps) {
  return (
    <div className="space-y-5 border-t border-subtle pt-5">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted">每日工時</h3>
        <span className="text-[11px] text-muted">上限容量 {capacity} 小時</span>
      </div>

      <NumberField
        label="最小工時"
        hint="每天所有專案加總的下限"
        value={minHours}
        min={LIMITS.hours.min}
        max={LIMITS.hours.max}
        onChange={(value) => onChange({ minHours: value, maxHours: Math.max(value, maxHours) })}
      />

      <NumberField
        label="最大工時"
        hint="每天所有專案加總的上限"
        value={maxHours}
        min={LIMITS.hours.min}
        max={LIMITS.hours.max}
        onChange={(value) => onChange({ maxHours: value, minHours: Math.min(value, minHours) })}
      />

      <NumberField
        label="單案每日上限"
        hint="單一專案一天最多幾小時"
        value={maxPerProject}
        min={LIMITS.maxPerProject.min}
        max={LIMITS.maxPerProject.max}
        onChange={(value) => onChange({ maxPerProject: value })}
      />
    </div>
  )
}
