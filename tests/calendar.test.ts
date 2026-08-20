import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { CALENDAR_YEARS, fetchMonth, holidayNames, workdaysOf } from '../src/lib/calendar'

const AUGUST_2026 = [
  { date: '20260801', week: '六', isHoliday: true, description: '' },
  { date: '20260802', week: '日', isHoliday: true, description: '' },
  { date: '20260803', week: '一', isHoliday: false, description: '' },
  { date: '20260804', week: '二', isHoliday: false, description: '' },
  { date: '20260805', week: '三', isHoliday: true, description: '中秋節' },
  // 補班日：週六卻要上班。
  { date: '20260808', week: '六', isHoliday: false, description: '' },
  // 其他月份的資料必須被濾掉。
  { date: '20260901', week: '二', isHoliday: false, description: '' },
]

const realFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = realFetch
})

function stubFetch(handler: () => Promise<unknown> | never) {
  globalThis.fetch = (async () => {
    const body = await handler()
    return { ok: true, json: async () => body } as Response
  }) as typeof fetch
}

test('解析 API 資料並只保留指定月份', async () => {
  stubFetch(async () => AUGUST_2026)
  const calendar = await fetchMonth(2026, 8)

  assert.equal(calendar.source, 'api')
  assert.equal(calendar.days.length, 6)
  assert.deepEqual(
    calendar.days.map((day) => day.day),
    [1, 2, 3, 4, 5, 8],
  )
  assert.equal(calendar.days[0].iso, '2026-08-01')
})

test('補班日標記為工作日', async () => {
  stubFetch(async () => AUGUST_2026)
  const calendar = await fetchMonth(2026, 8)
  const makeup = calendar.days.find((day) => day.day === 8)

  assert.equal(makeup?.isMakeupWorkday, true)
  assert.equal(makeup?.isHoliday, false)
  assert.deepEqual(
    workdaysOf(calendar).map((day) => day.day),
    [3, 4, 8],
  )
})

test('列出當月的節日名稱且不重複', async () => {
  stubFetch(async () => [...AUGUST_2026, { date: '20260806', week: '四', isHoliday: true, description: '中秋節' }])
  assert.deepEqual(holidayNames(await fetchMonth(2026, 8)), ['中秋節'])
})

test('抓取失敗時退回週一至週五推算', async () => {
  globalThis.fetch = (async () => {
    throw new Error('network down')
  }) as typeof fetch

  const calendar = await fetchMonth(2026, 8)
  assert.equal(calendar.source, 'fallback')
  assert.equal(calendar.days.length, 31)
  assert.equal(workdaysOf(calendar).length, 21)
  assert.equal(calendar.days.every((day) => !day.isMakeupWorkday), true)
})

test('回傳空陣列時視同失敗並退回推算', async () => {
  stubFetch(async () => [])
  assert.equal((await fetchMonth(2026, 8)).source, 'fallback')
})

test('超出資料年份範圍時直接使用推算，不打 API', async () => {
  let called = false
  globalThis.fetch = (async () => {
    called = true
    throw new Error('不應該被呼叫')
  }) as typeof fetch

  const calendar = await fetchMonth(CALENDAR_YEARS.max + 1, 3)
  assert.equal(calendar.source, 'fallback')
  assert.equal(called, false)
})

test('推算會處理閏年的二月', async () => {
  globalThis.fetch = (async () => {
    throw new Error('network down')
  }) as typeof fetch

  assert.equal((await fetchMonth(2024, 2)).days.length, 29)
  assert.equal((await fetchMonth(2026, 2)).days.length, 28)
})
