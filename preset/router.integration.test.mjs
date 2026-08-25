/**
 * Real-assembly-chain integration tests for router-bootstrap (v0.3.0).
 *
 * Drives the ACTUAL preset code through the DeepSeek Harness event ordering,
 * taken from `@deepseek-ai/dsh-agent-loop` preStep/turn (verified against
 * 0.1.0-rc.7):
 *
 *   inbox.claim()                       → emits `agent/inbox/claimed` per message
 *   systemPrompt.assemble(...)          → `system-prompt/assemble` waterfall
 *   dispatch.waterfall("agent/pre-step")→ `agent/pre-step` waterfall
 *   session.append('user/message', ...) → `session/event` (per decision.messages)
 *   step(assembly)                      → model request (NOT simulated here)
 *
 * These tests exist because pure-function tests could not see the first-turn
 * classification hole (#13), the dead `session/event` guidance channel
 * (#34/#36), the missing `extractText`/`bandOf` imports (#11), or the extra
 * API call manufactured by inbox re-append guidance (#55).
 */
import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply as applyStandard } from './router-standard/router-bootstrap-v34.mjs' // v1.18.3：测试面=运行面（agent.cordis.yml 挂载 -v34）
import { apply as applySpec } from './router-spec/router-bootstrap-v10.mjs' // v1.18.3: 测试面=运行面（agent.cordis.yml 挂载 -v10）
import { classifyTask, sessionMode } from './router-standard/router-core.mjs'

// ── minimal Cordis-shaped context ──────────────────────────────────────────

function makeHarness(applyFn, config) {
  const listeners = new Map()
  const registeredTools = []
  const agentRef = { current: undefined }
  const ctx = {
    on(name, fn) {
      if (!listeners.has(name)) listeners.set(name, [])
      listeners.get(name).push(fn)
      return () => {}
    },
    effect(fn) { fn() },
    get(name) { return name === 'agent' ? agentRef.current : undefined },
    tools: { register(tool) { registeredTools.push(tool) } },
    llm: { stream() { throw new Error('llm.stream must not be called in integration tests') } },
  }
  applyFn(ctx, config)
  return {
    ctx, listeners, registeredTools, agentRef,
    emit(name, ...args) {
      for (const fn of listeners.get(name) ?? []) fn(...args)
    },
    async assemble(initial, context) {
      const fns = listeners.get('system-prompt/assemble') ?? []
      const run = async (i) => (i >= fns.length ? initial : fns[i](initial, context, () => run(i + 1)))
      return run(0)
    },
    async preStep(payload) {
      const fns = listeners.get('agent/pre-step') ?? []
      const base = { kind: 'enter', messages: [...payload.messages] }
      const run = async (i) => (i >= fns.length ? base : fns[i](payload, () => run(i + 1)))
      return run(0)
    },
  }
}

// ── fixtures ───────────────────────────────────────────────────────────────

const SECTIONS = [
  { name: 'harness-identity', text: 'identity', order: -100 },
  { name: 'persona', text: 'You are a helpful software engineer assistant.', order: 0 },
  { name: 'plan-mode', text: 'You are in plan mode.', order: -50 },
  { name: 'tool-guidance', text: 'guidance', order: 100 },
]

const TOOLS = [
  { name: 'phase_begin' }, { name: 'bash' }, { name: 'pwsh' }, { name: 'str_replace_editor' },
  { name: 'read' }, { name: 'write' }, { name: 'edit' }, { name: 'glob' }, { name: 'grep' },
]

function baseAssembled() {
  return {
    sections: SECTIONS.map((s) => ({ ...s })),
    tools: TOOLS.map((t) => ({ ...t })),
    contexts: [],
    variables: { provider: 'deepseek-official', model: 'deepseek-v4-flash' },
  }
}

function userMessage(id, text) {
  return { id, role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text }] }
}

function makeSession(events = []) {
  return { id: `session-${Math.random().toString(36).slice(2, 10)}`, header: {}, events: [...events] }
}

