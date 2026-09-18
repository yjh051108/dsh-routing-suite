/**
 * preset 契约校验：`agent.cordis.yml` 的 persona 行必须与**运行中部署**的
 * `@deepseek-ai/dsh-persona` schema 对齐，发行 tgz 内的 composition 必须与包内逐字节一致。
 *
 * 为什么要有这一项：schema 改名时行内字段没跟着改，preset 会在挂载期失败，而用户
 * 看到的是选择器报「无法切换到 <preset>」。三份 preset 都踩过这个坑——persona 行写的
 * 是 schema 改名前的 `text`，而当前契约要求必填 `prefix`：
 *
 *   failed to apply loader entry persona (@deepseek-ai/dsh-persona): invalid config:
 *     - $.prefix missing required value
 *
 * 契约来源优先取安装部署里 dsh-persona 的源码，其次取其已构建产物；两者都取不到时
 * 回退快照，并由「schema 来源」一项把这种退化显式判失败——否则 dsh 升级改名后本校验
 * 会静默失效。
 */
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const HERE = dirname(fileURLToPath(import.meta.url))
const PRESETS = ['router-standard', 'router-spec', 'router-react'].map((name) => `${name}/agent.cordis.yml`)

/** schema 改名后必须被拒绝的历史键名 → 正确键名。 */
const RENAMED_KEYS = { text: 'prefix', persona: 'prefix' }

function parseZodFields(text) {
  const start = text.indexOf('Config = z.object({')
  if (start < 0) return null
  const body = text.slice(start)
  const end = body.indexOf('\n});')
  const scope = end < 0 ? body : body.slice(0, end)
  const required = []
  const optional = []
  for (const line of scope.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_$][\w$]*)\s*:\s*([^\n]+?),?\s*$/)
    if (!m) continue
    if (/\.default\(/.test(m[2])) optional.push(m[1])
    else required.push(m[1])
  }
  return required.length ? { required, optional } : null
}

function readInstalledPersona(pkgDir) {
  for (const rel of [['src', 'index.ts'], ['lib', 'index.js']]) {
    const file = join(pkgDir, rel[0], rel[1])
    if (!existsSync(file)) continue
    const parsed = parseZodFields(readFileSync(file, 'utf8'))
    if (parsed) return { origin: `installed:${file}`, ...parsed }
  }
  return null
}

function discoverSchema() {
  const candidates = []
  if (process.env.DSH_DEPLOY_NODE_MODULES) {
    candidates.push(join(process.env.DSH_DEPLOY_NODE_MODULES, '@deepseek-ai', 'dsh-persona'))
  }
  let cursor = HERE
  for (let i = 0; i < 10; i++) {
    const scope = join(cursor, 'node_modules', '@deepseek-ai')
    if (existsSync(scope)) {
      for (const name of readdirSync(scope)) {
        if (name === 'dsh-persona') candidates.push(join(scope, name))
      }
    }
    const parent = dirname(cursor)
    if (parent === cursor) break
    cursor = parent
  }
  if (process.env.LOCALAPPDATA) {
    const npx = join(process.env.LOCALAPPDATA, 'npm-cache', '_npx')
    if (existsSync(npx)) {
      for (const hash of readdirSync(npx)) candidates.push(join(npx, hash, 'node_modules', '@deepseek-ai', 'dsh-persona'))
    }
  }
  for (const dir of candidates) {
    const found = readInstalledPersona(dir)
    if (found) return found
  }
  return { origin: 'snapshot', required: ['prefix'], optional: ['suffix', 'complete', 'includeRuntimeContext'] }
}

/** 摘出 composition 里每个 entry 的模块名与 config 字段（行扫描，不引 YAML 库）。 */
function parseRows(text, file) {
  const rows = []
  let current = null
  let inConfig = false
  let indent = 0
  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^\s*#/.test(line) || /^\s*$/.test(line)) continue
    const entry = line.match(/^(\s*)- id:\s*(\S+)\s*$/)
    if (entry) {
      if (current) rows.push(current)
      current = { line: i + 1, configLine: i + 1, moduleName: null, fields: [], file }
      inConfig = false
      continue
    }
    if (!current) continue
    const module = line.match(/^\s{2,}name:\s*(\S+)\s*$/)
    if (module && current.moduleName === null) {
      current.moduleName = module[1].replace(/^['"]|['"]$/g, '')
      continue
    }
    const config = line.match(/^(\s*)config:\s*$/)
    if (config) {
      inConfig = true
      indent = config[1].length
      current.configLine = i + 1
      continue
    }
    if (inConfig) {
      const lead = (line.match(/^(\s*)\S/) || [, ''])[1].length
      if (lead <= indent) { inConfig = false; continue }
      const key = line.match(/^(\s*)([A-Za-z_$][\w$-]*):(?:\s|$)/)
      if (key) current.fields.push({ key: key[2], line: i + 1 })
    }
  }
  if (current) rows.push(current)
  return rows
}

function checkComposition(file, schema) {
  const allowed = new Set([...(schema.required || []), ...(schema.optional || [])])
  const findings = []
  for (const row of parseRows(readFileSync(file, 'utf8'), file)) {
    if (row.moduleName !== '@deepseek-ai/dsh-persona') continue
    for (const field of row.fields) {
      if (RENAMED_KEYS[field.key]) {
        findings.push(
          `${file}:${field.line} persona 行使用了历史字段名 "${field.key}"——当前契约要求 ` +
          `"${RENAMED_KEYS[field.key]}"；否则整份 preset 挂载失败：$.${RENAMED_KEYS[field.key]} missing required value`,
        )
        continue
      }
      if (!allowed.has(field.key)) {
        findings.push(
          `${file}:${field.line} persona 行有契约未声明的字段 "${field.key}"` +
          `（契约字段：${[...allowed].join(', ')}；来源：${schema.origin}）`,
        )
      }
    }
    if (!row.fields.some((f) => f.key === 'prefix')) {
      findings.push(`${file}:${row.configLine} persona 行缺少必填字段 prefix`)
    }
  }
  return findings
}

const schema = discoverSchema()

test('persona 行字段符合当前 dsh-persona schema', () => {
  const findings = PRESETS.flatMap((rel) => checkComposition(join(HERE, rel), schema))
  assert.equal(
    findings.length,
    0,
    `\n${findings.join('\n')}\n契约来源: ${schema.origin}\n必填: ${schema.required.join(', ')}｜可选: ${schema.optional.join(', ')}`,
  )
})

test('校验用的是运行中部署的 schema（非仅有快照）', () => {
  assert.match(
    schema.origin,
    /^installed:/,
    `未能从已安装 dsh-persona 读到契约，当前回退快照（${schema.origin}）——dsh 升级改名后本校验会静默失效`,
  )
})

test('发行 tgz 与包内 composition 逐字节一致', () => {
  const tgzs = readdirSync(HERE).filter((f) => f.endsWith('.tgz'))
  assert.ok(tgzs.length >= 1, `包根未找到发行 tgz（${HERE}）；打新包后须重跑本项`)
  for (const relative of PRESETS) {
    const source = readFileSync(join(HERE, relative))
    for (const tgz of tgzs) {
      const res = spawnSync('tar', ['-xOf', join(HERE, tgz), `package/${relative}`], { maxBuffer: 32 * 1024 * 1024 })
      if (res.status !== 0) continue
      assert.ok(res.stdout.equals(source), `${tgz} 内 ${relative} 与包内不一致（归档回灌旧字段）`)
    }
  }
})
