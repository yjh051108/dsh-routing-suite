import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import {
  ARMS,
  DEFAULT_ARM,
  applyArm,
  armDescription,
  headerSnapshot,
  isProModel,
  normalizeArm,
  phaseFor,
  routeClass,
  schemaFingerprint,
  stableJson,
  toolNames,
} from './lab-core.mjs'

export const name = 'dsh-pro-lab'
export const inject = ['systemPrompt', 'tools', 'llm']

const MAX_TRACE = 2000

function dshHome() {
  return process.env.DSH_HOME || join(homedir(), '.dsh')
}

function sessionId(session) {
  return String(session?.id ?? session?.key ?? session?.name ?? 'unknown')
}

function modelOf(agent) {
  return String(agent?.options?.model ?? '')
}

function providerOf(agent) {
  return String(agent?.options?.provider ?? '')
}

function userText(data) {
  const payload = data?.message && typeof data.message === 'object' ? data.message : data
  const content = Array.isArray(payload?.content) ? payload.content : []
  return content.map((part) => typeof part === 'string' ? part : String(part?.text ?? '')).join(' ')
}

/** Parse an explicit preflight command from durable user events. */
export function requestedArm(session) {
  for (const event of session?.events ?? []) {
    if (event?.type !== 'user/message') continue
    const text = userText(event.data)
    const match = text.match(/^\s*\/v4\s+(?:lab\s+)?(?:mode\s+)?([a-z0-9-]+)\s*$/i)
    const arm = match ? normalizeArm(match[1]) : null
    if (arm) return arm
  }
  return null
}

export function createSessionState(session, agent, configuredArm = null) {
  const arm = normalizeArm(configuredArm) ?? DEFAULT_ARM
  return {
    id: sessionId(session),
    arm,
    armSource: configuredArm ? 'environment' : 'default',
    locked: false,
    provider: providerOf(agent) || null,
    model: modelOf(agent) || null,
    routeClass: routeClass(providerOf(agent), modelOf(agent)),
    proDetected: isProModel(modelOf(agent)),
    assemblies: 0,
    requests: 0,
    toolCalls: 0,
    toolErrors: 0,
    assistantMessages: 0,
    turns: 0,
    steps: 0,
    firstAssembly: null,
    firstHeader: null,
    schemaFingerprints: [],
    promptFingerprints: [],
    invalid: [],
    eventCounts: {},
    trace: [],
  }
}

function currentAgent(ctx) {
  try { return ctx.get('agent') } catch { return undefined }
}

function stateFor(states, session, agent, configuredArm = null) {
  const id = sessionId(session)
  let state = states.get(id)
  if (!state) {
    state = createSessionState(session, agent, configuredArm)
    states.set(id, state)
  }
  if (agent) {
    state.provider ||= providerOf(agent) || null
    state.model ||= modelOf(agent) || null
    state.proDetected ||= isProModel(modelOf(agent))
    if (state.routeClass === 'unknown') state.routeClass = routeClass(state.provider, state.model)
  }
  return state
}

function markInvalid(state, reason) {
  if (!state.invalid.includes(reason)) state.invalid.push(reason)
}

function safeEvent(event) {
  const type = String(event?.type ?? 'unknown')
  const data = event?.data && typeof event.data === 'object' ? event.data : {}
  const out = { type }
  if (type === 'tool/call' || type === 'tool/result') {
    out.tool = data.name ?? data.tool ?? null
    if (type === 'tool/result') out.error = Boolean(data.isError ?? data.error)
  }
  if (type === 'request/header') out.header = headerSnapshot(event)
  return out
}

function summary(state) {
  return {
    session: state.id,
    arm: state.arm,
    armSource: state.armSource,
    locked: state.locked,
    phase: phaseFor(state.arm, state),
    provider: state.provider,
    model: state.model,
    routeClass: state.routeClass,
    proDetected: state.proDetected,
    invalid: [...state.invalid],
    counts: {
      assemblies: state.assemblies,
      requests: state.requests,
      turns: state.turns,
      steps: state.steps,
      assistantMessages: state.assistantMessages,
      toolCalls: state.toolCalls,
      toolErrors: state.toolErrors,
    },
    firstAssembly: state.firstAssembly,
    firstHeader: state.firstHeader,
    schemaFingerprints: [...state.schemaFingerprints],
    promptFingerprints: [...state.promptFingerprints],
    eventCounts: { ...state.eventCounts },
  }
}