/** Mirror the loop: claim → assemble → pre-step, then persist decision.messages. */
async function runFirstStep(h, { message, session }) {
  const agent = { session, options: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } }
  h.agentRef.current = agent
  h.emit('agent/inbox/claimed', { agent, message })
  const assembled = await h.assemble(baseAssembled(), { agent, scope: agent })
  const claimed = [message]
  const decision = await h.preStep({ agent, messages: claimed, turn: 1, step: 1, signal: undefined })
  for (const message of decision.messages) session.events.push({ type: 'user/message', data: message })
  return { agent, assembled, decision }
}

// ── first-turn classification (#13) ────────────────────────────────────────

test('first request: RL persona + phase_begin as the only first-turn tool (v0.9)', async () => {
  const h = makeHarness(applyStandard, {})
  const session = makeSession()
  const build = userMessage('m1', '从零开发一个马里奥网页游戏，生成完整实现，构建可运行的网站应用')
  assert.equal(classifyTask(build.content[0].text), 1) // react

  const { assembled, decision } = await runFirstStep(h, { message: build, session })

  // v0.9 self-routed: RL persona + progressive disclosure gate —— 首轮只有 phase_begin
  assert.match(assembled.sections.find((s) => s.name === 'router-persona').text, /^You are a helpful software engineer assistant\./)
  assert.ok(!assembled.sections.some((s) => s.name === 'router-stage'), 'stage section appears only after phase_begin/promotion')
  assert.deepEqual(assembled.tools.map((t) => t.name), ['phase_begin'])
  assert.deepEqual(assembled.contexts, [])
  // no injection in the harness (no inbox): the decision stays on the real message
  assert.deepEqual(decision.messages.map((m) => m.id), ['m1'])
})

test('phase_begin injects the bootstrap guide exactly once and persists guided (v0.9)', async () => {
  process.env.DSH_ROUTER_STAGE_FILE = tmpStageFile()
  const h = makeHarness(applyStandard, {})
  const session = makeSession()
  const appends = []
  const restrictCalls = []
  const agent = {
    session,
    options: { provider: 'deepseek-official', model: 'deepseek-v4-flash' },
    inbox: { append(_kind, msg) { appends.push(msg) } },
    ctx: { get(name) { return name === 'tools' ? { restrict(cfg) { restrictCalls.push(cfg) } } : undefined } },
  }
  h.agentRef.current = agent
  await h.assemble(baseAssembled(), { agent, scope: agent })
  const begin = h.registeredTools.find((t) => t.name === 'phase_begin')
  assert.ok(begin, 'phase_begin registered')
  const first = await begin.execute()
  assert.match(String(first), /session started/)
  assert.equal(appends.length, 1, 'bootstrap guide appended once')
  assert.equal(appends[0].source.plugin, 'router-bootstrap')
  assert.match(appends[0].content[0].text, /Bootstrap \(once per session\)/)
  const again = await begin.execute()
  assert.match(String(again), /already started/)
  assert.equal(appends.length, 1, 'no duplicate bootstrap guide')
  const disk = JSON.parse(readFileSync(process.env.DSH_ROUTER_STAGE_FILE, 'utf8'))
  assert.equal(disk.sessions[session.id].guided, true)
  assert.ok(restrictCalls.length >= 1 && restrictCalls[0].allow.includes('read'), 'stage 0 allows stage-0 tools')
  assert.ok(!restrictCalls[0].allow.includes('todo_write'), 'v1.20: no pre-unlock — planning tier not exposed at stage 0')
})

test('plugin-origin claimed messages never pin the band or receive guides', async () => {
  const h = makeHarness(applyStandard, {})
  const session = makeSession()
  const approval = { id: 'a1', role: 'user', source: { kind: 'plugin', plugin: 'user-approval' }, content: [{ type: 'text', text: 'The approval policy changed from "ask" to "never"' }] }
  const agent = { session, options: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } }
  h.agentRef.current = agent
  // Real chain: next-step plugin messages are claimed BEFORE the next-turn user message.
  const fix = userMessage('m4', '修复这个仓库里的 bug')
  h.emit('agent/inbox/claimed', { agent, message: approval })
  h.emit('agent/inbox/claimed', { agent, message: fix })
  const assembled = await h.assemble(baseAssembled(), { agent, scope: agent })
  const decision = await h.preStep({ agent, messages: [approval, fix], turn: 1, step: 1 })
  // Classification comes from the REAL user message (plugin messages never pin the band)
  assert.equal(sessionMode({ events: [{ type: 'user/message', data: approval }] }), 'weak') // approval alone would be weak
  assert.match(assembled.sections.find((s) => s.name === 'router-persona').text, /^You are a helpful software engineer assistant\./)
  assert.deepEqual(decision.messages.map((m) => m.id), ['a1', 'm4']) // no bootstrap guide for plugin-origin messages
})

