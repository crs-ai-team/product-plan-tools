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
    <div className="panel overflow-hidden">
      <div className="panel-head">參數</div>

      <div className="space-y-2.5 px-3 py-3">
        <NumberField
          label="專案數量"
          value={options.numProjects}
          min={LIMITS.numProjects.min}
          max={LIMITS.numProjects.max}
          onChange={(value) => onChange({ numProjects: value })}
        />
        <NumberField
          label="天數"
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

      <div className="border-t border-line px-3 py-3">
        <SeedInput seed={options.seed} onSeedChange={(seed) => onChange({ seed })} />
      </div>

      <PanelActions errors={errors} onGenerate={onGenerate} onReset={onReset} />
    </div>
  )
}
