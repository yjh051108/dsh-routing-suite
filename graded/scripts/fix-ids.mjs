/**
 * fix-ids — 全盘修复会话日志里"无 id 的 user/assistant 消息"（DSH identified-message 校验）。
 * 背景：deferContext 空用户消息缺 id → SessionPersistenceCorruptionError（历史加载失败）。
 * 读取用 python zstandard（跨帧流解压，Node zstdDecompressSync 只解第一帧）；
 * 重写为官方 2 帧格式（header 一帧 + 全部事件一帧，checksum），与持久化写器一致。
 * 用法：node scripts/fix-ids.mjs
 */
import { execFileSync } from 'node:child_process'
import { writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { zstdCompressSync, constants } from 'node:zlib'

const CHECKSUM_OPTIONS = { params: { [constants.ZSTD_c_checksumFlag]: 1 } }
const DSH = 'PATH_TO_DSH_HOME/sessions'

function zstdReadPy(zpath) {
  try {
    return execFileSync('python', ['-c',
      "import sys,zstandard as z; " +
      "sys.stdout.write(z.ZstdDecompressor().stream_reader(open(sys.argv[1],'rb')).read().decode('utf-8',errors='replace'))",
      zpath], { maxBuffer: 300 * 1024 * 1024 }).toString('utf-8')
  } catch (e) {
    console.error('read fail:', zpath, String(e).slice(0, 80))
    return null
  }
}

let scanned = 0, fixed = 0
for (const dir of readdirSync(DSH)) {
  const root = join(DSH, dir)
  if (!existsSync(root)) continue
  for (const sdir of readdirSync(root)) {
    const zpath = join(root, sdir, 'session.jsonl.zstd')
    if (!existsSync(zpath)) continue
    scanned++
    const text = zstdReadPy(zpath)
    if (!text) continue
    const lines = text.split('\n').filter(Boolean)
    const out = []
    let changed = false
    for (const ln of lines) {
      try {
        const ev = JSON.parse(ln)
        const data = ev.data || {}
        if (ev.type === 'user/message' && !data.id) {
          data.id = 'graded-repair-' + (ev.seq ?? Math.floor(Math.random() * 1e9))
          changed = true
        } else if (ev.type === 'assistant/message' && data.message && !data.message.id) {
          data.message.id = 'graded-repair-' + (ev.seq ?? Math.floor(Math.random() * 1e9))
          changed = true
        }
        out.push(JSON.stringify(ev))
      } catch {
        out.push(ln)
      }
    }
    if (!changed) continue
    const header = out[0]
    const rest = out.slice(1)
    const buf = Buffer.concat([
      zstdCompressSync(Buffer.from(header + '\n', 'utf-8'), CHECKSUM_OPTIONS),
      zstdCompressSync(Buffer.from(rest.join('\n') + '\n', 'utf-8'), CHECKSUM_OPTIONS),
    ])
    writeFileSync(zpath, buf)
    fixed++
    console.log('FIXED', sdir)
  }
}
console.log(`scanned=${scanned} fixed=${fixed}`)