// ── promotion ──────────────────────────────────────────────────────────────

test('standard preset: after the first tool/call the router keeps the full surface + stage state (v0.9)', async () => {
  const h = makeHarness(applyStandard, {})
  const session = makeSession([
    { type: 'user/message', data: userMessage('m6', '从零开发一个马里奥网页游戏') },
    { type: 'tool/call', data: {} },
  ])
  const agent = { session, options: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } }
  h.agentRef.current = agent
  const assembled = await h.assemble(baseAssembled(), { agent, scope: agent })
  assert.equal(assembled.sections.length, SECTIONS.length + 3, 'official sections + router-stage/decl/pressure (v1.3)')
  assert.ok(assembled.sections.some((s) => s.name === 'router-stage'), 'stage state stays visible after promotion')
  const stageTextSec = assembled.sections.find((s) => s.name === 'router-stage')
  assert.ok(/Core: /.test(stageTextSec.text), 'stage text splits Core')
  assert.ok(!/Pre-unlocked \(already callable\): /.test(stageTextSec.text), 'v1.20: no pre-unlock group in stage text')
  assert.match(stageTextSec.text, /Task: 从零开发一个马里奥网页游戏/, 'stage text echoes the real user task (guiding, not gating)')
  assert.ok(assembled.sections.some((s) => s.name === 'router-decl'), 'progressive declaration persists after promotion')
  assert.ok(assembled.sections.some((s) => s.name === 'router-proactivity'), 'pressure guide persists after promotion')
  assert.deepEqual(assembled.contexts, [])
  assert.ok(assembled.tools.length === TOOLS.length, 'full tool catalog exposed')
  assert.match(assembled.sections.find((s) => s.name === 'persona').text, /^You are a helpful software engineer assistant\.$/)
})

test('v1.18: catalog default = current tier only; query/all whitebox; help marks unlock stage', async () => {
  process.env.DSH_ROUTER_STAGE_FILE = tmpStageFile()
  const h = makeHarness(applyStandard, {})
  const session = makeSession([
    { type: 'user/message', data: userMessage('m100', '诊断') },
    { type: 'tool/call', data: {} },
  ])
  const agent = { session, options: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } }
  h.agentRef.current = agent
  const assembled = await h.assemble(baseAssembled(), { agent, scope: agent })
  assert.ok(assembled, 'assembly runs')
  const defs = [
    { name: 'read', description: 'Read a UTF-8 text file.', parameters: { file_path: { type: 'string' } } },
    { name: 'write', description: 'Create or fully replace a text file.', parameters: { file_path: { type: 'string' }, content: { type: 'string' } } },
    { name: 'bash', description: 'Execute a bash command.', parameters: { command: { type: 'string' } } },
    { name: 'dev_build_plugin', description: 'Build a plugin via bash scripts.', parameters: {} },
  ]
  h.ctx.tools.view = () => ({ knownNames: ['read', 'write', 'bash', 'dev_build_plugin'], visible: new Map([['read', {}]]), restrictableNames: ['read', 'write', 'bash', 'dev_build_plugin'] })
  h.ctx.tools.schemas = () => defs
  const cat = h.registeredTools.find((t) => t.name === 'tools_catalog')
  const help = h.registeredTools.find((t) => t.name === 'tools_help')
  assert.ok(!JSON.stringify(cat.parameters).includes('"all"'), 'no all:true escape hatch (strict workflow)')
  const plain = await cat.execute({})
  assert.ok(plain.includes('read') && !plain.includes('write'), 'v1.20: default catalog shows only current stage tools (no pre-unlock)')
  assert.ok(!plain.match(/write \[可调\]（预放）/), 'v1.20: no pre-unlock marker — write not exposed at stage 0')
  assert.ok(!plain.includes('bash'), 'default catalog must not name locked tools (attention blind zone)')
  const q = await cat.execute({ query: 'bash' })
  assert.match(q, /bash \[未解锁\]/)
  assert.match(q, /解锁于阶段 3/)
  const q2 = await cat.execute({ query: 'dev_build_plugin' })
  assert.match(q2, /dev_build_plugin \[未解锁\]（宿主·交付期：阶段 3 全量开放）/, 'host tool gets deliver-stage annotation via query whitebox')
  const hb = await help.execute({ name: 'bash' })
  assert.match(hb, /解锁阶段: 3/)
  const hh = await help.execute({ name: 'dev_build_plugin' })
  assert.match(hh, /解锁阶段: 交付期/)
})

