/**
 * 極簡 ZIP 封裝器（僅 store，不壓縮）。
 *
 * xlsx 檔案本質就是一包 XML 的 ZIP，而這個工具要寫出的資料量很小，
 * 不壓縮完全可以接受。自己實作可以省下一個有已知漏洞且已停止維護的依賴。
 */

export interface ZipEntry {
  name: string
  data: Uint8Array
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c >>> 0
  }
  return table
})()

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

export function textToBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

/**
 * 把多個檔案打包成一個 ZIP。
 *
 * 時間戳一律寫成固定值，讓同樣的輸入永遠產生位元組完全相同的檔案。
 */
export function createZip(entries: ZipEntry[]): Uint8Array {
  const LOCAL_HEADER_SIZE = 30
  const CENTRAL_HEADER_SIZE = 46
  const EOCD_SIZE = 22
  const DOS_TIME = 0
  const DOS_DATE = 0x21 // 1980-01-01

  const prepared = entries.map((entry) => {
    const nameBytes = textToBytes(entry.name)
    return { nameBytes, data: entry.data, crc: crc32(entry.data) }
  })

  const localSize = prepared.reduce((sum, e) => sum + LOCAL_HEADER_SIZE + e.nameBytes.length + e.data.length, 0)
  const centralSize = prepared.reduce((sum, e) => sum + CENTRAL_HEADER_SIZE + e.nameBytes.length, 0)

  const buffer = new Uint8Array(localSize + centralSize + EOCD_SIZE)
  const view = new DataView(buffer.buffer)
  let offset = 0

  const offsets: number[] = []

  for (const entry of prepared) {
    offsets.push(offset)
    view.setUint32(offset, 0x04034b50, true)
    view.setUint16(offset + 4, 20, true) // 解壓縮所需版本
    view.setUint16(offset + 6, 0x0800, true) // 檔名使用 UTF-8
    view.setUint16(offset + 8, 0, true) // 不壓縮
    view.setUint16(offset + 10, DOS_TIME, true)
    view.setUint16(offset + 12, DOS_DATE, true)
    view.setUint32(offset + 14, entry.crc, true)
    view.setUint32(offset + 18, entry.data.length, true)
    view.setUint32(offset + 22, entry.data.length, true)
    view.setUint16(offset + 26, entry.nameBytes.length, true)
    view.setUint16(offset + 28, 0, true)
    offset += LOCAL_HEADER_SIZE

    buffer.set(entry.nameBytes, offset)
    offset += entry.nameBytes.length
    buffer.set(entry.data, offset)
    offset += entry.data.length
  }

  const centralStart = offset

  prepared.forEach((entry, index) => {
    view.setUint32(offset, 0x02014b50, true)
    view.setUint16(offset + 4, 20, true)
    view.setUint16(offset + 6, 20, true)
    view.setUint16(offset + 8, 0x0800, true)
    view.setUint16(offset + 10, 0, true)
    view.setUint16(offset + 12, DOS_TIME, true)
    view.setUint16(offset + 14, DOS_DATE, true)
    view.setUint32(offset + 16, entry.crc, true)
    view.setUint32(offset + 20, entry.data.length, true)
    view.setUint32(offset + 24, entry.data.length, true)
    view.setUint16(offset + 28, entry.nameBytes.length, true)
    view.setUint16(offset + 30, 0, true)
    view.setUint16(offset + 32, 0, true)
    view.setUint16(offset + 34, 0, true)
    view.setUint16(offset + 36, 0, true)
    view.setUint32(offset + 38, 0, true)
    view.setUint32(offset + 42, offsets[index], true)
    offset += CENTRAL_HEADER_SIZE

    buffer.set(entry.nameBytes, offset)
    offset += entry.nameBytes.length
  })

  view.setUint32(offset, 0x06054b50, true)
  view.setUint16(offset + 4, 0, true)
  view.setUint16(offset + 6, 0, true)
  view.setUint16(offset + 8, prepared.length, true)
  view.setUint16(offset + 10, prepared.length, true)
  view.setUint32(offset + 12, offset - centralStart, true)
  view.setUint32(offset + 16, centralStart, true)
  view.setUint16(offset + 20, 0, true)

  return buffer
}
