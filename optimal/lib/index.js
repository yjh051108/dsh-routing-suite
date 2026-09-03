/**
 * index — dsh-closedloop-mode v0.3 插件入口（fiber/路由骨架继承 v0.2，注入面换血）。
 *
 * v0.3 注入纪律（定理7 + 教育=违规事件）：
 *   - 讲课件全部废除；rolling 每步只注 propose-text.stateFace（盘档机械生成的最小状态面，
 *     幂等键=残差读数本身——closedCount/栈顶态变化才重注）；
 *   - weights 段注 weightsFace 评审单一次；
 *   - 「确认/修改」文本扫描**覆盖 weights 与 rolling 全段**（v0.2 只接 review 段的缺陷修复，a2）；
 *   - 栈顶 open/invalidated 的写闸提醒=一行编译器式短句（条款细节在工具拒绝文本里，不复读）。
 */
import { join } from 'node:path'
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import {
  initMode, loadState, saveState, serializeState, STAGE_SEMANTICS, controlSurface,
  trigger, deactivate, loadConceptLimit, loadVerifyMode, onWeightsConfirmed, onWeightsUnlock,
  stateFileFor, stateDirFor,
} from './mode-state.js'
import { loadStack, stackTop, vLadderOf } from './optimal-engine.js'
import { stateFace, weightsFace } from './propose-text.js'
import { offReceipt, VERSION } from './inject-text.js'
import {
  costSetDefinition, decomposeDefinition, freezeDefinition, optimalDeclareDefinition,
  optimalConvergeDefinition, auditRecordDefinition, optimalRollbackDefinition,
  optimalStackDefinition, reviseDoDefinition, terminalCheckDefinition,
} from './tools.js'
import z from '@deepseek-ai/schemastery'

export const name = 'dsh-closedloop-mode'

/** 工具集唯一真相（v0.3：十一名，audit_record 在位；注册漂移 warn 兜底）。 */
export const TOOL_NAMES = ['cost_set', 'decompose', 'freeze', 'optimal_declare', 'optimal_converge', 'audit_record', 'cost_audit', 'optimal_rollback', 'optimal_stack', 'revise_do', 'terminal_check']
export const inject = ['commands', 'webServer', 'tools']
export const Config = z.object({})

const defaultDshHome = () => join(process.env.HOME || process.env.USERPROFILE || '.', '.dsh')

function userMsg(text) {
  return {
    id: 'closedloop-' + Date.now() + '-' + Math.floor(Math.random() * 1e6),
    role: 'user',
    source: { kind: 'plugin', plugin: name },
    content: [{ type: 'text', text }],
  }
}

/** 在 decision.messages 最后一条真实 user 消息之后插入注入（前置位语义，继承 v0.2）。 */
function spliceInjection(decision, msg) {
  if (!decision || !Array.isArray(decision.messages)) return
  let at = decision.messages.length
  for (let i = decision.messages.length - 1; i >= 0; i--) {
    if (decision.messages[i] && decision.messages[i].role === 'user') { at = i + 1; break }
  }
  decision.messages.splice(at, 0, msg)
}

/** 最近活跃 v3 盘档（重启零等待恢复）。 */
function latestStateSid() {
  try {
    const dir = stateDirFor()
    let best = null, bestM = -1
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.closedloop.json'))) {
      const m = statSync(join(dir, f)).mtimeMs
      if (m > bestM) { bestM = m; best = f.replace(/\.closedloop\.json$/, '') }
    }
    return best
  } catch { return null }
}

/** 确认/修改意图（纯函数可测；修改优先——v0.2 语义继承）。导出供 a2 测例。 */
export function scanIntent(text) {
  const t = String(text || '').trim()
  if (!t) return null
  const wantReject = /修改|拒绝|取消|不同意|建议|改成|改为|调整为|调整|reject/i.test(t)
  if (wantReject) return 'reject'
  if (/确认|通过|同意|确定|继续|开工|开始|approve|confirm|ok/i.test(t)) return 'approve'
  return null
}

/** v3 审统计（面板/审计共用，纯函数）：逐动作审轮次与 pending。 */
export function auditStat(s) {
  const rt = { rounds: 0, passed: 0, rejected: 0, pending: 0 }
  for (const c of s?.closed || []) {
    if (c.audit) {
      rt.rounds += c.audit.rounds || 0
      if (c.audit.last?.verdict === 'pass') rt.passed++
      if (c.audit.last?.verdict === 'reject') rt.rejected++
    }
  }
  for (const g of s?.groups || []) {
    if (g.verify !== 'redteam' || g.settled) continue
    rt.pending += (s.closed || []).filter((c) => c.group === g.title && !(c.audit && c.audit.last?.verdict === 'pass')).length
  }
  return rt
}