test('v1.18.2: stage 1 default catalog marks pwsh/bash as 预放', async () => {
  process.env.DSH_ROUTER_STAGE_FILE = tmpStageFile()
  const h = makeHarness(applyStandard, {})
  const session = makeSession([
    { type: 'user/message', data: userMessage('m101', 'diagnose') },
    { type: 'tool/call', data: {} },
  ])
  writeFileSync(process.env.DSH_ROUTER_STAGE_FILE, JSON.stringify({ version: 2, savedAt: new Date().toISOString(), sessions: { [session.id]: { stage: 1, guided: true } } }))
  const agent = { session, options: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } }
  h.agentRef.current = agent
  await h.assemble(baseAssembled(), { agent, scope: agent })
  const defs = [
    { name: 'read', description: 'Read.', parameters: {} },
    { name: 'pwsh', description: 'Execute PowerShell.', parameters: {} },
    { name: 'bash', description: 'Execute bash.', parameters: {} },
    { name: 'workflow', description: 'Run workflow.', parameters: {} },
  ]
  h.ctx.tools.view = () => ({ knownNames: ['read', 'pwsh', 'bash', 'workflow'], visible: new Map([['read', {}], ['pwsh', {}], ['bash', {}]]), restrictableNames: ['read', 'pwsh', 'bash', 'workflow'] })
  h.ctx.tools.schemas = () => defs
  const cat = h.registeredTools.find((t) => t.name === 'tools_catalog')
  const plain = await cat.execute({})
  assert.ok(!plain.includes('（预放）'), 'v1.20: no pre-unlock markers anywhere in the catalog')
  assert.ok(plain.includes('bash'), 'bash appears in catalog (host/verification tier) as 未解锁, not 预放')
  assert.ok(!plain.match(/bash \[可调\]（预放）/), 'bash not marked pre-unlocked')
  assert.ok(!plain.includes('workflow'), 'stage-3 host tool still hidden at stage 1')
})

test('v1.18.1: phase_advance groups New this stage vs Pre-unlocked', async () => {
  process.env.DSH_ROUTER_STAGE_FILE = tmpStageFile()
  const h = makeHarness(applyStandard, {})
  const session = makeSession()
  const agent = { session, options: { provider: 'deepseek-official', model: 'deepseek-v4-flash' }, ctx: { get() { return undefined } } }
  h.agentRef.current = agent
  await h.assemble(baseAssembled(), { agent, scope: agent })
  const adv = h.registeredTools.find((t) => t.name === 'phase_advance')
  const out = String(await adv.execute({}))
  assert.match(out, /advanced to phase 1/)
  assert.match(out, /New this stage: todo_write/)
  assert.match(out, /New this stage:.*engram_open/)
  assert.ok(!out.includes('Pre-unlocked'), 'v1.20: no pre-unlock group in the advance card')
  assert.match(out, /Next goal: 拟合方案/, 'advance card states the next goal')
  assert.ok(out.includes('\n'), 'card content on its own line')
})

test('v1.18.3: delivery_check registered schema accepts evidence kind external', async () => {
  process.env.DSH_ROUTER_STAGE_FILE = tmpStageFile()
  const h = makeHarness(applyStandard, {})
  const dc = h.registeredTools.find((t) => t.name === 'delivery_check')
  assert.ok(dc, 'delivery_check registered')
  assert.ok(JSON.stringify(dc.parameters).includes('"external"'), 'schema enum includes external (外部验证器一等公民)')
})

