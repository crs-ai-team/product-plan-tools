import { createZip, textToBytes } from './zip'
import { dailyTotals, type HoursMatrix } from './generator'

export interface SheetData {
  /** 第一欄的列標題，通常是專案名稱。 */
  rowLabels: string[]
  /** 第一列的欄標題，通常是「第 N 天」。 */
  columnLabels: string[]
  matrix: HoursMatrix
}

/** 把工時矩陣攤平成含表頭與每日合計的二維陣列。 */
function toGrid(data: SheetData): (string | number)[][] {
  const { rowLabels, columnLabels, matrix } = data
  const grid: (string | number)[][] = []

  grid.push(['專案', ...columnLabels, '合計'])

  matrix.forEach((row, index) => {
    const total = row.reduce((sum, value) => sum + value, 0)
    grid.push([rowLabels[index], ...row, total])
  })

  const totals = dailyTotals(matrix)
  grid.push(['每日合計', ...totals, totals.reduce((sum, value) => sum + value, 0)])

  return grid
}

export function toCsv(data: SheetData): string {
  const escape = (value: string | number): string => {
    const text = String(value)
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  return toGrid(data)
    .map((row) => row.map(escape).join(','))
    .join('\r\n')
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 把 0-based 欄索引轉成 Excel 欄名（0 → A、26 → AA）。 */
function columnName(index: number): string {
  let name = ''
  let n = index
  while (n >= 0) {
    name = String.fromCharCode((n % 26) + 65) + name
    n = Math.floor(n / 26) - 1
  }
  return name
}

function sheetXml(grid: (string | number)[][]): string {
  const rows = grid
    .map((row, rowIndex) => {
      const cells = row
        .map((value, colIndex) => {
          const ref = `${columnName(colIndex)}${rowIndex + 1}`
          // 表頭列與最後一列（每日合計）套用粗體樣式。
          const isHeader = rowIndex === 0 || rowIndex === grid.length - 1
          const style = isHeader ? ' s="1"' : ''
          if (typeof value === 'number') {
            return `<c r="${ref}"${style}><v>${value}</v></c>`
          }
          return `<c r="${ref}"${style} t="inlineStr"><is><t>${escapeXml(String(value))}</t></is></c>`
        })
        .join('')
      return `<row r="${rowIndex + 1}">${cells}</row>`
    })
    .join('')

  const lastColumn = columnName(Math.max(0, (grid[0]?.length ?? 1) - 1))

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0" tabSelected="1"><pane ySplit="1" xSplit="1" topLeftCell="B2" activePane="bottomRight" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="18" customWidth="1"/><col min="2" max="${grid[0]?.length ?? 1}" width="9" customWidth="1"/></cols><sheetData>${rows}</sheetData><autoFilter ref="A1:${lastColumn}1"/></worksheet>`
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`

const WORKBOOK = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="工時分配" sheetId="1" r:id="rId1"/></sheets></workbook>`

const WORKBOOK_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`

// 兩種樣式：索引 0 是預設，索引 1 是粗體並帶淺灰底，供表頭與合計列使用。
const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEEF2F7"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`

export function toXlsx(data: SheetData): Uint8Array {
  const grid = toGrid(data)
  return createZip([
    { name: '[Content_Types].xml', data: textToBytes(CONTENT_TYPES) },
    { name: '_rels/.rels', data: textToBytes(ROOT_RELS) },
    { name: 'xl/workbook.xml', data: textToBytes(WORKBOOK) },
    { name: 'xl/_rels/workbook.xml.rels', data: textToBytes(WORKBOOK_RELS) },
    { name: 'xl/styles.xml', data: textToBytes(STYLES) },
    { name: 'xl/worksheets/sheet1.xml', data: textToBytes(sheetXml(grid)) },
  ])
}

export function download(filename: string, data: Uint8Array | string, mime: string): void {
  const blob = data instanceof Uint8Array
    ? new Blob([data.slice().buffer as ArrayBuffer], { type: mime })
    : new Blob(['﻿' + data], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
