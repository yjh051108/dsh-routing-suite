/**
 * dsh-graded-mode — 会话级两级任务协议插件（v4：编辑+锁定,工具驱动）。
 *
 * 用户拍板的理想开局（v4）：
 *   /graded <任务> → 注入「先想大类」→ 模型 edit_plan(L1) → lock_stage(L1)
 *   → 注入「三概念分化」→ 模型 edit_plan(L2) → lock_stage(L2)
 *   → 所有门关闭 → 插件自动弹树状图审核（ctx.userQuestions.ask）
 *   → 通过 → 逐小类开发；拒绝 → 全解锁回大类编辑（按意见改）。
 *
 * 关键性质：
 *   - 阶段推进 = 工具调用（lock 即切阶段），零字符串解析。
 *   - 锁了就是锁了：已锁层 edit_plan 被拒；解锁唯一入口 = 审核拒绝。
 *   - 数据面 todo max：清单只存结构化树 + graded/plan 事件快照,不写官方 todo_write。
 *   - 未触发 = 官方零痕迹（无工具注册、无注入）。
 *   - **状态单轨=磁盘**（v0.5）：内存无副本。tools execute 与 pre-step 注入判定
 *     读同一快照 → 幂等键（injected）真实生效 → 杜绝双注（曾因"execute 写盘 /
 *     pre-step 读内存"双轨时序失真,同一引导注 2-3 次）。
 *   - 模式（correct/experience/research）：开局模型自报 [模式:x] / 用户随时改口；
 *     只改验收重心引导,不改任务与范围。
 *
 * 工具（edit_plan / lock_stage / mark_task）全局常驻（inject: 'tools'）——任何会话
 * 任何阶段工具不缺失（工具缺失=标定断裂）；激活/阶段校验在 execute 内兜底。
 */
import { initMode, trigger, deactivate, onReviewApproved, onReviewRejected,
  currentFocus, groupDone, allDone, treeText, serializeState, loadConceptLimit, loadVerifyMode,
  loadState, saveState } from './mode-state.js'
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { createHash } from 'node:crypto'

/** 默认 DSH_HOME（运行时计算——不硬编码用户名/盘符；脱敏：真实主目录由 os.homedir() 提供）。 */
function defaultDshHome() {
  return join(homedir(), '.dsh')
}

/** 盘档 mtime 最新的会话（重启后零等待恢复——不依赖内存 activeSid；最多扫 200 文件）。 */
function latestStateSid() {
  try {
    const dir = join(process.env.DSH_HOME || defaultDshHome(), 'graded-state')
    const files = readdirSync(dir).filter((f) => f.endsWith('.json')).slice(0, 200)
    let best = null, bestM = -1
    for (const f of files) {
      const m = statSync(join(dir, f)).mtimeMs
      if (m > bestM) { bestM = m; best = f.replace(/\.json$/, '') }
    }
    return best
  } catch { return null }
}
import { editPlanDefinition, lockStageDefinition, markTaskDefinition, commitStarDefinition, redteamVerdictDefinition, reviseDoDefinition } from './tools.js'
import { phaseL1, phaseL2, reviewPendingText, approvedToDevelop, approvedKickoff, brainStormText, focusL2, focusL2GroupOpen, focusL2Last, groupCheck, finalCheck, modeName, starPurpose, offReceipt, rejectAck } from './inject-text.js'
import z from '@deepseek-ai/schemastery'

export const name = 'dsh-graded-mode'
export const inject = ['commands', 'userQuestions', 'webServer', 'tools']
export const Config = z.object({}) // 无配置项；cordis loader 要求 schema 形态

function userMsg(text) {
  return {
    id: 'graded-' + Date.now() + '-' + Math.floor(Math.random() * 1e6),
    role: 'user',
    source: { kind: 'plugin', plugin: 'dsh-graded-mode' },
    content: [{ type: 'text', text }],
  }
}

/** 在 decision.messages 里,最后一条 user 消息之后插入注入消息（前置位语义）。 */
function spliceInjection(decision, msg) {
  if (!decision || !Array.isArray(decision.messages)) return
  let at = decision.messages.length
  for (let i = decision.messages.length - 1; i >= 0; i--) {
    if (decision.messages[i] && decision.messages[i].role === 'user') {
      at = i + 1
      break
    }
  }
  decision.messages.splice(at, 0, msg)
}