test('v1.18.3: memoryMuted phase_advance card filters engram tools', async () => {
  process.env.DSH_ROUTER_STAGE_FILE = tmpStageFile()
  const h = makeHarness(applyStandard, {})
  const session = makeSession([{ type: 'user/message', data: userMessage('m102', '不用记忆，继续诊断') }])
  const agent = { session, options: { provider: 'deepseek-official', model: 'deepseek-v4-flash' }, ctx: { get() { return undefined } } }
  h.agentRef.current = agent
  await h.assemble(baseAssembled(), { agent, scope: agent })
  const adv = h.registeredTools.find((t) => t.name === 'phase_advance')
  const out = String(await adv.execute({}))
  assert.ok(!out.includes('engram_'), 'muted card must not announce engram tools')
  assert.match(out, /New this stage:.*todo_write/)
})

test('v1.18.4: phase_advance reason persists lastAdvance; status shows it', async () => {
  const file = tmpStageFile()
  process.env.DSH_ROUTER_STAGE_FILE = file
  const h = makeHarness(applyStandard, {})
  const session = makeSession()
  writeFileSync(file, JSON.stringify({ version: 2, savedAt: new Date().toISOString(), sessions: { [session.id]: { stage: 0, guided: false } } }))
  const agent = { session, options: { provider: 'deepseek-official', model: 'deepseek-v4-flash' }, ctx: { get() { return undefined } } }
  h.agentRef.current = agent
  await h.assemble(baseAssembled(), { agent, scope: agent })
  const adv = h.registeredTools.find((t) => t.name === 'phase_advance')
  const out = String(await adv.execute({ reason: 'understanding settled' }))
  assert.match(out, /advanced to phase 1/)
  const disk = JSON.parse(readFileSync(file, 'utf8'))
  assert.equal(disk.sessions[session.id].lastAdvance.reason, 'understanding settled', 'lastAdvance persisted')
  const status = h.registeredTools.find((t) => t.name === 'dev_router_status')
  assert.match(String(await status.execute({})), /lastAdvance=.*understanding settled/)
})

test('v1.18.4: loadStageState restores lastAdvance/stageAtTime from disk', async () => {
  const file = tmpStageFile()
  process.env.DSH_ROUTER_STAGE_FILE = file
  const h = makeHarness(applyStandard, {})
  const session = makeSession()
  writeFileSync(file, JSON.stringify({ version: 2, savedAt: new Date().toISOString(), sessions: { [session.id]: { stage: 1, guided: true, stageAtTime: 123456, lastAdvance: { at: 123456, reason: 'prior' } } } }))
  const agent = { session, options: { provider: 'deepseek-official', model: 'deepseek-v4-flash' }, ctx: { get() { return undefined } } }
  h.agentRef.current = agent
  await h.assemble(baseAssembled(), { agent, scope: agent })
  const status = h.registeredTools.find((t) => t.name === 'dev_router_status')
  const out = String(await status.execute({}))
  assert.match(out, /\(1\/3\)/, 'resumed phase 1 from disk')
  assert.match(out, /lastAdvance=.*prior/, 'lastAdvance restored from disk')
})

test('v1.18: new conversation (request/header initial) auto-resets legacy stage to 0', async () => {
  process.env.DSH_ROUTER_STAGE_FILE = tmpStageFile()
  const h = makeHarness(applyStandard, {})
  const session = makeSession([{ type: 'request/header', data: { reason: 'initial' } }])
  writeFileSync(process.env.DSH_ROUTER_STAGE_FILE, JSON.stringify({ version: 2, savedAt: new Date().toISOString(), sessions: { [session.id]: { stage: 3, guided: false } } }))
  const agent = { session, options: { provider: 'deepseek-official', model: 'deepseek-v4-flash' }, inbox: { append(_k, m) {} }, ctx: { get(name) { return name === 'tools' ? { restrict() {} } : undefined } } }
  h.agentRef.current = agent
  await h.assemble(baseAssembled(), { agent, scope: agent })
  const begin = h.registeredTools.find((t) => t.name === 'phase_begin')
  const out = String(await begin.execute({}))
  assert.match(out, /session started \(fresh-auto\): phase 0/)
})

