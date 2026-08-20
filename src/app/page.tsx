'use client'

import { useEffect, useState } from 'react'
import { MonthPanel } from '@/components/MonthPanel'
import { QuickPanel } from '@/components/QuickPanel'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useProjectNames } from '@/hooks/useProjectNames'
import { useToast } from '@/hooks/useToast'
import { loadStoredTab, saveStoredTab, tabFromQuery, type TabId } from '@/lib/params'

const TABS: Array<{ id: TabId; label: string; hint: string }> = [
  { id: 'month', label: '整月工作日', hint: '依台灣行事曆排整個月' },
  { id: 'quick', label: '快速產生', hint: '自訂天數，不對應日期' },
]

export default function Page() {
  const [tab, setTab] = useState<TabId>('month')
  const { resolve, rename, reset } = useProjectNames()
  const { message, notify } = useToast()

  // 網址指定的分頁優先，其次是上次選過的分頁，都沒有就用預設的整月模式。
  useEffect(() => {
    const initial = tabFromQuery(window.location.search) ?? loadStoredTab()
    if (initial) setTab(initial)
  }, [])

  const selectTab = (next: TabId) => {
    setTab(next)
    saveStoredTab(next)
  }

  const shared = {
    projectNames: resolve,
    onRenameProject: rename,
    onResetNames: reset,
    notify,
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-[110rem] px-4 py-6 sm:px-6 lg:px-8">
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

        <div className="flex items-center gap-3">
          <nav className="flex gap-1 rounded-xl border border-subtle surface-muted p-1" aria-label="模式切換">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectTab(item.id)}
                title={item.hint}
                aria-current={tab === item.id ? 'page' : undefined}
                className={`btn ${tab === item.id ? 'btn-primary' : '!bg-transparent text-muted hover:text-strong'}`}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <ThemeToggle />
        </div>
      </header>

      {tab === 'month' ? <MonthPanel {...shared} /> : <QuickPanel {...shared} />}

      {message && (
        <div
          role="status"
          className="card fixed bottom-6 left-1/2 z-50 -translate-x-1/2 px-4 py-2.5 text-sm font-medium text-strong"
        >
          {message}
        </div>
      )}
    </div>
  )
}
