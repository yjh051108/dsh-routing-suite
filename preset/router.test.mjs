/** Router classifier + continuous mode tests. */
import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { writeFileSync, rmSync } from 'node:fs'
import {
  classifyTask, personaFor, coreFor, bandFor, testinessFor, parseMode, applyPersona,
  isFlashModel, extractText, sessionMode,
} from './router-standard/router-core.mjs'
import { autoAdvance, filterToolGuidance, markerFor, runtimeMark, runtimeCallable, deliveryCheck, paramHint, isMemoryTool, muteAwareList, firstUserTask } from './router-standard/router-bootstrap-v34.mjs' // v1.18.3：测试面=运行面（agent.cordis.yml 挂载 -v34）

test('react: greenfield/build tasks map to react band', () => {
  assert.equal(bandFor(classifyTask('需要本地开发一个马里奥网页小游戏，参考经典原版')), 'react')
  assert.equal(bandFor(classifyTask('帮我写一个 Python 脚本处理 CSV')), 'react')
  assert.equal(bandFor(classifyTask('从零搭建一个网站')), 'react')
})

test('spec: maintenance/fix tasks map to spec band', () => {
  assert.equal(bandFor(classifyTask('修复这个仓库里的 bug')), 'spec')
  assert.equal(bandFor(classifyTask('为什么登录一直报错，帮我排查')), 'spec')
  assert.equal(classifyTask('修复这个仓库里的 bug'), 0)
})

test('mixed task lands in react band (net react keywords)', () => {
  assert.equal(bandFor(classifyTask('帮我开发一个小游戏然后修复里面的 bug')), 'react')
})

test('unmatched defaults to weak (internal routing)', () => {
  assert.equal(classifyTask('今天天气怎么样'), 'weak')
  assert.equal(bandFor('weak'), 'weak')
})

test('ties default to weak (internal routing)', () => {
  assert.equal(classifyTask('帮我开发一个小游戏然后修复里面的 bug'), 1) // net react wins
  assert.equal(classifyTask('开发并修复'), 'weak') // tie → weak
})

test('issue #1: plugin-generated nested user/message shape still classifies', () => {
  // 注入器 startIngest 的旧 seed 形状（data.message 嵌套）：提取必须解包，
  // 否则构建/修复任务误入 weak。
  const nested = { message: { kind: 'user', source: { kind: 'user' }, content: [{ type: 'text', text: '把目录里的内容内化成 DSH 插件并构建注入' }] } }
  assert.match(extractText(nested), /内化成/)
  assert.equal(bandFor(classifyTask(extractText(nested))), 'react')
  // 标准形状不受影响
  const flat = { kind: 'user', source: { kind: 'user' }, content: [{ type: 'text', text: '修复这个仓库里的 bug' }] }
  assert.equal(extractText(flat), '修复这个仓库里的 bug')
  assert.equal(bandFor(classifyTask(extractText(flat))), 'spec')
  // sessionMode 用首条 user/message（嵌套形状）
  const session = { events: [{ type: 'user/message', data: nested }] }
  assert.equal(sessionMode(session), 1)
})

test('issue #13: sessionMode skips plugin-origin messages when pinning the band', () => {
  // 真实链路上首条落库的 user/message 常常是插件注入的（approval 通知、
  // runtime-context 快照、agent-instructions、router 引导），它们不能参与分类。
  const buildTask = { kind: 'user', source: { kind: 'user' }, content: [{ type: 'text', text: '从零开发一个马里奥网页游戏' }] }
  const approval = { kind: 'user', source: { kind: 'plugin', plugin: 'user-approval' }, content: [{ type: 'text', text: 'The approval policy changed from "ask" to "never"' }] }
  const snapshot = { kind: 'user', source: { kind: 'plugin', plugin: 'runtime-context' }, content: [{ type: 'text', text: 'cwd snapshot' }] }
  const guide = { id: 'router-guide-x', kind: 'user', source: { kind: 'plugin', plugin: 'router-bootstrap' }, content: [{ type: 'text', text: 'Router: classify this task now' }] }
  // 插件消息在前、真实用户消息在后 → 必须按真实消息分类（react）
  assert.equal(sessionMode({ events: [
    { type: 'user/message', data: approval },
    { type: 'user/message', data: snapshot },
    { type: 'user/message', data: guide },
    { type: 'user/message', data: buildTask },
  ] }), 1)
  // 只有插件消息 → 退化到首条 user/message（旧行为，不抛错）
  assert.equal(sessionMode({ events: [{ type: 'user/message', data: approval }] }), 'weak')
  // 无 source 的历史消息按用户消息处理
  const legacy = { kind: 'user', content: [{ type: 'text', text: '修复这个仓库里的 bug' }] }
  assert.equal(sessionMode({ events: [{ type: 'user/message', data: legacy }] }), 0)
})