test('spec preset (routerMode: standard): RL first turn, then full assembly returns (#44)', async () => {
  const h = makeHarness(applySpec, { routerMode: 'standard' })
  const session = makeSession()
  const build = userMessage('m7', '从零开发一个马里奥网页游戏')
  const { assembled } = await runFirstStep(h, { message: build, session })
  // RL-interface first turn
  assert.deepEqual(assembled.sections.map((s) => s.name), ['plan-mode', 'router-persona'])
  assert.deepEqual(assembled.tools.map((t) => t.name), ['pwsh', 'str_replace_editor'])
  assert.deepEqual(assembled.contexts, [])

  // promoted: the router stops touching the assembly (full sections restored)
  session.events.push({ type: 'tool/call', data: {} })
  const agent = { session, options: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } }
  h.agentRef.current = agent
  const original = baseAssembled()
  const promoted = await h.assemble(original, { agent, scope: agent })
  assert.equal(promoted, original, 'promoted assembly must be returned untouched')
})

test('spec preset (routerMode: spec): classified persona over the full section list', async () => {
  const h = makeHarness(applySpec, { routerMode: 'spec' })
  const session = makeSession()
  const build = userMessage('m8', '从零开发一个马里奥网页游戏')
  const { assembled } = await runFirstStep(h, { message: build, session })
  assert.match(assembled.sections.find((s) => s.name === 'router-persona').text, /hands-on software engineer/)
  assert.equal(assembled.sections.length, SECTIONS.length)
  assert.deepEqual(assembled.tools.map((t) => t.name), ['pwsh', 'read', 'write', 'edit'])
})

// ── resume safety ──────────────────────────────────────────────────────────

test('resume: a guide already in the durable transcript is never injected twice', async () => {
  const h = makeHarness(applyStandard, {})
  const m = userMessage('m9', '今天天气怎么样')
  const session = makeSession([
    { type: 'user/message', data: m },
    { type: 'user/message', data: { id: 'router-guide-m9', role: 'user', source: { kind: 'plugin', plugin: 'router-bootstrap' }, content: [{ type: 'text', text: 'guide' }] } },
  ])
  const agent = { session, options: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } }
  h.agentRef.current = agent
  const decision = await h.preStep({ agent, messages: [m], turn: 2, step: 1 })
  assert.deepEqual(decision.messages.map((x) => x.id), ['m9'], 'no duplicate guide on resume')
})

// ── legacy session/event capture only ──────────────────────────────────────

test('no session/event listener: legacy emit is a no-op, never appends to the inbox (#55)', async () => {
  const h = makeHarness(applyStandard, {})
  const session = makeSession()
  const inbox = { append() { throw new Error('inbox.append must not be called from session/event') } }
  const agent = { session, options: { provider: 'deepseek-official', model: 'deepseek-v4-flash' }, inbox }
  h.agentRef.current = agent
  h.emit('session/event', session, { type: 'user/message', data: userMessage('m10', '今天天气怎么样') })
  const assembled = await h.assemble(baseAssembled(), { agent, scope: agent })
  assert.match(assembled.sections.find((s) => s.name === 'router-persona').text, /^You are a helpful software engineer assistant\./)
})

// ── dev tools register ─────────────────────────────────────────────────────

test('router visibility tools are registered', () => {
  const h = makeHarness(applyStandard, {})
  const names = h.registeredTools.map((t) => t.name)
  assert.ok(names.includes('tools_catalog'))
  assert.ok(names.includes('tools_help'))
  assert.ok(names.includes('dev_router_status'))
  assert.ok(!names.includes('dev_router_mode'), 'v1.20: dev_router_mode retired (no preset-internal routing)')
})

// ── v0.9 self-routed phases ─────────────────────────────────────────────────

function tmpStageFile() {
  const dir = mkdtempSync(join(tmpdir(), 'router-stage-'))
  return join(dir, 'stages.json')
}

function makeStageAgent(session, appends) {
  const restrictCalls = []
  return {
    session,
    options: { provider: 'deepseek-official', model: 'deepseek-v4-flash' },
    inbox: { append(_kind, msg) { appends.push(msg) } },
    ctx: { get() { return { restrict(cfg) { restrictCalls.push(cfg) } } } },
    _restrictCalls: restrictCalls,
  }
}

