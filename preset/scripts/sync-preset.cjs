#!/usr/bin/env node
// sync-preset.cjs — 一键把 preset 源码同步到 DSH 运行目录（.agent-presets）
//
// 替代 routing-probe 里散落的 sync-*-v*.cjs。
// 编辑基准：源码目录的无版本别名（router-bootstrap.mjs / router-core.mjs）
// 生成：带版本号 router-bootstrap-vN.mjs + router-core-vN.mjs 到运行目录
// 并：复制 agent.cordis.yml / preset.yml / gitbash-executor.mjs / selftest，bump ?v=N，跑 selftest
//
// 用法：node scripts/sync-preset.cjs <router-standard|router-react|router-spec> [--bump]
//
// 稳定原则：
//  - 源码是唯一编辑基准（改无版本别名）；
//  - 运行目录是版本快照（agent.cordis.yml 指向 -vN）；
//  - --bump 只在需要绕 ESM 缓存时用（递增源码+运行目录两侧的 ?v=N，保持一致）。

const fs = require('node:fs')
const path = require('node:path')
const { execSync } = require('node:child_process')

const REQ = path.resolve(__dirname, '..') // preset 仓库根
const P = path.join(REQ, 'preset')         // preset/preset 源码根

// DSH_HOME = dsh 的 .dsh 根目录。
// 注意坑（本部署实测）：user shell 的 HOME/USERPROFILE 是 Administrator，
// 但真实 profile/agent-presets 在 Eldwen 用户下（dsh 进程 homedir=Administrator 却吃到 Eldwen）。
// 所以：优先用 DSH_HOME 环境变量（dsh 启动器真实设置值）；否则用当前用户的
// 主目录（os.homedir()），绝不硬编码某个用户名——不同机器/不同账户都能跑。
const DSH_HOME = process.env.DSH_HOME || require('node:os').homedir()
const AGENT = path.join(DSH_HOME, '.dsh', '.agent-presets')

// 三大预设：源码目录名 + 运行目录候选名 + 目标版本（从源码 agent.cordis.yml 反推）
// runCandidates 按顺序探测：历史部署把 router-standard 的运行目录命名为
// `router-standard-v22`（内容其实是 v34），新部署直接叫 `router-standard`。
// 硬编码单一名字会让另一类部署直接报「运行目录不存在」。
const PRESETS = {
  'router-standard': { src: 'router-standard', runCandidates: ['router-standard-v22', 'router-standard'] },
  'router-react':    { src: 'router-react',    runCandidates: ['router-react'] },
  'router-spec':     { src: 'router-spec',     runCandidates: ['router-spec'] },
}

function die(msg) { console.error('[sync-preset] ' + msg); process.exit(1) }

/** 第一个存在的运行目录；都不存在时返回 null（调用方给出候选清单）。 */
function resolveRunDir(candidates) {
  for (const name of candidates) {
    const dir = path.join(AGENT, name)
    if (fs.existsSync(dir)) return { name, dir }
  }
  return null
}

function readTargetVersion(srcDir) {
  // 从源码 agent.cordis.yml 的 bootstrap 行提取 -vN
  const cfg = fs.readFileSync(path.join(srcDir, 'agent.cordis.yml'), 'utf8')
  const m = cfg.match(/\.\/router-bootstrap-v(\d+)\.mjs/)
  if (!m) return null
  return { ver: 'v' + m[1], num: m[1] }
}

function bumpVersionStamps(srcDir, runDir) {
  // 在源码+运行目录的 agent.cordis.yml 各递增 ?v=N（bootstrap + gitbash-executor）
  for (const [label, dir] of [['src', srcDir], ['run', runDir]]) {
    const cfgPath = path.join(dir, 'agent.cordis.yml')
    if (!fs.existsSync(cfgPath)) continue
    let cfg = fs.readFileSync(cfgPath, 'utf8')
    let changed = false
    cfg = cfg.replace(/(router-bootstrap-v\d+\.mjs\?v=)(\d+)/, (_, pre, n) => { changed = true; return pre + (Number(n) + 1) })
    cfg = cfg.replace(/(gitbash-executor\.mjs\?v=)(\d+)/, (_, pre, n) => { changed = true; return pre + (Number(n) + 1) })
    if (changed) fs.writeFileSync(cfgPath, cfg)
    console.log(`  ${label} agent.cordis.yml ?v bumped → ${(cfg.match(/\?v=\d+/g) || []).join(' ')}`)
  }
}

