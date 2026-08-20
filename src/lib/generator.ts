import { mulberry32, type Rng } from './rng'

export interface GeneratorOptions {
  /** 專案數量，也就是表格的列數。 */
  numProjects: number
  /** 天數，也就是表格的欄數。 */
  numDays: number
  /** 每天工時總和的下限。 */
  minHours: number
  /** 每天工時總和的上限。 */
  maxHours: number
  /** 單一專案單日可分配的工時上限。 */
  maxPerProject: number
  /** 亂數種子；相同種子搭配相同參數必定產生相同結果。 */
  seed: number
}

/** `matrix[projectIndex][dayIndex]` = 該專案在該天分配到的工時。 */
export type HoursMatrix = number[][]

export interface ValidationError {
  field: keyof GeneratorOptions
  message: string
}

export const LIMITS = {
  numProjects: { min: 1, max: 20 },
  numDays: { min: 1, max: 31 },
  hours: { min: 1, max: 12 },
  maxPerProject: { min: 1, max: 8 },
} as const

/**
 * 檢查參數組合是否有解。
 *
 * 最容易踩到的坑是「專案太少、工時上限太低，湊不出最小工時」，
 * 例如 2 個專案、每案上限 3 小時，最多只有 6 小時，卻要求每天至少 7 小時。
 */
export function validate(options: GeneratorOptions): ValidationError[] {
  const errors: ValidationError[] = []
  const { numProjects, numDays, minHours, maxHours, maxPerProject } = options

  if (!Number.isInteger(numProjects) || numProjects < LIMITS.numProjects.min || numProjects > LIMITS.numProjects.max) {
    errors.push({ field: 'numProjects', message: `專案數量需介於 ${LIMITS.numProjects.min} ~ ${LIMITS.numProjects.max}` })
  }
  if (!Number.isInteger(numDays) || numDays < LIMITS.numDays.min || numDays > LIMITS.numDays.max) {
    errors.push({ field: 'numDays', message: `天數需介於 ${LIMITS.numDays.min} ~ ${LIMITS.numDays.max}` })
  }
  if (!Number.isInteger(maxPerProject) || maxPerProject < LIMITS.maxPerProject.min || maxPerProject > LIMITS.maxPerProject.max) {
    errors.push({ field: 'maxPerProject', message: `單案上限需介於 ${LIMITS.maxPerProject.min} ~ ${LIMITS.maxPerProject.max}` })
  }
  if (minHours > maxHours) {
    errors.push({ field: 'minHours', message: '最小工時不可大於最大工時' })
  }

  const capacity = numProjects * maxPerProject
  if (errors.length === 0 && minHours > capacity) {
    errors.push({
      field: 'minHours',
      message: `${numProjects} 個專案 × 每案上限 ${maxPerProject} 小時 = 最多 ${capacity} 小時，湊不出最小工時 ${minHours}`,
    })
  }

  return errors
}

/**
 * 計算「用 slots 個專案、每個 0~cap 小時，湊出總和 s」的組合數。
 *
 * 回傳的 `table[i][s]` 代表還剩 i 個專案要分配、總和必須是 s 時的組合數。
 * 有了這張表就能逐格依真實比例抽樣，得到在所有合法組合上均勻分佈的結果，
 * 不需要像原版那樣不斷重抽直到碰巧符合條件。
 */
function countTable(slots: number, cap: number, maxSum: number): number[][] {
  const table: number[][] = Array.from({ length: slots + 1 }, () => new Array<number>(maxSum + 1).fill(0))
  table[0][0] = 1

  for (let i = 1; i <= slots; i++) {
    for (let s = 0; s <= maxSum; s++) {
      let total = 0
      for (let v = 0; v <= Math.min(cap, s); v++) {
        total += table[i - 1][s - v]
      }
      table[i][s] = total
    }
  }

  return table
}

/**
 * 在所有「總和為 target、每格 0~cap」的組合中均勻抽出一組。
 */
function sampleComposition(slots: number, cap: number, target: number, table: number[][], rng: Rng): number[] {
  const result: number[] = []
  let remaining = target

  for (let i = slots; i >= 1; i--) {
    const total = table[i][remaining]
    let threshold = rng() * total
    let picked = Math.min(cap, remaining)

    for (let v = 0; v <= Math.min(cap, remaining); v++) {
      threshold -= table[i - 1][remaining - v]
      if (threshold < 0) {
        picked = v
        break
      }
    }

    result.push(picked)
    remaining -= picked
  }

  return result
}

/**
 * 產生工時分配表。
 *
 * 每一天先在 [minHours, maxHours] 中挑一個合法的總工時，再把它均勻拆給各專案。
 */
export function generate(options: GeneratorOptions): HoursMatrix {
  const errors = validate(options)
  if (errors.length > 0) {
    throw new Error(errors[0].message)
  }

  const { numProjects, numDays, minHours, maxHours, maxPerProject, seed } = options
  const rng = mulberry32(seed)

  const capacity = numProjects * maxPerProject
  const effectiveMax = Math.min(maxHours, capacity)
  const table = countTable(numProjects, maxPerProject, effectiveMax)

  // 每天總和只能落在這些值上，且必須真的有組合存在。
  const feasibleTotals: number[] = []
  for (let total = minHours; total <= effectiveMax; total++) {
    if (table[numProjects][total] > 0) feasibleTotals.push(total)
  }

  const matrix: HoursMatrix = Array.from({ length: numProjects }, () => new Array<number>(numDays).fill(0))

  for (let day = 0; day < numDays; day++) {
    const dailyTotal = feasibleTotals[Math.floor(rng() * feasibleTotals.length)]
    const column = sampleComposition(numProjects, maxPerProject, dailyTotal, table, rng)
    for (let project = 0; project < numProjects; project++) {
      matrix[project][day] = column[project]
    }
  }

  return matrix
}

/** 每一天的工時總和，用來在表尾顯示與驗算。 */
export function dailyTotals(matrix: HoursMatrix): number[] {
  if (matrix.length === 0) return []
  return matrix[0].map((_, day) => matrix.reduce((sum, row) => sum + row[day], 0))
}

/** 每個專案跨越所有天數的工時總和。 */
export function projectTotals(matrix: HoursMatrix): number[] {
  return matrix.map((row) => row.reduce((sum, value) => sum + value, 0))
}
