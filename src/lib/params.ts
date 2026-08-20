import { CALENDAR_YEARS } from './calendar'
import { LIMITS, type GeneratorOptions } from './generator'
import { randomSeed, seedFromString, seedToString } from './rng'

export type TabId = 'month' | 'quick'

/** 月份模式的參數；天數由行事曆決定，因此不在這裡指定。 */
export interface MonthOptions {
  year: number
  month: number
  numProjects: number
  minHours: number
  maxHours: number
  maxPerProject: number
  seed: number
}

const QUICK_KEY = 'product-plan-tools:options'
const MONTH_KEY = 'product-plan-tools:month-options'
const TAB_KEY = 'product-plan-tools:tab'

export const DEFAULT_OPTIONS: GeneratorOptions = {
  numProjects: 10,
  numDays: 5,
  minHours: 5,
  maxHours: 7,
  maxPerProject: 3,
  seed: 0,
}

/**
 * 預設要排的月份：下個月。
 *
 * 排班多半是提前規劃下一個月，開起來就停在當月的話每次都要手動往後撥一格。
 * 12 月時自動跨到隔年 1 月；超出行事曆資料範圍時夾回可選的年份。
 */
export function defaultMonth(now: Date): { year: number; month: number } {
  const target = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return {
    year: Math.min(CALENDAR_YEARS.max, Math.max(CALENDAR_YEARS.min, target.getFullYear())),
    month: target.getMonth() + 1,
  }
}

/** 月份模式的預設值；年月留給呼叫端填入。 */
export const DEFAULT_MONTH_OPTIONS: Omit<MonthOptions, 'year' | 'month'> = {
  numProjects: 10,
  minHours: 5,
  maxHours: 7,
  maxPerProject: 3,
  seed: 0,
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.round(parsed)))
}

/** 兩種模式共用的欄位：專案數、工時上下限、單案上限。 */
function sanitizeShared(raw: Partial<MonthOptions>, defaults: Omit<MonthOptions, 'year' | 'month'>) {
  const numProjects = clampInt(raw.numProjects, LIMITS.numProjects.min, LIMITS.numProjects.max, defaults.numProjects)
  const maxPerProject = clampInt(raw.maxPerProject, LIMITS.maxPerProject.min, LIMITS.maxPerProject.max, defaults.maxPerProject)
  const minHours = clampInt(raw.minHours, LIMITS.hours.min, LIMITS.hours.max, defaults.minHours)
  const maxHours = clampInt(raw.maxHours, minHours, LIMITS.hours.max, Math.max(minHours, defaults.maxHours))
  return { numProjects, maxPerProject, minHours, maxHours }
}

/** 把所有欄位夾回合法範圍，避免網址或 localStorage 被手動改壞後炸掉。 */
export function sanitize(raw: Partial<GeneratorOptions>): GeneratorOptions {
  return {
    ...sanitizeShared(raw, DEFAULT_OPTIONS),
    numDays: clampInt(raw.numDays, LIMITS.numDays.min, LIMITS.numDays.max, DEFAULT_OPTIONS.numDays),
    seed: raw.seed ?? DEFAULT_OPTIONS.seed,
  }
}

export function sanitizeMonth(raw: Partial<MonthOptions>, fallbackYear: number, fallbackMonth: number): MonthOptions {
  return {
    ...sanitizeShared(raw, DEFAULT_MONTH_OPTIONS),
    year: clampInt(raw.year, CALENDAR_YEARS.min, CALENDAR_YEARS.max, fallbackYear),
    month: clampInt(raw.month, 1, 12, fallbackMonth),
    seed: raw.seed ?? DEFAULT_MONTH_OPTIONS.seed,
  }
}

function sharedQuery(options: { numProjects: number; minHours: number; maxHours: number; maxPerProject: number; seed: number }) {
  return {
    p: String(options.numProjects),
    min: String(options.minHours),
    max: String(options.maxHours),
    cap: String(options.maxPerProject),
    s: seedToString(options.seed),
  }
}

