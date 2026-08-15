import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  ARMS,
  applyArm,
  bootstrapTools,
  fingerprint,
  headerSnapshot,
  isProModel,
  normalizeArm,
  phaseFor,
  routeClass,
  schemaFingerprint,
} from './lab-core.mjs'
import { apply as applyPlugin, requestedArm } from './index.mjs'

const tools = [
  { name: 'bash', parameters: { type: 'object' } },
  { name: 'str_replace_editor', parameters: { type: 'object', properties: { path: { type: 'string' } } } },
  { name: 'glob', parameters: { type: 'object' } },
]

test('arm registry is explicit and aliases are stable', () => {
  assert.ok(ARMS.includes('anchored'))
  assert.equal(normalizeArm('baseline'), 'standard')
  assert.equal(normalizeArm('minimal'), 'anchored')
  assert.equal(normalizeArm('nope'), null)
})

test('Pro detection never opts Flash or unknown models into experiments', () => {
  assert.equal(isProModel('deepseek-v4-pro'), true)
  assert.equal(isProModel('deepseek-v3-pro'), false)
  assert.equal(isProModel('deepseek-v4-flash'), false)
  assert.equal(isProModel('custom-provider/model'), false)
})

test('OpenCode Go quantized Flash is a separate evidence population', () => {
  assert.equal(routeClass('opencode-go', 'deepseek-v4-flash'), 'opencode-go-flash-quantized')
  assert.equal(routeClass('deepseek', 'deepseek-v4-flash'), 'deepseek-flash')
  assert.equal(routeClass('opencode-go', 'deepseek-v4-pro'), 'opencode-go-pro')
  assert.equal(routeClass('custom-provider', 'deepseek-v4-flash'), 'flash-unknown-provider')
})

test('bootstrap surface keeps one shell and one filesystem action', () => {
  assert.deepEqual(bootstrapTools(tools).map((tool) => tool.name), ['bash', 'str_replace_editor'])
  assert.deepEqual(bootstrapTools([{ name: 'glob' }]).map((tool) => tool.name), [])
})

test('anchored arm changes tools once and promotes after a durable call', () => {
  const assembly = { sections: [{ name: 'router-persona', text: 'old' }], contexts: [{ id: 1 }], tools }
  const first = applyArm(assembly, 'anchored', phaseFor('anchored', { toolCalls: 0 }))
  assert.deepEqual(first.tools.map((tool) => tool.name), ['bash', 'str_replace_editor'])
  assert.equal(first.contexts.length, 1)
  assert.equal(first.sections[0].name, 'pro-lab-persona')
  const promoted = applyArm(assembly, 'anchored', phaseFor('anchored', { toolCalls: 1 }))
  assert.equal(promoted.tools.length, tools.length)
})

test('schema-only and zero-tool arms do not inject prompt text', () => {
  const assembly = { sections: [{ name: 'persona', text: 'keep' }], contexts: [], tools }
  const schema = applyArm(assembly, 'schema-only', 'bootstrap')
  assert.equal(schema.sections[0].name, 'persona')
  assert.equal(schema.tools.length, 2)
  const zero = applyArm(assembly, 'zero-tool', 'bootstrap')
  assert.equal(zero.tools.length, 0)
})

test('header snapshots expose metadata and a schema fingerprint only', () => {
  const header = headerSnapshot({ type: 'request/header', data: { provider: 'deepseek', model: 'deepseek-v4-pro', max_tokens: 4096, tools } })
  assert.deepEqual(header.tools, ['bash', 'str_replace_editor', 'glob'])
  assert.equal(header.toolCount, 3)
  assert.equal(header.maxTokens, 4096)
  assert.equal(header.schema, schemaFingerprint(tools))
  assert.equal(Object.hasOwn(header, 'prompt'), false)
  assert.notEqual(fingerprint(tools), fingerprint([{ name: 'other' }]))
})

test('preflight command selects an arm before the first model request', () => {
  const session = {
    events: [
      { type: 'user/message', data: { content: [{ type: 'text', text: '/v4 lab anchored' }] } },
    ],
  }
  assert.equal(requestedArm(session), 'anchored')
  assert.equal(requestedArm({ events: [{ type: 'user/message', data: { content: [{ type: 'text', text: 'anchored' }] } }] }), null)
})

test('plugin integration locks the arm and exports sanitized evidence', async () => {
  const oldHome = process.env.DSH_HOME
  const home = mkdtempSync(join(tmpdir(), 'dsh-pro-lab-'))
  process.env.DSH_HOME = home
  const handlers = new Map()
  const registered = []
  const ctx = {
    on(event, handler) { handlers.set(event, handler) },
    effect(register) { return register() },
    tools: { register(tool) { registered.push(tool); return () => {} } },
    get() { throw new Error('no global agent in fixture') },
  }
  try {
    applyPlugin(ctx)
    assert.deepEqual(registered.map((tool) => tool.name), ['dev_pro_lab_mode', 'dev_pro_lab_status', 'dev_pro_lab_export'])
    const session = { id: 'fixture', events: [{ type: 'user/message', data: { content: [{ type: 'text', text: '/v4 lab anchored' }] } }] }
    const agent = { session, options: { provider: 'deepseek', model: 'deepseek-v4-pro' } }
    const assembly = { sections: [{ name: 'router-persona', text: 'old' }], contexts: [{ id: 'runtime' }], tools }
    const first = await handlers.get('system-prompt/assemble')({}, { agent }, async () => assembly)
    assert.deepEqual(first.tools.map((tool) => tool.name), ['bash', 'str_replace_editor'])
    handlers.get('session/event')(session, { type: 'request/header', data: { provider: 'deepseek', model: 'deepseek-v4-pro', tools: first.tools } })
    const status = JSON.parse(await registered[1].execute({}))
    assert.equal(status.arm, 'anchored')
    assert.equal(status.locked, true)
    assert.equal(status.invalid.length, 0)
    assert.match(await registered[0].execute({ arm: 'schema-only' }), /locked/)
    const target = join(home, 'fixture.jsonl')
    assert.match(await registered[2].execute({ path: target }), /exported/)
    const exported = readFileSync(target, 'utf8')
    assert.equal(exported.includes('raw prompt'), false)
    assert.equal(exported.includes('reasoning_content'), false)
  } finally {
    if (oldHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = oldHome
    rmSync(home, { recursive: true, force: true })
  }
})