test('v1.19: completion signals drive the phase ladder; tool names do not', async () => {
  const file = tmpStageFile()
  process.env.DSH_ROUTER_STAGE_FILE = file
  const h = makeHarness(applyStandard, {})
  const session = makeSession()
  const appends = []
  const agent = makeStageAgent(session, appends)
  h.agentRef.current = agent
  // todo_write → planning
  session.events.push({ type: 'tool/call', data: { name: 'todo_write', arguments: '{}' }, time: Date.now() })
  await h.preStep({ agent, messages: [userMessage('v1', '先看计划')], turn: 1, step: 1 })
  let disk = JSON.parse(readFileSync(file, 'utf8'))
  assert.equal(disk.sessions[session.id].stage, 1, 'todo_write completes alignment → planning')
  // 工具名（哪怕下一档开发工具）不再跳级
  session.events.push({ type: 'tool/call', data: { name: 'str_replace_editor', arguments: JSON.stringify({ command: 'create', path: 'x.txt', file_text: 'x' }) }, time: Date.now() })
  await h.preStep({ agent, messages: [userMessage('v2', '开始写')], turn: 2, step: 1 })
  disk = JSON.parse(readFileSync(file, 'utf8'))
  assert.equal(disk.sessions[session.id].stage, 1, 'using a dev tool does not skip planning')
  // 计划锁定（todo_write again）→ development
  session.events.push({ type: 'tool/call', data: { name: 'todo_write', arguments: JSON.stringify({ todos: [] }) }, time: Date.now() })
  await h.preStep({ agent, messages: [userMessage('v3', '计划锁定')], turn: 3, step: 1 })
  disk = JSON.parse(readFileSync(file, 'utf8'))
  assert.equal(disk.sessions[session.id].stage, 2, 'locked plan completes planning → development')
  // delivery_check → verification
  session.events.push({ type: 'tool/call', data: { name: 'delivery_check' }, time: Date.now() })
  await h.preStep({ agent, messages: [userMessage('v4', '交付')], turn: 4, step: 1 })
  disk = JSON.parse(readFileSync(file, 'utf8'))
  assert.equal(disk.sessions[session.id].stage, 3, 'delivery intent completes development → verification')
})

test('v1.17.1: legacy stage>0 + guided:false — phase_begin repairs flag, no duplicate phase-0 bootstrap', async () => {
  const file = tmpStageFile()
  writeFileSync(file, JSON.stringify({ version: 2, sessions: { 'legacy-session': { stage: 3, guided: false } } }))
  process.env.DSH_ROUTER_STAGE_FILE = file
  const h = makeHarness(applyStandard, {})
  const session = { id: 'legacy-session', header: {}, events: [] }
  const appends = []
  const agent = makeStageAgent(session, appends)
  h.agentRef.current = agent
  const begin = h.registeredTools.find((t) => t.name === 'phase_begin')
  const r = await begin.execute()
  assert.match(r, /already started \(legacy state\)/)
  assert.equal(appends.length, 0, 'no bootstrap injected for legacy started session')
  const disk = JSON.parse(readFileSync(file, 'utf8'))
  assert.equal(disk.sessions['legacy-session'].guided, true, 'guided flag repaired')
})

test('v0.9: resume keeps the phase and never re-injects the bootstrap guide', async () => {
  const file = tmpStageFile()
  writeFileSync(file, JSON.stringify({ version: 2, sessions: { 'resume-session': { stage: 2, guided: true } } }))
  process.env.DSH_ROUTER_STAGE_FILE = file
  const h = makeHarness(applyStandard, {})
  const session = { id: 'resume-session', header: {}, events: [
    { type: 'user/message', data: userMessage('r1', '写一个工具') },
    { type: 'tool/call', data: { name: 'write' } },
  ] }
  const appends = []
  const agent = makeStageAgent(session, appends)
  h.agentRef.current = agent
  const decision = await h.preStep({ agent, messages: [userMessage('r2', '继续')], turn: 3, step: 1 })
  assert.equal(appends.length, 0, 'resume: zero injection')
  const assembled = await h.assemble(baseAssembled(), { agent, scope: agent })
  assert.match(assembled.sections.find((s) => s.name === 'router-stage').text, /开发 \(2\/3\)/)
})

