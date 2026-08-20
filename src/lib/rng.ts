/**
 * 可重現的偽亂數產生器。
 *
 * 使用 mulberry32：狀態小、分佈品質對本工具足夠，且同一個種子必定產生
 * 完全相同的序列 —— 這是「分享連結後對方看到同一張表」的前提。
 */
export type Rng = () => number

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 產生一個新的隨機種子，範圍 0 ~ 2^32-1。 */
export function randomSeed(): number {
  return Math.floor(Math.random() * 4294967296) >>> 0
}

/** 把種子轉成方便閱讀與分享的 8 碼十六進位字串。 */
export function seedToString(seed: number): string {
  return (seed >>> 0).toString(16).padStart(8, '0').toUpperCase()
}

/** 解析使用者輸入或網址上的種子字串，失敗時回傳 null。 */
export function seedFromString(value: string): number | null {
  const trimmed = value.trim()
  if (!/^[0-9a-fA-F]{1,8}$/.test(trimmed)) return null
  return parseInt(trimmed, 16) >>> 0
}
