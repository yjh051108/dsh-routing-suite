/**
 * router-bootstrap (standard v1.20.0): progressive disclosure with zero pre-unlock — each stage sees only its own tools (anti-"haste" main line).
 *
 * 时序（用户定稿）：
 *   T0 首轮 = 纯 RL 句（46 字符）+ phase_begin（唯一确认工具，native；稳定 we）
 *   T1 模型调 phase_begin（确认开启）→ Bootstrap 消息（声明+主动性+阶段0指引）
 *      + 解锁阶段 0 + 切换 native 呈现（presentAs native；v1.15 定案，PTC/run_code 已退役）
 *   T2 闯关：模型完成阶段 → phase_advance → 解锁下一档 + 阶段提示（一次）
 *
 * 要点：
 *   - 首轮无 restrict（phase_begin 可见）；确认后才 restrict/注入/切 native
 *   - tools.restrict 是交集——释放旧 disposer 再设新（restrictLift per-session）
 *   - stage 状态持久化（stages.json：ensureStage/saveStageState）
 *   - we-form 阶段声明（you-form 是 let me 吸引子——用户命名 react=稳定we/spec=letMe）
 */

import {
  bandFor, sessionMode, extractText, isComplexTask,
} from './router-core-v34.mjs'
import { join, dirname } from 'node:path'
import { homedir, tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, readdirSync, rmSync } from 'node:fs'
import vm from 'node:vm'

export const name = 'router-bootstrap'
export const inject = ['systemPrompt', 'tools', 'llm']

function toJsonSchema(spec) {
  const buildProp = (meta) => {
    const prop = { type: meta?.type || 'any' }
    if (Array.isArray(meta?.enum)) prop.enum = meta.enum
    if (meta?.description) prop.description = meta.description
    if (meta?.properties) prop.properties = buildProps(meta.properties)
    if (meta?.items) prop.items = buildProp(meta.items)
    if (Array.isArray(meta?.required) && meta.required.length) prop.required = meta.required
    return prop
  }
  const buildProps = (props) => {
    const out = {}
    for (const [key, meta] of Object.entries(props || {})) {
      out[key] = buildProp(meta)
      if (meta?.required === true) out.required = [...(out.required || []), key]
    }
    return out
  }
  const properties = {}
  const required = []
  for (const [key, meta] of Object.entries(spec || {})) {
    properties[key] = buildProp(meta)
    if (meta?.required === true) required.push(key)
  }
  return { type: 'object', properties, required, additionalProperties: false }
}

const RL_PERSONA = 'You are a helpful software engineer assistant.'
const ROUTER_VERSION = 'v1.20.0'
/* 描述单源（v1.13 审计修复）：main 注册与 own-layer shim 读同一份，杜绝双份漂移。 */
const DESC = {
  toolsCatalog: '渐进式披露一级：默认只列当前阶段可调工具（未解锁不点名、不预告后续工具）；query 单点白盒（命中未解锁才给相关行，带解锁阶段/交付期标注）；无全量出口——严格按阶段推进，未解锁工具名称不进入视野。行标注=运行时真绑定。',
  toolsHelp: '渐进式披露二级：单个工具的完整 schema（含解锁阶段提示）。查询本身是主动行为——可查未解锁工具详情，但调用会被拒绝。',
  phaseAdvance: '闯关推进：声明当前阶段已完成，进入下一阶段（解锁新工具 + 阶段提示）。逐级推进（一次一级，不跳级）。仅在明确完成本阶段工作时调用。进入验证/交付阶段后：先 delivery_check(file[, url], evidence)，PASS 才可宣告完成。',
  routerStatus: 'Show the current routing state (phase, band, persona, unlocked tools, override). No arguments — call as tools["dev_router_status"]({}).',
  deliveryCheck: '交付 gate（阶段出口契约）。检查清单：file-exists / file-nonempty / encoding-utf8（必查）+ headless-smoke（页面类必查：传 url；requireSmoke 默认 true——省略 url 会 FAIL，不再可绕过）+ delivery-evidence。evidence 结构（tools_help 同源）：{ items: [{ label, kind ∈ file|page|image|run|test|text|external|numeric, target?（file/page/image/test 必填路径）, result?（run/text/external 必填文本）, external?（kind=external：target=输出路径或命令、result=结果摘要）, reviewed?: true（page/image 视觉类必须人工复核） }] }。⚠️ 全部 PASS 才允许宣告完成；任一 FAIL 修复后重跑，不允许绕过。',
}
const PROGRESSIVE_DECL =
  'We hold a full tool registry (see tools_catalog for the live count), revealed in phases. tools_catalog lists every tool (name + summary + [phase mark] + param names); tools_help <name> returns any tool\'s complete spec. We query on demand and call precisely. '
  + 'Meta tools are always callable: tools_catalog/tools_help (secondary disclosure), phase_advance/dev_router_status (level-up & self-check), dev_reload_preset_live (live reload), delivery_check (delivery gate). '
  + 'Long-running goals carry goal tools: get_goal / create_goal / update_goal (read before updating, mark complete only when actually achieved). '
  + 'Tool signatures are NOT uniform: before the first use of any tool this session, read its parameter names via tools_catalog or tools_help — never guess. Runtime caps (read lines, search count, output bytes) are enforced at call time — check tools_help before big calls. '
  + 'Tools are directly callable (native mode — no wrapping): call write/edit/read/pwsh directly; only the current phase\'s tools are injected (full schema never flooded). Zero-arg tools still take {}: tools[\'dev_router_status\']({}). '
  + 'write/edit bindings return the FULL before/after text — take only path/operation, never print a whole write/edit result (context explosion); inspect the changed lines with grep/read instead. Verify your own work: use bash to run a headless browser / playwright (or install one) and screenshot/render the page, then read_image the shot to visually confirm — do not rely on a fixed page-verify tool.'
  + ' Proactivity protocol: act on reversible next steps; ask only for user-owned choices; report actions with evidence.'
const PRESSURE_GUIDE =
  '\n\nProactivity (replaces the pressure valve): every turn, before awaiting the user, scan for the next actionable item — unfinished work, unverified claims, reversible improvements, unfixed warnings. Choose one and act; report what you did and why. Ask only when the choice belongs to the user (preference, budget, irreversible/destructive, external approval). Two or more dependent steps: think step by step, but do not stop to ask permission for reversible work. Depth is our call: a small result gets a small thought, a consequential fork gets full reasoning.'
const START_GUIDE =
  '\n\nBootstrap (once per session): this is a progressive tool-unlock session — tools open in phases like a leveling game. Call phase_begin to confirm start (unlock phase-0 tools; presentation stays native). A brand-new conversation auto-starts at phase 0 — no manual reset needed.'
  + 'Unlock order: understanding (read/glob/grep/web_search/ask_user_question) → planning (todo_write) → development (write/edit/str_replace_editor) → verification (pwsh/read_image/jobs). '
  + 'This guide appears only once; after this, no phase messages are injected. '
  + 'Current phase + unlocked tools are always visible in the system prompt (router-stage section) and via dev_router_status. '
  + 'You route yourself: to advance, complete the current phase — alignment (ask_user_question / plan recorded) → planning (plan locked) → development (self-check) → verification (delivery_check) — or call phase_advance; tool usage alone never skips a stage.'

const STAGES = [
  { name: '了解/对齐', tools: ['read', 'glob', 'grep', 'web_search', 'ask_user_question', 'engram_recall', 'engram_verify', 'engram_respond'] },
  { name: '拟合方案', tools: ['todo_write', 'exit_plan_mode', 'engram_search', 'engram_open'] },
  { name: '开发', tools: ['write', 'edit', 'str_replace_editor', 'engram_store', 'engram_link'] },
  { name: '验证', tools: ['pwsh', 'bash', 'read_image', 'job_list', 'job_output', 'job_kill'] },
]
// 平台事实（v1.12）：win32 已由 gitbash-shell 组提供真 Git Bash（isolate realm 私有 shell seam，
// 机制参照 liceses/dsh-gitbash-preset, MIT）——bash 重回验证档（原 v1.5 的平台剔除已回退）。

/** 阶段表的工具全集（单一事实源：STAGES 派生，v1.18.2）。 */
const STAGE_SAFE = STAGES.flatMap((s) => s.tools)
const GLOBAL_SAFE = [
  ...STAGE_SAFE,
  'tools_catalog', 'tools_help', 'dev_router_status', 'phase_begin', 'phase_advance',
  'engram_recall', 'engram_store', 'engram_propose', 'engram_confirm', 'engram_reject',
  'engram_open', 'engram_search', 'engram_link', 'engram_update', 'engram_remove',
  'engram_promote', 'engram_status', 'engram_verify', 'engram_respond',
  'dev_reload_preset_live', 'delivery_check',
  'get_goal', 'create_goal', 'update_goal',
]

const META_TOOLS = ['phase_advance', 'dev_router_status', 'tools_catalog', 'tools_help']
const META_LIVE = [...META_TOOLS, 'dev_reload_preset_live', 'dev_page_check', 'phase_begin', 'delivery_check', 'dev_reset_experience']
const META_GOAL = ['get_goal', 'create_goal', 'update_goal']
const META_ALL = [...META_LIVE, ...META_GOAL]

/** 窗口（单一事实源）：返回 STAGES.slice 的结束索引。
 *  v1.20（用户定稿）：预解锁归零——`stage+3` 预放两档改为 `stage+1` 只含当前档。
 *  效果：模型每阶段只看到当前阶段工具，看不到后续工具（消除"知道后面有工具"的焦虑与大跃进入口）；
 *  机制框架（windowFor/preUnlockedFor/stageSummary）保留，未来需放宽预放时只改此常量即可回退。 */
export function windowFor(stage) { return Math.min(stage + 1, STAGES.length) }

/** 闯关提示（常驻于 stageText——每阶段的"要解锁 X，先做 Y"引导；免打断、经压缩不丢）。
 *  实测吸收（v1.4）：参数不猜/重读再改/Windows shell/沙箱提升/多图对比。
 *  v1.5：caps 提示 / write-edit 只用 path / shell 真实语义 / dev_page_check。
 *  v1.6：预放两档 + 直达语义（写 HTML 直给任务零路由成本）；跨语言转义提醒。 */
