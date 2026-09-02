/**
 * e2e-develop — 分级模式 confirm→develop→final 全链路自动化实测。
 *
 * 流程：创建会话 → 文本触发 /graded → 等模型跑完 planning/splitting/awaiting
 * （mux WS 监听 question/requested 抓 rpcId）→ /api/respond 确认 → 等 develop
 * 阶段推进（focusL2 注入 / mark-l2 / mark-l1 / groupCheck / final）→ 打结果。
 *
 * 用法：node scripts/e2e-develop.mjs [任务文本]
 *
 * 依赖：dsh 安装的 ws 包（绝对路径 import）。
 */
import WebSocket from 'file:///PATH_TO_NPM_GLOBAL/node_modules/@deepseek-ai/dsh/node_modules/ws/index.js'
import { readFileSync, existsSync } from 'node:fs'
import { zstdRead } from './zstd-read.mjs'

const BASE = 'http://127.0.0.1:3080'
const DSH_HOME = (process.env.DSH_HOME || process.env.USERPROFILE + '/.dsh')
const TASK = process.argv[2] || '把 PATH_TO_PLUGIN/README.md 的「为什么有这个东西」一节重写为更精炼的三句,每改完一段就标记。'

/** RPC 调用（http /api/<method> 信封）。 */
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

/** wait ms. */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** 会话目录 + 最新 jsonl（zstd 解压）。 */
function sessionPath(sessionId) {
  for (const dir of readdirSync(`${DSH_HOME}/sessions`)) {
    const p = `${DSH_HOME}/sessions/${dir}/${sessionId}/session.jsonl.zstd`
    if (existsSync(p)) return p
  }
  throw new Error(`session not found: ${sessionId}`)
}

function readSession(sessionId) {
  const zpath = sessionPath(sessionId)
  return zstdRead(zpath)
}

let line = 0
function* events(sessionId) {
  const raw = readSession(sessionId)
  for (const l of raw.split('\n')) {
    if (!l.trim()) continue
    try { yield JSON.parse(l) } catch {}
  }
}

async function main() {
  // ① 打开 mux WS：收集 question/requested 帧 rpcId
  const frames = []
  const requested = new Map() // sessionId -> rpcId
  const ws = new WebSocket(`${BASE.replace('http', 'ws')}/api/events.mux`)
  await new Promise((resolve) => ws.once('open', resolve))
  ws.on('message', (data) => {
    try {
      const frame = JSON.parse(String(data))
      const pl = frame.payload || {}
      if (pl.type === 'question/requested') {
        requested.set(pl.sessionId, frame.rpcId)
        frames.push({ t: 'question/requested', rpcId: frame.rpcId, sessionId: pl.sessionId })
      }
    } catch {}
  })

  // ② 创建会话 + 触发
  const { sessionId } = await rpc('session.create', { cwd: 'PATH_TO_PLUGIN', agentPreset: 'standard' })
  console.log('SID', sessionId)
  await rpc('session.prompt', { sessionId, mode: 'queue', content: [{ type: 'text', text: `/graded ${TASK}` }] })

  // ③ 等 ask_user_question 出现（awaiting）+ mux 帧到位
  let qrpc = null
  for (let i = 0; i < 120; i++) {
    await sleep(5000)
    qrpc = requested.get(sessionId)
    const evs = [...events(sessionId)]
    const asked = evs.some((e) => e.type === 'tool/call' && e.data?.name === 'ask_user_question')
    if (qrpc && asked) break
    if (i % 6 === 0) console.log('  waiting...', i * 5 + 's', 'asked=', asked, 'frame=', !!qrpc)
  }
  if (!qrpc) throw new Error('no question/requested rpcId within 10min; session=' + sessionId)
  console.log('QRPC', qrpc)

  // ④ 确认（先等一问一答闭环：工具调用已挂起）
  const respond = await fetch(`${BASE}/api/respond`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'client-response',
      rpcId: qrpc,
      result: { ok: true, value: { sessionId, answer: { answers: [{ id: 'graded-plan-review', selected: ['确认'] }] } } },
    }),
  })
  console.log('RESPOND', await respond.text())

  // ⑤ 观察 develop：等 mark 调用 / final
  const seen = new Set()
  for (let i = 0; i < 180; i++) {
    await sleep(4000)
    const evs = [...events(sessionId)]
    for (const e of evs) {
      if (e.type === 'tool/call') {
        const name = e.data?.name
        if (['plan-l1', 'plan-l2', 'mark-l1', 'mark-l2', 'ask_user_question'].includes(name) && !seen.has(`${name}:${e.data?.callId}`)) {
          seen.add(`${name}:${e.data?.callId}`)
          console.log('CALL', name, JSON.stringify(e.data.arguments || '').slice(0, 110))
        }
      }
      if (e.type === 'user/message') {
        const txt = (e.data?.content || []).filter((x) => x?.type === 'text').map((x) => x.text).join('')
        if (/【分级/.test(txt) && !seen.has('msg:' + txt.slice(0, 20))) {
          seen.add('msg:' + txt.slice(0, 20))
          console.log('MSG', txt.split('\n')[0].slice(0, 80))
        }
      }
      if (e.type === 'todo/write') {
        const mark = e.data?.todos?.filter((t) => t.status === 'completed').length
        const key = 'tw:' + JSON.stringify(e.data.todos.length) + ':' + mark
        if (!seen.has(key)) {
          seen.add(key)
          console.log('TODO', e.data.todos.length, 'completed=' + mark)
        }
      }
      if (e.type === 'turn/end' && i > 0) {
        const reason = e.data?.reason
        if (reason?.kind === 'error') console.log('TURN-ERR', JSON.stringify(reason.error).slice(0, 200))
      }
    }
    // 收尾判断：finish 注入 or 用户结束
    const last = evs[evs.length - 1]
    if (last?.type === 'turn/end' && last?.data?.reason?.kind !== 'running') {
      console.log('DONE at', i * 4 + 's')
      break
    }
  }
  ws.close()
  console.log('--- FRAMES', frames.length, '---')
}

import { readdirSync } from 'node:fs'
main().catch((e) => { console.error('E2E FAIL:', e); process.exit(1) })