/** 模式自报扫描：**只认用户**最近一条非插件消息里的 [模式:x]（模型不得自行漂移——防"开局 E 后期 C"）。 */
const MODE_RE = /\[模式[:：]\s*(correct|experience|research)\s*\]/
function scanMode(messages) {
  if (!Array.isArray(messages)) return null
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (!m || m.role !== 'user') continue // 只扫用户消息：模型自报不生效为改口
    if (m.source && m.source.kind === 'plugin') continue // 跳过本插件注入消息
    let txt = ''
    for (const x of (m.content || [])) {
      if (x && typeof x === 'object' && x.type === 'text') txt += x.text || ''
    }
    const hit = MODE_RE.exec(txt)
    if (hit) return hit[1]
    break // 只扫最近一条真实用户消息（避免命中历史旧自报导致反复切换）
  }
  return null
}

/** redteam 汇总（纯函数,可测）：审计与面板共用。 */
export function redteamStat(state) {
  const rt = { rounds: 0, passed: 0, rejected: 0, pending: 0 }
  const acc = (node) => {
    if (!node?.redteam) return
    rt.rounds += node.redteam.rounds || 0
    if (node.redteam.passed) rt.passed++
    for (const l of node.redteam.log || []) if (l.verdict === 'reject') rt.rejected++
  }
  const accP = (node) => { if (node?.verify === 'redteam' && !(node.redteam && node.redteam.passed)) rt.pending++ }
  for (const g of state?.plan?.groups || []) {
    acc(g); accP(g)
    for (const it of (g.items || [])) { acc(it); accP(it) }
  }
  return rt
}

/** 审计体（纯函数,可测）：注入计数（前缀聚合）+ 盘档指纹 + redteam 统计 + 唯一率。 */
export function auditBody(state) {
  const keys = [...(state?.injected || [])]
  const injections = {}
  const dupKeys = keys.filter((k, i) => keys.indexOf(k) !== i)
  for (const k of keys) {
    const p = k.startsWith('focus:') ? 'focus:*' : k.startsWith('check:') ? 'check:*' : k
    injections[p] = (injections[p] || 0) + 1
  }
  const rt = redteamStat(state)
  const fingerprint = createHash('sha1').update(JSON.stringify(serializeState(state))).digest('hex').slice(0, 16)
  return {
    ok: true,
    injections,
    fingerprint,
    redteam: rt,
    uniqueRate: keys.length === 0 ? 0 : 1 - dupKeys.length / keys.length,
    dupKeys: [...new Set(dupKeys)],
    settings: { conceptLimit: state?.conceptLimit ?? null, verifyMode: state?.verifyMode ?? null }, // 审计含设置摘要（调用方填充）
  }
}

