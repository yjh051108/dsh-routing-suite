/**
 * router-bootstrap: task-aware reasoning-mode router with a continuous
 * react↔spec axis.
 *
 * Reads the session's first user message, classifies the task into a
 * continuous mode in [0,1] (0 = spec plan-first, 1 = react doer), and on the
 * first model request injects the matching persona and first-turn core tool
 * set. After the first durable tool/call the full preset catalog is exposed
 * and nothing is touched again; the mode derives from durable session events,
 * so resume/reload keeps it.
 *
 * The agent can read and tune its own routing through `dev_router_status` and
 * `dev_router_mode` (self-optimization loop) — mode accepts band names
 * (spec/spec-lean/balanced/react-lean/react), 0-100 numbers, or 0.0-1.0.
 *
 * Zero external imports on purpose: relative preset rows resolve bare
 * specifiers from the user home, where `@deepseek-ai/*` is not installed.
 * The router tools therefore inline a minimal schema compiler instead of
 * importing `defineTool` from `@deepseek-ai/dsh-tools`.
 */

import {
  applyPersona, bandFor, bandOf, coreFor, parseMode, personaFor, sessionMode, testinessFor, clamp01,
  isComplexTask,
} from './router-core.mjs'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'router-bootstrap'

/** Prompt assembly, the tools registry, and the LLM route must exist. */
export const inject = ['systemPrompt', 'tools', 'llm']

/** Minimal spec → JSON Schema compiler (subset of defineTool's work). */
function toJsonSchema(spec) {
  const properties = {}
  const required = []
  for (const [key, meta] of Object.entries(spec || {})) {
    const prop = { type: meta.type }
    if (Array.isArray(meta.enum)) prop.enum = meta.enum
    if (meta.description) prop.description = meta.description
    properties[key] = prop
    if (meta.required) required.push(key)
  }
  return { type: 'object', properties, required, additionalProperties: false }
}

