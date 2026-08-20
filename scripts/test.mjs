/**
 * 跑 src/lib 與 tests 的單元測試。
 *
 * Node 的 ESM 解析器要求相對匯入必須寫出副檔名，但原始碼是給打包工具用的
 * 無副檔名寫法，所以這裡先用 tsc 編成 CommonJS 再交給 node --test。
 * package.json 標記的是 "type": "module"，因此輸出目錄要自己補一個
 * "type": "commonjs" 覆蓋掉它。
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'

const OUT_DIR = '.test-build'

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

run('tsc', ['-p', 'tsconfig.test.json'])

mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(`${OUT_DIR}/package.json`, JSON.stringify({ type: 'commonjs' }))

run('node', ['--test', `${OUT_DIR}/tests/*.test.js`])
