/**
 * router-core: reasoning-mode routing logic (zero dependencies).
 *
 * BEHAVIORAL REALITY (measured, 21-point × n=2 on v4-pro): model behavior
 * along the react↔spec axis collapses into THREE stable regions, not a
 * continuum — spec [0, 0.15], a transition band [0.2, 0.45] (unstable mix,
 * avoid), and react [0.5, 1.0] (11 mode values behave identically). The
 * numeric interface therefore maps onto three behavior bands; "continuous"
 * tuning is an illusion at the model layer.
 *
 * FOURTH MODE — weak (internal routing): P8/P11 show a weak-persona domain
 * where the model routes itself from the task (discrimination up to +5.0).
 * The optimal weak persona is model-specific (P11, n=3):
 *   - pro:   spec sentence + few-shot routing instruction (w6, +5.00)
 *   - flash: neutral + explicit "classify then act" instruction (w7, +5.67)
 *   - spec-sentence weak personas ANTI-route on flash (planGreen > 0).
 *
 *   mode 0    → pure spec  — plan-first, collective, read-first tools
 *   mode 0.3  → mixed      — transition band (trap; only explicit opt-in)
 *   mode 1    → pure react — doer, produce-verify-fix, test-suppressed
 *   mode W    → weak       — internal routing (model decides per task)
 *
 * `mode` is stored as a number in [0, 1] or the string 'weak'; band mapping
 * quantizes to the four modes.
 */

export const MODE_SPEC = 0
export const MODE_MIXED = 0.3
export const MODE_REACT = 1
export const MODE_WEAK = 'weak'

const SPEC_PERSONA = 'You are a helpful software engineer assistant.'

const MIXED_PERSONA =
  'You are a helpful software engineer assistant.\n'
  + 'Work directly: prefer writing or editing code over describing plans. '
  + 'Verify your changes by reading and running them.'

const REACT_PERSONA =
  'You are a hands-on software engineer who delivers working output fast.\n'
  + 'Work directly: write or edit code, then verify it by reading and running. '
  + 'Keep the loop tight — produce, verify, fix — and do not build test '
  + 'harnesses, scaffolding, or ceremony the user did not ask for. '
  + 'Finish with a usable deliverable and a short summary.'

/** Weak (internal-routing) personas — model-specific optimum (P11/P24).
 *  pro:   spec sentence + classify instruction (w6c, +4.67, P24) — the
 *         few-shot variants and the recall/converge anchors HURT Pro
 *         (P24: suite-full 83% < naked 87.5% vs +guide 100%)
 *  flash: neutral + classify + recall/converge/anti-runaway anchors
 *         (w7, +5.67, P11; anchors lift single-task completion to 100%, P23)
 */
const WEAK_PRO =
  'You are a helpful software engineer assistant.\n'
  + 'Before acting, decide the task type (build or fix) and adopt the matching '
  + 'style: build → hands-on production; fix → inspect-and-plan.'

const WEAK_FLASH =
  'You are a helpful assistant.\n'
  + 'Before acting, decide the task type (build or fix) and adopt the matching '
  + 'style: build → hands-on production; fix → inspect-and-plan.\n'
  + 'Before acting, briefly review what you have already done in this session and continue from where you left off; do not repeat completed steps. Do not run environment checks (echo, whoami, uname, node --version, date) or exhaustive grep/glob scans.\n'
  + 'Think deeply first, then produce.'

/** Complexity heuristic: long or architecturally-worded tasks are COMPLEX.
 *  Simple tasks get fast-convergence guidance; complex tasks get deep
 *  exploration guidance (depth-adaptive, v19). */
const COMPLEX_RE = /(重构|架构|全面|详细|设计|系统|优化|分析|survey|overview|architecture|refactor|comprehensive|detailed|design|system|optimize|analyze)/i

export function isComplexTask(text) {
  return typeof text === 'string' && (text.length > 120 || COMPLEX_RE.test(text))
}

/** True when the routed model id is a Flash-family model. */
export function isFlashModel(modelId) {
  return typeof modelId === 'string' && /flash/i.test(modelId)
}