const STAGE_GUIDES = [
  'Phase: understanding. Unlocked: this stage only — read/glob/grep/web_search/ask_user_question + memory recall/verify/respond. Ground first: recall → verify → read/ask. Do this stage properly and think broadly — do not settle on the first obvious reading. Break the request into its dimensions (what the user wants, how features should behave, what "good" looks like) and surface the genuinely ambiguous ones: a word like "拖拽" could mean reorder, drag-to-recategory, or both; "瀑布流" could mean masonry columns or JS-grid; persistence is often unspecified. **Decide each ambiguity by its impact:** if you can infer the common meaning and only one interpretation is reasonable for a deliverable, state that assumption clearly in one sentence (so the user can correct it) and continue — but if two or more interpretations would materially change the result (reorder vs recategory; persist vs not), ask ONE focused ask_user_question per such ambiguity, with concrete options. Do not under-ask (assume everything) nor over-ask (interrogate trivia) — aim for the questions that actually change the artifact. This is a deep-thinking stage: if the task is complex, also record a plan (todo_write). **Complete when: you understand the task (assumptions stated, or key ambiguities answered) — and, if complex, a plan is recorded. No alignment, no advancement.** → Done? Understood (stated assumption / question answered / plan recorded) → next stage.',
  'Phase: planning. Unlocked: todo_write/exit_plan_mode + memory review (search/open). Do this stage properly: design the approach, cover edge cases, define what "done" means, and decide acceptance criteria — not just list steps. **Attention reclamation (v1.26): assetize your context — keep the task goal + the current decision + the live evidence in the attention window; sink settled exploration/details into memory (engram_store) instead of holding them all; let stale, superseded, or resolved threads truly drop (fresh context recovers attention). Do not hold "everything might be useful" in mind — that is attention leakage, not diligence.** **Isolation & parallel (pillar 4): when two independent concerns are polluting one thread, or a sub-problem is eating the mainline budget, push it into a subagent / workflow (independent context) instead of keeping it in the same stream — a focused subagent holds its own attention so your mainline stays on the critical path.** **Complete when: the plan is thorough enough that the design is decision-complete (what to build, how it fits, what success looks like), recorded via todo_write or presented via exit_plan_mode.** Only this lets you enter development. Note: a completion signal (todo_write / exit_plan_mode) AUTO-advances to the next phase — do NOT call phase_advance after it, or you will skip a phase. → Done? Plan is decision-complete and locked (todo_write / exit_plan_mode) → develop (auto).',
  'Phase: development. Unlocked: write/edit/str_replace_editor + memory write (store/link). Re-read before re-edit (editor enforces fresh read); write/edit results carry FULL before/after text — take path/operation, inspect with grep/read. Do this stage properly: make the artifact real, self-check it against the plan and the acceptance criteria, and do not declare it done until it actually passes its own check. **Avoid local-optima (v1.22): keep the WHOLE artifact working while you iterate. If you find yourself re-fighting the same detail for several rounds with no convergence (e.g. a finite-difference sign, a conservation drift), step back: (1) is this detail blocking the overall deliverable, or is it polish? (2) preserve a working version; iterate on the detail in parallel, not by stalling the whole. (3) if a detail resists, finish the rest and re-attack it fresh — do not let one stubborn sub-problem stall the deliverable.** **Complete when: the artifact exists and passes its self-check — then enter verification via delivery_check (completion signal) or phase_advance.** → Done? Self-check passes → delivery_check → verification.',
  'Phase: verification → delivery gate. Unlocked: pwsh/bash/read_image/jobs + delivery_check. Windows: bash = Git Bash (first-class), pwsh for PowerShell; Git Bash may need the one-shot sandbox escalation (approval=never: if denied, report it — never bypass). Page verify with your OWN tools: run a headless browser/playwright via bash (or install one), screenshot + read_image each shot (reviewed:true) to visually confirm. **On verification failure, hold a quick hypothesis-audit (guidance, not a hard block): before touching the implementation, name in one line (a) which assumption you are now re-checking, (b) what NEW evidence you just gained — this turns "doubt the hypothesis" from a prompt into a habit. If the code is actually correct, say so and move on (do not manufacture a bug to justify rework).** Then check gates/evidence. Do this stage properly: verify the real artifact, not a summary of it — check evidence, look for defects, review the visuals honestly. **Gate: delivery_check must PASS — evidence manifest required; missing evidence/unreviewed visuals = FAIL.**',
]

/** 阶段文本（we-form——you-form 是 let me 吸引子）。
 *  v1.6：预放两档（stage 0 就用得到 write/edit）——消除"先玩一遍路由才能干活"的摩擦。 */
function stageSummary(stage) {
  const unlockedEnd = windowFor(stage)
  const unlocked = STAGES.slice(0, unlockedEnd).flatMap((s) => s.tools).concat(META_ALL)
  const nextTier = stage + 1 < STAGES.length ? STAGES[stage + 1].tools : []
  const nextAfter = stage + 2 < STAGES.length ? STAGES[stage + 2].tools : []
  return { name: STAGES[stage].name, stage, unlocked, nextTier, nextAfter }
}
/** 工具阶段归属（v1.18.1 单一出口）：stage（参与阶段）/ meta（常驻）/ host（宿主·阶段外）。 */
export function stageInfo(name) {
  const idx = STAGES.findIndex((s) => s.tools.includes(name))
  if (idx >= 0) return { kind: 'stage', stage: idx }
  if (META_ALL.includes(name)) return { kind: 'meta' }
  return { kind: 'host' }
}
/** 当前阶段的预放工具集（stage+1 .. stage+2 两档窗口内、尚未进入本阶段的工具）。 */
export function preUnlockedFor(stage) {
  const end = windowFor(stage)
  const seen = new Set()
  for (let i = 0; i <= stage; i++) for (const n of STAGES[i].tools) seen.add(n)
  const out = []
  for (let i = stage + 1; i < end; i++) for (const nm of STAGES[i].tools) { if (!seen.has(nm)) { seen.add(nm); out.push(nm) } }
  return out
}
/** 目录行标注（v1.18.1 统一）：未解锁 → 阶段 N / 宿主·阶段外；可调且属预放 → （预放）。 */
export function catalogMarkExtra(name, mark, stage) {
  const info = stageInfo(name)
  if (mark === '未解锁' && info.kind === 'stage') return '（解锁于阶段 ' + info.stage + '）'
  if (mark === '未解锁' && info.kind === 'host') return '（宿主·交付期：阶段 3 全量开放）'
  if (mark === '可调' && info.kind === 'host') return '（宿主·常驻）'
  if (mark === '可调' && preUnlockedFor(stage).includes(name)) return '（预放）'
  return ''
}
/** help 解锁行（v1.18.1 统一）：阶段工具/宿主工具两种表述。 */
export function helpUnlockLine(name, mark) {
  if (mark !== '未解锁') return ''
  const info = stageInfo(name)
  if (info.kind === 'stage') return '解锁阶段: ' + info.stage + '（当前调用会被拒绝；详情可提前查阅。若你判断它应属于当前阶段，请指出工具分配问题（调整 STAGES），而不是寻求绕过）'
  return '解锁阶段: 交付期（宿主工具·阶段 3 全量开放；当前调用会被拒绝。若你认为它应在当前阶段，请指出工具分配问题）'
}
/** 域分类（v1.18.3 单源）：主/shim 共用，替代两份正则启发式。 */
export function categorizeDomain(name, desc) {
  const t = name + ' ' + desc
  if (/(read|write|edit|glob|grep|str_replace_editor|fs|file|path)/i.test(t)) return 'file'
  if (/(bash|pwsh|shell|run_code|exec|command|spawn)/i.test(t)) return 'exec'
  if (/(web|search|fetch|http|network|browse)/i.test(t)) return 'network'
  if (/(subagent|agent|delegate|workflow|ralph|fork)/i.test(t)) return 'delegate'
  if (/(engram|memory|recall|store|search)/i.test(t)) return 'memory'
  return 'other'
}
/** 记忆工具判定（v1.16：#4 用户禁用记忆 → 调用面+注入面双双剔除，不是只改引导句）。 */
export function isMemoryTool(name) { return /^engram_/.test(String(name || '')) }
export function muteAwareList(names, muted) {
  return muted ? (names || []).filter((n) => !isMemoryTool(n)) : names
}

/** 会话是否为新会话（DSH request/header reason=initial）——即使 session id 复用了旧阶段记录，也自动从 0 开始。 */
export function sessionFresh(agent) {
  try {
    for (const e of agent?.session?.events || []) {
      if (e.type === 'request/header' && e.data?.reason === 'initial') return true
    }
  } catch { /* 无法判定时按旧会话处理 */ }
  return false
}

/** 用户显式禁用（v1.15 建议 #4——还原不是控制：用户说"不用记忆"就不再引导）。
 *  检测会话用户消息中的记忆禁用意图；命中后阶段指引不再提 recall/verify/engram。 */
export function memoryMuted(session) {
  try {
    const events = session?.events || []
    const re = /不用记忆|勿用记忆|禁用记忆|记忆系统.*(不用|不要|禁用)|不要用记忆|no memory|without memory/i
    for (const e of events) {
      if (e.type !== 'user/message') continue
      if (re.test(extractText(e.data))) return true
    }
    return false
  } catch { return false }
}

/** 会话任务回显（v1.19.1 引导工程）：取第一条真实用户消息，让模型每轮都看清"我在为哪件事工作"。 */
export function firstUserTask(session) {
  try {
    for (const e of session?.events || []) {
      if (e.type !== 'user/message') continue
      const src = e.data?.source ?? e.data?.message?.source
      if (src?.kind !== 'user') continue
      const txt = extractText(e.data).trim()
      if (txt) return txt.length > 160 ? txt.slice(0, 160) + '…' : txt
    }
  } catch { /* ignore */ }
  return ''
}

/** 单一事实源（v1.15 建议 #2）：阶段文本只有一份正交真相——
 *  非交付：Callable now = 运行时可见面（runtimeCallable），其余全部锁定（无矛盾句）；
 *  交付：full catalog open（restrict 已释放），无 Locked 句。列表与 dev_router_status 同源。 */
