'use client'

import type { ValidationError } from '@/lib/generator'

interface PanelActionsProps {
  errors: ValidationError[]
  onGenerate: () => void
  onReset: () => void
}

/** 參數面板底部固定出現的錯誤提示與操作按鈕。 */
export function PanelActions({ errors, onGenerate, onReset }: PanelActionsProps) {
  return (
    <>
      {errors.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-subtle surface-muted p-3">
          {errors.map((error) => (
            <li key={`${error.field}-${error.message}`} className="text-xs text-danger">
              {error.message}
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2 border-t border-subtle pt-5">
        <button type="button" onClick={onGenerate} disabled={errors.length > 0} className="btn btn-primary flex-1">
          <SparkIcon />
          重新產生
        </button>
        <button type="button" onClick={onReset} className="btn btn-ghost" title="還原預設參數">
          重設
        </button>
      </div>
    </>
  )
}

function SparkIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
    </svg>
  )
}