test('weak persona is model-specific (P11/P24)', () => {
  const pro = personaFor('weak', 'deepseek-v4-pro')
  const flash = personaFor('weak', 'deepseek-v4-flash')
  assert.ok(pro.includes('decide the task type (build or fix)'))
  assert.ok(pro.includes('You are a helpful software engineer assistant.'))
  assert.ok(!pro.includes('review what you have already done')) // P24: anchors hurt Pro
  assert.ok(flash.includes('decide the task type (build or fix)'))
  assert.ok(flash.includes('review what you have already done')) // anchors help flash
  assert.notEqual(pro, flash)
  assert.equal(personaFor('weak', 'deepseek-v4-flash'), personaFor('weak', 'deepseek-v4-flash'))
  assert.equal(isFlashModel('deepseek-v4-flash'), true)
  assert.equal(isFlashModel('deepseek-v4-pro'), false)
})

test('parseMode accepts weak', () => {
  assert.equal(parseMode('weak'), 'weak')
  assert.equal(parseMode('router'), 'weak')
})

test('persona quantizes to three measured bands', () => {
  assert.equal(personaFor(0), 'You are a helpful software engineer assistant.')
  assert.equal(personaFor(0.1), 'You are a helpful software engineer assistant.')
  assert.ok(personaFor(0.3).includes('Work directly'))
  assert.ok(!personaFor(0.3).includes('test harnesses'))
  assert.ok(personaFor(1).includes('hands-on'))
  assert.ok(personaFor(1).includes('do not build test harnesses'))
})

test('core tool surface varies by band', () => {
  assert.deepEqual(coreFor(0), ['read', 'edit', 'glob', 'grep'])
  assert.deepEqual(coreFor(1), ['read', 'write', 'edit'])
  assert.deepEqual(coreFor(0.3), ['read', 'edit', 'write', 'glob', 'grep'])
})

test('band mapping matches the measured phase transition', () => {
  assert.equal(bandFor(0.1), 'spec') // stable spec region
  assert.equal(bandFor(0.2), 'mixed') // unstable band (display name)
  assert.equal(bandFor(0.4), 'mixed')
  assert.equal(bandFor(0.5), 'react') // stable react region
  assert.equal(bandFor(0.99), 'react')
})

test('testiness rises toward spec', () => {
  assert.equal(testinessFor(1), 'suppressed')
  assert.equal(testinessFor(0), 'normal')
  assert.equal(testinessFor(0.3), 'light')
})

test('parseMode accepts bands, percents, and decimals', () => {
  assert.equal(parseMode('spec'), 0)
  assert.equal(parseMode('react'), 1)
  assert.equal(parseMode('balanced'), 0.3)
  assert.equal(parseMode('70'), 0.7)
  assert.equal(parseMode('0.3'), 0.3)
  assert.equal(parseMode('auto'), 'auto')
  assert.equal(parseMode('nonsense'), null)
})

test('applyPersona replaces only the persona section (keeps plan-mode)', () => {
  const sections = [
    { name: 'harness-identity', text: 'x', order: -100 },
    { name: 'persona', text: 'old persona', order: 0 },
    { name: 'plan-mode', text: 'You are in plan mode.', order: -50 },
    { name: 'tool-guidance', text: 'y', order: 100 },
  ]
  const out = applyPersona(sections, 'new persona')
  const names = out.map((s) => s.name)
  assert.ok(names.includes('harness-identity'))
  assert.ok(names.includes('plan-mode'), 'plan-mode section must survive')
  assert.ok(names.includes('tool-guidance'))
  assert.ok(!names.includes('persona'), 'old persona section replaced')
  assert.equal(out.find((s) => s.name === 'router-persona').text, 'new persona')
})

test('applyPersona tolerates missing sections', () => {
  const out = applyPersona([], 'p')
  assert.deepEqual(out, [{ name: 'router-persona', text: 'p', order: 0 }])
})

test('autoAdvance v1.19: no advance from plan filenames / read-only editors / tool names / text intent', () => {
  assert.equal(autoAdvance(0, [], 'STANDARD-PLAN.md 是美好期待'), 0)
  assert.equal(autoAdvance(1, [{ name: 'str_replace_editor', args: { command: 'view', path: 'README.md' } }], ''), 1)
  assert.equal(autoAdvance(1, [{ name: 'str_replace_editor', args: { command: 'str_replace', path: 'a.txt', old_str: 'x', new_str: 'y' } }], ''), 1, 'mutating editor use is not a completion signal')
  assert.equal(autoAdvance(0, [{ name: 'write', args: { file_path: 'x', content: 'y' } }], ''), 0, 'using a pre-unlocked dev tool does not skip alignment')
  assert.equal(autoAdvance(1, [{ name: 'pwsh', args: { command: 'x' } }], ''), 1, 'pre-unlocked verification tool does not skip planning')
  assert.equal(autoAdvance(0, [], '写一个 HTML 页面'), 0, 'text intent does not skip phases')
  assert.equal(autoAdvance(3, [{ name: 'read_image', args: { file_path: 'x.png' } }], ''), 3)
})