function stageText(stage, runtimeList, muted, taskText = '') {
  const s = stageSummary(stage)
  const callable = runtimeList && runtimeList.length ? runtimeList : s.unlocked
  const taskLine = taskText ? '\nTask: ' + taskText : ''
  let guide = STAGE_GUIDES[stage] || ''
  if (muted) {
    guide = guide
      .replace(/ \+ memory \(engram_recall\/verify\/respond\)/, ' (memory disabled by user)')
      .replace(/ \+ memory review \(engram_search\/open\)/, ' (memory disabled by user)')
      .replace(/ \+ memory write \(engram_store\/link\)/, ' (memory disabled by user)')
      .replace(/Ground first: recall, verify claims, then read\/ask for the rest\./, 'Ground first: read/ask for the rest (memory disabled by user).')
  }
  if (stage >= STAGES.length - 1) {
    return 'Current phase: ' + s.name + ' (' + s.stage + '/3). Delivery: restrict released — full catalog open: ' + callable.join(', ')
      + taskLine
      + '\nDelivery evidence gate: provide an evidence manifest (kind by artifact). Visual/3D tasks: capture views + read_image review; no fixed view count.'
      + '\nStage guide: ' + guide
      + '\nUntil delivery_check passes, do NOT declare the task delivered. Delivery is the gate, not a progress label.'
  }
  const preSet = new Set(preUnlockedFor(stage))
  const core = callable.filter((n) => !preSet.has(n))
  const pre = muteAwareList(callable.filter((n) => preSet.has(n)), muted)
  return 'Current phase: ' + s.name + ' (' + s.stage + '/3). Core: ' + core.join(', ')
    + taskLine
    + (pre.length ? '\nPre-unlocked (already callable): ' + pre.join(', ') : '')
    + '\nMore tools unlock with the next stage — browse on demand: tools_catalog(query) (single-point whitebox).'
    + '\nStage guide: ' + guide
    + '\nPhase is self-routed state: advancing requires the phase completion signal (ask_user_question/todo_write/exit_plan_mode/delivery_check) or phase_advance; tool usage alone never skips a stage.'
}

/** 兼容旧 PTC 呈现的阶段化 SDK 头：标准模式已是 native（此类通常不再触发）；
 *  若宿主仍注入 run_code，则给 tools:sdk 段加一行阶段头（39K 全量 SDK 仍是注意力税）。 */
function buildStagedSdk(sections, stage) {
  const sdk = sections.find((s) => s?.name === 'tools:sdk')
  if (!sdk) return null
  const stageTools = STAGES.slice(0, windowFor(stage)).flatMap((s) => s.tools).concat(META_ALL)
  // 真实 SDK 由 registry 生成：sdkSchemas(view) 已按 restrict + own-layer 阶段化，
  // 保留其完整类型声明；只加一行阶段头，避免 bullet 清单丢掉 schema。
  if (typeof sdk.text === 'string') {
    const header = '## 阶段化工具（当前可见）：' + stageTools.join(', ') + '\n\n'
    return { ...sdk, text: header + sdk.text }
  }
  return sdk
}

/** 读取工具调用参数（tool/call 的 arguments 是 JSON 字符串；tool/code-dispatch 是对象）。 */
function toolArgs(data) {
  const a = data?.arguments
  if (typeof a === 'string') { try { return JSON.parse(a) } catch { return null } }
  return a ?? null
}

/** 阶段带宽控：tool:* 引导段按当前可见面裁剪（100-199 段的工具使用说明是静态注册，
 *  不受 restrict 过滤——与 39K SDK 同款的注意力税；这里只把"不可调用工具"的说明裁掉）。
 *  安全规则：后缀必须是全量注册中的真实工具名，且不在当前可见面 → 才裁掉；否则保留。 */
export function filterToolGuidance(sections, stage, fullNames) {
  if (stage >= STAGES.length - 1) return sections
  const visible = new Set(stageSummary(stage).unlocked)
  return (sections || []).filter((s) => {
    const name = typeof s?.name === 'string' ? s.name : ''
    if (!name.startsWith('tool:')) return true
    const toolName = name.slice(5)
    if (!fullNames.has(toolName)) return true
    return visible.has(toolName)
  })
}

/** 全量工具名（不受 restrict 过滤）：view(scope).knownNames = restrict 前的继承面 + own layer。 */
function knownToolNames(toolsSvc, scope) {
  try {
    const names = new Set()
    const view = typeof toolsSvc?.view === 'function' ? toolsSvc.view(scope) : undefined
    for (const nm of view?.knownNames ?? []) names.add(nm)
    if (typeof toolsSvc?.schemas === 'function') {
      for (const s of toolsSvc.schemas(scope)) { const nm = s.name || s.function?.name; if (nm) names.add(nm) }
    }
    return names
  } catch { return new Set() }
}

/** 全量索引（二级披露）：knownNames + 层链原始定义——不随 restrict 阶段过滤（catalog 列全部工具）。 */
function registryFullIndex(toolsSvc, scope) {
  try {
    const ls = toolsSvc?.layers
    const view = typeof toolsSvc?.view === 'function' ? toolsSvc.view(scope) : undefined
    const names = new Set(view?.knownNames ?? [])
    if (typeof toolsSvc?.schemas === 'function') {
      for (const s of toolsSvc.schemas(scope)) { const nm = s.name || s.function?.name; if (nm) names.add(nm) }
    }
    const chain = (typeof ls?.chainLayers === 'function' ? ls.chainLayers(scope) : []) || []
    const own = typeof ls?.peek === 'function' ? ls.peek(scope) : undefined
    const layersList = []
    if (own) layersList.push(own) // v1.18.3：own（scope 自身注册）优先——tools_help 与 wire 同定义，杜绝"描述漂移"
    layersList.push(...chain)
    if (ls?.global) layersList.push(ls.global)
    const findDef = (name) => {
      for (const layer of layersList) {
        const lt = layer?.tools
        let def = typeof lt?.get === 'function' ? lt.get(name) : undefined
        if (!def && lt && typeof lt.entries === 'function') {
          for (const [nn, dd] of lt.entries()) if (nn === name) { def = dd; break }
        }
        if (def) return def
      }
      /* host 兜底（v1.13）：host 注入核心工具（旧 run_code 系）不在层链——从 registry 视图/原始 schemas 反查 */
      try {
        if (typeof toolsSvc?.view === 'function') {
          const d = toolsSvc.view(scope)?.tools?.get?.(name)
          if (d) return d
        }
        if (typeof toolsSvc?.schemas === 'function') {
          for (const s of toolsSvc.schemas(scope)) {
            if ((s?.name || s?.function?.name) === name) return s
          }
        }
      } catch { /* 兜底失败不影响 catalog 行展示 */ }
      return undefined
    }
    return [...names].sort().map((name) => {
      const def = findDef(name)
      return { name, description: def?.description || '', parameters: def?.parameters || {} }
    })
  } catch { return [] }
}

/** 二级披露可见性标记（v1.9 根修——"标注可调但运行时未绑定"六轮实弹反馈）：
 *  静态阶段映射会与运行时 view(scope).visible（SDK 真绑定）错位；标记必须回答
 *  "这个工具现在真的绑在运行时可见面上吗"——以运行时可见面为准。 */
export function markerFor(name, stage) {
  if (stage >= STAGES.length - 1) return '全量'
  if (META_ALL.includes(name)) return 'meta'
  const idx = STAGES.findIndex((s) => s.tools.includes(name))
  if (idx < 0) return '未解锁'
  if (idx < windowFor(stage)) return '可调' // v1.6 预放两档 = 已可调："预解锁" 与 "可调" 无行为差 → 单语义
  return '未解锁' // v1.14：『未解锁』= 尚未进入当前+预放窗口（如 bash 属验证档：阶段1起预放、阶段3全量），非"交付之后才给"
}

/** 运行时真绑定标记（v1.9）：registry.view(scope).visible 是 SDK 生成的唯一事实源——
 *  visible.has(name) = 该工具在运行时可见（一定可调）；否则一律"未解锁"，绝不谎报。 */
export function runtimeMark(toolsSvc, scope, name) {
  try {
    if (typeof toolsSvc?.view !== 'function') return markerFor(name, 0)
    const visible = toolsSvc.view(scope).visible
    if (typeof visible?.has !== 'function') return markerFor(name, 0)
    if (META_ALL.includes(name)) return visible.has(name) ? 'meta' : '未解锁'
    return visible.has(name) ? '可调' : '未解锁'
  } catch { return markerFor(name, 0) }
}

/** 运行时真实可调列表（v1.14——与 SDK 绑定 100% 同源：visible 全集）。
 *  不再按 STAGES/META 过滤：scope-local 工具（dev_*、engram_* 等宿主插件注册）真实可调也必须列出，
 *  否则状态文本与绑定不一致（"到底能调什么"只能靠试错——用户实测指控）。 */
export function runtimeCallable(toolsSvc, scope) {
  try {
    if (typeof toolsSvc?.view !== 'function') return []
    const visible = toolsSvc.view(scope).visible
    const keys = typeof visible?.keys === 'function' ? visible.keys() : []
    const out = []
    for (const name of keys) out.push(name) // 全列（运行时真实可调，不按 STAGES/META 过滤）
    return [...out].sort()
  } catch { return [] }
}

/** 参数名速览（一行）：catalog 行内嵌——消灭"猜参数名"摩擦（glob 的 pattern / read 的 file_path / todo_write 的 content 各不相同）。 */
export function paramHint(parameters) {
  try {
    if (typeof parameters === 'function') return 'schema in tools_help'
    const p = parameters && typeof parameters === 'object' && !Array.isArray(parameters) ? parameters : {}
    const props = p.properties || {}
    const keys = Object.keys(props)
    if (keys.length === 0) return 'no params'
    // 带类型（glob 的 pattern: string / read 的 limit: number）——参数名+类型的速览已能消灭大部分试错
    return 'params: ' + keys.map((k) => {
      const meta = props[k] || {}
      const t = meta.type || 'any'
      const extra = meta.description && /defaults? to/i.test(meta.description) ? '≤' + (meta.description.match(/defaults? to (\d+)/i)?.[1] || 'cap') : ''
      return k + ': ' + t + extra
    }).join(', ')
  } catch { return '' }
}

/** str_replace_editor 只有 view 是读操作；create/str_replace/insert 才是开发写入。 */
function isMutatingDev(name, args) {
  if (name === 'str_replace_editor') {
    const command = String(args?.command ?? '').toLowerCase()
    return command === 'create' || command === 'str_replace' || command === 'insert'
  }
  return name === 'write' || name === 'edit'
}

