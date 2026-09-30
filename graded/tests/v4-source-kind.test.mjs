/**
 * v4 消息源契约回归：插件注入的消息必须带 producer-owned 的 source kind。
 *
 * 背景：会话格式 v4 的准入规则拒绝字面量 `source.kind === 'plugin'`（v3 退休写法），
 * 注入即抛 `SessionFormatError: format v4 message requires a producer-owned source kind`，
 * 表现为「本轮运行失败」——分级模式一注入就断（commit_star 激活后、mark_task 续轮后）。
 * v4 的官方迁移映射把 `{ kind: 'plugin', plugin: 'X' }` 改写为 `{ kind: 'plugin:X' }`。
 *
 * 断言四件事：
 *  A. pre-step 注入产生的消息 kind = 'plugin:dsh-graded-mode'（且不含裸 'plugin'）
 *  B/C. 插件自己注入的审核提示不会被 review 文本扫描误判成用户「确认」；真实用户「确认」照常推进
 *  D. mark_task 续轮 steer 的 kind 同上
 *
 * 运行：node --test tests/v4-source-kind.test.mjs
 * 反证（打补丁前应红）：GRADED_PLUGIN=<打补丁前的插件目录> node --test tests/v4-source-kind.test.mjs
 *
 * 边界：本文件断言的是**生产者侧发出的 source 形态**（离线运行，不引入宿主
 * `@deepseek-ai/dsh-session-format*` 包），锁的是"注入形态不被改回退休写法"；
 * 宿主是否接纳该形态由 `packages/session/session-format-v3-to-v4` 的 `source()` 决定。
 */
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PLUGIN = process.env.GRADED_PLUGIN || fileURLToPath(new URL('..', import.meta.url))

// 测试级状态目录（状态单轨=磁盘：pre-step 与工具 execute 直读写盘）
const TMP = mkdtempSync(join(tmpdir(), 'graded-v4-source-'))
process.env.DSH_HOME = TMP

const { saveState, loadState } = await import(`${PLUGIN}/src/mode-state.js`)
const { reviewPendingText } = await import(`${PLUGIN}/src/inject-text.js`)
const mod = await import(`${PLUGIN}/src/index.js`)

/** 假 cordis ctx：捕获注册的钩子与工具，不触碰真实宿主。 */
function makeCtx() {
  const tools = new Map()
  const hooks = new Map()
  return {
    tools,
    hooks,
    ctx: {
      effect: (fn) => { try { return fn() } catch { return undefined } },
      webServer: { register: () => ({ dispose() {} }) },
      tools: { register: (def) => { tools.set(def.name, def); return { dispose() {} } } },
      commands: { register: () => ({ dispose() {} }) },
      userQuestions: { ask: async () => ({ answer: '待定' }) },
      on: (ev, fn) => { if (!hooks.has(ev)) hooks.set(ev, []); hooks.get(ev).push(fn) },
      get: () => undefined,
    },
  }
}

const { tools, hooks, ctx } = makeCtx()
mod.default.apply(ctx)
const preStep = hooks.get('agent/pre-step')?.[0]

const STAR = { purpose: '为测试在本地达成可验证的注入形态', requirements: [], nonGoals: [], assumptions: [] }
const item = (title) => ({ title, spec: 's', accept: ['a'], do: 'self', verify: 'self', status: 'pending', concepts: [] })
const modeState = (stage, extra = {}) => ({
  stage, task: 't', mode: 'correct', star: STAR, l1Locked: false, l2Locked: false, plan: { groups: [] }, injected: new Set(), ...extra,
})
const reviewPlan = { groups: [{ title: 'G', spec: 's', accept: ['a'], locked: false, items: [item('I1')] }] }
const reviewInjected = new Set(['brainstorm-guidance', 'l1-guidance', 'l2-guidance', 'review-pending'])

/** 跑一次 pre-step：返回注入后的 messages 与本次投递的 steer 载荷。 */
async function runPreStep(sid, messages) {
  const steers = []
  const agent = { session: { id: sid }, steer: (payload) => steers.push(payload) }
  const decision = await preStep({ agent, messages: structuredClone(messages) }, async () => ({ messages: structuredClone(messages) }))
  return { messages: decision.messages, steers }
}

after(() => { rmSync(TMP, { recursive: true, force: true }) })

test('pre-step 注入用 producer-owned kind，而非 v3 字面量 plugin', async () => {
  assert.ok(preStep, 'agent/pre-step 未注册')
  const sid = 'graded-v4-a'
  saveState(sid, modeState('l1-edit'))
  const { messages } = await runPreStep(sid, [{ role: 'user', content: [{ type: 'text', text: '开工' }] }])
  const injected = messages.filter((m) => typeof m?.source?.kind === 'string' && m.source.kind.includes('plugin'))
  assert.equal(injected.length, 1, '应注入 1 条引导消息')
  assert.equal(injected[0].source.kind, 'plugin:dsh-graded-mode')
  assert.ok(!messages.some((m) => m?.source?.kind === 'plugin'), '不得再出现 v4 拒绝的字面量 kind')
})

test('review 扫描跳过插件自注入消息（避免把自家审核提示当成用户确认）', async () => {
  const sid = 'graded-v4-b'
  saveState(sid, modeState('review', { l1Locked: true, l2Locked: true, plan: reviewPlan, injected: reviewInjected }))
  const selfMsg = {
    role: 'user',
    source: { kind: 'plugin:dsh-graded-mode' },
    content: [{ type: 'text', text: `${reviewPendingText()}\n（回复「确认」开始开发）` }],
  }
  await runPreStep(sid, [selfMsg])
  assert.equal(loadState(sid).stage, 'review', '插件自注入的「确认」不得推进阶段')
})

test('review 扫描仍认真实用户确认', async () => {
  const sid = 'graded-v4-c'
  saveState(sid, modeState('review', { l1Locked: true, l2Locked: true, plan: reviewPlan, injected: reviewInjected }))
  await runPreStep(sid, [{ role: 'user', source: { kind: 'user', rpcId: 'r1' }, content: [{ type: 'text', text: '确认' }] }])
  assert.equal(loadState(sid).stage, 'develop')
})

test('mark_task 续轮 steer 用 producer-owned kind', async () => {
  const sid = 'graded-v4-d'
  saveState(sid, modeState('develop', {
    l1Locked: true,
    l2Locked: true,
    plan: { groups: [{ title: 'G', spec: 's', accept: ['a'], locked: false, items: [item('I1'), item('I2')] }] },
    injected: new Set(['approved-kickoff']),
  }))
  const steers = []
  const agent = { session: { id: sid }, steer: (payload) => steers.push(payload) }
  const markTask = tools.get('mark_task')
  assert.ok(markTask, 'mark_task 未注册')
  const res = await markTask.execute({ level: 'L2', title: 'I1', status: 'completed' }, { agent })
  assert.equal(res?.ok, true)
  // 插件以 60ms 窗口合并续轮引导：轮询到出现为止（高负载 CI 下固定 sleep 会闪红）
  const deadline = Date.now() + 2000
  while (steers.length === 0 && Date.now() < deadline) await new Promise((r) => setTimeout(r, 20))
  assert.equal(steers.length, 1, '应发出 1 条续轮 steer')
  assert.equal(steers[0]?.source?.kind, 'plugin:dsh-graded-mode')
})
