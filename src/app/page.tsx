'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ControlPanel } from '@/components/ControlPanel'
import { ResultTable } from '@/components/ResultTable'
import { ThemeToggle } from '@/components/ThemeToggle'
import { download, toCsv, toXlsx, type SheetData } from '@/lib/export'
import { dailyTotals, generate, validate, type GeneratorOptions, type HoursMatrix } from '@/lib/generator'
import { DEFAULT_OPTIONS, fromQuery, loadStored, saveStored, toQuery } from '@/lib/params'
import { randomSeed } from '@/lib/rng'

const NAMES_KEY = 'product-plan-tools:names'

export default function Page() {
  const [options, setOptions] = useState<GeneratorOptions>(DEFAULT_OPTIONS)
  const [ready, setReady] = useState(false)
  const [matrix, setMatrix] = useState<HoursMatrix | null>(null)
  const [names, setNames] = useState<string[]>([])
  const [revision, setRevision] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const errors = useMemo(() => validate(options), [options])

  const notify = useCallback((message: string) => {
    setToast(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2400)
  }, [])

  // 初次載入：網址參數優先於 localStorage，兩者都沒有就用預設值配一顆新種子。
  useEffect(() => {
    const initial = fromQuery(window.location.search) ?? loadStored() ?? DEFAULT_OPTIONS

    try {
      const stored = localStorage.getItem(NAMES_KEY)
      if (stored) setNames(JSON.parse(stored) as string[])
    } catch {
      // 名稱只是輔助資訊，解析失敗就退回預設命名。
    }

    setOptions(initial.seed === 0 ? { ...initial, seed: randomSeed() } : initial)
    setReady(true)
  }, [])

  // 表格永遠是目前參數的函數，任何一格改動都立刻重算。
  // 這樣畫面、統計數字與分享連結三者不會出現不一致的狀態。
  useEffect(() => {
    if (!ready || errors.length > 0) return
    setMatrix(generate(options))
    setRevision((value) => value + 1)
  }, [ready, options, errors])

  useEffect(() => {
    if (ready) saveStored(options)
  }, [ready, options])

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
  }, [])

  const projectNames = useMemo(
    () => Array.from({ length: options.numProjects }, (_, index) => names[index] || `Project ${index + 1}`),
    [names, options.numProjects],
  )

  const patch = (changes: Partial<GeneratorOptions>) => setOptions((current) => ({ ...current, ...changes }))

  const handleReset = () => {
    setNames([])
    try {
      localStorage.removeItem(NAMES_KEY)
    } catch {
      // 略過，重設在本次瀏覽中仍然生效。
    }
    setOptions({ ...DEFAULT_OPTIONS, seed: randomSeed() })
  }

  const handleRename = (index: number, value: string) => {
    setNames((current) => {
      const next = [...current]
      while (next.length <= index) next.push('')
      next[index] = value.trim()
      try {
        localStorage.setItem(NAMES_KEY, JSON.stringify(next))
      } catch {
        // 同上，storage 不可用時只影響下次載入。
      }
      return next
    })
  }

  const sheet = (): SheetData => ({
    rowLabels: projectNames,
    columnLabels: Array.from({ length: options.numDays }, (_, day) => `第${day + 1}天`),
    matrix: matrix ?? [],
  })

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

  const handleCsv = () => download(`${filename}.csv`, toCsv(sheet()), 'text/csv;charset=utf-8')

  const handleXlsx = () =>
    download(
      `${filename}.xlsx`,
      toXlsx(sheet()),
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )

  const totals = matrix ? dailyTotals(matrix) : []
  const grandTotal = totals.reduce((sum, value) => sum + value, 0)
  const average = totals.length > 0 ? grandTotal / totals.length : 0

  return (
    <div className="mx-auto min-h-screen w-full max-w-[100rem] px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold"
            style={{ backgroundColor: 'rgb(var(--accent))', color: 'rgb(var(--accent-contrast))' }}
            aria-hidden
          >
            ⏱
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-strong">隨機工時分配表</h1>
            <p className="text-xs text-muted">依每日工時上下限，隨機把時數分配給各專案</p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <ControlPanel
            options={options}
            errors={errors}
            onChange={patch}
            onSeedChange={(seed) => patch({ seed })}
            onGenerate={() => patch({ seed: randomSeed() })}
            onReset={handleReset}
          />
        </aside>

        <main className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="專案" value={options.numProjects} />
            <Stat label="天數" value={options.numDays} />
            <Stat label="總工時" value={grandTotal} />
            <Stat label="平均每日" value={average.toFixed(1)} />
          </div>

          <div className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-subtle px-5 py-3.5">
              <div>
                <h2 className="text-sm font-bold text-strong">分配結果</h2>
                <p className="text-xs text-muted">點專案名稱可改名 · 色塊越深代表投入越多</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={handleShare} disabled={!matrix} className="btn btn-ghost">
                  複製連結
                </button>
                <button type="button" onClick={handleCsv} disabled={!matrix} className="btn btn-ghost">
                  CSV
                </button>
                <button type="button" onClick={handleXlsx} disabled={!matrix} className="btn btn-primary">
                  下載 Excel
                </button>
              </div>
            </div>

            <div className="p-3 sm:p-4">
              {matrix && errors.length === 0 ? (
                <ResultTable
                  matrix={matrix}
                  projectNames={projectNames}
                  maxPerProject={options.maxPerProject}
                  minHours={options.minHours}
                  maxHours={options.maxHours}
                  revision={revision}
                  onRenameProject={handleRename}
                />
              ) : (
                <p className="px-2 py-16 text-center text-sm text-muted">
                  {errors.length > 0 ? '目前的參數組合沒有解，請調整左側設定' : '產生中…'}
                </p>
              )}
            </div>
          </div>
        </main>
      </div>

      {toast && (
        <div
          role="status"
          className="card fixed bottom-6 left-1/2 z-50 -translate-x-1/2 px-4 py-2.5 text-sm font-medium text-strong"
        >
          {toast}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-0.5 text-2xl font-bold text-strong" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </p>
    </div>
  )
}
