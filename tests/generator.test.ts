import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dailyTotals, generate, projectTotals, validate, type GeneratorOptions } from '../src/lib/generator'
import { mulberry32, seedFromString, seedToString } from '../src/lib/rng'

const base: GeneratorOptions = {
  numProjects: 10,
  numDays: 5,
  minHours: 5,
  maxHours: 7,
  maxPerProject: 3,
  seed: 12345,
}

test('矩陣形狀符合專案數與天數', () => {
  const matrix = generate(base)
  assert.equal(matrix.length, base.numProjects)
  for (const row of matrix) {
    assert.equal(row.length, base.numDays)
  }
})

test('每日總和落在設定的工時範圍內', () => {
  for (let seed = 0; seed < 200; seed++) {
    const matrix = generate({ ...base, seed })
    for (const total of dailyTotals(matrix)) {
      assert.ok(total >= base.minHours && total <= base.maxHours, `總和 ${total} 超出範圍`)
    }
  }
})

test('單一專案單日工時不超過上限且非負', () => {
  for (let seed = 0; seed < 100; seed++) {
    const matrix = generate({ ...base, seed })
    for (const row of matrix) {
      for (const value of row) {
        assert.ok(Number.isInteger(value) && value >= 0 && value <= base.maxPerProject)
      }
    }
  }
})

test('相同種子產生完全相同的結果', () => {
  assert.deepEqual(generate({ ...base, seed: 777 }), generate({ ...base, seed: 777 }))
})

test('不同種子產生不同結果', () => {
  assert.notDeepEqual(generate({ ...base, seed: 1 }), generate({ ...base, seed: 2 }))
})

test('工時上限超過理論容量時自動收斂到容量', () => {
  // 2 個專案、每案上限 3 小時，一天最多只有 6 小時。
  const matrix = generate({ ...base, numProjects: 2, minHours: 4, maxHours: 8, seed: 42 })
  for (const total of dailyTotals(matrix)) {
    assert.ok(total >= 4 && total <= 6, `總和 ${total} 超出實際容量`)
  }
})

test('最小工時超過容量時視為無效參數', () => {
  const options = { ...base, numProjects: 2, minHours: 8, maxHours: 8 }
  assert.equal(validate(options).length, 1)
  assert.throws(() => generate(options))
})

test('最小工時大於最大工時時視為無效參數', () => {
  assert.equal(validate({ ...base, minHours: 7, maxHours: 5 }).length, 1)
})

test('合法參數不會產生錯誤', () => {
  assert.deepEqual(validate(base), [])
})

test('每日合計與專案合計的總和一致', () => {
  const matrix = generate({ ...base, seed: 99 })
  const byDay = dailyTotals(matrix).reduce((a, b) => a + b, 0)
  const byProject = projectTotals(matrix).reduce((a, b) => a + b, 0)
  assert.equal(byDay, byProject)
})

test('分佈涵蓋 0 到上限的所有值', () => {
  const seen = new Set<number>()
  for (let seed = 0; seed < 50; seed++) {
    for (const row of generate({ ...base, seed })) {
      for (const value of row) seen.add(value)
    }
  }
  assert.deepEqual([...seen].sort(), [0, 1, 2, 3])
})

test('mulberry32 輸出落在 [0, 1) 且可重現', () => {
  const a = mulberry32(5)
  const b = mulberry32(5)
  for (let i = 0; i < 1000; i++) {
    const value = a()
    assert.ok(value >= 0 && value < 1)
    assert.equal(value, b())
  }
})

test('種子字串可以來回轉換', () => {
  assert.equal(seedFromString(seedToString(0xdeadbeef)), 0xdeadbeef)
  assert.equal(seedFromString('zzzz'), null)
})