test('v1.19: completion signal persists phase to disk', async () => {
  const file = tmpStageFile()
  process.env.DSH_ROUTER_STAGE_FILE = file
  const h = makeHarness(applyStandard, {})
  const session = makeSession()
  const appends = []
  const agent = makeStageAgent(session, appends)
  h.agentRef.current = agent
  await h.preStep({ agent, messages: [userMessage('v3', '开始')], turn: 1, step: 1 })
  session.events.push({ type: 'tool/call', data: { name: 'todo_write' } })
  await h.preStep({ agent, messages: [userMessage('v4', '继续')], turn: 2, step: 1 })
  const disk = JSON.parse(readFileSync(file, 'utf8'))
  assert.equal(disk.sessions[session.id].stage, 1, 'phase persisted to disk')
  const assembled = await h.assemble(baseAssembled(), { agent, scope: agent })
  assert.match(assembled.sections.find((s) => s.name === 'router-stage').text, /拟合方案 \(1\/3\)/)
})

test('v1.6.1: shim zero-arg tools keep string output (catalog/status unchanged)', async () => {
  process.env.DSH_ROUTER_STAGE_FILE = tmpStageFile()
  const h = makeHarness(applyStandard, {})
  const session = makeSession()
  const appends = []
  const shimTools = []
  const agent = {
    session,
    options: { provider: 'deepseek-official', model: 'deepseek-v4-flash' },
    inbox: { append(_k, m) { appends.push(m) } },
    ctx: {
      get(name) {
        if (name === 'tools') return {
          restrict() {}, register(def) { shimTools.push(def) }, schemas() { return [] },
        }
        return undefined
      },
    },
  }
  h.agentRef.current = agent
  await h.assemble(baseAssembled(), { agent, scope: agent })
  await h.registeredTools.find((t) => t.name === 'phase_begin').execute()
  const status = shimTools.find((d) => d.name === 'dev_router_status')
  assert.ok(status && status.output.schema.type === 'string', 'string-output tools keep string schema')
})

test('v1.6: restrict pre-unlocks two tiers (stage 0 → write available; verification stays locked)', async () => {
  process.env.DSH_ROUTER_STAGE_FILE = tmpStageFile()
  const h = makeHarness(applyStandard, {})
  const session = makeSession()
  const appends = []
  const agent = makeStageAgent(session, appends)
  h.agentRef.current = agent
  await h.assemble(baseAssembled(), { agent, scope: agent })
  const begin = h.registeredTools.find((t) => t.name === 'phase_begin')
  assert.ok(begin, 'phase_begin registered')
  await begin.execute()
  const first = agent._restrictCalls[0]
  assert.ok(first, 'restrict called on phase_begin')
  assert.ok(first.allow.includes('read'), 'stage-0 tool allowed at stage 0')
  assert.ok(!first.allow.includes('write'), 'v1.20: development tier NOT pre-unlocked at stage 0 (zero pre-unlock)')
  assert.ok(!first.allow.includes('pwsh'), 'verification tier stays locked at stage 0')
})

test('v0.9: final phase releases the restrict (no new restriction)', async () => {
  process.env.DSH_ROUTER_STAGE_FILE = tmpStageFile()
  const h = makeHarness(applyStandard, {})
  const session = makeSession()
  const appends = []
  const agent = makeStageAgent(session, appends)
  h.agentRef.current = agent
  await h.assemble(baseAssembled(), { agent, scope: agent })
  const begin = h.registeredTools.find((t) => t.name === 'phase_begin')
  const advance = h.registeredTools.find((t) => t.name === 'phase_advance')
  assert.ok(begin && advance, 'phase tools registered')
  await begin.execute()
  await advance.execute({ reason: 'to 1' })
  await advance.execute({ reason: 'to 2' })
  await advance.execute({ reason: 'to 3' })
  // 阶段 0/1/2 各设一次 restrict；阶段 3 释放（不再新增）
  assert.equal(agent._restrictCalls.length, 3, 'stage 3 must not install another restriction')
})
