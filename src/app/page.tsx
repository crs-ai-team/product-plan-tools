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
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line surface-panel">
        <div className="mx-auto flex max-w-[110rem] flex-wrap items-center justify-between gap-3 px-3 py-2">
          <h1 className="font-semibold text-strong">隨機工時分配</h1>

          <div className="flex items-center gap-2">
            <div className="segment" role="tablist" aria-label="模式切換">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  id={`tab-${item.id}`}
                  aria-controls={`panel-${item.id}`}
                  aria-selected={tab === item.id}
                  aria-current={tab === item.id ? 'page' : undefined}
                  onClick={() => selectTab(item.id)}
                  title={item.hint}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div
        className="mx-auto max-w-[110rem] px-3 py-3"
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
      >
        {tab === 'month' ? <MonthPanel {...shared} /> : <QuickPanel {...shared} />}
      </div>

      {message && (
        <div
          role="status"
          className="panel fixed bottom-4 left-1/2 z-50 -translate-x-1/2 px-3 py-2 text-strong shadow-lg"
        >
          {message}
        </div>
      )}
    </div>
  )
}
