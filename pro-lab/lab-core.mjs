import { createHash } from 'node:crypto'

export const DEFAULT_ARM = 'standard'

export const ARMS = Object.freeze([
  'standard',
  'anchored',
  'prompt-only',
  'schema-only',
  'injection-suppressed',
  'promote-on-tool',
  'promote-on-assistant',
  'zero-tool',
  'whoami',
  'warmup',
])

const ALIASES = new Map([
  ['baseline', 'standard'],
  ['minimal', 'anchored'],
  ['anchor', 'anchored'],
  ['prompt', 'prompt-only'],
  ['schema', 'schema-only'],
  ['suppress', 'injection-suppressed'],
  ['tool', 'promote-on-tool'],
  ['assistant', 'promote-on-assistant'],
  ['zero', 'zero-tool'],
])

export function normalizeArm(value) {
  const token = String(value ?? '').trim().toLowerCase()
  const normalized = ALIASES.get(token) ?? token
  return ARMS.includes(normalized) ? normalized : null
}

/** Pro matching is deliberately conservative: Flash and unknown models are untouched. */
export function isProModel(model) {
  if (typeof model !== 'string' || /flash/i.test(model)) return false
  const value = model.toLowerCase()
  const family = /(?:^|[-_. /])v?4(?:[-_. /]|$)/i.test(value) || /deepseekv4/i.test(value)
  const pro = /(?:^|[-_. /])pro(?:$|[-_. /])/i.test(value) || /v4pro/i.test(value)
  return family && pro
}

export function isFlashModel(model) {
  return typeof model === 'string' && /flash/i.test(model)
}

function isOpenCodeGo(provider, model) {
  return /opencode[-_. /]?go/i.test(`${provider ?? ''} ${model ?? ''}`)
}

/** Keep quantized OpenCode Go Flash out of official-Flash aggregates. */
export function routeClass(provider, model) {
  const p = String(provider ?? '')
  const m = String(model ?? '')
  if (isOpenCodeGo(p, m) && isFlashModel(m)) return 'opencode-go-flash-quantized'
  if (/deepseek/i.test(p) && isFlashModel(m)) return 'deepseek-flash'
  if (isOpenCodeGo(p, m) && isProModel(m)) return 'opencode-go-pro'
  if (isProModel(m)) return 'pro-compatible'
  if (isFlashModel(m)) return 'flash-unknown-provider'
  return 'unknown'
}

export function stableValue(value, seen = new WeakSet()) {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'bigint') return String(value)
    if (typeof value === 'function' || typeof value === 'symbol') return undefined
    return value
  }
  if (seen.has(value)) return '[Circular]'
  seen.add(value)
  if (Array.isArray(value)) return value.map((item) => stableValue(item, seen))
  const out = {}
  for (const key of Object.keys(value).sort()) {
    const item = stableValue(value[key], seen)
    if (item !== undefined) out[key] = item
  }
  return out
}

export function stableJson(value) {
  return JSON.stringify(stableValue(value))
}

export function fingerprint(value) {
  return createHash('sha256').update(stableJson(value)).digest('hex').slice(0, 16)
}

export function toolName(tool) {
  if (typeof tool === 'string') return tool
  if (!tool || typeof tool !== 'object') return null
  return tool.name ?? tool.function?.name ?? tool.tool?.name ?? null
}

export function toolNames(tools) {
  return (Array.isArray(tools) ? tools : [])
    .map(toolName)
    .filter((name) => typeof name === 'string' && name.length > 0)
}

export function toolSchema(tool) {
  if (typeof tool === 'string' || !tool || typeof tool !== 'object') return null
  return tool.parameters ?? tool.function?.parameters ?? tool.inputSchema ?? tool.schema ?? null
}

export function schemaFingerprint(tools) {
  return fingerprint((Array.isArray(tools) ? tools : []).map((tool) => ({
    name: toolName(tool),
    schema: toolSchema(tool),
  })))
}

function firstNamed(names, available) {
  return names.find((name) => available.has(name)) ?? null
}