test('autoAdvance v1.19: completion signals drive the phase ladder', () => {
  assert.equal(autoAdvance(0, [{ name: 'ask_user_question' }], ''), 1, 'asking user completes alignment')
  assert.equal(autoAdvance(0, [{ name: 'todo_write' }], ''), 1, 'recording a plan completes alignment')
  assert.equal(autoAdvance(0, [{ name: 'exit_plan_mode' }], ''), 1, 'presenting a plan completes alignment')
  assert.equal(autoAdvance(1, [{ name: 'todo_write' }], ''), 2, 'locked plan completes planning')
  assert.equal(autoAdvance(1, [{ name: 'exit_plan_mode' }], ''), 2, 'presented plan completes planning')
  assert.equal(autoAdvance(2, [{ name: 'delivery_check' }], ''), 3, 'delivery intent completes development')
  assert.equal(autoAdvance(0, [{ name: 'delivery_check' }], ''), 0, 'no signal skips stages')
})

test('v1.19.1: firstUserTask echoes the first real user message (guiding, not gating)', () => {
  const mk = (src, text) => ({ id: 'a', role: 'user', source: src, content: [{ type: 'text', text }] })
  assert.equal(firstUserTask({ events: [{ type: 'user/message', data: mk({ kind: 'user' }, '做一个马里奥游戏') }] }), '做一个马里奥游戏')
  assert.equal(firstUserTask({ events: [{ type: 'user/message', data: mk({ kind: 'plugin', plugin: 'x' }, 'approval') }] }), '', 'plugin-origin messages are not the task')
  assert.equal(firstUserTask({ events: [{ type: 'user/message', data: mk({ kind: 'user' }, 'x'.repeat(200)) }] }).length, 161, 'truncates to 160 + ellipsis')
})

test('filterToolGuidance: keeps only visible-tier tool guidance before delivery (v1.6 pre-unlock 2 tiers)', () => {
  const sections = [
    { name: 'tool:read', order: 100, text: 'r' },
    { name: 'tool:write', order: 100, text: 'w' },
    { name: 'tool:subagent', order: 100, text: 's' },
    { name: 'plan-mode', order: -50, text: 'p' },
    { name: 'tools:sdk', order: 150, text: 'sdk' },
  ]
  const full = new Set(['read', 'write', 'subagent'])
  // stage 0: read 当前档；write 不预解锁（v1.20 预解锁归零）→ 裁掉；subagent 无阶段→锁定→裁
  const out0 = filterToolGuidance(sections, 0, full)
  assert.deepEqual(out0.map((s) => s.name), ['tool:read', 'plan-mode', 'tools:sdk'])
  // subagent 仍裁
  assert.ok(!filterToolGuidance(sections, 1, full).some((s) => s.name === 'tool:subagent'))
  // delivery：不裁剪
  assert.equal(filterToolGuidance(sections, 3, full).length, sections.length)
  // 安全规则：后缀不属全量真实名 → 保留
  assert.ok(filterToolGuidance([{ name: 'tool:unknown-thing', text: 'x' }], 0, full).length === 1)
})

test('runtimeMark: 以运行时可见面为准（v1.9 根修——目录标注=SDK 真绑定）', () => {
  const fakeVisible = (names) => ({ view: () => ({ visible: new Map(names.map((n) => [n, {}])) }) })
  const svc = fakeVisible(['read', 'write', 'pwsh'])
  assert.equal(runtimeMark(svc, {}, 'read'), '可调')
  assert.equal(runtimeMark(svc, {}, 'pwsh'), '可调')
  assert.equal(runtimeMark(svc, {}, 'read_image'), '未解锁') // 不在可见面 → 不谎报
  assert.equal(runtimeMark(fakeVisible(['tools_catalog']), {}, 'tools_catalog'), 'meta')
  assert.equal(runtimeMark(fakeVisible([]), {}, 'tools_catalog'), '未解锁')
})
test('markerFor: 可调/交付后/meta/全量 semantics (v1.20 预解锁归零)', () => {
  assert.equal(markerFor('read', 0), '可调')
  assert.equal(markerFor('todo_write', 0), '未解锁') // v1.20：无预放 → 阶段1 工具在 0 不可调
  assert.equal(markerFor('write', 0), '未解锁') // v1.20：write 不再预放（stage+1 窗口）
  assert.equal(markerFor('tools_catalog', 0), 'meta')
  assert.equal(markerFor('subagent', 0), '未解锁')
  assert.equal(markerFor('read', 3), '全量')
})


