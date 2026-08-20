'use client'

interface NumberFieldProps {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}

/**
 * 一行標籤配一個數字輸入框，底下墊一條細滑桿。
 *
 * 輸入框負責精準指定、滑桿負責快速掃過範圍，兩者共用同一個受控值。
 */
export function NumberField({ label, value, min, max, onChange }: NumberFieldProps) {
  const percent = max === min ? 100 : ((value - min) / (max - min)) * 100

  const commit = (raw: string) => {
    const parsed = Number.parseInt(raw, 10)
    if (!Number.isFinite(parsed)) return
    onChange(Math.min(max, Math.max(min, parsed)))
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label className="text-strong">{label}</label>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[11px] text-faint">
            {min}–{max}
          </span>
          <input
            type="number"
            className="input w-12"
            min={min}
            max={max}
            value={value}
            onChange={(event) => commit(event.target.value)}
            aria-label={label}
          />
        </div>
      </div>
      <input
        type="range"
        className="slider mt-0.5"
        style={{ '--fill': `${percent}%` } as React.CSSProperties}
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        tabIndex={-1}
        aria-hidden
      />
    </div>
  )
}