function exportPath(value, stateId) {
  if (value) return isAbsolute(String(value)) ? String(value) : resolve(String(value))
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  return join(dshHome(), 'pro-lab', `session-${stateId}-${stamp}.jsonl`)
}

export function apply(ctx) {
  const states = new Map()
  const configuredArm = normalizeArm(process.env.DSH_PRO_LAB_ARM)
  const logFile = join(dshHome(), 'pro-lab', 'sessions.jsonl')
  let activeSession = null

  function appendTrace(state, record) {
    const line = { ts: new Date().toISOString(), ...record }
    state.trace.push(line)
    if (state.trace.length > MAX_TRACE) state.trace.shift()
    try {
      mkdirSync(dirname(logFile), { recursive: true })
      appendFileSync(logFile, stableJson({ ...line, session: state.id, arm: state.arm }) + '\n', 'utf8')
    } catch {
      // Evidence collection must never break the user request.
    }
  }

  ctx.on('system-prompt/assemble', async (_assembly, context, next) => {
    const assembled = await next()
    const agent = context?.agent
    const session = agent?.session
    if (!session) return assembled
    const state = stateFor(states, session, agent, requestedArm(session) ?? configuredArm)
    activeSession = state.id
    state.assemblies += 1
    state.provider ||= providerOf(agent) || null
    state.model ||= modelOf(agent) || null
    state.proDetected ||= isProModel(modelOf(agent))

    const beforePrompt = (assembled.sections ?? []).map((section) => ({ name: section.name, order: section.order, textLength: String(section.text ?? '').length }))
    if (beforePrompt.filter((section) => /router-persona|pro-lab-persona/i.test(String(section.name))).length > 1) {
      markInvalid(state, 'multiple-prompt-writers-visible')
    }

    const phase = phaseFor(state.arm, state)
    const output = state.proDetected || state.arm !== DEFAULT_ARM
      ? applyArm(assembled, state.arm, phase)
      : assembled
    const outputNames = toolNames(output.tools)
    const schema = schemaFingerprint(output.tools)
    const prompt = (output.sections ?? []).map((section) => ({ name: section.name, order: section.order, textLength: String(section.text ?? '').length }))
    state.schemaFingerprints.push(schema)
    state.promptFingerprints.push(schemaFingerprint(prompt))
    if (state.schemaFingerprints.length > 1 && new Set(state.schemaFingerprints).size > 2) {
      markInvalid(state, 'schema-changed-more-than-once')
    }
    if (!state.firstAssembly) {
      state.firstAssembly = {
        phase,
        toolCount: outputNames.length,
        tools: outputNames,
        schema,
        contexts: Array.isArray(output.contexts) ? output.contexts.length : null,
      }
      if (state.arm !== DEFAULT_ARM) {
        if (['anchored', 'schema-only', 'promote-on-tool', 'promote-on-assistant'].includes(state.arm) && outputNames.length > 2) markInvalid(state, 'bootstrap-tool-count-too-large')
        if (state.arm === 'zero-tool' && outputNames.length !== 0) markInvalid(state, 'zero-tool-arm-exposed-tools')
        if (state.arm === 'injection-suppressed' && Array.isArray(output.contexts) && output.contexts.length !== 0) markInvalid(state, 'contexts-not-suppressed')
      }
    }
    state.locked = true
    appendTrace(state, { type: 'assembly', phase, toolCount: outputNames.length, tools: outputNames, schema })
    return output
  })

  ctx.on('llm/stream', (options, next) => {
    const state = activeSession ? states.get(activeSession) : null
    if (state) {
      state.provider ||= options?.provider ?? null
      state.model ||= options?.model ?? null
      state.proDetected ||= isProModel(state.model)
      state.routeClass = routeClass(state.provider, state.model)
      appendTrace(state, {
        type: 'route',
        provider: options?.provider ?? null,
        model: options?.model ?? null,
        routeClass: state.routeClass,
        maxTokens: options?.maxTokens ?? options?.max_tokens ?? null,
      })
    }
    return next()
  })

  ctx.on('session/event', (session, event) => {
    if (!session) return
    const agent = currentAgent(ctx)
    const state = stateFor(states, session, agent, requestedArm(session) ?? configuredArm)
    activeSession = state.id
    state.routeClass = routeClass(state.provider, state.model)
    const type = String(event?.type ?? 'unknown')
    state.eventCounts[type] = (state.eventCounts[type] ?? 0) + 1
    if (type === 'request/header') {
      state.requests += 1
      const header = headerSnapshot(event)
      if (!state.firstHeader) {
        state.firstHeader = header
        if (state.firstAssembly && (state.firstAssembly.schema !== header.schema || state.firstAssembly.toolCount !== header.toolCount)) markInvalid(state, 'header-schema-mismatch')
      }
    } else if (type === 'tool/call') {
      state.toolCalls += 1
    } else if (type === 'tool/result') {
      if (safeEvent(event).error) state.toolErrors += 1
    } else if (type === 'assistant/message') {
      state.assistantMessages += 1
    } else if (type === 'turn/start') {
      state.turns += 1
    } else if (type === 'step/start') {
      state.steps += 1
    }
    appendTrace(state, safeEvent(event))
  })

  function currentState() {
    return activeSession ? states.get(activeSession) : null
  }

  function register(tool) {
    ctx.effect(() => ctx.tools.register({
      ...tool,
      parameters: toJsonSchema(tool.parameters),
    }))
  }

  register({
    name: 'dev_pro_lab_mode',
    description: 'Select an opt-in DeepSeek V4 Pro experiment arm before the first request; mode is locked after assembly.',
    parameters: { arm: { type: 'string', required: true, description: ARMS.join(' / ') } },
    output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: String(value) }] },
    execute(args) {
      const state = currentState()
      const arm = normalizeArm(args?.arm)
      if (!state) return 'no active agent session'
      if (!arm) return `invalid arm; use one of: ${ARMS.join(', ')}`
      if (state.locked && state.arm !== arm) return `arm is locked to ${state.arm} after the first request`
      if (!state.proDetected && arm !== DEFAULT_ARM) return 'Pro lab arms are disabled for non-Pro or unknown models; use standard to observe'
      state.arm = arm
      state.armSource = 'manual'
      return `arm=${arm}; ${armDescription(arm)}; applies on the next request`
    },
  })

  register({
    name: 'dev_pro_lab_status',
    description: 'Show sanitized Pro lab state: arm, route, phase, schema fingerprints, counts, and invalid-run reasons.',
    parameters: {},
    output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: String(value) }] },
    execute() {
      const state = currentState()
      return JSON.stringify(state ? summary(state) : { error: 'no active agent session' }, null, 2)
    },
  })

  register({
    name: 'dev_pro_lab_export',
    description: 'Export the current session as sanitized JSONL. Raw prompt, reasoning, tool arguments, and secrets are excluded.',
    parameters: { path: { type: 'string', description: 'optional absolute or relative output path' } },
    output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: String(value) }] },
    execute(args) {
      const state = currentState()
      if (!state) return 'no active agent session'
      const target = exportPath(args?.path, state.id.replace(/[^a-zA-Z0-9_.-]/g, '_'))
      try {
        mkdirSync(dirname(target), { recursive: true })
        const lines = [...state.trace, { type: 'summary', ...summary(state) }]
        writeFileSync(target, lines.map((line) => stableJson(line)).join('\n') + '\n', 'utf8')
        return `exported ${lines.length} records to ${target}`
      } catch (error) {
        return `export failed: ${String(error).slice(0, 240)}`
      }
    },
  })
}

function toJsonSchema(spec) {
  const properties = {}
  const required = []
  for (const [key, meta] of Object.entries(spec ?? {})) {
    const prop = { type: meta.type }
    if (Array.isArray(meta.enum)) prop.enum = meta.enum
    if (meta.description) prop.description = meta.description
    properties[key] = prop
    if (meta.required) required.push(key)
  }
  return { type: 'object', properties, required, additionalProperties: false }
}