export function apply(ctx, config) {
  const overrides = new Map() // session id -> explicit mode (number 0..1)
  const agents = new Map() // session id -> Agent (live handle, in-process only)
  const firstUserText = new Map() // session id -> first REAL user message text (issue #3 fix)

  // ── 路由模式（v0.2.0 命名，用户定义）───────────────────────────────────────
  // standard（默认，新）: RL 接口还原——首轮只有 RL 训练句 + shell/str_replace_editor，
  //   模型"想一段、做一段"（实测 25 步 / 24 工具调用 / 产出文件）。
  // spec（旧）: 深度思考优先——分类 persona（w7/REACT/SPEC）+ 保留全部 sections，
  //   模型首轮长思维链（101K 推理 0 行动是其特征，不是缺陷）。
  const routerMode = config.routerMode === 'spec' ? 'spec' : 'standard'
  const RL_PERSONA = 'You are a helpful software engineer assistant.'
  // v0.4 We-Team Protocol（回退 native 版，用户定稿）：
  // We stay we。Openers only: We/我们/Next/因此/Therefore——没有合适开头就改写句子。
  // 每 2-3 句一个决策句；每个工具结果后一行收束（we confirm/refute + 下一步）；
  // 最终回复一律 we-form。
  const WE_TEAM_PROTOCOL = [
    'We-Team Protocol:',
    'We stay we.',
    'Openers only: We / 我们 / Next / 因此 / Therefore — if a sentence fits no opener, we rewrite the sentence.',
    'One decision every 2-3 sentences.',
    'One closing line per tool result: we confirm or refute, then one next step.',
    'Final reply always in we-form.',
    'This turn: We move. Two paths before us? We name both, pick one by a stated criterion, and continue as we.',
  ].join('\n')

  /** spec 路由模式的首轮工具面（旧行为；weak 也走 default 面）。 */
  function legacyCore(mode) {
    switch (bandOf(mode)) {
      case 'spec': return ['read', 'edit', 'glob', 'grep']
      default: return ['read', 'write', 'edit']
    }
  }

  ctx.on('system-prompt/assemble', async (_assembly, context, next) => {
    const assembled = await next()
    const agent = context.agent
    if (agent === undefined) return assembled
    const session = agent.session
    agents.set(session.id, agent)

    // issue #3 fix: the first assembly happens before the first user/message
    // event lands in session.events, so sessionMode() saw an empty transcript
    // and injected the WEAK band on the path-committing first request. Use the
    // live text captured by the session/event listener (or inbox pending) so
    // the first request carries the REAL classification.
    const mode = overrides.get(session.id) ?? firstUserText.get(session.id) ?? sessionMode(session)
    const modelId = agent.options?.model

    // ── 模式分派 ──
    // standard（RL 接口还原）: 首轮 system = 只有 RL 训练句；身份/Web 定位/工具引导/
    // 规则 sections 全部移除（minimal 的 complete:true 语义，实测 46 字符 system →
    // 25 步迭代工作流）。
    // spec（深度思考优先）: 分类 persona + 保留全部 sections（首轮超长思维链是特征）。
    const planSection = (assembled.sections || []).find((s) => /plan/i.test(s.name))
    let sections
    let core
    let persona
    if (routerMode === 'standard') {
      persona = RL_PERSONA + '\n\n' + WE_TEAM_PROTOCOL
      // v0.4（回退 native）：首轮只有 RL 句 + 协议——身份/Web/工具引导/
      // 规则 sections 全部移除（minimal 的 complete:true 语义）。plan 段保留。
      sections = planSection
        ? [planSection, { name: 'router-persona', text: persona, order: 0 }]
        : [{ name: 'router-persona', text: persona, order: 0 }]
      core = new Set(['str_replace_editor']) // RL shape: shell + editor
    } else {
      persona = personaFor(mode, modelId)
      sections = applyPersona(assembled.sections, persona) // keep all other sections
      core = new Set(legacyCore(mode))
    }

    if (session.events.some((event) => event.type === 'tool/call')) {
      return { ...assembled, sections, contexts: [] } // promoted: full catalog
    }

    const available = new Set(assembled.tools.map((tool) => tool.name))
    const shell = available.has('pwsh') ? 'pwsh' : available.has('bash') ? 'bash' : null
    if (shell === null) {
      // PTC 基座（v0.4 实验）：code mode 下模型面只有 run_code（原生 schema
      // 全省略），没有 shell——工具面收窄无意义，直接放行（persona/sections
      // 逻辑照常）。
      if (available.has('run_code')) {
        return { ...assembled, sections, contexts: [] }
      }
      throw new Error(`${name}: no platform shell in catalog`)
    }
    core.add(shell)

    return {
      ...assembled,
      sections,
      contexts: [],
      tools: assembled.tools.filter((tool) => core.has(tool.name)),
    }
  })

  // ── near-field routing guidance for weak mode (P14/P16/P17/P19/P20) ─────
  // Every REAL user message in a weak-mode session gets ONE fixed guidance
  // message appended to the inbox right after it (near field, cache-neutral).
  // v19: depth-adaptive — SIMPLE tasks get the fast-convergence guide;
  // COMPLEX tasks get the deep-exploration guide (depth-first, information-
  // driven stop signal). The persona carries no hard converge anchor
  // (P27: information-driven convergence beats step-driven; user feedback:
  // flash was over-confident / too shallow on complex tasks).

  // v0.4 We-Team 协议近场注入：分类 + 行动节律 + 决策节奏（专属语言）。
  // 决策节奏（每 2-3 句一个决策句）直接对抗推理-行动失联；完整 PTC 下
  // 行动载体是 run_code 程序（一次执行多步）。
  const GUIDE_WEAK =
    '\n\nWe/我们：按 We-Team Protocol 推进——先分类任务：build → 直接写 run_code 程序生产；fix → 先查后修。'
    + ' 我们的节奏：每句一个动作；每 2-3 句一个决策句（We decide / 我们决定）然后继续。'
    + ' 我们直接行动：第一句即调用 run_code 执行第一步，再按反馈推进。'
    + ' 我们验证、我们收敛、我们交付——决策后即前进。'
  const GUIDE_DEEP =
    '\n\nWe/我们：按 We-Team Protocol 推进——先分类任务：build → 直接生产；fix → 先查后修。'
    + ' 我们深入架构、边界与集成点（不猜环境、不重复检查）。'
    + ' 我们的节奏：每句一个动作；每 2-3 句一个决策句（We decide / 我们决定）然后继续。'
    + ' 我们直接行动：信息足够即调用 run_code 执行，再按反馈推进。'
    + ' 我们以决策或信息需求结束每个推理块；我们收敛、我们交付。'
    '\nRouter: classify this task (build or fix) now, then adopt the matching style — build: direct production; fix: inspect-first. Think deeply about the architecture, edge cases, and integration points. Do not spend reasoning on the environment or tooling. Produce when your information is complete. End each reasoning block with a decision or an information need.'

  ctx.on('session/event', (session, event) => {
    if (event.type !== 'user/message') return
    const data = event.data ?? {}
    if (data.source?.kind !== 'user') return // only real user messages
    const text = extractText(data)
    if (!firstUserText.has(session.id) && text.trim()) {
      firstUserText.set(session.id, text.trim()) // issue #3: capture BEFORE assembly
    }
    const agent = ctx.get('agent')
    const target = agent !== undefined && agent.session === session ? agent : [...agents.values()].find((a) => a.session === session)
    if (target === undefined || target.inbox === undefined) return
    const mode = overrides.get(session.id) ?? firstUserText.get(session.id) ?? sessionMode(session)
    if (bandOf(mode) !== 'weak') return // strong modes need no guidance
    if (!text.trim()) return
    const guide = isComplexTask(text) ? GUIDE_DEEP : GUIDE_WEAK
    try {
      target.inbox.append('next-step', {
        id: `router-guide-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role: 'user',
        source: { kind: 'plugin', plugin: 'router-bootstrap' },
        content: [{ type: 'text', text: guide }],
      })
    } catch { /* duplicate/ordering races: skip */ }
  })

  // ── router visibility & tuning (agent self-optimization) ────────────────
  const registerTool = (tool) => {
    ctx.effect(() => ctx.tools.register({
      ...tool,
      parameters: toJsonSchema(tool.parameters),
      // output.schema is already a plain JSON Schema; keep it as-is
    }))
  }

  const modeSpec = {
    mode: {
      type: 'string',
      required: true,
      description: 'band name (spec / weak / mixed / react), a 0-100 number, a 0.0-1.0 number, or auto to clear the override',
    },
  }

  function fmtMode(mode) {
    return typeof mode === 'string' ? mode : mode.toFixed(2)
  }

  registerTool({
    name: 'dev_router_status',
    description: 'Show this session\'s reasoning-mode routing: mode, band, persona, first-turn core tools, test-suppression, and whether an override is active.',
    parameters: {},
    output: { schema: { type: 'string' }, render: (_a, v) => [{ type: 'text', text: v }] },
    execute() {
      const session = currentSession()
      if (session === undefined) return 'no agent session'
      const mode = overrides.get(session.id) ?? sessionMode(session)
      const modelId = currentAgent()?.options?.model
      return [
        `router-mode=${routerMode} (standard=RL接口还原 / spec=深度思考优先)`,
        `mode=${fmtMode(mode)} (band=${bandFor(mode)})`,
        `persona=${personaFor(mode, modelId).replace(/\n/g, ' / ')}`,
        `core=[${coreFor(mode).join(', ')}]`,
        `testiness=${testinessFor(mode)}`,
        `override=${overrides.has(session.id) ? 'yes' : 'no'}`,
      ].join('\n')
    },
  })

  registerTool({
    name: 'dev_router_mode',
    description: 'Set this session\'s reasoning mode: spec (plan-first) / weak (internal routing, model decides per task) / mixed (transition, trap) / react (doer). Accepts band names, 0-100, or 0.0-1.0; use auto to return to task classification. The next request applies it.',
    parameters: modeSpec,
    output: { schema: { type: 'string' }, render: (_a, v) => [{ type: 'text', text: v }] },
    execute(args) {
      const parsed = parseMode(args.mode)
      if (parsed === null) return `invalid mode "${args.mode}": use spec/weak/mixed/react, 0-100, 0.0-1.0, or auto`
      const session = currentSession()
      if (session === undefined) return 'no agent session'
      if (parsed === 'auto') overrides.delete(session.id)
      else overrides.set(session.id, parsed === 'weak' ? 'weak' : clamp01(parsed))
      const current = overrides.get(session.id) ?? sessionMode(session)
      return `mode=${fmtMode(current)} (band=${bandFor(current)}) — next request applies`
    },
  })

  // ── mode-isolated subagent: run a task in a DIFFERENT reasoning mode,
  //    without touching this session's trajectory (P6 showed tail persona
  //    is ineffective; DSH's native subagent inherits this persona, so the
  //    only working isolation is a fresh LLM call with its own system). ──
  registerTool({
    name: 'dev_mode_subagent',
    description: 'Run one task in a DIFFERENT reasoning mode than this session, in a fresh isolated context (own system prompt). The current session trajectory is untouched. Mode: spec (plan-first) / weak (internal routing) / react (doer) / balanced. Returns the subagent\'s answer text.',
    parameters: {
      mode: { type: 'string', required: true, description: 'spec / weak / react / balanced (or 0-100)' },
      task: { type: 'string', required: true, description: 'the task to hand to the mode-isolated subagent' },
      maxTokens: { type: 'number', description: 'output cap (default 1024)' },
    },
    output: { schema: { type: 'string' }, render: (_a, v) => [{ type: 'text', text: v }] },
    async execute(args) {
      const parsed = parseMode(args.mode)
      if (parsed === null || parsed === 'auto') return `invalid mode "${args.mode}"`
      const session = currentSession()
      const agent = session === undefined ? undefined : [...agents.values()].find((a) => a.session === session)
      if (agent === undefined || agent.options === undefined) return 'no agent route available'
      const { provider, model } = agent.options
      if (!provider || !model) return 'agent route missing provider/model'

      const persona = personaFor(parsed, model)
      const maxTokens = Number(args.maxTokens || 1024)
      let text = ''
      let reasoningChars = 0
      try {
        const stream = ctx.llm.stream({
          provider,
          model,
          system: persona,
          messages: [{ role: 'user', content: [{ type: 'text', text: String(args.task) }] }],
          maxTokens,
        })
        for await (const chunk of stream) {
          if (chunk.type === 'text-delta') text += chunk.text
          else if (chunk.type === 'reasoning-delta') reasoningChars += chunk.text.length
        }
      } catch (error) {
        return `subagent error: ${error && error.message ? error.message : String(error)}`
      }
      const head = text.slice(0, 3000)
      return `[mode-subagent ${bandFor(parsed)} | reasoning ${reasoningChars} chars]\n${head}${text.length > 3000 ? '\n…(truncated)' : ''}`
    },
  })

  function currentSession() {
    const agent = ctx.get('agent')
    if (agent !== undefined && agent.session !== undefined) return agent.session
    const last = [...agents.values()].at(-1)
    return last?.session
  }

  function currentAgent() {
    const session = currentSession()
    return session === undefined ? undefined : [...agents.values()].find((a) => a.session === session)
  }
}
