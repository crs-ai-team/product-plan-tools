'use client'

interface NumberFieldProps {
  label: string
  hint?: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}

/**
 * 滑桿與數字輸入框並排的欄位。
 *
 * 滑桿方便快速調整、輸入框方便精準指定，兩者共用同一個受控值。
 */
export function NumberField({ label, hint, value, min, max, onChange }: NumberFieldProps) {
  const percent = max === min ? 100 : ((value - min) / (max - min)) * 100

  const commit = (raw: string) => {
    const parsed = Number.parseInt(raw, 10)
    if (!Number.isFinite(parsed)) return
    onChange(Math.min(max, Math.max(min, parsed)))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-sm font-semibold text-strong">{label}</label>
        {hint && <span className="text-[11px] text-muted">{hint}</span>}
      </div>

      <div className="flex items-center gap-3">
        <input
          type="range"
          className="slider flex-1"
          style={{ '--fill': `${percent}%` } as React.CSSProperties}
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          aria-label={label}
        />
        <input
          type="number"
          className="field-input w-16 shrink-0"
          min={min}
          max={max}
          value={value}
          onChange={(event) => commit(event.target.value)}
          aria-label={`${label}（數值）`}
        />
      </div>
    </div>
  )
}
