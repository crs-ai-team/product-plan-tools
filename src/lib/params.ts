import { LIMITS, type GeneratorOptions } from './generator'
import { randomSeed, seedFromString, seedToString } from './rng'

const STORAGE_KEY = 'product-plan-tools:options'

export const DEFAULT_OPTIONS: GeneratorOptions = {
  numProjects: 10,
  numDays: 5,
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

/** 把所有欄位夾回合法範圍，避免網址或 localStorage 被手動改壞後炸掉。 */
export function sanitize(raw: Partial<GeneratorOptions>): GeneratorOptions {
  const numProjects = clampInt(raw.numProjects, LIMITS.numProjects.min, LIMITS.numProjects.max, DEFAULT_OPTIONS.numProjects)
  const numDays = clampInt(raw.numDays, LIMITS.numDays.min, LIMITS.numDays.max, DEFAULT_OPTIONS.numDays)
  const maxPerProject = clampInt(raw.maxPerProject, LIMITS.maxPerProject.min, LIMITS.maxPerProject.max, DEFAULT_OPTIONS.maxPerProject)
  const minHours = clampInt(raw.minHours, LIMITS.hours.min, LIMITS.hours.max, DEFAULT_OPTIONS.minHours)
  const maxHours = clampInt(raw.maxHours, minHours, LIMITS.hours.max, Math.max(minHours, DEFAULT_OPTIONS.maxHours))

  return { numProjects, numDays, minHours, maxHours, maxPerProject, seed: raw.seed ?? DEFAULT_OPTIONS.seed }
}

/** 從網址查詢字串讀參數；沒有任何相關參數時回傳 null。 */
export function fromQuery(search: string): GeneratorOptions | null {
  const params = new URLSearchParams(search)
  const keys = ['p', 'd', 'min', 'max', 'cap', 's']
  if (!keys.some((key) => params.has(key))) return null

  const seedParam = params.get('s')
  const seed = seedParam ? seedFromString(seedParam) : null

  return sanitize({
    numProjects: params.get('p') ? Number(params.get('p')) : undefined,
    numDays: params.get('d') ? Number(params.get('d')) : undefined,
    minHours: params.get('min') ? Number(params.get('min')) : undefined,
    maxHours: params.get('max') ? Number(params.get('max')) : undefined,
    maxPerProject: params.get('cap') ? Number(params.get('cap')) : undefined,
    seed: seed ?? randomSeed(),
  })
}

/** 組出可分享的查詢字串，種子放最後讓網址讀起來比較順。 */
export function toQuery(options: GeneratorOptions): string {
  const params = new URLSearchParams({
    p: String(options.numProjects),
    d: String(options.numDays),
    min: String(options.minHours),
    max: String(options.maxHours),
    cap: String(options.maxPerProject),
    s: seedToString(options.seed),
  })
  return params.toString()
}

export function loadStored(): GeneratorOptions | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return sanitize(JSON.parse(raw) as Partial<GeneratorOptions>)
  } catch {
    return null
  }
}

export function saveStored(options: GeneratorOptions): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(options))
  } catch {
    // 無痕模式或 storage 被停用時直接略過，不影響主要功能。
  }
}