export async function deliveryCheck(ctx, args) {
  const file = String(args?.file || '').trim()
  const checks = []
  if (!file) return { ok: false, checks: [{ name: 'file-path', pass: false, detail: 'missing file parameter' }] }
  try {
    const st = statSync(file)
    checks.push({ name: 'file-exists', pass: true, detail: `${file} (${st.size} bytes, mtime ${st.mtime.toISOString()})` })
    checks.push(st.size > 0
      ? { name: 'file-nonempty', pass: true, detail: `${st.size} bytes` }
      : { name: 'file-nonempty', pass: false, detail: 'file is 0 bytes' })
  } catch (e) {
    return { ok: false, checks: [...checks, { name: 'file-exists', pass: false, detail: String((e && e.message) || e) }] }
  }
  try {
    const head = readFileSync(file).subarray(0, 65536)
    new TextDecoder('utf-8', { fatal: true }).decode(head)
    checks.push({ name: 'encoding-utf8', pass: true, detail: 'UTF-8 decode OK (head 64KB)' })
  } catch (e) {
    checks.push({ name: 'encoding-utf8', pass: false, detail: String((e && e.message) || e) })
  }
  // v1.23（方案A·大道至简）：delivery_check 不再自跑 headless smoke（此前复用 dev_page_check/pageCheckRun，反复出bug）。
  // 页面交付物的视觉验证交给**模型用 bash 自测**（playwright/headless Chrome 截图 + read_image 视觉确认），
  // 并在 evidence 里给 visual proof（kind=image, reviewed:true）。delivery_check 校验 evidence 门禁，而非自已渲染。
  const requireSmoke = args?.requireSmoke !== false
  if (args?.url && requireSmoke) {
    checks.push({ name: 'page-verify', pass: false, detail: 'visual verify the page with bash (headless Chrome/playwright screenshot) + read_image (reviewed:true) into evidence — delivery_check gates the evidence, not a built-in browser' })
  }
  /* 证据门禁（正式交付契约——v1.14 规范化：schema 写清进工具描述，不再让模型读源码）：
   * evidence.items[] 每项: { label, kind ∈ file|page|image|run|test|text|external|numeric, target?（file/page/image/test 必填路径）,
   *   result?（run/text 必填文本）, reviewed?: true（page/image 视觉类必须人工复核过）}
   * 页面交付物额外要求：至少一项 reviewed 的视觉证据。 */
  const ev = args?.evidence
  if (!ev || !Array.isArray(ev.items) || ev.items.length === 0) {
    checks.push({ name: 'delivery-evidence', pass: false, detail: 'missing evidence items — provide at least one evidence item: {label, kind, target?, result?, reviewed?} (see tools_help for the exact shape)' })
  } else {
    // v1.16 外部验证器一等公民（AI 反馈 #9：门禁验结果不锁工具）——
    // external = 外部验证器（Playwright/playwright-cli/自产报告）产物：target（截图/报告文件）
    // 或 result（命令输出摘要）任一存在即合法；页面交付物仍需 ≥1 项 reviewed 视觉证据（page/image/external 皆可）。
    const ALLOWED = new Set(['file', 'page', 'image', 'run', 'test', 'text', 'external', 'numeric'])
    const failures = []
    for (const it of ev.items) {
      const label = String(it?.label || '').trim()
      const kind = String(it?.kind || '').trim()
      if (!label) { failures.push('empty label'); continue }
      if (!ALLOWED.has(kind)) { failures.push('bad kind: ' + kind); continue }
      if (kind === 'run' || kind === 'text') {
        if (!String(it?.result || '').trim()) failures.push(kind + ' evidence without result')
        continue
      }
      if (kind === 'numeric') {
        // v1.24：数值不变量 evidence——模型自算物理/数值不变量（如黑洞光子球半径、守恒量 H/L），
        // 门禁校验它必须带"数值结果"。这回应"自动计算物理不变量，让环境替模型完成主动怀疑"。
        const res = String(it?.result ?? '').trim()
        if (!res || !/^-?[\d.eE+-]+$/.test(res)) failures.push('numeric evidence needs a numeric result (e.g. minr=2.07, H=0.00)')
        continue
      }
      if (kind === 'external') {
        const hasTarget = String(it?.target || '').trim() !== ''
        const hasResult = String(it?.result || '').trim() !== ''
        if (!hasTarget && !hasResult) failures.push('external evidence needs target (file) or result (output summary)')
        if (hasTarget) {
          try {
            const st = statSync(String(it.target))
            if (!st.isFile() || st.size <= 0) failures.push('external target not valid file: ' + st)
          } catch { failures.push('external target missing: ' + it.target) }
        }
        continue
      }
      const t = String(it?.target || '').trim()
      if (!t) { failures.push(kind + ' evidence without target'); continue }
      try {
        const st = statSync(t)
        if (!st.isFile() || st.size <= 0) failures.push('target not valid file: ' + t)
      } catch { failures.push('target missing: ' + t) }
      if ((kind === 'page' || kind === 'image') && it?.reviewed !== true) failures.push('visual not reviewed: ' + label)
    }
    if (args?.url) {
      const hasReviewedVisual = (ev.items || []).some(it => (['page', 'image', 'external'].includes(String(it?.kind))) && it?.reviewed === true)
      if (!hasReviewedVisual) failures.push('page deliverable needs at least one reviewed visual evidence (page/image/external)')
    }
    checks.push({ name: 'delivery-evidence', pass: failures.length === 0, detail: failures.length === 0 ? 'evidence accepted (' + ev.items.length + ' item(s))' : failures.join('; ') })
    // v1.28（引导，不强杀）：若交付物存在可测数值不变量（守恒量/半径/计数/编译成功），但 evidence 里没有
    // numeric 断言——只提示"缺一个数值断言"，不强杀。这响应黑洞建议"把'我认为对'变成'我验证过'"（B 强度）。
    const noNumeric = (ev.items || []).every(it => String(it?.kind) !== 'numeric')
    if (noNumeric) checks.push({ name: 'numeric-assertion', pass: true, detail: 'hint: if this deliverable has a measurable invariant (conserved qty / radius / count / compile-ok), add a numeric evidence item (kind=numeric, result=<number>) to turn "I think it works" into "I verified it". Non-blocking.' })
  }
  return { ok: checks.every((c) => c.pass), checks }
}

function deliveryCheckRender(_args, v) {
  let text = 'delivery-check: ' + (v.ok ? 'PASS ✅' : 'FAIL ❌') + '\n'
  for (const c of v.checks || []) text += `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.name}: ${c.detail}\n`
  text += v.ok
    ? 'All checks passed — delivery gate satisfied; you may report completion to the user.'
    : 'Delivery gate NOT satisfied — do NOT report completion; fix the failing checks and re-run delivery_check.'
  return [{ type: 'text', text }]
}


/** 完成信号驱动的阶段推进（v1.19，严格 workflow）——"完成本阶段任务"才晋级：
 *  ① 了解/对齐（0→1）：ask_user_question（已澄清）或 todo_write/exit_plan_mode（已计划）；
 *  ② 拟合方案（1→2）：todo_write（计划已记录）或 exit_plan_mode（计划已呈现/批准）；
 *  ③ 开发（2→3）：delivery_check（产物自检/交付准备）。
 *  工具名、文本意图不跨档跳级——某阶段缺少工具 = 工具分配位置问题（STAGES 归属），不是给出口。 */
export function autoAdvance(stage, toolCalls, _text) {
  if (stage >= STAGES.length - 1) return stage
  const names = new Set((Array.isArray(toolCalls) ? toolCalls : []).map((t) => (typeof t === 'string' ? t : t?.name)).filter(Boolean))
  if (stage === 0 && (names.has('ask_user_question') || names.has('todo_write') || names.has('exit_plan_mode'))) return 1
  if (stage === 1 && (names.has('todo_write') || names.has('exit_plan_mode'))) return 2
  if (stage === 2 && names.has('delivery_check')) return 3
  return stage
}

/* 阶段状态持久化 */
const dshHomeForState = () => process.env.DSH_HOME || join(homedir(), '.dsh')
const stageFile = () => process.env.DSH_ROUTER_STAGE_FILE || join(dshHomeForState(), 'router-standard', 'stages.json')
let stageCache = null
function ensureStage() {
  const file = stageFile()
  if (stageCache === null || stageCache.file !== file) {
    stageCache = { file, state: loadStageState() }
  }
  return stageCache.state
}
function loadStageState() {
  try {
    const parsed = JSON.parse(readFileSync(stageFile(), 'utf8'))
    if (parsed && typeof parsed === 'object' && parsed.sessions && typeof parsed.sessions === 'object') {
      const out = {}
      for (const [sid, st] of Object.entries(parsed.sessions)) {
        const stage = Number(st?.stage)
        if (Number.isInteger(stage) && stage >= 0 && stage <= 3) out[sid] = { stage, guided: st?.guided === true, ...(Number.isFinite(st?.stageAtTime) ? { stageAtTime: st.stageAtTime } : {}), ...(st?.lastAdvance && typeof st.lastAdvance === 'object' ? { lastAdvance: { at: Number.isFinite(st.lastAdvance.at) ? st.lastAdvance.at : 0, reason: st.lastAdvance.reason ?? null } } : {}) }
      }
      return out
    }
  } catch (e) { if (e && e.code !== 'ENOENT') console.error('[router-bootstrap] loadStageState failed:', e) }
  return {}
}
function saveStageState() {
  try {
    mkdirSync(join(stageFile(), '..'), { recursive: true })
    writeFileSync(stageFile(), JSON.stringify({ version: 2, savedAt: new Date().toISOString(), sessions: ensureStage() }, null, 2), 'utf8')
  } catch (e) { console.error('[router-bootstrap] saveStageState failed:', e) }
}

/** restrict 交集修复：per-session disposer（释放旧再设新）。 */
const restrictLift = new Map()
/** 跨 generation 共享：新代才能提起旧代设下的 restrict（避免交集叠加）。 */
const sharedLift = globalThis[Symbol.for('router-standard.restrictLift')] ?? (globalThis[Symbol.for('router-standard.restrictLift')] = new Map())
/** 跨代共享 override：main 注册与 own-layer shim 必须读写同一张表，否则 status 看不到 mode 覆盖。 */
const overrideMap = () => globalThis[Symbol.for('router-standard.overrides')] ??= new Map()
function applyStageRestrict(agent, stage) {
  try {
    const sid = agent?.session?.id
    const prev = sid ? sharedLift.get(sid) : undefined
    if (prev) { try { prev() } catch { /* ignore */ }; if (sid) sharedLift.delete(sid) }
    // 交付阶段：restrict 释放，全量目录开放（STANDARD-PLAN：阶段3 → 全量开放）
    if (stage >= STAGES.length - 1) return
    const toolsSvc = agent.ctx.get('tools')
    if (toolsSvc && typeof toolsSvc.restrict === 'function') {
      const allowed = new Set(STAGES.slice(0, windowFor(stage)).flatMap((s) => s.tools).concat(META_ALL))
      // v1.5：先按 GLOBAL_SAFE 过滤，再按 restrictableNames 过滤——平台性缺失（如 win32 无 bash）
      // 命名的工具会导致 restrict() 抛 unknown，从而放弃整个阶段门控；双过滤保证门控始终成立。
      let known = null
      try { if (typeof toolsSvc.view === 'function') known = new Set(toolsSvc.view(agent).restrictableNames) } catch { /* fall through */ }
      const allow = [...allowed].filter((t) => GLOBAL_SAFE.includes(t) && (known === null || known.has(t)) && !(memoryMuted(agent.session) && isMemoryTool(t)))
      if (allow.length === 0) return
      const disposer = toolsSvc.restrict({ allow })
      if (sid && disposer) sharedLift.set(sid, disposer)
    }
  } catch (e) { console.error('[router-bootstrap] applyStageRestrict failed:', e); /* scope-local names in allow: skip restrict, keep full catalog */ }
}

