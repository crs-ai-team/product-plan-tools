'use client'

import { CALENDAR_YEARS, type MonthCalendar } from '@/lib/calendar'
import { LIMITS, type ValidationError } from '@/lib/generator'
import type { MonthOptions } from '@/lib/params'
import { HoursFields } from './HoursFields'
import { NumberField } from './NumberField'
import { PanelActions } from './PanelActions'
import { SeedInput } from './SeedInput'

interface MonthControlsProps {
  options: MonthOptions
  errors: ValidationError[]
  calendar: MonthCalendar | null
  loading: boolean
  onChange: (patch: Partial<MonthOptions>) => void
  onGenerate: () => void
  onReset: () => void
}

/** 把年月往前或往後移動指定的月數，跨年時自動進位。 */
function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta
  return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}

export function MonthControls({ options, errors, calendar, loading, onChange, onGenerate, onReset }: MonthControlsProps) {
  const workdays = calendar?.days.filter((day) => !day.isHoliday).length ?? 0
  const years = Array.from(
    { length: CALENDAR_YEARS.max - CALENDAR_YEARS.min + 1 },
    (_, index) => CALENDAR_YEARS.min + index,
  )

  const step = (delta: number) => {
    const next = shiftMonth(options.year, options.month, delta)
    if (next.year < CALENDAR_YEARS.min || next.year > CALENDAR_YEARS.max) return
    onChange(next)
  }

  return (
    <div className="panel overflow-hidden">
      <div className="panel-head">月份</div>

      <div className="space-y-2 px-3 py-3">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => step(-1)} className="btn w-6 !px-0" aria-label="上個月">
            ‹
          </button>
          <select
            className="input flex-1"
            value={options.year}
            onChange={(event) => onChange({ year: Number(event.target.value) })}
            aria-label="年份"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <select
            className="input w-16"
            value={options.month}
            onChange={(event) => onChange({ month: Number(event.target.value) })}
            aria-label="月份"
          >
            {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
              <option key={month} value={month}>
                {String(month).padStart(2, '0')} 月
              </option>
            ))}
          </select>
          <button type="button" onClick={() => step(1)} className="btn w-6 !px-0" aria-label="下個月">
            ›
          </button>
        </div>

        <p className="text-[11px] text-faint">
          {loading ? '讀取行事曆中…' : `${workdays} 個工作日`}
          {calendar?.source === 'fallback' && ' · 行事曆讀取失敗，已改用週一至週五推算'}
        </p>
      </div>

      <div className="border-t border-line px-3 py-3">
        <NumberField
          label="專案數量"
          value={options.numProjects}
          min={LIMITS.numProjects.min}
          max={LIMITS.numProjects.max}
          onChange={(value) => onChange({ numProjects: value })}
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
