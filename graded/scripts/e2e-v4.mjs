/**
 * e2e-v4 — 分级模式 v4 全流程自动化实测。
 *
 * 流程：创建会话 → 文本触发 /graded → 等模型 edit_plan(L1) → lock_stage(L1)
 * → edit_plan(L2) → lock_stage(L2)（插件自动 ask,挂起）→ mux WS 抓
 * question/requested rpcId → /api/respond 确认 → 观察 develop 注入。
 *
 * 用法：node scripts/e2e-v4.mjs [任务文本]
 */
import WebSocket from 'file:///PATH_TO_NPM_GLOBAL/node_modules/@deepseek-ai/dsh/node_modules/ws/index.js'
import { existsSync, readFileSync } from 'node:fs'
import { readdirSync } from 'node:fs'
import { zstdDecompressSync } from 'node:zlib'

const BASE = 'http://127.0.0.1:3080'
const DSH_HOME = (process.env.DSH_HOME || process.env.USERPROFILE + '/.dsh')
const TASK = process.argv[2] || '把 dsh-graded-mode 的设计理念整理成三段话'

async function rpc(method, args, rpcId = crypto.randomUUID()) {
  const res = await fetch(`${BASE}/api/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId, method, payload: args }),
  })
  const body = await res.json()
  if (!body?.result?.ok) throw new Error(`${method} failed: ${JSON.stringify(body.result?.error || body)}`)
  return body.result.value
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function sessionPath(sessionId) {
  for (const dir of readdirSync(`${DSH_HOME}/sessions`)) {
    const p = `${DSH_HOME}/sessions/${dir}/${sessionId}/session.jsonl.zstd`
    if (existsSync(p)) return p
  }
  throw new Error(`session not found: ${sessionId}`)
}

function readSession(sessionId) {
  const zpath = sessionPath(sessionId)
  return zstdDecompressSync(readFileSync(zpath)).toString('utf-8')
}

function* eventsOf(raw) {
  for (const l of raw.split('\n')) {
    if (!l.trim()) continue
    try { yield JSON.parse(l) } catch {}
  }
}

async function main() {
  // ① mux WS：抓 question/requested 帧（自动审核弹窗的 rpcId）
  const requested = new Map()
  const ws = new WebSocket(`${BASE.replace('http', 'ws')}/api/events.mux`)
  await new Promise((resolve) => ws.once('open', resolve))
  ws.on('message', (data) => {
    try {
      const frame = JSON.parse(String(data))
      const pl = frame.payload || {}
      if (pl.type === 'question/requested') requested.set(pl.sessionId, frame.rpcId)
    } catch {}
  })

  // ② 会话 + 触发
  const { sessionId } = await rpc('session.create', { cwd: 'PATH_TO_PLUGIN', agentPreset: 'standard' })
  console.log('SID', sessionId)
  await rpc('session.prompt', { sessionId, mode: 'queue', content: [{ type: 'text', text: `/graded ${TASK}` }] })

  // ③ 跟踪工具调用序列（edit_plan / lock_stage）
  const seq = []
  const seen = new Set()
  for (let i = 0; i < 90; i++) {
    await sleep(4000)
    for (const e of eventsOf(readSession(sessionId))) {
      if (e.type === 'tool/call') {
        const name = e.data?.name
        if ((name === 'edit_plan' || name === 'lock_stage') && !seen.has(e.data?.callId)) {
          seen.add(e.data?.callId)
          let level = ''
          try { level = (JSON.parse(e.data.arguments) || {}).level || '' } catch {}
          seq.push(`${name}(${level})`)
          console.log('CALL', name, level, JSON.stringify((e.data.arguments || '')).slice(0, 120))
        }
      }
      if (e.type === 'user/message') {
        const txt = (e.data?.content || []).filter((x) => x?.type === 'text').map((x) => x.text).join('')
        if (/【分级/.test(txt)) {
          const key = 'msg:' + txt.slice(0, 16)
          if (!seen.has(key)) { seen.add(key); console.log('MSG', txt.split('\n')[0].slice(0, 70)) }
        }
      }
    }
    // L1 锁定出现后即确认已见到 lock(L2)+审核?——继续等到 ask 帧
    if (requested.has(sessionId)) break
  }
  const qrpc = requested.get(sessionId)
  console.log('QRPC', qrpc || '(none)', '| seq:', seq.join(' → '))
  if (!qrpc) { ws.close(); console.error('E2E STOP: no question frame'); process.exit(1) }

  // ④ 确认
  const resp = await fetch(`${BASE}/api/respond`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'client-response',
      rpcId: qrpc,
      result: { ok: true, value: { sessionId, answer: { answers: [{ id: 'graded-plan-review', selected: ['确认'] }] } } },
    }),
  })
  console.log('RESPOND', await resp.text())

  // ⑤ 等 develop 结果文本
  for (let i = 0; i < 30; i++) {
    await sleep(4000)
    const all = [...eventsOf(readSession(sessionId))]
    const last = all[all.length - 1]
    if (last?.type === 'turn/end') {
      console.log('TURN-END', JSON.stringify(last.data?.reason || {}).slice(0, 160))
      break
    }
  }
  ws.close()
  console.log('DONE seq:', seq.join(' → '))
}

main().catch((e) => { console.error('E2E FAIL:', e); process.exit(1) })
