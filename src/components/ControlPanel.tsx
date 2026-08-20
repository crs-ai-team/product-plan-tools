'use client'

import { LIMITS, type GeneratorOptions, type ValidationError } from '@/lib/generator'
import { HoursFields } from './HoursFields'
import { NumberField } from './NumberField'
import { PanelActions } from './PanelActions'
import { SeedInput } from './SeedInput'

interface ControlPanelProps {
  options: GeneratorOptions
  errors: ValidationError[]
  onChange: (patch: Partial<GeneratorOptions>) => void
  onGenerate: () => void
  onReset: () => void
}

/** 快速產生模式的參數面板：自行指定天數，不綁定實際日期。 */
export function ControlPanel({ options, errors, onChange, onGenerate, onReset }: ControlPanelProps) {
  return (
    <div className="card space-y-6 p-5">
      <div className="space-y-1">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted">參數設定</h2>
        <p className="text-xs text-muted">自訂天數，不對應實際日期。</p>
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

      <HoursFields
        minHours={options.minHours}
        maxHours={options.maxHours}
        maxPerProject={options.maxPerProject}
        capacity={options.numProjects * options.maxPerProject}
        onChange={onChange}
      />

      <div className="border-t border-subtle pt-5">
        <SeedInput seed={options.seed} onSeedChange={(seed) => onChange({ seed })} />
      </div>

      <PanelActions errors={errors} onGenerate={onGenerate} onReset={onReset} />
    </div>
  )
}