function readShared(params: URLSearchParams): Partial<MonthOptions> {
  const seed = params.get('s') ? seedFromString(params.get('s') as string) : null
  return {
    numProjects: params.get('p') ? Number(params.get('p')) : undefined,
    minHours: params.get('min') ? Number(params.get('min')) : undefined,
    maxHours: params.get('max') ? Number(params.get('max')) : undefined,
    maxPerProject: params.get('cap') ? Number(params.get('cap')) : undefined,
    seed: seed ?? randomSeed(),
  }
}

/** 網址裡指定的分頁；沒有指定就回傳 null 讓呼叫端沿用記住的值。 */
export function tabFromQuery(search: string): TabId | null {
  const tab = new URLSearchParams(search).get('tab')
  return tab === 'month' || tab === 'quick' ? tab : null
}

/** 從網址查詢字串讀快速模式的參數；沒有任何相關參數時回傳 null。 */
export function fromQuery(search: string): GeneratorOptions | null {
  const params = new URLSearchParams(search)
  if (!['p', 'd', 'min', 'max', 'cap', 's'].some((key) => params.has(key))) return null
  return sanitize({ ...readShared(params), numDays: params.get('d') ? Number(params.get('d')) : undefined })
}

export function toQuery(options: GeneratorOptions): string {
  return new URLSearchParams({ tab: 'quick', d: String(options.numDays), ...sharedQuery(options) }).toString()
}

/** 從網址查詢字串讀月份模式的參數；沒有任何相關參數時回傳 null。 */
export function monthFromQuery(search: string, fallbackYear: number, fallbackMonth: number): MonthOptions | null {
  const params = new URLSearchParams(search)
  if (!['y', 'm', 'p', 'min', 'max', 'cap', 's'].some((key) => params.has(key))) return null
  return sanitizeMonth(
    {
      ...readShared(params),
      year: params.get('y') ? Number(params.get('y')) : undefined,
      month: params.get('m') ? Number(params.get('m')) : undefined,
    },
    fallbackYear,
    fallbackMonth,
  )
}

export function monthToQuery(options: MonthOptions): string {
  return new URLSearchParams({
    tab: 'month',
    y: String(options.year),
    m: String(options.month),
    ...sharedQuery(options),
  }).toString()
}

function read<T>(key: string): Partial<T> | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as Partial<T>) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 無痕模式或 storage 被停用時直接略過，不影響主要功能。
  }
}

export function loadStored(): GeneratorOptions | null {
  const raw = read<GeneratorOptions>(QUICK_KEY)
  return raw ? sanitize(raw) : null
}

export function saveStored(options: GeneratorOptions): void {
  write(QUICK_KEY, options)
}

export function loadStoredMonth(fallbackYear: number, fallbackMonth: number): MonthOptions | null {
  const raw = read<MonthOptions>(MONTH_KEY)
  return raw ? sanitizeMonth(raw, fallbackYear, fallbackMonth) : null
}

export function saveStoredMonth(options: MonthOptions): void {
  // 年月刻意不存：那是隨時間變動的選擇，不是偏好設定。
  // 存了的話每次開啟都會停在上次看的月份，蓋掉「下個月」這個預設。
  write(MONTH_KEY, {
    numProjects: options.numProjects,
    minHours: options.minHours,
    maxHours: options.maxHours,
    maxPerProject: options.maxPerProject,
    seed: options.seed,
  })
}

export function loadStoredTab(): TabId | null {
  try {
    const raw = localStorage.getItem(TAB_KEY)
    return raw === 'month' || raw === 'quick' ? raw : null
  } catch {
    return null
  }
}

export function saveStoredTab(tab: TabId): void {
  try {
    // 直接存字串，讀取端才不用再剝一層 JSON 引號。
    localStorage.setItem(TAB_KEY, tab)
  } catch {
    // 無痕模式或 storage 被停用時直接略過，不影響主要功能。
  }
}
