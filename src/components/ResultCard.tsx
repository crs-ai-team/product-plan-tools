'use client'

interface Stat {
  label: string
  value: string | number
}

interface ResultCardProps {
  title: string
  /** 摘要數字，排成一行而不是四塊大磚，避免喧賓奪主。 */
  stats: Stat[]
  note?: string
  disabled: boolean
  onCopy: () => void
  onShare: () => void
  onCsv: () => void
  onXlsx: () => void
  children: React.ReactNode
}

/** 兩種模式共用的結果區：標題、摘要數字、匯出按鈕與表格容器。 */
export function ResultCard({ title, stats, note, disabled, onCopy, onShare, onCsv, onXlsx, children }: ResultCardProps) {
  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line px-3 py-2">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="font-semibold text-strong">{title}</h2>
          <div className="flex flex-wrap items-baseline gap-x-3 text-[12px] text-faint">
            {stats.map((stat) => (
              <span key={stat.label}>
                {stat.label} <span className="font-mono font-semibold text-strong">{stat.value}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={onCopy} disabled={disabled} className="btn btn-primary" title="複製數字區塊，可直接貼進試算表">
            <CopyIcon />
            複製表格
          </button>
          <button type="button" onClick={onCsv} disabled={disabled} className="btn">
            CSV
          </button>
          <button type="button" onClick={onXlsx} disabled={disabled} className="btn">
            Excel
          </button>
          <button type="button" onClick={onShare} disabled={disabled} className="btn" title="複製可重現這張表的網址">
            連結
          </button>
        </div>
      </div>

      {note && <p className="border-b border-line surface-alt px-3 py-1.5 text-[11px] text-faint">{note}</p>}

      <div className="p-2">{children}</div>
    </div>
  )
}

function CopyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}
