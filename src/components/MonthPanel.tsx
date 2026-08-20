'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchMonth, holidayNames, type MonthCalendar } from '@/lib/calendar'
import { copyText, download, toCsv, toTsv, toXlsx, type SheetData } from '@/lib/export'
import { generate, validate, type HoursMatrix, type ValidationError } from '@/lib/generator'
import {
  DEFAULT_MONTH_OPTIONS,
  defaultMonth,
  loadStoredMonth,
  monthFromQuery,
  monthToQuery,
  saveStoredMonth,
  type MonthOptions,
} from '@/lib/params'
import { randomSeed } from '@/lib/rng'
import { MonthControls } from './MonthControls'
import { ResultCard } from './ResultCard'
import { ResultTable, type TableColumn } from './ResultTable'

interface MonthPanelProps {
  projectNames: (count: number) => string[]
  onRenameProject: (index: number, name: string) => void
  onResetNames: () => void
  notify: (message: string) => void
}

function defaults(): MonthOptions {
  return { ...DEFAULT_MONTH_OPTIONS, ...defaultMonth(new Date()) }
}

/** 月份模式：只在台灣行事曆的工作日排工時，假日留白。 */
export function MonthPanel({ projectNames, onRenameProject, onResetNames, notify }: MonthPanelProps) {
  const [options, setOptions] = useState<MonthOptions>(defaults)
  const [ready, setReady] = useState(false)
  const [calendar, setCalendar] = useState<MonthCalendar | null>(null)
  const [loading, setLoading] = useState(true)
  const [matrix, setMatrix] = useState<HoursMatrix | null>(null)

  // 初次載入：網址參數優先於 localStorage，兩者都沒有就用當月配一顆新種子。
  useEffect(() => {
    const base = defaults()
    const initial = monthFromQuery(window.location.search, base.year, base.month) ?? loadStoredMonth(base.year, base.month) ?? base
    setOptions(initial.seed === 0 ? { ...initial, seed: randomSeed() } : initial)
    setReady(true)
  }, [])

  // 年或月一變就重新取行事曆；切換太快時取消還在飛的請求，避免舊資料蓋掉新的。
  useEffect(() => {
    if (!ready) return
    const controller = new AbortController()
    setLoading(true)

    fetchMonth(options.year, options.month, controller.signal)
      .then((result) => {
        setCalendar(result)
        setLoading(false)
      })
      .catch((error: Error) => {
        if (error.name !== 'AbortError') setLoading(false)
      })

    return () => controller.abort()
  }, [ready, options.year, options.month])

  useEffect(() => {
    if (ready) saveStoredMonth(options)
  }, [ready, options])

  const workdays = useMemo(() => calendar?.days.filter((day) => !day.isHoliday) ?? [], [calendar])

  const errors: ValidationError[] = useMemo(() => {
    if (workdays.length === 0) return []
    return validate({ ...options, numDays: workdays.length })
  }, [options, workdays.length])

  // 只為工作日產生工時，再把結果攤回整個月份，假日一律留 0。
  useEffect(() => {
    if (!ready || !calendar || workdays.length === 0 || errors.length > 0) {
      if (workdays.length === 0) setMatrix(null)
      return
    }

    const generated = generate({ ...options, numDays: workdays.length })
    const workdayIndex = new Map(workdays.map((day, index) => [day.day, index]))

    setMatrix(
      generated.map((row) => calendar.days.map((day) => {
        const index = workdayIndex.get(day.day)
        return index === undefined ? 0 : row[index]
      })),
    )
  }, [ready, calendar, workdays, options, errors])

  const names = projectNames(options.numProjects)
  const patch = (changes: Partial<MonthOptions>) => setOptions((current) => ({ ...current, ...changes }))

  const columns: TableColumn[] = (calendar?.days ?? []).map((day) => ({
    label: String(day.day),
    sublabel: day.week,
    offDay: day.isHoliday,
    title: day.isMakeupWorkday
      ? `${day.iso}（補行上班）`
      : day.description
        ? `${day.iso} ${day.description}`
        : day.iso,
  }))

  const sheet = (): SheetData => ({
    rowLabels: names,
    columnLabels: (calendar?.days ?? []).map(
      (day) => `${String(options.month).padStart(2, '0')}/${String(day.day).padStart(2, '0')}(${day.week})`,
    ),
    matrix: matrix ?? [],
  })

  /**
   * 複製整個月份的數字區塊。
   *
   * 欄數等於當月天數，假日欄留空，貼進以整月為欄位的試算表時位置會完全對齊。
   */
  const handleCopy = async () => {
    if (!matrix) return
    const ok = await copyText(toTsv(matrix, columns.map((column) => Boolean(column.offDay))))
    notify(
      ok
        ? `已複製 ${matrix.length} × ${columns.length} 的數字區塊，假日欄留空，可直接貼進試算表`
        : '複製失敗，請改用 CSV 或 Excel 下載',
    )
  }

  const handleReset = () => {
    onResetNames()
    setOptions({ ...defaults(), seed: randomSeed() })
  }

  const handleShare = async () => {
    const query = monthToQuery(options)
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

  const filename = `工時分配_${options.year}年${String(options.month).padStart(2, '0')}月`
  const grandTotal = matrix?.reduce((sum, row) => sum + row.reduce((a, b) => a + b, 0), 0) ?? 0
  const holidays = calendar ? holidayNames(calendar) : []
  const showTable = Boolean(matrix && calendar && errors.length === 0)

  return (
    <div className="grid gap-3 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-14 lg:self-start">
        <MonthControls
          options={options}
          errors={errors}
          calendar={calendar}
          loading={loading}
          onChange={patch}
          onGenerate={() => patch({ seed: randomSeed() })}
          onReset={handleReset}
        />
      </aside>

      {/* min-w-0 讓 grid 項目可以縮到比內容窄，寬表格才會在容器內捲動而不是撐開整頁。 */}
      <main className="min-w-0">
        <ResultCard
          title={`${options.year}-${String(options.month).padStart(2, '0')}`}
          note={
            holidays.length > 0
              ? `本月國定假日：${holidays.join('、')} · 點專案名稱可改名 · 假日欄不排工時`
              : '點專案名稱可改名 · 假日欄不排工時'
          }
          stats={[
            { label: '工作日', value: workdays.length },
            { label: '專案', value: options.numProjects },
            { label: '總工時', value: grandTotal },
            { label: '平均', value: workdays.length > 0 ? (grandTotal / workdays.length).toFixed(1) : '0.0' },
          ]}
          disabled={!showTable}
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
          {showTable ? (
            <ResultTable
              matrix={matrix as HoursMatrix}
              columns={columns}
              projectNames={names}
              maxPerProject={options.maxPerProject}
              minHours={options.minHours}
              maxHours={options.maxHours}
              onRenameProject={onRenameProject}
            />
          ) : (
            <p className="px-2 py-16 text-center text-faint">
              {errors.length > 0 ? '目前的參數組合沒有解，請調整左側設定' : loading ? '讀取行事曆中…' : '這個月份沒有工作日'}
            </p>
          )}
        </ResultCard>
      </main>
    </div>
  )
}
