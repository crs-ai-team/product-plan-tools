'use client'

import { useState } from 'react'
import { dailyTotals, projectTotals, type HoursMatrix } from '@/lib/generator'

export interface TableColumn {
  /** 欄位主標，例如「第1天」或月份模式的日期數字。 */
  label: string
  /** 欄位副標，例如星期幾。 */
  sublabel?: string
  /** 放假日：不排工時，整欄以灰階顯示。 */
  offDay?: boolean
  /** 滑鼠停留時的說明，例如節日名稱。 */
  title?: string
}

interface ResultTableProps {
  matrix: HoursMatrix
  columns: TableColumn[]
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
  columns,
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

  // 首欄與合計欄固定在兩側，整月 31 欄橫向捲動時仍看得到專案名稱與總時數。
  const stickyLeft = 'sticky left-0 z-10 sticky-edge-left'
  const stickyRight = 'sticky right-0 z-10 sticky-edge-right'

  return (
    <div className="scroll-slim overflow-x-auto rounded-xl border border-subtle">
      <table className="w-full border-collapse text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
        <thead>
          <tr className="surface-muted">
            <th
              scope="col"
              className={`${stickyLeft} surface-muted min-w-[9rem] border-b border-r border-subtle px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-muted`}
            >
              專案
            </th>
            {columns.map((column, index) => (
              <th
                key={index}
                scope="col"
                title={column.title}
                className={`min-w-[3.25rem] border-b border-subtle px-2 py-2 text-center text-xs font-bold ${
                  column.offDay ? 'text-muted opacity-60' : 'text-muted'
                }`}
              >
                <span className="block leading-tight">{column.label}</span>
                {column.sublabel && (
                  <span className="block text-[10px] font-medium leading-tight opacity-70">{column.sublabel}</span>
                )}
              </th>
            ))}
            <th
              scope="col"
              className={`${stickyRight} surface-muted min-w-[4rem] border-b border-l border-subtle px-3 py-2 text-center text-xs font-bold uppercase tracking-wider text-muted`}
            >
              合計
            </th>
          </tr>
        </thead>

        <tbody>
          {matrix.map((row, project) => (
            <tr key={project}>
              <th
                scope="row"
                className={`${stickyLeft} surface-card border-b border-r border-subtle px-3 py-1.5 text-left font-medium`}
              >
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
                  style={{ animationDelay: `${Math.min(320, (project * row.length + day) * 5)}ms` }}
                >
                  {columns[day]?.offDay ? (
                    <span className="flex h-8 items-center justify-center rounded-md surface-inset text-xs font-medium text-muted opacity-50">
                      休
                    </span>
                  ) : (
                    <span
                      className="flex h-8 items-center justify-center rounded-md font-semibold"
                      style={heatStyle(value, maxPerProject)}
                    >
                      {value}
                    </span>
                  )}
                </td>
              ))}

              <td className={`${stickyRight} surface-card border-b border-l border-subtle px-3 py-1.5 text-center font-bold text-accent`}>
                {totalsByProject[project]}
              </td>
            </tr>
          ))}
        </tbody>

        <tfoot>
          <tr className="surface-muted">
            <th
              scope="row"
              className={`${stickyLeft} surface-muted border-r border-subtle px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-muted`}
            >
              每日合計
            </th>
            {totalsByDay.map((total, day) => {
              if (columns[day]?.offDay) {
                return (
                  <td key={day} className="px-2 py-2.5 text-center text-muted opacity-50">
                    —
                  </td>
                )
              }
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
            <td className={`${stickyRight} surface-muted border-l border-subtle px-3 py-2.5 text-center font-bold text-accent`}>
              {grandTotal}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