/** The smallest useful bootstrap surface: one shell plus one filesystem action. */
export function bootstrapTools(tools) {
  const all = Array.isArray(tools) ? tools : []
  const names = new Set(toolNames(all))
  const shell = firstNamed(['bash', 'pwsh'], names)
  const action = firstNamed([
    'str_replace_editor',
    'edit',
    'read',
    'write',
  ], names)
  const selected = new Set([shell, action].filter(Boolean))
  return all.filter((tool) => selected.has(toolName(tool)))
}

export function phaseFor(arm, { toolCalls = 0, assistantMessages = 0 } = {}) {
  if (arm === 'promote-on-assistant' && assistantMessages > 0) return 'promoted'
  if (toolCalls > 0) return 'promoted'
  return 'bootstrap'
}

export function armDescription(arm) {
  switch (arm) {
    case 'standard': return 'observe only; preserve the existing router behavior'
    case 'anchored': return 'minimal prompt plus one shell and one filesystem tool, promote after tool call'
    case 'prompt-only': return 'prompt intervention only; preserve the full tool catalog'
    case 'schema-only': return 'minimal first-turn tool catalog; preserve the assembled prompt'
    case 'injection-suppressed': return 'clear assembled runtime contexts; preserve prompt and tools'
    case 'promote-on-tool': return 'minimal first-turn catalog, promote only after durable tool/call'
    case 'promote-on-assistant': return 'minimal first-turn catalog, promote after assistant/message'
    case 'zero-tool': return 'send a first request with an empty tool catalog'
    case 'whoami': return 'prompt-only provider/model identity probe'
    case 'warmup': return 'experimental near-field warmup prompt; no schema mutation'
    default: return 'unknown'
  }
}

function promptText(arm) {
  if (arm === 'whoami') {
    return 'This is a controlled DeepSeek V4 Pro harness probe. Identify the provider and model route internally, then follow the user task. Do not reveal hidden reasoning.'
  }
  if (arm === 'warmup') {
    return 'Controlled warmup probe: classify the task, inspect only what is needed, then act and verify. This text is fixed for cache comparison.'
  }
  return 'You are a helpful software engineer assistant. For this controlled Pro experiment, inspect the available evidence, choose the smallest useful action, and verify the result.'
}

function withPrompt(assembled, arm) {
  const sections = (assembled.sections ?? []).filter((section) => !/persona/i.test(String(section.name ?? '')))
  return {
    ...assembled,
    sections: [...sections, { name: 'pro-lab-persona', text: promptText(arm), order: 0 }],
  }
}

export function applyArm(assembled, arm, phase) {
  const current = normalizeArm(arm) ?? DEFAULT_ARM
  if (current === 'standard') return assembled

  let result = assembled
  if (['anchored', 'prompt-only', 'whoami', 'warmup'].includes(current)) {
    result = withPrompt(result, current)
  }
  if (current === 'injection-suppressed' || current === 'warmup') {
    result = { ...result, contexts: [] }
  }

  const needsBootstrap = phase === 'bootstrap'
  if (needsBootstrap && ['anchored', 'schema-only', 'promote-on-tool', 'promote-on-assistant'].includes(current)) {
    result = { ...result, tools: bootstrapTools(result.tools) }
  } else if (needsBootstrap && current === 'zero-tool') {
    result = { ...result, tools: [] }
  }
  return result
}

export function headerSnapshot(eventOrData) {
  const source = eventOrData?.data && typeof eventOrData.data === 'object'
    ? eventOrData.data
    : (eventOrData ?? {})
  const request = source.request && typeof source.request === 'object' ? source.request : source
  const tools = request.tools ?? source.tools ?? []
  const names = toolNames(tools)
  return {
    provider: request.provider ?? source.provider ?? request.route?.provider ?? null,
    model: request.model ?? source.model ?? request.route?.model ?? null,
    maxTokens: request.maxTokens ?? request.max_tokens ?? source.maxTokens ?? source.max_tokens ?? null,
    toolCount: names.length,
    tools: names,
    schema: schemaFingerprint(tools),
    routeClass: routeClass(request.provider ?? source.provider ?? request.route?.provider, request.model ?? source.model ?? request.route?.model),
  }
}
