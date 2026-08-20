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
    <>
      <div className="panel-head flex items-center justify-between !border-t">
        <span>每日工時</span>
        <span className="font-mono normal-case tracking-normal">容量 {capacity}h</span>
      </div>

      <div className="space-y-2.5 px-3 py-3">
        <NumberField
          label="最小工時"
          value={minHours}
          min={LIMITS.hours.min}
          max={LIMITS.hours.max}
          onChange={(value) => onChange({ minHours: value, maxHours: Math.max(value, maxHours) })}
        />
        <NumberField
          label="最大工時"
          value={maxHours}
          min={LIMITS.hours.min}
          max={LIMITS.hours.max}
          onChange={(value) => onChange({ maxHours: value, minHours: Math.min(value, minHours) })}
        />
        <NumberField
          label="單案每日上限"
          value={maxPerProject}
          min={LIMITS.maxPerProject.min}
          max={LIMITS.maxPerProject.max}
          onChange={(value) => onChange({ maxPerProject: value })}
        />
      </div>
    </>
  )
}
