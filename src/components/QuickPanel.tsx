'use client'

import { useEffect, useMemo, useState } from 'react'
import { copyText, download, toCsv, toTsv, toXlsx, type SheetData } from '@/lib/export'
import { dailyTotals, generate, validate, type GeneratorOptions, type HoursMatrix } from '@/lib/generator'
import { DEFAULT_OPTIONS, fromQuery, loadStored, saveStored, toQuery } from '@/lib/params'
import { randomSeed } from '@/lib/rng'
import { ControlPanel } from './ControlPanel'
import { ResultCard } from './ResultCard'
import { ResultTable, type TableColumn } from './ResultTable'

interface QuickPanelProps {
  projectNames: (count: number) => string[]
  onRenameProject: (index: number, name: string) => void
  onResetNames: () => void
  notify: (message: string) => void
}

/** 快速產生模式：自訂天數，不對應實際日期。 */
export function QuickPanel({ projectNames, onRenameProject, onResetNames, notify }: QuickPanelProps) {
  const [options, setOptions] = useState<GeneratorOptions>(DEFAULT_OPTIONS)
  const [ready, setReady] = useState(false)
  const [matrix, setMatrix] = useState<HoursMatrix | null>(null)

  const errors = useMemo(() => validate(options), [options])

  // 初次載入：網址參數優先於 localStorage，兩者都沒有就用預設值配一顆新種子。
  useEffect(() => {
    const initial = fromQuery(window.location.search) ?? loadStored() ?? DEFAULT_OPTIONS
    setOptions(initial.seed === 0 ? { ...initial, seed: randomSeed() } : initial)
    setReady(true)
  }, [])

  // 表格永遠是目前參數的函數，任何一格改動都立刻重算。
  // 這樣畫面、統計數字與分享連結三者不會出現不一致的狀態。
  useEffect(() => {
    if (!ready || errors.length > 0) return
    setMatrix(generate(options))
  }, [ready, options, errors])

  useEffect(() => {
    if (ready) saveStored(options)
  }, [ready, options])

  const names = projectNames(options.numProjects)
  const patch = (changes: Partial<GeneratorOptions>) => setOptions((current) => ({ ...current, ...changes }))

  const columns: TableColumn[] = Array.from({ length: options.numDays }, (_, day) => ({ label: `第${day + 1}天` }))

  const sheet = (): SheetData => ({
    rowLabels: names,
    columnLabels: columns.map((column) => column.label),
    matrix: matrix ?? [],
  })

  const handleReset = () => {
    onResetNames()
    setOptions({ ...DEFAULT_OPTIONS, seed: randomSeed() })
  }

  const handleCopy = async () => {
    if (!matrix) return
    const ok = await copyText(toTsv(matrix))
    notify(ok ? `已複製 ${matrix.length} × ${options.numDays} 的數字區塊，可直接貼進試算表` : '複製失敗，請改用 CSV 或 Excel 下載')
  }

  const handleShare = async () => {
    const query = toQuery(options)
    const url = `${window.location.origin}${window.location.pathname}?${query}`
    try {
      await navigator.clipboard.writeText(url)
      notify('已複製分享連結，對方會看到完全相同的表格')
    } catch {
      // 非 HTTPS 或使用者拒絕授權時，退而寫進網址列讓使用者自行複製。
      window.history.replaceState(null, '', `?${query}`)
      notify('無法存取剪貼簿，已改寫入網址列')
    }
  }

  const filename = `工時分配_${options.numProjects}案_${options.numDays}天`
  const totals = matrix ? dailyTotals(matrix) : []
  const grandTotal = totals.reduce((sum, value) => sum + value, 0)

  return (
    <div className="grid gap-3 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-14 lg:self-start">
        <ControlPanel
          options={options}
          errors={errors}
          onChange={patch}
          onGenerate={() => patch({ seed: randomSeed() })}
          onReset={handleReset}
        />
      </aside>

      {/* min-w-0 讓 grid 項目可以縮到比內容窄，寬表格才會在容器內捲動而不是撐開整頁。 */}
      <main className="min-w-0">
        <ResultCard
          title="分配結果"
          note="點專案名稱可改名 · 底色越深代表投入越多"
          stats={[
            { label: '專案', value: options.numProjects },
            { label: '天數', value: options.numDays },
            { label: '總工時', value: grandTotal },
            { label: '平均', value: totals.length > 0 ? (grandTotal / totals.length).toFixed(1) : '0.0' },
          ]}
          disabled={!matrix || errors.length > 0}
          onCopy={handleCopy}
          onShare={handleShare}
          onCsv={() => download(`${filename}.csv`, toCsv(sheet()), 'text/csv;charset=utf-8')}
          onXlsx={() =>
            download(
              `${filename}.xlsx`,
              toXlsx(sheet()),
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            )
          }
        >
          {matrix && errors.length === 0 ? (
            <ResultTable
              matrix={matrix}
              columns={columns}
              projectNames={names}
              maxPerProject={options.maxPerProject}
              minHours={options.minHours}
              maxHours={options.maxHours}
              onRenameProject={onRenameProject}
            />
          ) : (
            <p className="px-2 py-16 text-center text-faint">
              {errors.length > 0 ? '目前的參數組合沒有解，請調整左側設定' : '產生中…'}
            </p>
          )}
        </ResultCard>
      </main>
    </div>
  )
}