/** Quantize a mode to one of the four measured behavior bands. */
export function bandOf(mode) {
  // 入参按 MODE_* 常量判定；返回值是 band 名（weak/spec/transition/react），与 mode 值不同语义
  if (mode === MODE_WEAK) return 'weak'
  const m = clamp01(mode)
  if (m < 0.2) return 'spec' // measured stable spec region (0..0.15)
  if (m < 0.5) return 'transition' // measured unstable band — avoid
  return 'react' // measured stable react region (0.5..1 behave alike)
}

/** Persona for a mode; weak picks the model-specific internal-routing text. */
export function personaFor(mode, modelId) {
  switch (bandOf(mode)) {
    case 'spec': return SPEC_PERSONA
    case 'transition': return MIXED_PERSONA
    case 'weak': return isFlashModel(modelId) ? WEAK_FLASH : WEAK_PRO
    default: return REACT_PERSONA
  }
}

/** First-turn core tools (shell added dynamically by the plugin).
 *  v0.2.0: the weak (internal-routing) band gets the RL-shape surface —
 *  shell + str_replace_editor — per the interface-restoration measurement
 *  (100% action at 18–29K reasoning chars vs ~25% / 73–101K on the
 *  read/write/edit surface, official API, 2026-08-15). */
export function coreFor(mode) {
  switch (bandOf(mode)) {
    case 'spec': return ['read', 'edit', 'glob', 'grep'] // read-first
    case 'transition': return ['read', 'edit', 'write', 'glob', 'grep'] // union
    case 'weak': return ['str_replace_editor'] // RL shape: shell + editor
    default: return ['read', 'write', 'edit'] // write-first
  }
}

/** Human-readable band name for a mode value. */
export function bandFor(mode) {
  const b = bandOf(mode)
  return b === 'transition' ? 'mixed' : b
}

/** Test-suppression strength for a mode (informational). */
/** Test-suppression strength for a mode (informational). */
export function testinessFor(mode) {
  switch (bandOf(mode)) {
    case 'react': return 'suppressed'
    case 'spec': return 'normal'
    default: return 'light'
  }
}

const REACT_RE = /(开发|创建|写一个|生成|从零|做一个|游戏|网页|网站|构建|新项目|搭建|实现|做出|上线|落地|脚本|工具|应用|build|create|develop|generate|implement|make a|new project)/gi
const SPEC_RE = /(修复|修一下|调试|重构|维护|排查|报错|出错|崩溃|优化|审查|review|fix|debug|refactor|maintain|repair|broken|break|为什么|异常|故障|迁移|升级|兼容)/gi

function countHits(regex, text) {
  return [...text.matchAll(regex)].length
}

/**
 * Classify a task text into a mode.
 *
 * v1.21：决策权收窄到"高置信度"才强制档位，其余一律 weak（模型自判）。
 *
 * 此前实现是 react/spec 关键词计数"谁多谁赢"：任一档命中数领先就强制该
 * persona，只有打平/无命中才落 weak。后果是关键词表缺项（如"设计/架构/
 * 系统/数据库/方案"）的任务被武断分档，违背 weak = internal-routing 的
 * 设计本意（router-core L11：weak 域由模型按任务自行路由，P11 实测最佳）。
 *
 * 现规则（互斥判据，不再比多少）：
 *   react 独占（有开发动词语义、无修复语义）→ 1  pure react
 *   spec  独占（有修复/诊断语义、无开发动词语义）→ 0  pure spec
 *   两边同时命中（语义混杂）→ 'weak'（歧义交给模型）
 *   两边都不命中（含设计/架构/系统类）→ 'weak'（交给模型）
 */
export function classifyTask(text) {
  const react = countHits(REACT_RE, text)
  const spec = countHits(SPEC_RE, text)
  if (react > 0 && spec === 0) return 1
  if (spec > 0 && react === 0) return 0
  return 'weak'
}

/**
 * Whether a durable message carries a plugin-injected source.
 *
 * Session format v4 replaced the literal `kind: 'plugin'` (plus a sibling
 * `plugin` name field) with producer-owned kinds shaped `plugin:<name>`, so a
 * `kind !== 'plugin'` comparison silently stops filtering injected messages
 * (router Bootstrap guide, approval notices, runtime context). Match both the
 * retired literal and the current prefixed form.
 */
export function isPluginSource(kind) {
  return kind === 'plugin' || (typeof kind === 'string' && kind.startsWith('plugin:'))
}

/**
 * Resolve a durable user/message's source kind across both shapes: the flat
 * `data.source` and the legacy nested `data.message.source` (issue #1 seed).
 */