test('paramHint: 参数名+类型速览消灭猜参数摩擦 (v1.4 → v1.5 带类型)', () => {
  assert.equal(paramHint({ type: 'object', properties: { pattern: { type: 'string' }, path: { type: 'string' } } }), 'params: pattern: string, path: string')
  assert.equal(paramHint({ properties: {} }), 'no params')
  assert.equal(paramHint({ type: 'object', properties: { content: { type: 'string' } } }), 'params: content: string')
  assert.equal(paramHint({ type: 'object', properties: { limit: { type: 'number', description: 'Maximum lines. Defaults to 2000.' } } }), 'params: limit: number≤2000')
  assert.match(paramHint(() => ({})), /tools_help/)
  assert.equal(paramHint(undefined), 'no params')
})
test('deliveryCheck: 交付 gate 检查清单（v1.11 → v1.14 requireSmoke+evidence）', async () => {
  // 缺失路径 → FAIL + 证据
  const nofile = await deliveryCheck({ get: () => undefined }, { file: 'Z:\\\\no-such-file-xyz.html' })
  assert.equal(nofile.ok, false)
  assert.ok(nofile.checks.some((c) => c.name === 'file-exists' && !c.pass))
  // 临时有效文件：无 url + 无 evidence → smoke/evidence FAIL（v1.14 不再可绕过）
  const tmp = join(process.cwd(), '.t-delivery-probe.html')
  writeFileSync(tmp, '<!doctype html><html><head><title>OK</title></head><body>x</body></html>', 'utf8')
  try {
    const noSmoke = await deliveryCheck({ get: () => undefined }, { file: tmp })
    assert.equal(noSmoke.ok, false)
    assert.ok(noSmoke.checks.some((c) => c.name === 'page-verify' && !c.pass || (c.name === 'delivery-evidence' && !c.pass)), 'page verify required (v1.23: model self-tests via bash, gate on evidence)')
    assert.ok(noSmoke.checks.some((c) => c.name === 'delivery-evidence' && !c.pass), 'evidence required')
    // 非页面产物显式关 smoke + 给 evidence → PASS
    const okr = await deliveryCheck({ get: () => undefined }, {
      file: tmp, requireSmoke: false,
      evidence: { items: [{ label: 'file', kind: 'file', target: tmp }] },
    })
    assert.equal(okr.ok, true)
  } finally { rmSync(tmp, { force: true }) }
  // 非法 UTF-8 → encoding FAIL
  const bad = join(process.cwd(), '.t-bad.html')
  writeFileSync(bad, Buffer.from([0xff, 0xfe, 0x00, 0x41]), 'utf8')
  try {
    const badr = await deliveryCheck({ get: () => undefined }, { file: bad, requireSmoke: false, evidence: { items: [{ label: 'f', kind: 'file', target: bad }] } })
    assert.equal(badr.ok, false)
    assert.ok(badr.checks.some((c) => c.name === 'encoding-utf8' && !c.pass))
  } finally { rmSync(bad, { force: true }) }
})

test('runtimeCallable: 与 SDK 绑定同源（v1.11）', () => {
  const svc = { view: () => ({ visible: new Map([['read', {}], ['write', {}], ['run_code', {}], ['subagent', {}]]) }) }
  const names = runtimeCallable(svc, {})
  assert.ok(names.includes('read') && names.includes('write'))
  assert.ok(names.includes('run_code'), 'both 模式下 run_code 真实可调')
  assert.ok(names.includes('subagent'), 'v1.14 全列：scope-local 也可调工具必列')
})
test('v1.16: muteAwareList/isMemoryTool + external evidence', async () => {
  assert.ok(isMemoryTool('engram_recall'))
  assert.ok(!isMemoryTool('read'))
  const all = ['read', 'write', 'engram_recall', 'tool-help']
  assert.deepEqual(muteAwareList(all, true), ['read', 'write', 'tool-help'])
  assert.deepEqual(muteAwareList(all, false), all)
  // external 证据：Playwright 产物合法（target 文件 + reviewed）
  const tmp = join(process.cwd(), '.t-ext-evidence.png')
  writeFileSync(tmp, 'x', 'utf8')
  try {
    const okr = await deliveryCheck({ get: () => undefined }, {
      file: tmp, requireSmoke: false,
      evidence: { items: [{ label: 'pw-screenshot', kind: 'external', target: tmp, reviewed: true }] },
    })
    assert.equal(okr.ok, true)
  } finally { rmSync(tmp, { force: true }) }
})