function syncPreset(name, doBump) {
  const p = PRESETS[name]
  if (!p) die('未知预设: ' + name + '（可选 ' + Object.keys(PRESETS).join(' | ') + '）')

  const srcDir = path.join(P, p.src)
  const run = resolveRunDir(p.runCandidates)
  if (!fs.existsSync(srcDir)) die('源码目录不存在: ' + srcDir)
  if (run === null) die(`运行目录不存在: 候选 ${p.runCandidates.join(' | ')}（在 ${AGENT} 下都没找到）`)
  const runDir = run.dir
  const runName = run.name

  const t = readTargetVersion(srcDir)
  if (!t) die('源码 agent.cordis.yml 未找到 router-bootstrap-vN.mjs 引用')

  console.log(`\n== 同步 ${name} → ${runName} (${t.ver}) ==`)

  // 1. 生成带版本号 bootstrap（替换 core import 为版本号）。
  // v1.20 同步修复：写回「源码目录」的 -vN.mjs 作为镜像（selftest/router.test 读源码 -vN.mjs）。
  // 此前只写运行目录 → 源码 -vN.mjs 永远是旧副本（编辑基准 alias 与 -vN 漂移，导致 selftest/测试读到旧代码）。
  const boot = fs.readFileSync(path.join(srcDir, 'router-bootstrap.mjs'), 'utf8')
  const bootV = boot.replace(/from ['"]\.\/router-core\.mjs['"]/, `from './router-core-${t.ver}.mjs'`)
  fs.writeFileSync(path.join(runDir, `router-bootstrap-${t.ver}.mjs`), bootV)
  fs.writeFileSync(path.join(srcDir, `router-bootstrap-${t.ver}.mjs`), bootV)
  console.log(`  生成 router-bootstrap-${t.ver}.mjs（源码 + 运行目录）`)

  // 2. 复制 core / agent.cordis.yml / preset.yml / gitbash-executor / selftest
  const copies = ['router-core.mjs', 'agent.cordis.yml', 'preset.yml', 'gitbash-executor.mjs', 'router-bootstrap-v34.selftest.mjs']
  for (const f of copies) {
    // selftest 按目标版本命名
    const target = f === 'router-bootstrap-v34.selftest.mjs' ? `router-bootstrap-${t.ver}.selftest.mjs` : f
    const sp = f === 'router-core.mjs' ? path.join(srcDir, f) : path.join(srcDir, f)
    if (!fs.existsSync(sp)) { console.log(`  跳过(源码缺): ${f}`); continue }
    fs.copyFileSync(sp, path.join(runDir, target))
  }
  // core 也要带版本号（源码 + 运行目录镜像同步，防漂移）
  const core = fs.readFileSync(path.join(srcDir, 'router-core.mjs'), 'utf8')
  fs.writeFileSync(path.join(runDir, `router-core-${t.ver}.mjs`), core)
  fs.writeFileSync(path.join(srcDir, `router-core-${t.ver}.mjs`), core)
  // 无版本别名必须与 -vN 同步：运行目录的 agent.cordis.yml 常直接引用
  // router-core.mjs / router-bootstrap.mjs（无版本戳），别名漂移会让线上跑旧代码。
  fs.writeFileSync(path.join(runDir, 'router-core.mjs'), core)
  fs.writeFileSync(path.join(runDir, 'router-bootstrap.mjs'), bootV)
  console.log(`  复制 core/agent.cordis.yml/preset.yml/gitbash/selftest → ${runName}`)

  // 3. 确认运行目录 agent.cordis.yml 指向 -vN（若不一致则修正）
  let cfg = fs.readFileSync(path.join(runDir, 'agent.cordis.yml'), 'utf8')
  if (!cfg.includes(`router-bootstrap-${t.ver}.mjs`)) {
    cfg = cfg.replace(/router-bootstrap-v\d+\.mjs/g, `router-bootstrap-${t.ver}.mjs`)
    fs.writeFileSync(path.join(runDir, 'agent.cordis.yml'), cfg)
    console.log(`  修正运行目录 agent.cordis.yml → ${t.ver}`)
  }

  // 4. bump 版本戳（可选；默认同步后源码==运行，两侧一致）
  if (doBump) bumpVersionStamps(srcDir, runDir)

  // 5. 跑 selftest 验证
  const selftestPath = path.join(runDir, `router-bootstrap-${t.ver}.selftest.mjs`)
  if (fs.existsSync(selftestPath)) {
    try {
      const out = execSync(`node "${selftestPath}"`, { encoding: 'utf8', timeout: 20000 })
      console.log('  selftest: ' + out.trim())
    } catch (e) {
      console.error('  selftest FAILED: ' + (e.stdout || e.message))
      process.exitCode = 1
    }
  } else {
    console.log('  (无 selftest，跳过验证)')
  }
  console.log(`== 完成 ${name} → ${runName} (${t.ver}) ==`)
}

const [name, flag] = process.argv.slice(2)
if (!name) die('用法: node scripts/sync-preset.cjs <preset> [--bump]')
syncPreset(name, flag === '--bump')