export function sourceKindOf(data) {
  return (data?.source ?? data?.message?.source)?.kind
}

/** Per-session mode derived from durable events (resume-safe). */
export function sessionMode(session) {
  const events = session.events || (typeof session.snapshotEvents === 'function' ? session.snapshotEvents() : [])
  // v1.21：口径与 bootstrap 的 firstUserText 对齐——只认 kind==='user' 的真实用户消息。
  // 此前是 !isPluginSource(...)，只排除 plugin / plugin:*，放行了 skill-catalog、
  // dsh-mnemon 等非用户注入（实测这两类文本 classifyTask 都判 weak）。于是首条真实
  // 任务一旦不排在最前，mode 就从 0(spec) 漂移成 weak —— 与 #143 同类的时序 bug。
  // 保留第二段兜底：整份 transcript 没有 kind==='user' 时退化到首条 user/message。
  const userMsg = events.find((e) => e.type === 'user/message' && sourceKindOf(e.data) === 'user')
    ?? events.find((e) => e.type === 'user/message')
  return classifyTask(extractText(userMsg?.data))
}

// 新增辅助（router-core）：
export function sessionEvents(session) {
  if (!session) return []
  if (Array.isArray(session.events)) return session.events
  if (typeof session.snapshotEvents === 'function') {
    try { return session.snapshotEvents() } catch { return [] }
  }
  return []
}

export function extractText(data) {
  if (!data) return ''
  // 防御性解包：插件/工具生成的 user/message 偶有 `data.message` 嵌套形状
  // （如注入器 startIngest 的 seed），直接读 data.content 会得到空串 →
  // 构建/修复任务被误判 weak（router-standard issue #1）。
  const payload = data && typeof data.message === 'object' && data.message !== null ? data.message : data
  const content = Array.isArray(payload.content) ? payload.content : []
  return content.map((c) => (typeof c === 'string' ? c : (c.text ?? ''))).join(' ')
}

/**
 * Advance the phase by one level at most, from durable session evidence
 * (tool calls) plus the current user text. Pure and idempotent, so replaying
 * a session's events after a restart reproduces its phase exactly (resume-safe
 * phase routing, v0.8).
 */
export function advanceStage(stage, toolNames, text) {
  const names = Array.isArray(toolNames) ? toolNames : []
  const words = typeof text === 'string' ? text : ''
  let s = stage
  // 文本信号收紧（P2 反馈）：/方案|计划/ 宽匹配误触发——只认明确开发指令
  if (s === 0 && (names.includes('todo_write') || /开始开发|进入开发|着手实现|开始实现|write the code/i.test(words))) s = 1
  if (s === 1 && names.some((n) => ['write', 'edit', 'str_replace_editor'].includes(n))) s = 2
  if (s === 2 && (names.includes('pwsh') || names.includes('bash') || /完成|finished|done|验证/i.test(words))) s = 3
  return s
}

export function clamp01(v) {
  return Math.min(1, Math.max(0, Number(v) || 0))
}

/**
 * Replace only the persona section of an assembled section list, keeping
 * everything else — the plan-mode section above all, which is toggled per
 * plan state and carries the plan-boundary instructions.
 */
export function applyPersona(sections, personaText) {
  const rest = (sections || []).filter(
    (section) => section.name !== 'persona' && !/persona/i.test(section.name),
  )
  return [...rest, { name: 'router-persona', text: personaText, order: 0 }]
}

/** Parse a user/agent-supplied mode token: number 0-100, 0.0-1.0, or a band name. */
export function parseMode(token) {
  if (token === undefined || token === null) return null
  const t = String(token).trim().toLowerCase()
  if (t === 'auto') return 'auto'
  // v1.21：口径单源——四档取 MODE_* 常量，不再各处散落 0 / 0.3 / 1 / 'weak' 字面量
  if (t === 'weak' || t === 'router') return MODE_WEAK
  if (t === 'spec' || t === 'spec-lean') return MODE_SPEC
  if (t === 'balanced' || t === 'mixed') return MODE_MIXED // transition-band center
  if (t === 'react' || t === 'react-lean') return MODE_REACT
  const n = Number(t)
  if (!Number.isFinite(n)) return null
  if (t.includes('.')) return clamp01(n)
  return clamp01(n / 100)
}