/** 面板体（v3 形状，纯函数可测——effect 与测试同一源，防"测的是副本"）。只读聚合，零写盘。 */
export function panelBody(sid, s, stack) {
  if (!sid || !s || s.stage === 'off') return { ok: false, error: '无激活会话' }
  const ladder = vLadderOf(stack.steps)
  const os = (stack.steps || []).filter((x) => x.status === 'open').pop()
  const surf = controlSurface(s)
  return {
    ok: true, v: 3, sid, stage: s.stage, weightsLocked: s.weightsLocked,
    openStep: os ? { n: os.n, title: os.title } : null,
    vLadder: { run: ladder.run, dipPending: ladder.dipPending },
    residual: surf.residual, groupsBrief: surf.groups.map((g) => ({ ...g, closedActs: s.closed.filter((c) => c.group === g.title).length })),
    audit: auditStat(s),
    modelState: { model: null, paramsSource: '内置默认（模型层参数接线=后续参数块）' },
  }
}

export function apply(ctx, config) {
  let activeSid = null
  const state = (sid) => loadState(sid) || initMode()
  const setState = (sid, s) => saveState(sid, s)

  function clearPersisted(sid) {
    try {
      mkdirSync(stateDirFor(), { recursive: true })
      writeFileSync(stateFileFor(sid), JSON.stringify(serializeState(initMode())), 'utf-8')
    } catch { /* 幂等 */ }
  }

  /* ---------- 只读端点（v3 形状；旧键尽量映射保面板不白屏——#24 全面板适配） ---------- */

  ctx.effect(() => {
    const d = ctx.webServer.register({
      kind: 'prefix', path: '/graded-mode/api',
      handler: async (req, res) => {
        const q = new URL(req.url, 'http://x').searchParams.get('sid')
        const sid = q || activeSid || latestStateSid()
        const s = sid ? state(sid) : initMode()
        const surf = controlSurface(s)
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({
          ok: true, sid, v: 3,
          stage: s.stage, task: s.task, cost: s.cost, stageSemantics: STAGE_SEMANTICS[s.stage] || null,
          weightsLocked: s.weightsLocked, residual: surf.residual, closed: surf.closed,
          groups: surf.groups, audit: auditStat(s),
          fingerprint: createHash('sha1').update(JSON.stringify(serializeState(s))).digest('hex').slice(0, 16),
          total: s.groups.length, done: s.groups.filter((g) => g.settled).length,
          sidShort: sid ? String(sid).replace(/^session-/, '').slice(0, 8) : null,
        }))
      },
    }, 'closedloop: state api')
    return () => d()
  })

  ctx.effect(() => {
    const d = ctx.webServer.register({
      kind: 'prefix', path: '/graded-mode/api/panel',
      handler: async (req, res) => {
        const send = (o, code = 200) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(o)) }
        try {
          const q = new URL(req.url, 'http://x').searchParams.get('sid')
          const sid = q || activeSid || latestStateSid()
          const s = sid ? state(sid) : null
          const body = sid && s && s.stage !== 'off' ? panelBody(sid, s, loadStack(sid)) : { ok: false, error: '无激活会话' }
          send(body, body.ok ? 200 : 404)
        } catch (e) { send({ ok: false, error: String(e?.message || e) }, 500) }
      },
    }, 'closedloop: panel api')
    return () => d()
  })

  ctx.effect(() => {
    const d = ctx.webServer.register({
      kind: 'prefix', path: '/graded-mode/api/audit',
      handler: async (req, res) => {
        const q = new URL(req.url, 'http://x').searchParams.get('sid')
        const sid = q || activeSid || latestStateSid()
        const s = sid ? state(sid) : initMode()
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({
          ok: true, sid, v: 3,
          fingerprint: createHash('sha1').update(JSON.stringify(serializeState(s))).digest('hex').slice(0, 16),
          closed: s.closed.length, groups: s.groups.length, settled: s.groups.filter((g) => g.settled).length,
          audit: auditStat(s),
          settings: { conceptLimit: loadConceptLimit(sid), verifyMode: loadVerifyMode(sid) },
        }))
      },
    }, 'closedloop: audit api')
    return () => d()
  })

  ctx.effect(() => {
    const d = ctx.webServer.register({
      kind: 'prefix', path: '/graded-mode/api/sessions',
      handler: async (_req, res) => {
        try {
          const dir = stateDirFor()
          const list = readdirSync(dir).filter((f) => f.endsWith('.closedloop.json')).map((f) => {
            const id = f.replace(/\.closedloop\.json$/, '')
            const s = state(id)
            return { sid: id, stage: s.stage, task: (s.task || '').slice(0, 40), mtime: statSync(join(dir, f)).mtimeMs }
          }).sort((a, b) => b.mtime - a.mtime)
          res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ ok: true, sessions: list }))
        } catch (e) { res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify({ ok: false, error: String(e) })) }
      },
    }, 'closedloop: sessions api')
    return () => d()
  })

  /* ---------- 工具注册（十一名全局常驻；execute 磁盘权威） ---------- */

  ctx.effect(() => {
    const disposers = []
    const defs = [costSetDefinition(), decomposeDefinition(), freezeDefinition(), optimalDeclareDefinition(), optimalConvergeDefinition(), auditRecordDefinition('audit_record'), auditRecordDefinition('cost_audit'), optimalRollbackDefinition(), optimalStackDefinition(), reviseDoDefinition(), terminalCheckDefinition()]
    const got = defs.map((d) => d.name)
    if (got.join(',') !== TOOL_NAMES.join(',')) console.warn('[closedloop] 注册清单与 TOOL_NAMES 漂移:', got.join(','))
    for (const def of defs) {
      try { const d = ctx.tools.register(def); if (d) disposers.push(d) } catch (e) { console.warn('[closedloop] tool register failed:', def.name, e?.message || e) }
    }
    return () => { for (const d of disposers) { try { d() } catch { /* 幂等 */ } } }
  }, 'closedloop: global tools')

  ctx.on('dispose', () => { activeSid = null })

  /* ---------- 命令 /graded（名字保留=用户肌肉记忆；v0.3 语义） ---------- */

  ctx.commands.register({
    name: 'optimal',
    description: '最优律闭环：/optimal <任务> 开单（Q_N→组冻结→快环实时定序）；off/status。',
    input: { hint: '[<任务描述>|off|status]' },
    handler: (invocation) => {
      const agent = invocation.agent
      if (!agent?.session?.id) return { kind: 'error', text: 'no agent session' }
      const sid = agent.session.id
      activeSid = sid
      const raw = String(invocation.rawInput || '').trim()
      const first = raw.split(/\s+/)[0] || ''
      if (first === 'off') {
        setState(sid, deactivate()); clearPersisted(sid)
        try { agent.followup(userMsg(offReceipt())) } catch { /* 不阻断 */ }
        return { kind: 'success', text: `闭环协议已关闭（v${VERSION}）。V 账本保留。` }
      }
      if (first === 'status') {
        const s = state(sid)
        return { kind: 'success', text: `闭环 v${VERSION}: ${s.stage}（${STAGE_SEMANTICS[s.stage] || '?'}｜权重${s.weightsLocked ? '已锁' : '未锁'}｜动作 closed ${s.closed.length}/${s.groups.length} 组）` }
      }
      const task = raw.replace(/^(?:[\\/|@])?(?:optimal|graded|分级)\s*[:：]?\s*/, '').trim()
      setState(sid, trigger(state(sid), task))
      try { agent.followup(userMsg('【闭环·标定】cost_set 定 Q_N（断言逐条 text/severity/source，nonGoals 确认制）——权重合同先于一切。')) } catch { /* 不阻断 */ }
      return { kind: 'success', text: `闭环协议触发（v${VERSION}）：标定→组冻结→确认→快环每步实时定序。任务：${task.slice(0, 60)}` }
    },
  })

  /* ---------- 文本通道触发（@graded / 分级任务:） ---------- */

  ctx.on('session/event', (session, event) => {
    if (!session?.id || event?.type !== 'user/message') return
    let txt = ''
    for (const x of (event.data?.content || [])) if (x?.type === 'text') txt += x.text || ''
    const m = txt.match(/^(?:[\\/@])(?:optimal|graded|分级)\s*[:：]?\s*(.+)/s)
    if (m && state(session.id).stage === 'off' && !['off', 'status'].includes(m[1].trim())) {
      setState(session.id, trigger(state(session.id), m[1].trim()))
    }
  })

  /* ---------- pre-step：触发 / off / 全段确认-修改扫描（a2 修复主体） / 最小状态面注入 ---------- */

  ctx.on('agent/pre-step', async ({ agent, messages }, next) => {
    const sid = agent?.session?.id
    let offJustNow = false
    if (sid !== undefined) {
      activeSid = sid
      let s = state(sid)
      let task = null
      for (const m of messages || []) {
        let txt = ''
        for (const x of (m?.content || [])) if (x?.type === 'text') txt += x.text || ''
        const hit = txt.match(/^(?:[\\/@])(?:optimal|graded|分级)\s*[:：]?\s*(.+)/s) // 正/反斜杠 & @ & 中英触发；graded 保留兼容别名
        if (hit) {
          const arg = hit[1].trim()
          if (arg === 'off') { setState(sid, deactivate()); clearPersisted(sid); offJustNow = true }
          if (s.stage === 'off') { task = arg; break }
        }
      }
      if (task !== null) setState(sid, trigger(state(sid), task))
      // 全段可逆扫描（v0.2 缺陷修复：不只 review 段）——weights 与 rolling 都接确认/修改
      const st = state(sid)
      if (st.stage === 'weights' || st.stage === 'rolling') {
        for (let i = (messages || []).length - 1; i >= 0; i--) {
          const m = messages[i]
          if (!m || m.role !== 'user' || (m.source && m.source.kind === 'plugin')) continue
          let txt2 = ''
          for (const x of (m?.content || [])) if (x?.type === 'text') txt2 += x.text || ''
          const t = txt2.trim()
          if (!t || t.length > 200) break // 长任务文本非翻转意图
          const intent = scanIntent(t)
          if (intent === 'reject') {
            setState(sid, onWeightsUnlock(state(sid)))
            console.log('[closedloop] weights/rolling unlocked by text (a2)')
          } else if (intent === 'approve' && st.stage === 'weights') {
            setState(sid, onWeightsConfirmed(state(sid)))
            console.log('[closedloop] contract confirmed by text')
          }
          break
        }
      }
    }
    const decision = await next()
    try {
      if (agent?.session?.id === undefined) return decision
      const sid2 = agent.session.id
      let s = state(sid2)
      if (s.stage === 'off') {
        if (offJustNow) { offJustNow = false; spliceInjection(decision, userMsg(offReceipt())) }
        return decision
      }
      // weights 评审单一次
      if (s.stage === 'weights' && !s.injected.has('weights-review')) {
        s.injected.add('weights-review')
        spliceInjection(decision, userMsg(weightsFace(controlSurface(s)) + '\n（回复『确认』开快环；『修改』解锁重排）'))
      }
      // rolling 最小状态面：幂等键=残差读数本身（closedCount+栈顶态变化才重注——无讲课件）
      if (s.stage === 'rolling') {
        const top = stackTop(loadStack(sid2))
        const fKey = 'face:' + s.closed.length + ':' + (top ? top.n + top.status : 'idle')
        if (!s.injected.has(fKey)) {
          s.injected.add(fKey)
          spliceInjection(decision, userMsg(stateFace(controlSurface(s))))
        }
        // 写闸/回滚义务：一行短句（条款在引擎拒绝文本，不复读）
        if (top && (top.status === 'open' || top.status === 'invalidated')) {
          const sKey = 'gate:' + top.status + ':' + top.n
          if (!s.injected.has(sKey)) {
            s.injected.add(sKey)
            spliceInjection(decision, userMsg(top.status === 'open'
              ? `【写闸】栈顶「${top.n}.${cut(top.title, 20)}」open——实现即 optimal_converge，未闭不得开新动作。`
              : `【回滚义务】「${cut(top.title, 20)}」预言作废——rollback（reason=re-linearize）重宣，禁修补冲刺。`))
          }
        }
      }
      if (s.stage === 'final' && !s.injected.has('terminal')) {
        s.injected.add('terminal')
        spliceInjection(decision, userMsg('【终端】terminal_check 归零（唯一 throw 位）。'))
      }
      if (s.stage !== 'off') saveState(sid2, s)
    } catch { /* 注入失败不阻断 */ }
    return decision
  })
}

export default { apply, name, inject, Config }
