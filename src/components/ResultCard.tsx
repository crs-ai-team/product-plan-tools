'use client'

interface Stat {
  label: string
  value: string | number
}

interface ResultCardProps {
  title: string
  subtitle: string
  stats: Stat[]
  disabled: boolean
  onShare: () => void
  onCsv: () => void
  onXlsx: () => void
  children: React.ReactNode
}

/** 兩種模式共用的結果區：統計數字、匯出按鈕與表格容器。 */
export function ResultCard({ title, subtitle, stats, disabled, onShare, onCsv, onXlsx, children }: ResultCardProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{stat.label}</p>
            <p className="mt-0.5 text-2xl font-bold text-strong" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-subtle px-5 py-3.5">
          <div>
            <h2 className="text-sm font-bold text-strong">{title}</h2>
            <p className="text-xs text-muted">{subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onShare} disabled={disabled} className="btn btn-ghost">
              複製連結
            </button>
            <button type="button" onClick={onCsv} disabled={disabled} className="btn btn-ghost">
              CSV
            </button>
            <button type="button" onClick={onXlsx} disabled={disabled} className="btn btn-primary">
              下載 Excel
            </button>
          </div>
        </div>

        <div className="p-3 sm:p-4">{children}</div>
      </div>
    </div>
  )
}
