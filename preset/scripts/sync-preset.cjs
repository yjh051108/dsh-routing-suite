#!/usr/bin/env node
// sync-preset.cjs — 把 preset 源码同步成「bundle 包发布形态」（DSH 0.2.x）
//
// DSH 0.2.x 起，agent preset 不再从 $DSH_HOME/.agent-presets/ 目录扫描加载，
// 而是由 profile bundle 的 cordis.patch.yml 声明（id: preset-<id> / name: @deepseek-ai/dsh-agent-preset）。
// 因此本脚本不再有「运行目录」概念：源码目录就是发布内容。
//
// 做三件事：
//   1. 用无版本别名重生成带版本号的 router-bootstrap-vN.mjs / router-core-vN.mjs（保持两侧一致）
//   2. 跑 selftest
//   3. --bump：把仓库根 cordis.patch.yml 里本 preset 包子路径的 ?v=N 自增（绕 ESM 缓存）
//
// 用法：node scripts/sync-preset.cjs <router-standard|router-react|router-spec> [--bump]

const fs = require('node:fs')
const path = require('node:path')
const { execSync } = require('node:child_process')

const REQ = path.resolve(__dirname, '..', '..') // 仓库根
const P = path.join(REQ, 'preset')               // preset 源码根
const PATCH = path.join(REQ, 'cordis.patch.yml') // bundle patch（声明 preset 行）

const PRESETS = {
  'router-standard': 'router-standard',
  'router-react': 'router-react',
  'router-spec': 'router-spec',
}

function die(msg) { console.error('[sync-preset] ' + msg); process.exit(1) }

function readTargetVersion(srcDir) {
  const cfg = fs.readFileSync(path.join(srcDir, 'agent.cordis.yml'), 'utf8')
  const m = cfg.match(/router-bootstrap-v(\d+)\.mjs/)
  if (!m) return null
  return { ver: 'v' + m[1], num: m[1] }
}

function bumpPatchQueries(presetId) {
  let text = fs.readFileSync(PATCH, 'utf8')
  const bumped = []
  const next = text.replace(/(\.mjs)(\?v=)(\d+)/g, (whole, base, q, n) => {
    bumped.push(base + q + n + ' -> ' + base + q + (Number(n) + 1))
    return base + q + (Number(n) + 1)
  })
  if (!bumped.length) { console.log('  cordis.patch.yml 内无 .mjs?v=N 引用（无需 bump）'); return }
  fs.writeFileSync(PATCH, next)
  console.log('  cordis.patch.yml ?v bumped（' + presetId + '）: ' + bumped.join(', '))
}

function syncPreset(name, doBump) {
  if (!PRESETS[name]) die('未知预设: ' + name + '（可选 ' + Object.keys(PRESETS).join(' | ') + '）')
  const srcDir = path.join(P, PRESETS[name])
  if (!fs.existsSync(srcDir)) die('源码目录不存在: ' + srcDir)
  const t = readTargetVersion(srcDir)
  if (!t) die('源码 agent.cordis.yml 未找到 router-bootstrap-vN.mjs 引用')
  console.log('\n== 同步 ' + name + ' (' + t.ver + ') ==')

  // 1. 重生成带版本号 bootstrap/core（以无版本别名为编辑基准）
  const boot = fs.readFileSync(path.join(srcDir, 'router-bootstrap.mjs'), 'utf8')
  const bootV = boot.replace(/from ['"]\.\/router-core\.mjs['"]/, "from './router-core-" + t.ver + ".mjs'")
  fs.writeFileSync(path.join(srcDir, 'router-bootstrap-' + t.ver + '.mjs'), bootV)
  console.log('  生成 router-bootstrap-' + t.ver + '.mjs')

  const core = fs.readFileSync(path.join(srcDir, 'router-core.mjs'), 'utf8')
  fs.writeFileSync(path.join(srcDir, 'router-core-' + t.ver + '.mjs'), core)
  console.log('  生成 router-core-' + t.ver + '.mjs')

  // 2. selftest
  const selftest = path.join(srcDir, 'router-bootstrap-' + t.ver + '.selftest.mjs')
  if (fs.existsSync(selftest)) {
    try {
      const out = execSync('node "' + selftest + '"', { encoding: 'utf8', timeout: 20000 })
      console.log('  selftest: ' + out.trim())
    } catch (e) {
      console.error('  selftest FAILED: ' + (e.stdout || e.message))
      process.exitCode = 1
    }
  } else {
    console.log('  (无 selftest，跳过验证)')
  }

  // 3. 可选 bump
  if (doBump) bumpPatchQueries(name)
  console.log('== 完成 ' + name + ' (' + t.ver + ') ==')
}

const [name, flag] = process.argv.slice(2)
if (!name) die('用法: node scripts/sync-preset.cjs <preset> [--bump]')
syncPreset(name, flag === '--bump')
