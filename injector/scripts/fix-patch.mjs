#!/usr/bin/env node
/**
 * dsh-super-injector — profile patch 修复器（零依赖，独立运行）。
 *
 * 用途：dsh 启动崩溃且报 `duplicate loader entry id: <xxx>` 时，说明
 * ~/.dsh/profiles/<profile>/cordis.patch.yml 里存在重复 id 条目（手动 patch
 * 两次 / 重复安装 / 多路径写入造成）。此时注入器自身无法启动，只有本脚本
 * 能救——它不依赖 dsh，也不依赖任何 npm 包，node 直接跑。
 *
 * 行为：
 *  1. 扫描所有 profile 的 cordis.patch.yml（或 --profile 指定一个）；
 *  2. 按 entry id 去重（同 id 保留最后一条；注释保留；顶层 [] 清理）；
 *  3. 修复前自动备份为 cordis.patch.yml.bak-<时间戳>；
 *  4. 输出每处修复（哪个 profile、哪个 id 重复、删了几条）。
 *
 * 用法：
 *  node scripts/fix-patch.mjs                 # 修复全部 profile
 *  node scripts/fix-patch.mjs --profile web   # 只修 web profile
 *  node scripts/fix-patch.mjs --check         # 只检查不写（退出码 0=健康 1=有重复）
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, renameSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'

const args = process.argv.slice(2)
const onlyProfile = args.includes('--profile') ? args[args.indexOf('--profile') + 1] : null
const checkOnly = args.includes('--check')

/** 切分 patch 内容为条目块（`- id:` 及其子行 + 前置注释），返回块列表与杂散行。 */
function extractBlocks(content) {
  const lines = content.split('\n')
  const blocks = []
  let current = null
  for (const line of lines) {
    const idMatch = /^\s*- id:\s*([^\s#]+)/.exec(line)
    if (idMatch) {
      if (current) blocks.push(current)
      current = { id: idMatch[1], text: line }
    } else if (current) {
      current.text += '\n' + line
    } else if (line.trim() !== '' && !/^\s*#/.test(line) && !/^\s*\[\]\s*$/.test(line)) {
      blocks.push({ id: undefined, text: line })
    }
  }
  if (current) blocks.push(current)
  return blocks
}

/** 去重：同 id 保留最后一条；返回 {text, removed:[{id, count}]}。 */
function dedupe(content) {
  const blocks = extractBlocks(content)
  const seen = new Set()
  const removed = []
  const kept = []
  for (const b of blocks) {
    if (b.id) {
      if (seen.has(b.id)) {
        const rec = removed.find((r) => r.id === b.id)
        if (rec) rec.count += 1
        else removed.push({ id: b.id, count: 1 })
        continue
      }
      seen.add(b.id)
    }
    kept.push(b.text)
  }
  return { text: kept.join('\n'), removed }
}

function fixFile(patchFile) {
  let content
  try {
    content = readFileSync(patchFile, 'utf8')
  } catch {
    return { ok: false, error: '读取失败（跳过）' }
  }
  const { text, removed } = dedupe(content)
  if (removed.length === 0) return { ok: true, clean: true, removed: [] }
  if (!checkOnly) {
    const bak = patchFile + '.bak-' + Date.now()
    try {
      mkdirSync(dirname(patchFile), { recursive: true })
      renameSync(patchFile, bak)
      // 末尾补回单个换行，保持文件以换行结尾
      writeFileSync(patchFile, text.replace(/\s*$/, '') + '\n', 'utf8')
    } catch (e) {
      return { ok: false, error: String(e?.message ?? e), removed }
    }
  }
  return { ok: true, clean: false, removed, backup: checkOnly ? undefined : patchFile + '.bak-*' }
}

function main() {
  const profilesRoot = join(homedir(), '.dsh', 'profiles')
  let profileDirs = []
  try {
    profileDirs = readdirSync(profilesRoot).filter((d) => !d.startsWith('.'))
  } catch {
    console.error('未找到 profiles 目录: ' + profilesRoot)
    process.exit(2)
  }
  if (onlyProfile) profileDirs = profileDirs.filter((d) => d === onlyProfile)
  if (profileDirs.length === 0) {
    console.error(checkOnly ? '未找到 profile: ' + onlyProfile : '未找到任何 profile')
    process.exit(2)
  }

  let foundAny = false
  let fixedAny = false
  for (const profile of profileDirs) {
    const patchFile = join(profilesRoot, profile, 'cordis.patch.yml')
    if (!existsSync(patchFile)) continue
    const r = fixFile(patchFile)
    if (r.error) {
      console.log(`[${profile}] cordis.patch.yml ${r.error}`)
      continue
    }
    foundAny = true
    if (r.clean) {
      console.log(`[${profile}] 健康：无重复 id`)
      continue
    }
    fixedAny = true
    for (const rec of r.removed) {
      console.log(`[${profile}] 修复：id "${rec.id}" 重复，删除 ${rec.count} 条（保留最后一条）`)
    }
    if (!checkOnly) console.log(`[${profile}] 已重写（原文件备份为 ${patchFile}.bak-<时间戳>）`)
  }
  if (!foundAny) {
    console.log('未找到任何 cordis.patch.yml（全部 profile 都是全新未 patch？）')
    process.exit(0)
  }
  if (checkOnly) {
    process.exit(fixedAny ? 1 : 0)
  }
  console.log(fixedAny ? '\n✅ 修复完成，现在可以重新启动 dsh' : '\n✅ 无需修复')
}

main()