export function apply(ctx, config) {
  let activeSid = null // 最近活跃 sid（完成情况面板 API 用；会话级单实例足够）

  /* ---------- 状态：磁盘单轨（无内存副本——双注根因:双轨快照不一致） ---------- */

  function state(sid) { return loadState(sid) || initMode() }
  function setState(sid, s) { saveState(sid, s) }
  function getState(sid) { return loadState(sid) }

  /* ---------- 持久化兼容（off 时清盘避免误恢复） ---------- */

  function clearPersisted(sid) {
    try {
      mkdirSync(join(process.env.DSH_HOME || defaultDshHome(), 'graded-state'), { recursive: true })
      writeFileSync(stateFile(sid), JSON.stringify(serializeState(initMode())), 'utf-8')
    } catch { /* 幂等 */ }
  }
  function stateFileRaw(sid) {
    return join(process.env.DSH_HOME || defaultDshHome(), 'graded-state', String(sid).replace(/[^a-zA-Z0-9-]/g, '_') + '.json')
  }
  function stateFile(sid) {
    return stateFileRaw(sid)
  }

  /* ---------- 完成情况面板 API（client 进度面板消费；常量路由 + 最近活跃 sid） ---------- */

  const apiProgress = (s) => ({
    stage: s.stage,
    task: s.task,
    mode: s.mode,
    current: (() => { const f = currentFocus(s.plan); return f ? f.item.title : null })(),
    redteam: redteamStat(s),
    uniqueRate: (() => { const keys = [...(s.injected || [])]; return keys.length === 0 ? 0 : 1 - (new Set(keys).size === keys.length ? 0 : keys.length - new Set(keys).size) / keys.length })(),
    specCoverage: (() => {
      const items = (s.plan?.groups || []).flatMap((g) => g.items || [])
      if (items.length === 0) return 0
      const withAcc = items.filter((i) => (i.accept || []).length > 0).length
      return Math.round((withAcc / items.length) * 100)
    })(),
    missingSpec: (s.plan?.groups || []).reduce((n, g) => n + (g.items || []).filter((i) => !(i.accept || []).length).length, 0),
    sidShort: activeSid ? String(activeSid).replace(/^session-/, '').slice(0, 8) : null,
    l1Locked: s.l1Locked,
    l2Locked: s.l2Locked,
    total: s.plan?.groups?.reduce((n, g) => n + (g.items || []).length, 0) || 0,
    done: s.plan?.groups?.reduce((n, g) => n + (g.items || []).filter((i) => i.status === 'completed').length, 0) || 0,
    groups: (s.plan?.groups || []).map((g) => ({
      title: g.title,
      done: (g.items || []).filter((i) => i.status === 'completed').length,
      total: (g.items || []).length,
    })),
    plan: s.plan,   // 3.1 面板三层树：完整规格（组/小类 spec/accept/do/verify/redteam 历史）
    star: s.star,   // 北极星栏（面板顶层常驻）
  })
  /* ---------- 设置（两级：全局 settings.json + 会话覆盖） ---------- */

  const DEFAULT_SETTINGS = { conceptLimit: 3, verifyMode: 'auto' } // auto=自决策 | self-redteam | subagent
  const VERIFY_MODES = ['auto', 'self-redteam', 'subagent']

  function settingsFile() {
    return join(process.env.DSH_HOME || defaultDshHome(), 'graded-settings.json')
  }
  function sessionSettingsFile(sid) {
    return join(process.env.DSH_HOME || defaultDshHome(), 'graded-state', String(sid).replace(/[^a-zA-Z0-9-]/g, '_') + '.settings.json')
  }
  function loadGlobalSettings() {
    try { return { ...DEFAULT_SETTINGS, ...JSON.parse(readFileSync(settingsFile(), 'utf8')) } }
    catch { return { ...DEFAULT_SETTINGS } }
  }
  function loadSessionSettings(sid) {
    try { return sid ? (JSON.parse(readFileSync(sessionSettingsFile(sid), 'utf8')) || {}) : {} }
    catch { return {} }
  }
  function settingsFor(sid) {
    const g = loadGlobalSettings()
    const s = loadSessionSettings(sid)
    return {
      global: g, session: s,
      conceptLimit: s.conceptLimit ?? g.conceptLimit,
      verifyMode: s.verifyMode ?? g.verifyMode,
    }
  }
  function validSettings(patch) {
    if (patch.conceptLimit !== undefined) {
      const n = Number(patch.conceptLimit)
      if (!Number.isInteger(n) || n < 3 || n > 8) return 'conceptLimit 须为 3-8 整数'
    }
    if (patch.verifyMode !== undefined && !VERIFY_MODES.includes(patch.verifyMode)) return 'verifyMode 须为 auto|self-redteam|subagent'
    return null
  }

  ctx.effect(() => {
    const d = ctx.webServer.register({
      kind: 'prefix',
      path: '/graded-mode/api/settings',
      handler: async (req, res) => {
      const q = new URL(req.url, 'http://x')
      const sid = q.searchParams.get('sid')
      const json = (o, code = 200) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(o)) }
      const scope = q.searchParams.get('scope')
      if (req.method === 'GET') return json(settingsFor(sid))
      if (req.method === 'PUT') {
        let raw = ''
        try { for await (const c of req) raw += c } catch { /* */ }
        let patch
        try { patch = JSON.parse(raw || '{}') } catch { return json({ ok: false, error: 'body 非 JSON' }, 400) }
        const err = validSettings(patch)
        if (err) return json({ ok: false, error: err }, 400)
        const target = (patch.scope === 'session' || scope === 'session') && sid ? 'session' : 'global'
        if (target === 'global') {
          const cur = loadGlobalSettings()
          if (patch.conceptLimit !== undefined) cur.conceptLimit = patch.conceptLimit
          if (patch.verifyMode !== undefined) cur.verifyMode = patch.verifyMode
          try { writeFileSync(settingsFile(), JSON.stringify(cur, null, 2), 'utf-8'); return json({ ok: true, scope: 'global', settings: cur }) }
          catch (e) { return json({ ok: false, error: '写盘失败: ' + e.message }, 500) }
        } else {
          const cur = loadSessionSettings(sid)
          if (patch.conceptLimit !== undefined) cur.conceptLimit = patch.conceptLimit
          if (patch.verifyMode !== undefined) cur.verifyMode = patch.verifyMode
          try {
            writeFileSync(sessionSettingsFile(sid), JSON.stringify(cur, null, 2), 'utf-8')
            return json({ ok: true, scope: 'session', settings: settingsFor(sid) })
          } catch (e) { return json({ ok: false, error: '写盘失败: ' + e.message }, 500) }
        }
      }
      return json({ ok: false, error: 'method 仅 GET/PUT' }, 405)
      }
    }, 'graded-mode: settings api')
    return () => d()
  })

  ctx.effect(() => {
    const d = ctx.webServer.register({
      kind: 'prefix',
      path: '/graded-mode/api/sessions',
      handler: async (_req, res) => {
        // 全部盘档会话清单（面板下拉切换用）——mtime 降序
        try {
          const dir = join(process.env.DSH_HOME || defaultDshHome(), 'graded-state')
          const list = readdirSync(dir).filter((f) => /^session-[\w-]+\.json$/.test(f))
            .map((f) => { const id = f.replace(/\.json$/, ''); const s = state(id) || initMode(); return { sid: id, stage: s.stage, task: (s.task || '').slice(0, 40), mtime: statSync(join(dir, f)).mtimeMs } })
            .sort((a, b) => b.mtime - a.mtime)
          res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ ok: true, sessions: list }))
        } catch (e) {
          res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ ok: false, error: String(e) }))
        }
      },
    }, 'graded-mode: sessions api')
    return () => d()
  })

  ctx.effect(() => {
    const d = ctx.webServer.register({
      kind: 'prefix',
      path: '/graded-mode/api',
      handler: async (_req, res) => {
        // 会话选择优先级：?sid= 显式（前端从 URL/历史解析）> 最近活跃（内存/命令）> 盘档 mtime 最新（重启零等待恢复）
        const q = new URL(_req.url, 'http://x').searchParams.get('sid')
        const sid = q || activeSid || latestStateSid()
        const s = sid ? state(sid) : initMode()
        // 防错显示：显式 sid 但无盘档 → ok:false（客户端不渲染徽章，绝不显示错会话）
        const bad = q && !existsSync(stateFileRaw(q)) ? false : true
        const body = JSON.stringify(bad ? { ok: true, sid, ...apiProgress(s) } : { ok: false, sid: q, reason: 'no-state' })
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
        res.end(body)
      },
    }, 'graded-mode: state api')
    return () => d()
  })

  /* ---------- 审计端点（/api/audit：注入计数/指纹/红队——检测类任务一眼可见） ---------- */
  ctx.effect(() => {
    const d = ctx.webServer.register({
      kind: 'prefix',
      path: '/graded-mode/api/audit',
      handler: async (_req, res) => {
        const q = new URL(_req.url, 'http://x').searchParams.get('sid')
        const sid = q || activeSid || latestStateSid()
        const s = sid ? state(sid) : initMode()
        const body = JSON.stringify({ ...auditBody({ ...s, conceptLimit: loadConceptLimit(sid), verifyMode: loadVerifyMode(sid) }), sid })
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
        res.end(body)
      },
    }, 'graded-mode: audit api')
    return () => d()
  })

  /* ---------- 工具注册（全局常驻;execute 走磁盘权威,激活/阶段校验在 execute 内） ---------- */

  const deps = {
    getState,
    setState,
    async askUser(agent, curState) {
      const tree = treeText(curState.plan)
      const l1 = curState.plan.groups.length
      const l2 = curState.plan.groups.reduce((n, g) => n + (g.items || []).length, 0)
      try {
        return await ctx.userQuestions.ask({
          questions: [{
            id: 'graded-plan-review',
            question: `两级清单（${l1} 大类 / ${l2} 小类）是否确认？确认后按小类逐个执行。`,
            header: '分级清单审核',
            detail: tree,
            options: [{ label: '确认' }, { label: '修改' }],
            intent: { kind: 'plan-review', approve: '确认' },
          }],
          agent,
        })
      } catch (e) {
        console.warn('[graded] askUser failed:', e?.message || e)
        return { answers: [] } // 视为取消 → 走拒绝路径回滚,保证状态机可达
      }
    },
  }

  ctx.effect(() => {
    const disposers = []
    for (const def of [editPlanDefinition(deps), lockStageDefinition(deps), markTaskDefinition(deps), commitStarDefinition(), redteamVerdictDefinition(), reviseDoDefinition()]) {
      try {
        const d = ctx.tools.register(def)
        if (d) disposers.push(d)
      } catch (e) { console.warn('[graded] global tool register failed:', def.name, e?.message || e) }
    }
    return () => { for (const d of disposers) { try { d() } catch { /* 幂等 */ } } }
  }, 'graded-mode: global tools')

  /** 阶段 → 工具组（兼容签名;工具已全局常驻,此处 no-op）。 */
  function ensureTools(_agent, _sid, _stage) { return }
  function removeTools(_sid) { return }

  ctx.on('dispose', () => {
    activeSid = null
  })

  /* ---------- ① 命令：/graded <任务>（一次性触发;off/status 控制） ---------- */

  ctx.commands.register({
    name: 'graded',
    description: '一次性触发分级模式（大类→锁定→小类→锁定→自动审核）: /graded <任务描述>',
    input: { hint: '[<任务描述>|off|status]' },
    handler: (invocation) => {
      const agent = invocation.agent
      if (!agent?.session?.id) return { kind: 'error', text: 'no agent session' }
      const sid = agent.session.id
      activeSid = sid
      const raw = String(invocation.rawInput || '').trim()
      const first = raw.split(/\s+/)[0] || ''
      if (first === 'off') {
        setState(sid, deactivate())
        clearPersisted(sid)
        // 修复：命令通道 off 也要让模型看到"已关闭"（offJustNow 仅文本通道生效——
        // 命令回执只达用户，模型下一轮无提示 → 注入靠 followup（先注后键不适用：无引导键）
        try {
          agent.followup(userMsg(offReceipt()))
        } catch { /* 提示失败不阻断 */ }
        return { kind: 'success', text: '分级模式已关闭' }
      }
      if (first === 'status') {
        const s = state(sid)
        let restore = 'none'
        try { restore = existsSync(stateFile(sid)) ? 'file' : 'none' } catch { restore = 'unreadable' }
        return { kind: 'success', text: `分级模式: ${s.stage}（${s.mode} | L1 ${s.l1Locked ? '🔒' : '开'} / L2 ${s.l2Locked ? '🔒' : '开'} | restore: ${restore}）` }
      }
      const task = raw.replace(/^(?:[\\/]|@)graded?\s*[:：]?\s*/, '').trim()
      const s1 = trigger(state(sid), task)
      setState(sid, s1)
      // turn 前注册工具 + 注入第一阶段提示（3.1：先头脑风暴·需求对齐；step 1 工具即就位）
      ensureTools(agent, sid, state(sid).stage)
      try {
        agent.followup(userMsg(brainStormText(task)))
        // 双注防治：followup **成功后**注册 'brainstorm-guidance' 键 → pre-step splice 通道见键跳过；
        // 失败则不注册 → pre-step 兜底补入
        const st = loadState(sid)
        if (st && !st.injected.has('brainstorm-guidance')) {
          st.injected.add('brainstorm-guidance')
          saveState(sid, st)
        }
      } catch { /* 注入失败不阻断（键未注册 → pre-step 兜底补） */ }
      const brief = task.length > 40 ? task.slice(0, 40) + '…' : task
      return { kind: 'success', text: `分级模式已触发：先头脑风暴对齐需求并定稿北极星（commit_star）→ 规划大类/小类 → 锁定 → 自动审核。\n📋 任务：${brief}` }
    },
  })

  /* ---------- ② 事件：用户文本 /graded 前缀触发（API/文本通道） ---------- */

  ctx.on('session/event', (session, event) => {
    if (!session?.id || !event) return
    const sid = session.id
    if (event?.type === 'user/message') {
      let txt = ''
      for (const x of (event.data?.content || [])) {
        if (x && typeof x === 'object' && x.type === 'text') txt += x.text || ''
      }
      const m = txt.match(/^(?:[\\/@]|分级任务\s*[:：])graded?\s*[:：]?\s*(.+)/s)
      if (m && state(sid).stage === 'off' && !['off', 'status'].includes(m[1].trim())) { // off/status 由 pre-step 统一处理
        setState(sid, trigger(state(sid), m[1].trim()))
      }
      return
    }
  })

  /* ---------- ③ pre-step：兜底触发 + 阶段注入 + 模式扫描（全程磁盘单轨） ---------- */

  ctx.on('agent/pre-step', async ({ agent, messages }, next) => {
    const sid = agent?.session?.id
    let offJustNow = false
    let rejectedJustNow = false
    let modeHit = null
    if (sid !== undefined) {
      activeSid = sid
      let s = state(sid) // 磁盘权威（热重载/重启后天然恢复）
      let task = null
      for (const m of messages || []) {
        let txt = ''
        for (const x of (m?.content || [])) {
          if (x && typeof x === 'object' && x.type === 'text') txt += x.text || ''
        }
        const hit = txt.match(/^(?:[\\/@]|分级任务\s*[:：])graded?\s*[:：]?\s*(.+)/s) // 正/反斜杠 & @graded & 中文触发
        if (hit) {
          const arg = hit[1].trim()
          if (arg === 'off') { // 文本通道 off 语义（与命令 handler 一致）
            setState(sid, deactivate())
            clearPersisted(sid)
            offJustNow = true // 后处理注入"已关闭"提示（模型不能再以为还在分级模式）
          }
          if (s.stage === 'off') { task = arg; break }
        }
      }
      if (task !== null) setState(sid, trigger(state(sid), task))
      s = state(sid) // 重新读（trigger/off 可能已改盘）
      // review 阶段：扫描用户文本答复（确认/修改 翻转；跳过插件注入消息）
      if (s.stage === 'review') {
        for (let i = messages.length - 1; i >= 0; i--) {
          const m = messages[i]
          if (!m || m.role !== 'user') continue
          if (m.source && m.source.kind === 'plugin') continue // 跳过本插件注入的 userMsg
          let txt2 = ''
          for (const x of (m?.content || [])) {
            if (x && typeof x === 'object' && x.type === 'text') txt2 += x.text || ''
          }
          const t = txt2.trim()
          if (!t) continue
          const sR = state(sid)
          // 意图判定：**修改优先**（含修改/建议/调整类词 → 解锁回 l1-edit,任意长度——
          // 用户选了修改+建议就是明确要改,不得锁死）；纯确认/继续且无修改词 → approve
          const wantReject = /修改|拒绝|取消|不同意|建议|改成|改为|调整为|调整|reject/i.test(t)
          const wantApprove = !wantReject && /确认|通过|同意|确定|继续|开工|开始|approve|confirm|ok/i.test(t)
          if (wantReject) {
            setState(sid, onReviewRejected(sR))
            rejectedJustNow = true // 时序修复：回滚后必须开口（reject-ack 注入由下半段 l1-edit 分支执行）
            console.log('[graded] review rejected by text')
          } else if (wantApprove) {
            setState(sid, onReviewApproved(sR))
            console.log('[graded] review approved by text')
          }
          break // 只处理最近一条真实用户消息
        }
      }
      // 模式自报/改口扫描（任何阶段可切换;只扫最近一条非插件消息,幂等:与当前一致则不动）
      if (s.stage !== 'off') {
        const hit = scanMode(messages)
        if (hit && hit !== s.mode) modeHit = hit
      }
      if (state(sid).stage !== 'off') ensureTools(agent, sid, state(sid).stage) // 文本通道：下一步起工具在
    }
    const decision = await next()
    try {
      if (agent?.session?.id === undefined) return decision
      const sid2 = agent.session.id
      let s = state(sid2) // 磁盘单轨：新一轮读（execute 同轮写入已在盘上）
      // 时序修复：『修改』回滚后（rejectedJustNow）→ l1-edit 分支先注 reject-ack（系统开口，防空窗）
      if (rejectedJustNow && s.stage === 'l1-edit' && !s.injected.has('reject-ack')) {
        s.injected.add('reject-ack')
        spliceInjection(decision, userMsg(rejectAck()))
        rejectedJustNow = false
      }
      if (s.stage === 'off') {
        // 刚关闭 → 注入"已关闭"提示（模型不再误以为还在分级模式）
        if (offJustNow) {
          offJustNow = false
          spliceInjection(decision, userMsg(offReceipt()))
        }
        return decision
      }

      // 模式改口 → 切换 + 注回执（同值即跳过=幂等）
      if (modeHit && modeHit !== s.mode) {
        s = { ...s, mode: modeHit }
        spliceInjection(decision, userMsg(`✅ 模式已定为【${modeName(modeHit)}】——本会话验收重心按此执行（任务与范围不变）；随时发 [模式:xxx] 改口。`))
      }

      // 阶段注入（全部基于同一 s 与 s.injected → 末尾一次落盘）
      if (s.stage === 'brainstorm') {
        // 3.1：需求对齐注入（信息不闭环不前进——未定稿时后续阶段不可达）
        if (!s.injected.has('brainstorm-guidance')) {
          s.injected.add('brainstorm-guidance')
          spliceInjection(decision, userMsg(brainStormText(s.task)))
        }
      } else if (s.stage === 'l1-edit') {
        if (!s.injected.has('l1-guidance')) {
          s.injected.add('l1-guidance')
          spliceInjection(decision, userMsg(phaseL1(s.task)))
        }
      } else if (s.stage === 'l2-edit') {
        if (!s.injected.has('l2-guidance')) {
          s.injected.add('l2-guidance')
          spliceInjection(decision, userMsg(phaseL2(s.mode, loadConceptLimit(sid2))))
        }
      } else if (s.stage === 'review') {
        // 文本通道审核：等待用户回复『确认』/『修改』（pre-step 前半扫描翻转；规格单已在锁定回执呈现）
        if (!s.injected.has('review-pending')) {
          s.injected.add('review-pending')
          spliceInjection(decision, userMsg(reviewPendingText()))
        }
      } else if (s.stage === 'develop') {
        // ① 审核通过 → 开发模式入场语（确认宣言 + 北极星长版一次；衔接：确认后顺理成章进入逐小类开发）
        if (!s.injected.has('approved-kickoff')) {
          s.injected.add('approved-kickoff')
          spliceInjection(decision, userMsg(approvedKickoff(s)))
        }
        // ② 大类完成闸：组完成但**大类未标定** 或 **收官未注入过**（抢跑标定却漏收官）→
        //    注入【大类收官】一条（验收+标定合一）；未标定时不注入下一大类焦点
        const doneGroupsUnmarked = s.plan.groups.filter((g) => groupDone(g) && (!g.locked || !s.injected.has('check:' + g.title)))
        if (doneGroupsUnmarked.length > 0) {
          for (const g of doneGroupsUnmarked) {
            const gkey = 'check:' + g.title
            if (!s.injected.has(gkey)) {
              s.injected.add(gkey)
              spliceInjection(decision, userMsg(groupCheck(g, s.mode)))
            }
          }
        } else if (s.plan.groups.length > 0) {
          // 正常焦点：开头/结尾小类注入略有不同（每大类的入口/出口语义）
          const focus = currentFocus(s.plan)
          if (focus) {
            // 幂等键不含 status：同一小类状态翻转（误标/回滚等抖动）不再重注同名引导——
            // 回滚场景由 stripDevelopMarkers 清 focus:* 恢复可注（误标修正仍需引导）
            const key = 'focus:' + focus.group.title + ':' + focus.item.title
            if (!s.injected.has(key)) {
              s.injected.add(key)
              const idx = (focus.group.items || []).indexOf(focus.item)
              let prev = null
              for (let i = idx - 1; i >= 0; i--) {
                if (focus.group.items[i].status === 'completed') { prev = focus.group.items[i].title; break }
              }
              const groupIdx = s.plan.groups.indexOf(focus.group)
              const prevGroupMarked = s.plan.groups.slice(0, groupIdx).some((g) => g.locked)
              const isFirst = idx === 0
              const isLast = (focus.group.items || []).slice(idx + 1).every((it) => it.status === 'completed')
              const text = (isFirst && prevGroupMarked)
                ? focusL2GroupOpen(focus.group.title, focus.item, s.mode, starPurpose(s))
                : isLast
                  ? focusL2Last(focus.group.title, focus.item, prev, s.mode, starPurpose(s))
                  : focusL2(focus.group.title, focus.item, prev, s.mode, starPurpose(s))
              spliceInjection(decision, userMsg(text))
            }
          }
        }
        // ③ 全部完成 → 收尾（最后一大类的 groupCheck 已在 ① 注入,此处只补 final）
        if (allDone(s.plan) && !s.injected.has('final')) {
          s.injected.add('final')
          spliceInjection(decision, userMsg(finalCheck(s.mode)))
        }
      }
      if (s.stage !== 'off') saveState(sid2, s) // 注入标记落盘（磁盘单轨:读-改-写整体一致）
    } catch { /* 注入失败不阻断 */ }
    return decision
  })
}

export default { apply, name, inject, Config }
