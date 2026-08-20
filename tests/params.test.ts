import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CALENDAR_YEARS } from '../src/lib/calendar'
import { defaultMonth } from '../src/lib/params'

test('預設帶下個月', () => {
  assert.deepEqual(defaultMonth(new Date(2026, 7, 20)), { year: 2026, month: 9 })
  assert.deepEqual(defaultMonth(new Date(2026, 0, 1)), { year: 2026, month: 2 })
})

test('12 月時跨到隔年 1 月', () => {
  assert.deepEqual(defaultMonth(new Date(2026, 11, 15)), { year: 2027, month: 1 })
})

test('月底也是下個月，不會因為天數進位而多跳一個月', () => {
  assert.deepEqual(defaultMonth(new Date(2026, 0, 31)), { year: 2026, month: 2 })
  assert.deepEqual(defaultMonth(new Date(2026, 2, 31)), { year: 2026, month: 4 })
})

test('超出行事曆年份範圍時夾回可選的年份', () => {
  const result = defaultMonth(new Date(CALENDAR_YEARS.max, 11, 1))
  assert.equal(result.year, CALENDAR_YEARS.max)
  assert.equal(result.month, 1)
})