export function apply(ctx, config) {
  try { mkdirSync(join(process.env.DSH_HOME || homedir(), 'router-standard'), { recursive: true }); writeFileSync(join(process.env.DSH_HOME || homedir(), 'router-standard', 'last-mount.txt'), 'new-gen v0.8 ' + new Date().toISOString(), 'utf8') } catch { /* marker */ }
  // 运行环境修整：① node 进 PATH（harness 的 node 在自定义运行时目录，不在系统 PATH——v1.5 实测
  // "node not recognized" 的根因）；② Git bin 前置（让 git 在任何 shell 都可用；bash 工具在 win32
  // 已禁用——host 的 shell seam 在 win32 只提供 pwsh，此前 bash 行在 win32 实为 pwsh 语义）。
  try {
    const sep = process.platform === 'win32' ? ';' : ':'
    const fore = (process.env.PATH || '').split(sep).filter(Boolean)
    const nodeDir = dirname(process.execPath || '')
    if (nodeDir && existsSync(join(nodeDir, process.platform === 'win32' ? 'node.exe' : 'node')) && !fore.includes(nodeDir)) fore.unshift(nodeDir)
    for (const gitDir of ['C:\\Program Files\\Git\\bin', 'C:\\Program Files\\Git\\usr\\bin', 'C:\\Program Files (x86)\\Git\\bin']) {
      if (existsSync(join(gitDir, 'bash.exe')) && !fore.includes(gitDir)) fore.unshift(gitDir)
    }
    process.env.PATH = fore.join(sep)
    // shell 解析诊断（v1.4.1→v1.5）：bash/node 实际解析到哪——事实文件，不再靠猜。
    try {
      const cands = fore.filter((e) => existsSync(join(e, process.platform === 'win32' ? 'bash.exe' : 'bash')))
      writeFileSync(join(process.env.DSH_HOME || homedir(), 'router-standard', 'bash-diag.json'),
        JSON.stringify({ at: new Date().toISOString(), win32: process.platform === 'win32', nodeDir, gitCandidates: cands, nodeOnPath: fore.some((e) => existsSync(join(e, 'node.exe'))) }, null, 2), 'utf8')
    } catch { /* 诊断失败不阻塞 */ }
  } catch { /* PATH 修整失败不阻塞 */ }
  const agents = new Map()
  const firstUserText = new Map()
  const sessionModels = new Map()
  const shimmedSessions = new Set()

  ctx.on('agent/inbox/claimed', ({ agent, message }) => {
    if (message?.source?.kind !== 'user') return
    const text = extractText(message)
    if (!text.trim()) return
    const session = agent?.session
    if (session !== undefined && !firstUserText.has(session.id)) firstUserText.set(session.id, text.trim())
  })

  ctx.on('system-prompt/assemble', async (_assembly, context, next) => {
    const assembled = await next()
    const agent = context.agent
    if (agent === undefined) return assembled
    if (agent.session?.header?.parentSession !== undefined) return assembled
    const session = agent.session
    agents.set(session.id, agent)

    const selectedModel = assembled.variables?.model
      ? { provider: assembled.variables?.provider, model: assembled.variables.model }
      : undefined
    if (selectedModel?.model) sessionModels.set(session.id, selectedModel)

    const promoted = session.events.some((event) => event.type === 'tool/call')
    const planSection = (assembled.sections || []).find((s) => /plan/i.test(s.name))
    const baseSections = planSection
      ? [planSection, { name: 'router-persona', text: RL_PERSONA, order: 0 }]
      : [{ name: 'router-persona', text: RL_PERSONA, order: 0 }]

    if (!promoted) {
      // 首轮：无 restrict + 工具面只留 phase_begin（纯 RL 条件 = 稳定 we）
      return { ...assembled, sections: baseSections, contexts: [], tools: assembled.tools.filter((tool) => tool.name === 'phase_begin') }
    }

    // promoted：官方 sections 回流（persona 保持 RL 句）+ 引导带宽控 + 阶段声明 + 常驻段
    const stage = ensureStage()[session.id]?.stage ?? 0
    const toolsSvc = agent?.ctx?.get?.('tools')
    const fullNames = knownToolNames(toolsSvc, agent)
    const sections = filterToolGuidance((assembled.sections || []).map((s) =>
      /persona/i.test(s.name) ? { ...s, text: RL_PERSONA } : s
    ), stage, fullNames)
    // v1.18.1 口径统一：先安装 meta shim，再基于同一注册面渲染 stageText（与 dev_router_status 同源）
    if (!shimmedSessions.has(session.id)) {
      try { installMetaShim(agent, { installStage: true, stage }); shimmedSessions.add(session.id) } catch { /* ignore */ }
    }
    sections.push({ name: 'router-stage', order: 1, text: stageText(stage, muteAwareList(runtimeCallable(toolsSvc, agent), memoryMuted(session)), memoryMuted(session), firstUserTask(session)) })
    // 声明与主动性常驻（人设常驻：不经压缩丢失；bootstrap 消息可能被 compaction 剪掉）
    sections.push({ name: 'router-decl', order: 2, text: PROGRESSIVE_DECL })
    sections.push({ name: 'router-proactivity', order: 3, text: PRESSURE_GUIDE.replace(/^\n+/, '') })
    const available = new Set(assembled.tools.map((tool) => tool.name))
    if (available.has('run_code')) {
      const staged = buildStagedSdk(sections, stage)
      if (staged) {
        return { ...assembled, sections: sections.map((s) => (s.name === 'tools:sdk' ? staged : s)), contexts: [] }
      }
    }
    return { ...assembled, sections, contexts: [] }
  })

  // ── 自主路由（pre-step）：调用下一档工具 → 自动推进阶段 ──────────────────
  ctx.on('agent/pre-step', async ({ agent, messages }, next) => {
    const decision = await next()
    if (agent === undefined || agent.session === undefined) return decision
    const userMsg = (messages || []).find((m) => m.role === 'user' && m.source?.kind === 'user')
    const text = userMsg ? extractText(userMsg) : ''
    const sid = agent.session.id
    const st = (ensureStage()[sid] ??= { stage: 0, guided: false })
    const stageAt = st.stageAtTime ?? 0
    const toolCalls = (agent.session.events || []).filter((e) => (e.time === undefined || e.time >= stageAt) && (e.type === 'tool/call' || e.type === 'tool/code-dispatch')).map((e) => ({ name: e.data?.name || e.data?.toolName || '', args: toolArgs(e.data) }))
    // v1.17.2：被拒的锁定工具调用（如阶段 0 调 bash → unknown tool）不算行为信号——
    // 只有当前阶段真实可调（view.visible）的工具调用才触发直达推进。
    let advanceCalls = toolCalls
    try {
      const ts = agent?.ctx?.get?.('tools')
      const vis = ts?.view?.(agent)?.visible
      if (vis && typeof vis.has === 'function') advanceCalls = toolCalls.filter((c) => !c.name || vis.has(c.name))
    } catch { /* 无法判定时回退旧语义：全部调用参与推进 */ }
    const nextStage = autoAdvance(st.stage, advanceCalls, text)
    if (nextStage > st.stage) {
      st.stage = nextStage
      st.stageAtTime = Date.now()
      st.lastAdvance = { at: Date.now(), reason: 'auto:' + advanceCalls.map((c) => c.name).filter(Boolean).join(',') }
      saveStageState()
      applyStageRestrict(agent, nextStage)
      try { installMetaShim(agent, { installStage: true }) } catch { /* ignore */ }
      // 阶段变化由 system prompt stageText 与 dev_router_status 呈现（不插用户消息打断）
    }
    return decision
  })

  // ── 工具注册 ─────────────────────────────────────────────────────────────
  const registerTool = (tool) => {
    ctx.effect(() => ctx.tools.register({
      ...tool,
      parameters: toJsonSchema(tool.parameters),
    }))
  }

  function toolIndex() {
    const session = currentSession()
    const stage = session === undefined ? 0 : (ensureStage()[session.id]?.stage ?? 0)
    const scope = currentAgent()
    return registryFullIndex(ctx.tools, scope).map((t) => ({
      name: t.name, desc: t.description, mark: runtimeMark(ctx.tools, scope, t.name), parameters: t.parameters,
    })).filter((t) => t.name)
  }

  registerTool({
    name: 'phase_begin',
    description: '确认开启本次会话：开始渐进式工具解锁（注入机制声明 + 解锁阶段 0 工具；呈现为 native 直调）。调用即开始。',
    parameters: {},
    output: { schema: { type: 'string' }, render: (_a, v) => [{ type: 'text', text: String(v) }] },
    async execute(args) {
      const session = currentSession()
      if (session === undefined) return 'no agent session'
      const sid = session.id
      const state = ensureStage()
      const doFresh = sessionFresh(currentAgent())
      if (doFresh) {
        state[sid] = { stage: 0, guided: true }
        saveStageState()
        applyStageRestrict(currentAgent(), 0)
        try { installMetaShim(currentAgent(), { installStage: false, stage: 0 }) } catch { /* ignore */ }
        try {
          const toolsSvc = currentAgent()?.ctx?.get?.('tools')
          if (toolsSvc && typeof toolsSvc.presentAs === 'function') toolsSvc.presentAs('native')
        } catch { /* already declared */ }
        const toolsSvc = currentAgent()?.ctx?.get?.('tools')
        const runtimeList = muteAwareList(runtimeCallable(toolsSvc, currentAgent()), memoryMuted(session))
        const guide = START_GUIDE + '\n\n' + PROGRESSIVE_DECL + '\n\n' + PRESSURE_GUIDE + '\n\n' + stageText(0, runtimeList, memoryMuted(session), firstUserTask(session))
        try {
          currentAgent()?.inbox.append('next-step', {
            id: 'bootstrap-fresh-' + Date.now(),
            role: 'user',
            source: { kind: 'plugin', plugin: 'router-bootstrap' },
            content: [{ type: 'text', text: guide }],
          })
        } catch { /* skip */ }
        return 'session started (fresh-auto): phase 0 了解/对齐 unlocked — Bootstrap injected. New conversation detected; stage state reset.'
      }
      const existing = state[sid] ?? { stage: 0, guided: false }
      state[sid] = existing
      if (existing.guided === true) {
        return 'session already started: phase ' + existing.stage + ' (' + STAGES[existing.stage].name + '); no duplicate bootstrap'
      }
      // v1.17.1 跨代兼容：guided 缺失（旧记录）但阶段 > 0 的会话视为已开启——
      // 只补标记、不重复注入 Bootstrap（此前漏判 → stage=3 会话收到"阶段 0"引导，用户 #2 矛盾根源）
      if (existing.stage > 0) {
        existing.guided = true
        saveStageState()
        return 'session already started (legacy state): phase ' + existing.stage + ' (' + STAGES[existing.stage].name + '); guided flag repaired, no duplicate bootstrap'
      }
      existing.guided = true
      saveStageState()
      applyStageRestrict(currentAgent(), 0)
      try { installMetaShim(currentAgent(), { installStage: false, stage: 0 }) } catch { /* ignore */ }
      try {
        const toolsSvc = currentAgent()?.ctx?.get('tools')
        if (toolsSvc && typeof toolsSvc.presentAs === 'function') toolsSvc.presentAs('native') // v1.15 定案：wire = restrict 过滤后的可见工具（注入面+调用面同时阶段化，SDK 段归零——39K 注意力税消失），且所有工具直接可调（无折叠）。both 的双注入态（wire 全量 + SDK 全量）已废弃
      } catch { /* already declared */ }
      const toolsSvc = currentAgent()?.ctx?.get?.('tools')
      const runtimeList = muteAwareList(runtimeCallable(toolsSvc, currentAgent()), memoryMuted(session))
      const guide = START_GUIDE + '\n\n' + PROGRESSIVE_DECL + '\n\n' + PRESSURE_GUIDE + '\n\n' + stageText(existing.stage, runtimeList, memoryMuted(session), firstUserTask(session))
      try {
        currentAgent()?.inbox.append('next-step', {
          id: 'bootstrap-' + Date.now(),
          role: 'user',
          source: { kind: 'plugin', plugin: 'router-bootstrap' },
          content: [{ type: 'text', text: guide }],
        })
      } catch { /* skip */ }
      return 'session started: phase ' + existing.stage + ' (' + STAGES[existing.stage].name + ') unlocked — Bootstrap injected.'
    },
  })

  registerTool({
    name: 'phase_advance',
    description: DESC.phaseAdvance,
    parameters: { reason: { type: 'string', description: '推进理由（可选，记录用）' } },
    output: { schema: { type: 'string' }, render: (_a, v) => [{ type: 'text', text: String(v) }] },
    async execute(args) {
      const session = currentSession()
      if (session === undefined) return 'no agent session'
      const sid = session.id
      const stage = ensureStage()[sid]?.stage ?? 0
      if (stage >= STAGES.length - 1) {
        return 'already at the last stage (' + STAGES[stage].name + '); full catalog is open'
      }
      const next = stage + 1
      const state = ensureStage()
      state[sid] = state[sid] ?? { stage: 0, guided: false }
      state[sid].stage = next
      state[sid].stageAtTime = Date.now()
      state[sid].lastAdvance = { at: Date.now(), reason: args?.reason ? String(args.reason) : null }
      saveStageState()
      applyStageRestrict(currentAgent(), next)
      try { installMetaShim(currentAgent(), { installStage: true }) } catch { /* ignore */ }
      // 阶段变化由 system prompt stageText 与 dev_router_status 呈现（不插用户消息打断）
      const muted = memoryMuted(session)
      const newTools = muteAwareList(STAGES[next].tools, muted)
      const preTools = muteAwareList(preUnlockedFor(next), muted)
      const card = (nm) => {
        const found = toolIndex().find((t) => t.name === nm)
        return nm + (found ? ' — ' + found.desc.split(/\n|\. /)[0].slice(0, 46) : '')
      }
      return 'advanced to phase ' + next + ': ' + STAGES[next].name
        + '\nNew this stage: ' + newTools.map(card).join(' | ')
        + (preTools.length ? '\nPre-unlocked (already callable): ' + preTools.map(card).join(' | ') : '')
        + '\nNext goal: ' + STAGES[next].name + ' — complete it via its completion signal (todo_write/exit_plan_mode/delivery_check) or phase_advance.'
    },
  })

  registerTool({
    name: 'tools_catalog',
    description: DESC.toolsCatalog,
    parameters: { query: { type: 'string', description: '关键词（单点白盒：命中未解锁工具时只给相关行，带解锁阶段/交付期标注）' }, domain: { type: 'string', description: '域筛选' } },
    output: { schema: { type: 'string' }, render: (_a, v) => [{ type: 'text', text: String(v) }] },
    async execute(args) {
      const all = toolIndex()
      const q = String(args.query || '').toLowerCase()
      const d = String(args.domain || '').toLowerCase()
      const dom = categorizeDomain
      const session = currentSession()
      const stage = session === undefined ? 0 : (ensureStage()[session.id]?.stage ?? 0)
      const rows = all.filter((t) => {
        if (d && dom(t.name, t.desc) !== d) return false
        if (q && !(t.name + ' ' + t.desc).toLowerCase().includes(q)) return false
        if (!q && t.mark === '未解锁') return false // v1.18 注意力盲区：默认不点名未解锁工具；query 命中即按需白盒
        return true
      })
      if (rows.length === 0) return '（无匹配工具）'
      return rows.map((t) => {
        const extra = catalogMarkExtra(t.name, t.mark, stage)
        return '- ' + t.name + ' [' + t.mark + ']' + extra + ' — ' + (t.desc.split(/\n|\. /)[0].slice(0, 90)) + ' (' + paramHint(t.parameters) + ')'
      }).join('\n')
    },
  })

  registerTool({
    name: 'tools_help',
    description: DESC.toolsHelp,
    parameters: { name: { type: 'string', required: true, description: '工具名（tools_catalog 里查到的）' } },
    output: { schema: { type: 'string' }, render: (_a, v) => [{ type: 'text', text: String(v) }] },
    async execute(args) {
      const name = String(args.name || '').trim()
      const found = toolIndex().find((x) => x.name === name)
      if (!found) return '未知工具: ' + name + '（先用 tools_catalog 查）'
      const params = found.parameters && typeof found.parameters === 'object' && !Array.isArray(found.parameters) ? found.parameters : {}
      const props = params.properties || {}
      const required = params.required || []
      const unlock = helpUnlockLine(name, found.mark)
      const lines = ['工具: ' + name + ' [' + found.mark + ']', unlock, '描述: ' + found.desc].filter(Boolean)
      for (const [k, v] of Object.entries(props)) {
        const meta = v || {}
        lines.push('  ' + k + ': ' + (meta.type || 'any') + (required.includes(k) ? '（必需）' : '') + ' — ' + (meta.description || ''))
      }
      return lines.join('\n')
    },
  })

  registerTool({
    name: 'dev_router_status',
    description: DESC.routerStatus,
    parameters: {},
    output: { schema: { type: 'string' }, render: (_a, v) => [{ type: 'text', text: String(v) }] },
    async execute() {
      const session = currentSession()
      if (session === undefined) return 'no agent session'
      const sid = session.id
      const agent = currentAgent()
      const stage = ensureStage()[sid]?.stage ?? 0
      const sum = stageSummary(stage)
      const mode = overrideMap().get(sid) ?? sessionMode(session)
      return [
        'router=standard (progressive, ' + ROUTER_VERSION + ')',
        'phase=' + sum.name + ' (' + sum.stage + '/3)',
        'callable=[' + muteAwareList(runtimeCallable(agent?.ctx?.get?.('tools'), agent), memoryMuted(session)).join(', ') + ']', // v1.11/v1.18.3 运行时事实（与 SDK 绑定同源；与 shim 版同口径）
        'presentation=' + readPresentation(agent),
        'mode=' + fmtMode(mode) + ' (band=' + bandFor(mode) + ')',
        'persona=' + RL_PERSONA,
        'override=' + (overrideMap().has(sid) ? String(overrideMap().get(sid)) : 'auto'),
        'preset=' + (ctx.get('agentPresets')?.composedPreset?.(agent?.ctx) ?? 'unknown'),
        'goalTools=get_goal/create_goal/update_goal',
        'lastAdvance=' + (() => { const la = (ensureStage()[sid] || {}).lastAdvance; return la && Number.isFinite(la.at) ? new Date(la.at).toISOString() + (la.reason ? ' (' + la.reason + ')' : '') : 'none' })(),
        ...(stage >= STAGES.length - 1 ? ['fullCatalog=restrict released (all tools open)'] : []),
      ].join('\n')
    },
  })

  registerTool({
    name: 'delivery_check',
    description: DESC.deliveryCheck,
    parameters: {
      file: { type: 'string', required: true, description: '交付物文件路径（绝对路径或工作区相对路径）' },
      url: { type: 'string', description: '页面交付物必传：http(s):// / file:// / 裸路径（自动编码）——省略时 headless-smoke 判 FAIL（requireSmoke: false 才可跳过，仅限脚本/文档类非页面产物）' },
      requireSmoke: { type: 'boolean', description: '默认 true：页面产物必须跑 headless smoke（避免"省略 url 即绕过"）。非页面产物传 false' },
      timeoutMs: { type: 'number', description: 'smoke 硬超时毫秒（默认 20000）' },
      virtualTimeMs: { type: 'number', description: 'smoke 虚拟时间预算（默认 8000）' },
      retry: { type: 'boolean', description: 'smoke 失败时自动重试一次（默认 true，降分辨率+双倍虚拟时间）' },
      evidence: { type: 'object', description: '通用证据清单。结构（唯一权威）：{ items: [{ label, kind ∈ file|page|image|run|test|text|external|numeric, target?（file/page/image/test 必填路径）, result?（run/text/external 必填文本）, reviewed?: true（page/image 视觉类必须人工复核过） }] }。页面交付物要求至少一项 reviewed:true 的视觉证据；为空则 delivery-evidence 判 FAIL。', properties: {
        items: { type: 'array', items: { type: 'object', additionalProperties: false, properties: {
          kind: { type: 'string', enum: ['file','page','image','run','test','text','external','numeric'] },
          label: { type: 'string' }, target: { type: 'string' }, result: { type: 'string' }, reviewed: { type: 'boolean' },
        }, required: ['kind', 'label'] } },
      }, required: ['items'] },
    },
    output: { schema: { type: 'object', additionalProperties: false, properties: {
      ok: { type: 'boolean' },
      checks: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { name: { type: 'string' }, pass: { type: 'boolean' }, detail: { type: 'string' } }, required: ['name', 'pass', 'detail'] } },
    }, required: ['ok', 'checks'] }, render: deliveryCheckRender },
    async execute(args) {
      return await deliveryCheck(ctx, args)
    },
  })


  /** forwarding shim：注册到 target 的**自身 scope**（own layer 不受旧 restrict 相交过滤），
   *  让当前热重载会话立即看到 meta 工具。 */
  function installMetaShim(agent, opts) {
    const installStage = opts?.installStage !== false
    const curStage = opts?.stage ?? (agent?.session?.id ? ensureStage()[agent.session.id]?.stage ?? 0 : 0)
    const toolsSvc = agent?.ctx?.get?.('tools')
    if (!toolsSvc || typeof toolsSvc.register !== 'function' || typeof toolsSvc.schemas !== 'function') return 0
    const sid = agent.session?.id || ''
    const make = (def) => {
      try {
        try { toolsSvc?.layers?.scoped?.get?.(agent)?.tools?.data?.delete?.(def.name) } catch { /* own-layer 可能在别处 */ }
        toolsSvc.register({
          name: def.name,
          description: def.description,
          parameters: toJsonSchema(def.parameters),
          // v1.6 修复（三轮实弹 P0）：shim 此前把所有 meta 工具的输出硬编码为 string——
          // dev_page_check 返回对象 → "invalid output: value must be a string"，工具整体不可用。
          // 有 def.output 的（对象 schema + 专属 render）透传；无的保持字符串兼容。
          output: def.output ? { schema: def.output.schema, render: def.output.render } : { schema: { type: 'string' }, render: (_a, v) => [{ type: 'text', text: String(v) }] },
          execute: def.execute,
        })
        return 1
      } catch { return 0 }
    }
    // 全量索引（共享实现）：二级披露按需查，不随 restrict 阶段过滤（计划书：catalog 列全部工具）。
    const allSchemas = () => registryFullIndex(toolsSvc, agent)
    const stageOf = () => ensureStage()[sid]?.stage ?? 0
    let n = 0

    n += make({
      name: 'tools_catalog',
      description: DESC.toolsCatalog,
      parameters: { query: { type: 'string', description: '关键词（单点白盒：命中未解锁工具时只给相关行，带解锁阶段/交付期标注）' }, domain: { type: 'string', description: '域筛选' } },
      execute: async (args) => {
        const q = String(args?.query || '').toLowerCase()
        const d = String(args?.domain || '').toLowerCase()
        const dom = categorizeDomain
        const rows = allSchemas().map((s) => ({
          name: s.name || s.function?.name,
          desc: (s.description || s.function?.description || ''),
          mark: runtimeMark(toolsSvc, agent, s.name || s.function?.name || ''),
          parameters: s.parameters || s.function?.parameters || {},
        })).filter((t) => t.name).sort((a, b) => a.name.localeCompare(b.name)).filter((t) => {
          if (d && dom(t.name, t.desc) !== d) return false
          if (q && !(t.name + ' ' + t.desc).toLowerCase().includes(q)) return false
          if (!q && t.mark === '未解锁') return false // v1.18 注意力盲区：默认不点名未解锁工具；query 命中即按需白盒
          return true
        })
        if (rows.length === 0) return '（无匹配工具）'
        return rows.map((t) => {
          const extra = catalogMarkExtra(t.name, t.mark, stageOf())
          return '- ' + t.name + ' [' + t.mark + ']' + extra + ' — ' + t.desc.split(/\n|\. /)[0].slice(0, 90) + ' (' + paramHint(t.parameters) + ')'
        }).join('\n')
      },
    })

    n += make({
      name: 'tools_help',
      description: DESC.toolsHelp,
      parameters: { name: { type: 'string', required: true, description: '工具名' } },
      execute: async (args) => {
        const wanted = String(args?.name || '').trim()
        const s = allSchemas().find((x) => (x.name || x.function?.name) === wanted)
        if (!s) return '未知工具: ' + wanted + '（先用 tools_catalog 查）'
        const params = s.parameters || s.function?.parameters || {}
        const props = params.properties || {}
        const required = params.required || []
        const mark = runtimeMark(toolsSvc, agent, wanted)
        const unlock = helpUnlockLine(wanted, mark)
        const lines = ['工具: ' + wanted + ' [' + mark + ']', unlock, '描述: ' + (s.description || s.function?.description || '')].filter(Boolean)
        for (const [k, v] of Object.entries(props)) lines.push('  ' + k + ': ' + (v.type || 'any') + (required.includes(k) ? '（必需）' : '') + ' — ' + (v.description || ''))
        return lines.join('\n')
      },
    })

    n += make({
      name: 'dev_router_status',
      description: DESC.routerStatus,
      parameters: {},
      execute: async () => {
        const sum = stageSummary(stageOf())
        const mode = overrideMap().get(sid) ?? sessionMode(agent?.session)
        const cur = stageOf()
        return 'router=standard (own-layer shim, ' + ROUTER_VERSION + ')\nphase=' + sum.name + ' (' + sum.stage + '/3)\ncallable(runtime)=' + muteAwareList(runtimeCallable(agent.ctx?.get?.('tools'), agent), memoryMuted(agent?.session)).join(', ') + '\npresentation=' + readPresentation(agent) + '\nmode=' + fmtMode(mode) + ' (band=' + bandFor(mode) + ')\npersona=' + RL_PERSONA + '\noverride=' + (overrideMap().has(sid) ? String(overrideMap().get(sid)) : 'auto') + '\npreset=' + (ctx.get('agentPresets')?.composedPreset?.(agent.ctx) ?? 'unknown') + '\ngoalTools=get_goal/create_goal/update_goal\nlastAdvance=' + (() => { const la = (ensureStage()[sid] || {}).lastAdvance; return la && Number.isFinite(la.at) ? new Date(la.at).toISOString() + (la.reason ? ' (' + la.reason + ')' : '') : 'none' })() + (cur >= STAGES.length - 1 ? '\nfullCatalog=restrict released (all tools open)' : '')
      },
    })

    n += make({
      name: 'phase_advance',
      description: DESC.phaseAdvance,
      parameters: { reason: { type: 'string', description: '推进理由（可选）' } },
      execute: async (args) => {
        const st = (ensureStage()[sid] ??= { stage: 0, guided: false })
        if (st.stage >= STAGES.length - 1) return 'already at the last stage (' + STAGES[st.stage].name + '); full catalog is open'
        st.stage += 1
        st.stageAtTime = Date.now()
        st.lastAdvance = { at: Date.now(), reason: args?.reason ? String(args.reason) : null }
        saveStageState()
        applyStageRestrict(agent, st.stage)
        try { installMetaShim(agent, { installStage: true }) } catch { /* ignore */ }
        const muted = memoryMuted(agent?.session)
        const newTools = muteAwareList(STAGES[st.stage].tools, muted)
        const preTools = muteAwareList(preUnlockedFor(st.stage), muted)
        const card = (nm) => {
          const found = allSchemas().find((x) => (x.name || x.function?.name) === nm)
          return nm + (found ? ' — ' + (found.description || found.function?.description || '').split(/\n|\. /)[0].slice(0, 46) : '')
        }
        return 'advanced to phase ' + st.stage + ': ' + STAGES[st.stage].name
          + '\nNew this stage: ' + newTools.map(card).join(' | ')
          + (preTools.length ? '\nPre-unlocked (already callable): ' + preTools.map(card).join(' | ') : '')
          + '\nNext goal: ' + STAGES[st.stage].name + ' — complete it via its completion signal (todo_write/exit_plan_mode/delivery_check) or phase_advance.'
      },
    })

    n += make({
      name: 'delivery_check',
      description: DESC.deliveryCheck,
      parameters: {
        file: { type: 'string', required: true, description: '交付物文件路径' },
        url: { type: 'string', description: '可选页面地址（自动编码）' },
        timeoutMs: { type: 'number' }, virtualTimeMs: { type: 'number' }, retry: { type: 'boolean' },
        requireSmoke: { type: 'boolean', description: '默认 true：页面产物必须 smoke（省略 url 即 FAIL，不再可绕过）' },
        evidence: { type: 'object', description: '证据清单（结构见 tools_help）：{ items: [{ label, kind ∈ file|page|image|run|test|text|external|numeric, target?, result?, reviewed? }] }——页面类要求至少一项 reviewed:true 视觉证据', properties: {
          items: { type: 'array', items: { type: 'object', additionalProperties: false, properties: {
            kind: { type: 'string', enum: ['file','page','image','run','test','text','external','numeric'] },
            label: { type: 'string' }, target: { type: 'string' }, result: { type: 'string' }, reviewed: { type: 'boolean' },
          }, required: ['kind', 'label'] } },
        }, required: ['items'] },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            ok: { type: 'boolean' },
            checks: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { name: { type: 'string' }, pass: { type: 'boolean' }, detail: { type: 'string' } }, required: ['name', 'pass', 'detail'] } },
          },
          required: ['ok', 'checks'],
        },
        render: deliveryCheckRender,
      },
      execute: async (args) => await deliveryCheck(ctx, args),
    })

    n += make({
      name: 'dev_reload_preset_live',
      description: '预设热重载（当前会话即时生效；own-layer shim 版）。',
      parameters: { targetSessionId: { type: 'string', description: '目标会话 id（缺省 = 当前会话）' } },
      execute: async (shimArgs) => {
        const ap2 = ctx.get('agentPresets')
        const target2 = shimArgs?.targetSessionId ? (ctx.get('agents')?.get?.(String(shimArgs.targetSessionId)) ?? agent) : agent
        if (!ap2 || !target2) return 'ERROR: agentPresets/target 不可用'
        const targetSid2 = shimArgs?.targetSessionId || target2.session?.id || sid
        const before2 = ap2.composedPreset(target2.ctx) ?? 'unknown'
        if (before2 === 'unknown') return 'ERROR: 未加入预设'
        const ymlFile2 = join(process.env.DSH_HOME || homedir(), '.agent-presets', before2, 'agent.cordis.yml')
        let yml2 = ''
        try { yml2 = readFileSync(ymlFile2, 'utf8') } catch (e) { return 'ERROR: 读取失败 ' + String(e) }
        const refRe2 = /(name: \.\/[A-Za-z0-9._-]+\.mjs)(\?v=\d+)?/g
        const b2 = []
        yml2 = yml2.replace(refRe2, (whole, base, query) => {
          const cur = query ? Number(query.slice(3)) : 0
          b2.push(base.split('/').pop() + '->?v=' + (cur + 1))
          return base + '?v=' + (cur + 1)
        })
        if (!b2.length) return 'ERROR: 无相对 .mjs 引用'
        writeFileSync(ymlFile2, yml2, 'utf8')
        const stage2 = ensureStage()[targetSid2]?.stage ?? 0
        await ap2.recompose(target2.ctx, before2)
        applyStageRestrict(target2, stage2)
        const shimN = installMetaShim(target2)
        return 'OK: shim live reloaded\n- bump: ' + b2.join(', ') + '\n- before=' + before2 + ' after=' + (ap2.composedPreset(target2.ctx) ?? before2) + '\n- shim=' + shimN
      },
    })


    const goalsValue = (goal) => goal === void 0 ? { goal: null } : { goal: { id: goal.id, revision: goal.revision, objective: goal.objective, phase: goal.phase, roundsStarted: goal.roundsStarted, maxGoalRounds: goal.maxGoalRounds, ...goal.blockedReason === void 0 ? {} : { blockedReason: { code: goal.blockedReason.code, message: goal.blockedReason.message } } }, activation: goal.activation }
    const goalExec = (exec) => {
      const theAgent = (exec && exec.agent) || agent
      if (!theAgent) throw new Error('goal tools require a calling agent')
      const agentsSvc = ctx.get('agents')
      if (!agentsSvc || agentsSvc.get(theAgent.id) !== theAgent || theAgent.status !== 'running' || (agentsSvc.currentInitiator && agentsSvc.currentInitiator() !== theAgent)) throw new Error('goal tools require the exact live calling agent inside its active driver')
      const evs = theAgent.session.events || []
      for (let i = evs.length - 1; i >= 0; i--) {
        if (evs[i]?.type === 'turn/end') throw new Error('goal tools require an open model turn')
        if (evs[i]?.type === 'turn/start') return { agent: theAgent, events: evs.slice(i + 1) }
      }
      throw new Error('goal tools require an open model turn')
    }
    const goalCompleteAuthority = (execution) => {
      if (execution.events.some((e) => e.type === 'user/message' && e.data?.source?.kind === 'user')) return { kind: 'direct-human' }
      const goalsSvc = ctx.get('goals')
      const goal = goalsSvc?.get?.(execution.agent)
      if (goal !== void 0 && execution.events.some((e) => e.type === 'user/message' && e.data?.source?.kind === 'goal' && e.data.source.goalId === goal.id && e.data.source.revision === goal.revision && e.data.source.round === goal.roundsStarted)) return { kind: 'goal-round', goal }
      throw new Error('complete and blocked require a direct human turn or the current goal round')
    }
    n += make({
      name: 'get_goal',
      description: 'Read the current same-session goal, including its exact id/revision, objective, phase, rounds, and activation. (own-layer shim)',
      parameters: {},
      execute: async (_args, exec) => JSON.stringify(goalsValue(ctx.get('goals')?.get?.(goalExec(exec).agent))),
    })
    n += make({
      name: 'create_goal',
      description: 'Create one persisted same-session completion goal for a long-running objective. (own-layer shim)',
      parameters: { objective: { type: 'string', required: true }, max_goal_rounds: { type: 'number' } },
      execute: async (args, exec) => {
        const execution = goalExec(exec)
        if (!execution.events.some((e) => e.type === 'user/message' && e.data?.source?.kind === 'user')) throw new Error('create requires a direct human turn')
        const goal = ctx.get('goals').create(execution.agent, { objective: String(args.objective), ...args.max_goal_rounds === void 0 ? {} : { maxGoalRounds: args.max_goal_rounds } })
        return JSON.stringify(goalsValue(goal))
      },
    })
    n += make({
      name: 'update_goal',
      description: 'Update the exact current goal revision. complete/blocked allowed in the current goal round. (own-layer shim)',
      parameters: { goal_id: { type: 'string', required: true }, revision: { type: 'number', required: true }, action: { type: 'string', required: true }, objective: { type: 'string' }, max_goal_rounds: { type: 'number' }, blocked_reason: { type: 'string' } },
      execute: async (args, exec) => {
        const execution = goalExec(exec)
        const goalsSvc = ctx.get('goals')
        const ref = { id: args.goal_id, revision: args.revision }
        if (args.action === 'complete' || args.action === 'blocked') {
          const authority = goalCompleteAuthority(execution)
          if (args.action === 'blocked' && authority.kind === 'goal-round' && authority.goal.roundsStarted < 3) throw new Error('blocked requires at least 3 consecutive goal rounds')
          const goal = args.action === 'complete' ? goalsSvc.complete(execution.agent, ref) : goalsSvc.block(execution.agent, ref, { code: 'model-reported', message: String(args.blocked_reason || '') })
          if (authority.kind === 'goal-round' && exec && typeof exec.deferContext === 'function') {
            exec.deferContext({ role: 'user', source: { kind: 'plugin', plugin: 'tool-goal', form: 'notice' }, content: [{ type: 'text', text: args.action === 'complete' ? '<goal_complete>' : '<goal_blocked>' }] })
          }
          return JSON.stringify(goalsValue(goal))
        }
        throw new Error('shim update_goal supports complete/blocked only here: edit/pause/resume require direct human + full adapter')
      },
    })

    n += make({
      name: 'dev_reset_experience',
      description: '回到初档（阶段 0）并清空阶段工具（meta/goal 保留），用于在本会话内从头体验渐进披露；用 todo_write 可触发自动推进。',
      parameters: {},
      execute: async () => {
        const st = (ensureStage()[sid] ??= { stage: 0, guided: false })
        st.stage = 0
        st.stageAtTime = Date.now()
        saveStageState()
        applyStageRestrict(agent, 0)
        const ownT = toolsSvc?.layers?.scoped?.get?.(agent)?.tools
        for (const nm of STAGE_HOST) { try { ownT?.data?.delete?.(nm) } catch { /* ignore */ } }
        installMetaShim(agent, { installStage: false, stage: 0 })
        return 'reset to phase 0: ' + STAGES[0].name + '（stage tools cleared; meta/goal retained）——现在用 todo_write 触发自动推进'
      },
    })

        // 从 scope 链收集真实 stage 工具（mount layer 的 write/edit/pwsh 等），按当前阶段解锁到 target 自身 scope
    const STAGE_3_TOOLS = [...STAGES[3].tools]
    const STAGE_2_TOOLS = [...STAGES[2].tools]
    const STAGE_HOST = [...STAGE_2_TOOLS, ...STAGE_3_TOOLS]
    const wanted = installStage ? [...(curStage >= 2 ? STAGE_2_TOOLS : []), ...(curStage >= 3 ? STAGE_3_TOOLS : [])] : []
    const layerSvc = toolsSvc?.layers
    const chainFn = layerSvc && typeof layerSvc.chainLayers === 'function' ? layerSvc.chainLayers.bind(layerSvc) : void 0
    const scopeCandidates = []
    try { if (agent !== void 0) scopeCandidates.push(agent) } catch { /* ignore */ }
    try { if (agent?.ctx !== void 0) scopeCandidates.push(agent.ctx) } catch { /* ignore */ }
    const seen = new Set()
    for (const name of wanted) {
      if (seen.has(name)) continue
      for (const scope of scopeCandidates) {
        let chain = []
        try { if (typeof chainFn === 'function') chain = chainFn(scope) || [] } catch { continue }
        for (const layer of chain) {
          const lt = layer?.tools
          let def = void 0
          try { def = lt?.get?.(name) } catch { /* ignore */ }
          if (!def && lt && typeof lt.entries === 'function') {
            try { for (const [nn, dd] of lt.entries()) if (nn === name) { def = dd; break } } catch { /* ignore */ }
          }
          if (def) {
            try {
              try { toolsSvc?.layers?.scoped?.get?.(agent)?.tools?.data?.delete?.(name) } catch { /* ignore */ }
              toolsSvc.register(def); n += 1; seen.add(name)
            } catch { /* duplicate/无效 */ }
          }
        }
      }
    }
    return n
  }

  registerTool({
    name: 'dev_reload_preset_live',
    description: '预设热重载（当前会话即时生效）：bump agent.cordis.yml 相对 .mjs 的 ?v=N → AgentPresets.recompose 把本 agent 重链到新 generation。仅在同预设自身向前兼容升级时使用（否则已记录工具调用可能在新代不可见）。',
    parameters: { targetSessionId: { type: 'string', description: '目标会话 id（缺省 = 当前会话）' } },
    output: { schema: { type: 'string' }, render: (_a, v) => [{ type: 'text', text: String(v) }] },
    async execute(args) {
      const ap = ctx.get('agentPresets')
      const agentsSvc = ctx.get('agents')
      let agent = currentAgent()
      let label = 'current'
      if (args && args.targetSessionId) {
        const found = agentsSvc?.get(String(args.targetSessionId))
        agent = found ?? null
        label = String(args.targetSessionId)
      }
      if (!ap || !agent) return 'ERROR: agentPresets/agent 不可用 (target=' + label + ')'
      const before = ap.composedPreset(agent.ctx) ?? 'unknown'
      if (before === 'unknown') return 'ERROR: 当前 agent 未加入预设'
      const home = process.env.DSH_HOME || homedir()
      const presetDir = join(home, '.agent-presets', before)
      const ymlFile = join(presetDir, 'agent.cordis.yml')
      let yml = ''
      try { yml = readFileSync(ymlFile, 'utf8') } catch (e) { return 'ERROR: 读取失败 ' + ymlFile + ' ' + String(e) }
      const refRe = /(name: \.\/[A-Za-z0-9._-]+\.mjs)(\?v=\d+)?/g
      let bumped = []
      let matched = false
      yml = yml.replace(refRe, (whole, base, query) => {
        matched = true
        const cur = query ? Number(query.slice(3)) : 0
        bumped.push(base.split('/').pop() + ' -> ?v=' + (cur + 1))
        return base + '?v=' + (cur + 1)
      })
      if (!matched) return 'ERROR: 无相对 .mjs 引用'
      writeFileSync(ymlFile, yml, 'utf8')
      const targetSid = (args && args.targetSessionId) || currentSession()?.id || agent.session?.id || ''
      const stage = ensureStage()[targetSid]?.stage ?? 0
      const preset = await ap.recompose(agent.ctx, before)
      applyStageRestrict(agent, stage)
      const after = ap.composedPreset(agent.ctx) ?? preset?.id ?? 'unknown'
      const shimN = installMetaShim(agent)
      return 'OK: live reloaded\n- bump: ' + bumped.join(', ') + '\n- before: ' + before + '\n- after: ' + after + '\n- shim: ' + shimN + '\n本工具调用仍跑在旧代；下一轮请求即挂载新一代。'
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

/** 实体呈现模式（v1.7：状态自检显示 presentation=code|native——描述不再断言，让模型对账实际）。 */
export function readPresentation(agent) {
  try {
    const ts = agent?.ctx?.get?.('tools')
    if (ts && typeof ts.modeFor === 'function') return String(ts.modeFor(agent))
    return 'unknown'
  } catch { return 'unknown' }
}

function fmtMode(mode) {
  if (mode === 'weak') return 'weak'
  return bandFor(mode)
}