#!/usr/bin/env node
/**
 * measure.mjs — 会话导出文件的公开测量工具（脱敏：只输出计数，不输出任何文本内容）。
 *
 * 用法：node scripts/measure.mjs <session.jsonl> [--json]
 *       node scripts/measure.mjs --selftest        # 小样自测
 *
 * 输出：指标行（工具调用/标定/截图/红队/模式/分三段衰减）——聚合法见 docs/STUDY.md §2。
 */
import { readFileSync } from 'node:fs'

const SEGMENTS = ['early', 'mid', 'late']

function parseEvents(path) {
  const lines = readFileSync(path, 'utf8').split('\n').filter(Boolean)
  const ev = []
  for (const line of lines) {
    try { ev.push(JSON.parse(line)) } catch { /* 跳过非 JSON 行 */ }
  }
  return ev
}

function measure(ev) {
  const tools = {}, marks = []
  let readImages = 0, redteam = 0
  const texts = []
  for (const o of ev) {
    const t = o?.type, d = o?.data
    if (t === 'tool/call') {
      const n = d?.name
      if (n === 'mark_task') marks.push({ level: JSON.parse(d.arguments || '{}')?.level, title: JSON.parse(d.arguments || '{}')?.title })
      else tools[n] = (tools[n] || 0) + 1
      if (n === 'read_image') readImages++
      if (n === 'redteam_verdict') redteam++
    }
  }
  const totalTools = Object.values(tools).reduce((a, b) => a + b, 0)
  // 分段：按事件索引三等分（早/中/晚）——工具调用按分段切
  const n = ev.length
  const segStats = SEGMENTS.map((name, i) => {
    const part = ev.slice(Math.floor(n * i / 3), Math.floor(n * (i + 1) / 3))
    const toolsInSeg = part.filter((o) => o?.type === 'tool/call')
    return {
      name,
      tools: toolsInSeg.length, // 事件级（含标定——口径同"tool/call 事件总数"）
      readImages: toolsInSeg.filter((o) => o?.data?.name === 'read_image').length,
    }
  })
  return {
    tools: totalTools,
    toolBreakdown: tools,
    marks: marks.length,
    markL2: marks.filter((m) => m.level === 'L2').length,
    markL1: marks.filter((m) => m.level === 'L1').length,
    readImages,
    redteam,
    segments: segStats,
  }
}

function textRow(m) {
  return [
    `tools=${m.tools}`,
    `read_image=${m.readImages}`,
    `marks=${m.marks}(L2:${m.markL2},L1:${m.markL1})`,
    `redteam=${m.redteam}`,
    `segments=${m.segments.map((s) => `${s.name}:${s.tools}t/${s.readImages}r`).join(' ')}`,
  ].join(' | ')
}

function selftest() {
  // 小样夹具：10 事件 → 3 工具调用（1 read_image + 2 pwsh）+ 2 标定 + 若干非工具
  const ev = []
  const push = (type, data) => ev.push({ type, data })
  for (let i = 0; i < 4; i++) push('user/message', { content: [{ type: 'text', text: `hello ${i}` }] })
  push('tool/call', { name: 'pwsh', arguments: JSON.stringify({ command: 'ls' }) })
  push('tool/call', { name: 'read_image', arguments: JSON.stringify({ file_path: 'x.png' }) })
  for (let i = 0; i < 3; i++) push('user/message', { content: [{ type: 'text', text: `mid ${i}` }] })
  push('tool/call', { name: 'pwsh', arguments: JSON.stringify({ command: 'pwd' }) })
  push('tool/call', { name: 'mark_task', arguments: JSON.stringify({ level: 'L2', title: '项', status: 'completed' }) })
  push('tool/call', { name: 'mark_task', arguments: JSON.stringify({ level: 'L1', title: '组', status: 'completed' }) })
  push('tool/result', { message: { content: [{ type: 'tool-result', text: 'ok' }] } })
  const m = measure(ev)
  const ok = m.tools === 3 && m.readImages === 1 && m.marks === 2 && m.markL2 === 1 && m.markL1 === 1 && m.redteam === 0 && m.segments.reduce((a, b) => a + b.tools, 0) === 5
  if (!ok) { console.error('SELFTEST FAIL', JSON.stringify(m)); process.exit(1) }
  console.log('SELFTEST OK |', textRow(m))
  return m
}

const args = process.argv.slice(2)
if (args[0] === '--selftest') selftest()
else if (args[0]) {
  const m = measure(parseEvents(args[0]))
  console.log(args[1] === '--json' ? JSON.stringify(m) : textRow(m))
} else {
  console.error('用法: node scripts/measure.mjs <session.jsonl> [--json] | --selftest')
  process.exit(1)
}
