import assert from 'node:assert/strict'
import { test } from 'node:test'
import { toCsv, toXlsx, type SheetData } from '../src/lib/export'
import { createZip, textToBytes } from '../src/lib/zip'

const data: SheetData = {
  rowLabels: ['Project 1', 'Project 2'],
  columnLabels: ['第1天', '第2天'],
  matrix: [
    [3, 1],
    [2, 3],
  ],
}

test('CSV 含表頭、資料列與合計列', () => {
  const lines = toCsv(data).split('\r\n')
  assert.equal(lines[0], '專案,第1天,第2天,合計')
  assert.equal(lines[1], 'Project 1,3,1,4')
  assert.equal(lines[2], 'Project 2,2,3,5')
  assert.equal(lines[3], '每日合計,5,4,9')
})

test('CSV 逸出含逗號與引號的名稱', () => {
  const csv = toCsv({ ...data, rowLabels: ['A,B', 'C"D'] })
  assert.ok(csv.includes('"A,B"'))
  assert.ok(csv.includes('"C""D"'))
})

test('XLSX 是合法的 ZIP 並含必要的 part', () => {
  const bytes = toXlsx(data)
  assert.equal(bytes[0], 0x50)
  assert.equal(bytes[1], 0x4b)

  const text = Buffer.from(bytes).toString('latin1')
  for (const part of [
    '[Content_Types].xml',
    '_rels/.rels',
    'xl/workbook.xml',
    'xl/_rels/workbook.xml.rels',
    'xl/styles.xml',
    'xl/worksheets/sheet1.xml',
  ]) {
    assert.ok(text.includes(part), `缺少 ${part}`)
  }

  // 結尾必須是 end of central directory 標記。
  const eocd = bytes.subarray(bytes.length - 22, bytes.length - 18)
  assert.deepEqual([...eocd], [0x50, 0x4b, 0x05, 0x06])
})

test('ZIP 的 CRC32 與長度欄位正確', () => {
  const payload = textToBytes('hello world')
  const zip = createZip([{ name: 'a.txt', data: payload }])
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength)
  // "hello world" 的 CRC32 是廣為人知的檢查值。
  assert.equal(view.getUint32(14, true), 0x0d4a1185)
  assert.equal(view.getUint32(18, true), payload.length)
  assert.equal(view.getUint32(22, true), payload.length)
})

test('XLSX 逸出 XML 特殊字元', () => {
  const text = Buffer.from(toXlsx({ ...data, rowLabels: ['A & B', '<C>'] })).toString('utf8')
  assert.ok(text.includes('A &amp; B'))
  assert.ok(text.includes('&lt;C&gt;'))
})
