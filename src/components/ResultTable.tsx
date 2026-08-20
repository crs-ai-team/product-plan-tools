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
  onRenameProject: (index: number, name: string) => void
}

/**
 * 依工時佔單案上限的比例決定底色深淺，效果等同試算表的色階格式化。
 *
 * 底色直接上在儲存格而不是內縮的色塊，靠格線分隔相鄰的格子。
 */
function heatStyle(value: number, cap: number): React.CSSProperties {
  if (value === 0) return { color: 'rgb(var(--text-3))' }
  const ratio = Math.min(1, value / Math.max(1, cap))
  return {
    backgroundColor: `rgb(var(--accent) / ${(0.1 + ratio * 0.3).toFixed(3)})`,
    color: 'rgb(var(--text))',
  }
}

export function ResultTable({
  matrix,
  columns,
  projectNames,
  maxPerProject,
  minHours,
  maxHours,
  onRenameProject,
}: ResultTableProps) {
  const [editing, setEditing] = useState<number | null>(null)
  const totalsByDay = dailyTotals(matrix)
  const totalsByProject = projectTotals(matrix)
  const grandTotal = totalsByDay.reduce((sum, value) => sum + value, 0)

  // 首欄與合計欄固定在兩側，整月 31 欄橫向捲動時仍看得到專案名稱與總時數。
  const stickyLeft = 'sticky left-0 z-10 sticky-edge-left'
  const stickyRight = 'sticky right-0 z-10 sticky-edge-right'
  const numberCell = 'text-center font-mono'

  return (
    <div className="scroll-slim overflow-x-auto border border-line">
      <table className="grid-table w-full">
        <thead>
          <tr>
            <th scope="col" className={`${stickyLeft} surface-alt min-w-[8.5rem] text-left text-[11px] uppercase tracking-wider text-faint`}>
              專案
            </th>
            {columns.map((column, index) => (
              <th
                key={index}
                scope="col"
                title={column.title}
                className={`min-w-[2.5rem] text-center text-[11px] ${column.offDay ? 'text-faint opacity-60' : 'text-body'}`}
              >
                <span className="block font-mono leading-none">{column.label}</span>
                {column.sublabel && <span className="mt-0.5 block text-[9px] font-normal leading-none opacity-70">{column.sublabel}</span>}
              </th>
            ))}
            <th scope="col" className={`${stickyRight} surface-alt min-w-[3.25rem] text-center text-[11px] uppercase tracking-wider text-faint`}>
              合計
            </th>
          </tr>
        </thead>

        <tbody>
          {matrix.map((row, project) => (
            <tr key={project}>
              <th scope="row" className={`${stickyLeft} text-left`}>
                {editing === project ? (
                  <input
                    autoFocus
                    className="input w-full !text-left font-sans"
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
                    className="w-full truncate text-left text-strong hover:underline"
                    title="點一下可重新命名"
                  >
                    {projectNames[project]}
                  </button>
                )}
              </th>

              {row.map((value, day) =>
                columns[day]?.offDay ? (
                  <td key={day} className="cell-off" />
                ) : (
                  <td key={day} className={numberCell} style={heatStyle(value, maxPerProject)}>
                    {value}
                  </td>
                ),
              )}

              <td className={`${stickyRight} surface-panel ${numberCell} font-semibold text-strong`}>
                {totalsByProject[project]}
              </td>
            </tr>
          ))}
        </tbody>

        <tfoot>
          <tr>
            <th scope="row" className={`${stickyLeft} surface-alt text-left text-[11px] uppercase tracking-wider text-faint`}>
              合計
            </th>
            {totalsByDay.map((total, day) => {
              if (columns[day]?.offDay) return <td key={day} className="cell-off" />
              const outOfRange = total < minHours || total > maxHours
              return (
                <td
                  key={day}
                  className={`${numberCell} ${outOfRange ? 'text-danger' : 'text-strong'}`}
                  title={outOfRange ? `超出設定範圍 ${minHours}–${maxHours}` : undefined}
                >
                  {total}
                </td>
              )
            })}
            <td className={`${stickyRight} surface-alt ${numberCell} text-strong`}>{grandTotal}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
