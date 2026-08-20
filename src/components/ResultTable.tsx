'use client'

import { useState } from 'react'
import { dailyTotals, projectTotals, type HoursMatrix } from '@/lib/generator'

interface ResultTableProps {
  matrix: HoursMatrix
  projectNames: string[]
  maxPerProject: number
  minHours: number
  maxHours: number
  /** 每次重新產生就換一個值，用來重播逐格淡入動畫。 */
  revision: number
  onRenameProject: (index: number, name: string) => void
}

/**
 * 依工時佔單案上限的比例決定色塊深淺，讓整張表一眼就能看出忙碌分佈。
 *
 * 色塊畫在格線內縮的 chip 上而不是整個 td，相鄰的高工時才不會糊成一整片。
 */
function heatStyle(value: number, cap: number): React.CSSProperties {
  if (value === 0) {
    return { color: 'rgb(var(--text-muted) / 0.45)' }
  }
  const ratio = Math.min(1, value / Math.max(1, cap))
  return {
    backgroundColor: `rgb(var(--accent) / ${(0.14 + ratio * 0.44).toFixed(3)})`,
    color: 'rgb(var(--text-strong))',
  }
}

export function ResultTable({
  matrix,
  projectNames,
  maxPerProject,
  minHours,
  maxHours,
  revision,
  onRenameProject,
}: ResultTableProps) {
  const [editing, setEditing] = useState<number | null>(null)
  const totalsByDay = dailyTotals(matrix)
  const totalsByProject = projectTotals(matrix)
  const grandTotal = totalsByDay.reduce((sum, value) => sum + value, 0)
  const days = matrix[0]?.length ?? 0

  const stickyCell = 'sticky left-0 z-10 surface-card'

  return (
    <div className="scroll-slim overflow-x-auto rounded-xl border border-subtle">
      <table className="w-full border-collapse text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
        <thead>
          <tr className="surface-muted">
            <th
              scope="col"
              className={`${stickyCell} surface-muted min-w-[9rem] border-b border-r border-subtle px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-muted`}
            >
              專案
            </th>
            {Array.from({ length: days }, (_, day) => (
              <th
                key={day}
                scope="col"
                className="min-w-[3.5rem] border-b border-subtle px-2 py-2.5 text-center text-xs font-bold text-muted"
              >
                第{day + 1}天
              </th>
            ))}
            <th
              scope="col"
              className="min-w-[4rem] border-b border-l border-subtle px-3 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-muted"
            >
              合計
            </th>
          </tr>
        </thead>

        <tbody>
          {matrix.map((row, project) => (
            <tr key={project} className="group">
              <th scope="row" className={`${stickyCell} border-b border-r border-subtle px-3 py-1.5 text-left font-medium`}>
                {editing === project ? (
                  <input
                    autoFocus
                    className="field-input !text-left"
                    defaultValue={projectNames[project]}
                    onBlur={(event) => {
                      onRenameProject(project, event.target.value)
                      setEditing(null)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') event.currentTarget.blur()
                      if (event.key === 'Escape') setEditing(null)
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditing(project)}
                    className="w-full truncate rounded px-1 py-1 text-left text-strong transition-colors hover:surface-inset"
                    title="點一下可重新命名"
                  >
                    {projectNames[project]}
                  </button>
                )}
              </th>

              {row.map((value, day) => (
                <td
                  // key 帶上 revision，重新產生時整格重新掛載，動畫才會重播。
                  key={`${revision}-${day}`}
                  className="cell-enter border-b border-subtle p-1"
                  style={{ animationDelay: `${Math.min(320, (project * days + day) * 6)}ms` }}
                >
                  <span
                    className="flex h-8 items-center justify-center rounded-md font-semibold"
                    style={heatStyle(value, maxPerProject)}
                  >
                    {value}
                  </span>
                </td>
              ))}

              <td className="border-b border-l border-subtle px-3 py-1.5 text-center font-bold text-accent">
                {totalsByProject[project]}
              </td>
            </tr>
          ))}
        </tbody>

        <tfoot>
          <tr className="surface-muted">
            <th
              scope="row"
              className={`${stickyCell} surface-muted border-r border-subtle px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-muted`}
            >
              每日合計
            </th>
            {totalsByDay.map((total, day) => {
              const outOfRange = total < minHours || total > maxHours
              return (
                <td
                  key={day}
                  className={`px-2 py-2.5 text-center font-bold ${outOfRange ? 'text-danger' : 'text-strong'}`}
                  title={outOfRange ? `超出設定範圍 ${minHours}–${maxHours}` : undefined}
                >
                  {total}
                </td>
              )
            })}
            <td className="border-l border-subtle px-3 py-2.5 text-center font-bold text-accent">{grandTotal}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
