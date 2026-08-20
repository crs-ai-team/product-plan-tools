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
        <ul className="space-y-1 border-t border-line px-3 py-2.5">
          {errors.map((error) => (
            <li key={`${error.field}-${error.message}`} className="text-[12px] text-danger">
              {error.message}
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-1.5 border-t border-line px-3 py-3">
        <button type="button" onClick={onGenerate} disabled={errors.length > 0} className="btn btn-primary flex-1">
          重新產生
        </button>
        <button type="button" onClick={onReset} className="btn" title="還原預設參數">
          重設
        </button>
      </div>
    </>
  )
}
