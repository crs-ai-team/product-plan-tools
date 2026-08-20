/**
 * 台灣行事曆。
 *
 * 資料來源是 ruyut/TaiwanCalendar，內容包含國定假日、彈性放假與補行上班日，
 * 所以「哪幾天要上班」不能單純用星期幾判斷。
 */

/** 上游 JSON 的單日格式。 */
interface RawDay {
  date: string
  week: string
  isHoliday: boolean
  description: string
}

export interface CalendarDay {
  /** ISO 格式 `YYYY-MM-DD`。 */
  iso: string
  /** 月份中的第幾天。 */
  day: number
  /** 星期的中文單字，例如「一」。 */
  week: string
  /** 為 true 代表放假，不排工時。 */
  isHoliday: boolean
  /** 節日名稱；補班日與一般假日皆可能為空字串。 */
  description: string
  /** 週末卻要上班，也就是補行上班日。 */
  isMakeupWorkday: boolean
}

export interface MonthCalendar {
  year: number
  month: number
  days: CalendarDay[]
  /** 資料是取自 API 還是本地推算的備援。 */
  source: 'api' | 'fallback'
}

/** 上游 repo 目前提供的年份範圍。 */
export const CALENDAR_YEARS = { min: 2017, max: 2027 } as const

const CDN = 'https://cdn.jsdelivr.net/gh/ruyut/TaiwanCalendar/data'
const CACHE_PREFIX = 'product-plan-tools:calendar:'
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

const WEEK_NAMES = ['日', '一', '二', '三', '四', '五', '六']

function readCache(year: number): RawDay[] | null {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${year}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { at: number; days: RawDay[] }
    if (!Array.isArray(parsed.days) || Date.now() - parsed.at > CACHE_TTL_MS) return null
    return parsed.days
  } catch {
    return null
  }
}

function writeCache(year: number, days: RawDay[]): void {
  try {
    localStorage.setItem(`${CACHE_PREFIX}${year}`, JSON.stringify({ at: Date.now(), days }))
  } catch {
    // 容量不足或 storage 被停用時略過，下次再重新抓即可。
  }
}

/**
 * 沒有網路或年份超出資料範圍時的備援：週一到週五視為工作日。
 *
 * 這種推算不會知道國定假日與補班日，所以呼叫端要把 `source` 顯示給使用者看。
 */
function fallbackMonth(year: number, month: number): MonthCalendar {
  const total = new Date(year, month, 0).getDate()
  const days: CalendarDay[] = []

  for (let day = 1; day <= total; day++) {
    const weekday = new Date(year, month - 1, day).getDay()
    days.push({
      iso: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      day,
      week: WEEK_NAMES[weekday],
      isHoliday: weekday === 0 || weekday === 6,
      description: '',
      isMakeupWorkday: false,
    })
  }

  return { year, month, days, source: 'fallback' }
}

function toCalendarDay(raw: RawDay): CalendarDay {
  const iso = `${raw.date.slice(0, 4)}-${raw.date.slice(4, 6)}-${raw.date.slice(6, 8)}`
  return {
    iso,
    day: Number(raw.date.slice(6, 8)),
    week: raw.week,
    isHoliday: raw.isHoliday,
    description: raw.description,
    isMakeupWorkday: !raw.isHoliday && (raw.week === '六' || raw.week === '日'),
  }
}

/**
 * 取得指定月份的行事曆。
 *
 * 先看 localStorage 快取，再打 CDN；兩者都失敗時退回本地推算，
 * 讓工具在離線或 CDN 異常時仍然可用。
 */
export async function fetchMonth(year: number, month: number, signal?: AbortSignal): Promise<MonthCalendar> {
  if (year < CALENDAR_YEARS.min || year > CALENDAR_YEARS.max) {
    return fallbackMonth(year, month)
  }

  let raw = readCache(year)

  if (!raw) {
    try {
      const response = await fetch(`${CDN}/${year}.json`, { signal })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const parsed = (await response.json()) as RawDay[]
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('資料格式不符')
      raw = parsed
      writeCache(year, parsed)
    } catch (error) {
      if ((error as Error).name === 'AbortError') throw error
      return fallbackMonth(year, month)
    }
  }

  const prefix = `${year}${String(month).padStart(2, '0')}`
  const days = raw
    .filter((entry) => typeof entry?.date === 'string' && entry.date.startsWith(prefix))
    .map(toCalendarDay)
    .sort((a, b) => a.day - b.day)

  if (days.length === 0) return fallbackMonth(year, month)

  return { year, month, days, source: 'api' }
}

export function workdaysOf(calendar: MonthCalendar): CalendarDay[] {
  return calendar.days.filter((day) => !day.isHoliday)
}

/** 該月出現過的節日名稱，依日期排序且不重複。 */
export function holidayNames(calendar: MonthCalendar): string[] {
  const names: string[] = []
  for (const day of calendar.days) {
    if (day.isHoliday && day.description && !names.includes(day.description)) {
      names.push(day.description)
    }
  }
  return names
}
