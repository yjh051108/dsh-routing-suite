/**
 * tools — v0.3 接线三件套之工具面（薄封装：判定全在模块，本文件零闸逻辑拷贝）。
 *
 * 模块分工（#15-#19 已闭件）：
 *   mode-state      盘档 v3 状态迁移（onCostCommit / onGroupsEdit / onWeights 系 / recordClosed）
 *   optimal-engine  快环栈与四闸（declareStep 硬化定理4 / convergeStep / rollbackStep / vLadderOf）
 *   contract-merge  差分→物化（materialize：链式量直读，模型不抄）+ 第5闸准入判定
 *   propose-text    最小状态面（stateFace/weightsFace——常驻展示面）
 *   audit-dispatch  另头审（auditBrief 机械审材 / parseVerdict 引文硬验 / recordAuditVerdict 落账）
 *
 * Schema 形态约束（血泪坑，原样继承）：parameters 对象级 required 数组，属性级禁 required 键；
 * output={ok,text}。教育=违规事件：拒绝文本即条款（引擎/审核模块自产，此处不复读）。
 */
import {
  initMode, loadState, saveState, SEVERITIES,
  onCostCommit, onGroupsEdit, onWeightsFreeze, recordClosed, markGroupSettled,
  controlSurface, terminalCheck, treeText, allGroupsSettled,
} from './mode-state.js'
import { declareStep, convergeStep, rollbackStep, loadStack, stackText, stackTop, optimalFileFor } from './optimal-engine.js'
import { materialize } from './contract-merge.js'
import { weightsFace } from './propose-text.js'
import { auditBrief, parseVerdict, recordAuditVerdict } from './audit-dispatch.js'
import { readFileSync } from 'node:fs'

const TEXT = (text) => ([{ type: 'text', text: String(text) }])
const OUT = {
  schema: { type: 'object', additionalProperties: false, required: ['ok', 'text'], properties: { ok: { type: 'boolean' }, text: { type: 'string' } } },
  render: (_a, v) => TEXT(String(v?.text || '')),
}
const sidOf = (exec) => {
  const sid = exec?.agent?.session?.id
  if (!sid) throw new Error('需要会话')
  return sid
}
const mustState = (sid) => {
  const s = loadState(sid)
  if (!s || s.stage === 'off') throw new Error('未激活：/分级 <任务> 或 cost_set 进入闭环协议')
  return s
}
const cut = (s, n) => {
  const x = String(s || '')
  return x.length > n ? x.slice(0, n) + '…' : x
}

/** 组落账机械门（converge/audit_record 共用）：closeRequested 的组，全部动作在栈 closed
 *  且（verify=redteam 时）逐动作有 pass 审 → settled；全组 settled → stage=final。
 *  判定输入全是盘档/栈实测——无模型口头空间。 */
export function trySettleGroups(s, steps) {
  const notes = []
  for (const g of s.groups) {
    if (g.settled || !g.closeRequested) continue
    const acts = s.closed.filter((c) => c.group === g.title)
    if (acts.length === 0) { notes.push(`组「${g.title}」请求落账但零动作——先跑动作再 closeGroup`); continue }
    const noStep = acts.filter((a) => !steps.some((x) => x.status === 'closed' && x.title === a.title)).map((a) => a.title)
    if (noStep.length) { notes.push(`组「${g.title}」落账待栈闭合：${noStep.join('、')}`); continue }
    if (g.verify === 'redteam') {
      const unaudited = acts.filter((a) => !(a.audit && a.audit.last && a.audit.last.verdict === 'pass')).map((a) => a.title)
      if (unaudited.length) { notes.push(`组「${g.title}」redteam 门未过：逐动作 audit_record 过审后方可落账（待审 ${unaudited.join('、')}）`); continue }
    }
    const r = markGroupSettled(s, g.title, 'mechanical-settle')
    if (r.ok) { s = r.state; notes.push(`组「${g.title}」落账 ✓（动作×${acts.length}，栈闭合齐${g.verify === 'redteam' ? '，审全 pass' : ''}）`) }
  }
  if (allGroupsSettled(s) && s.stage !== 'final') { s = { ...s, stage: 'final' }; notes.push('全组落账 → 终端校验态：terminal_check 出归零报告。') }
  return { state: s, notes }
}

/* ============================ 慢环（用户主权段） ============================ */

export function costSetDefinition() {
  return {
    name: 'cost_set',
    description: '【代价·定稿·慢环】Q_N 唯一合同（v0.3）：purpose（为谁/处境/价值/结果句式，≥12 字，禁照抄）；assertions 逐条 {text,severity,source}（缺档缺源=拒——定理4）；nonGoals 仅随 nonGoalsConfirmed:true（用户选择题/原话确认=定理1，AI 直写=拒）；assumptions。weights 锁定后本工具只读——开发中改口走文本『修改』（全段在位，v0.3 修复）。',
    parameters: {
      type: 'object', additionalProperties: false, required: ['purpose'],
      properties: {
        purpose: { type: 'string', description: '目的宣言（一句话）' },
        assertions: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['text', 'severity', 'source'], properties: { text: { type: 'string' }, severity: { type: 'string', enum: ['minor', 'major', 'catastrophic'] }, source: { type: 'string', description: '公式/条款/用户确认原话（空=拒）' } } } },
        nonGoals: { type: 'array', items: { type: 'string' } },
        nonGoalsConfirmed: { type: 'boolean' },
        assumptions: { type: 'array', items: { type: 'string' } },
      },
    },
    output: OUT,
    async execute(args, exec) {
      const sid = sidOf(exec)
      if (args && ('requirements' in args || 'mode' in args)) throw new Error('cost_set：requirements/mode 已废——断言走 assertions[{text,severity,source}]。')
      let s = loadState(sid) || initMode()
      if (s.weightsLocked) throw new Error('合同已锁（单一锁点）——开发中改口发文本『修改』解锁重排。')
      const p = String(args?.purpose || '').trim()
      if (!p || p.length < 12) throw new Error('purpose 必填且 ≥12 字（有信息量的目的宣言，非口号）')
      const assertions = Array.isArray(args?.assertions) ? args.assertions : []
      if (assertions.length === 0) throw new Error('assertions 至少 1 条 {text,severity,source}——无断言=无代价函数')
      for (const [i, a] of assertions.entries()) {
        if (!String(a?.text || '').trim()) throw new Error(`assertions[${i}].text 缺失`)
        if (!SEVERITIES.includes(a?.severity)) throw new Error(`assertions[${i}] 缺合法档位（minor|major|catastrophic）`)
        if (!String(a?.source || '').trim()) throw new Error(`assertions[${i}] 缺来源——无来源=断言无效（定理4，防"自造 0.02"）`)
      }
      const ng = Array.isArray(args?.nonGoals) ? args.nonGoals : []
      if (ng.length > 0 && args?.nonGoalsConfirmed !== true) throw new Error('定理1：nonGoals 须用户确认（选择题/原话）并携 nonGoalsConfirmed=true——AI 单方不做清单=拒')
      s = s.stage === 'off' ? { ...s, stage: 'brainstorm', task: p.slice(0, 60) } : s
      s = onCostCommit(s, args)
      saveState(sid, s)
      const dist = ['catastrophic', 'major', 'minor'].map((sv) => `${sv}×${s.cost.assertions.filter((a) => a.severity === sv).length}`).join(' ')
      return { ok: true, text: `⭐ Q_N 定稿（慢环合同）：${cut(p, 80)}\n断言 ${s.cost.assertions.length}（${dist}）/ 非目标 ${s.cost.nonGoals.length} / 假设 ${s.cost.assumptions.length}\n下一步=decompose 提交组级结构（大类；块级序列不存在——轨迹不入合同，定理7）` }
    },
  }
}

export function decomposeDefinition() {
  return {
    name: 'decompose',
    description: '【分解·组级·慢环】一次全量提交大类 groups=[{title,spec,accept,verify,do?}]（组判据 accept 必填≥1；verify=组核对形态 self|subagent|redteam|user）。**无块级 items**——动作由快环每步实时提议（cost-to-go 最小），冻结锁的是权重与组结构，不是轨迹（定理7）。',
    parameters: {
      type: 'object', additionalProperties: false, required: ['groups'],
      properties: {
        groups: {
          type: 'array',
          items: {
            type: 'object', additionalProperties: false, required: ['title'],
            properties: {
              title: { type: 'string', description: '大类名' },
              spec: { type: 'string', description: '组任务描述（必填）' },
              accept: { type: 'array', items: { type: 'string' }, description: '组判定标准 ≥1（可核对）' },
              verify: { type: 'string', enum: ['self', 'subagent', 'redteam', 'user'], description: '组核对形态（redteam=逐动作另头审门）' },
              do: { type: 'string', enum: ['self', 'subagent', 'workflow', 'daemon', 'mixed'], description: '组默认执行形态（动作提议时可覆写）' },
            },
          },
        },
      },
    },
    output: OUT,
    async execute(args, exec) {
      const sid = sidOf(exec)
      const s = mustState(sid)
      if (s.weightsLocked) throw new Error('权重已锁——『修改』解锁后重排。')
      if (!s.cost?.aligned) throw new Error('先 cost_set 定 Q_N（合同顺序：权重先于结构）')
      const groups = Array.isArray(args?.groups) ? args.groups : []
      if (groups.length === 0) throw new Error('groups 为空')
      const titles = groups.map((g) => String(g?.title || '').trim())
      if (titles.some((t) => !t)) throw new Error('存在空组名')
      if (new Set(titles).size !== titles.length) throw new Error('组名重复')
      for (const g of groups) {
        if (!String(g?.spec || '').trim()) throw new Error(`组「${g.title}」缺 spec`)
        if (!(Array.isArray(g?.accept) && g.accept.length > 0)) throw new Error(`组「${g.title}」缺 accept（至少一条完成判据）`)
      }
      const r = onGroupsEdit(s, groups)
      if (!r.ok) throw new Error(r.error)
      saveState(sid, r.state)
      return { ok: true, text: `组结构落盘（${groups.length} 组，无块级序列）：\n${treeText(r.state)}\n下一步=freeze（锁权重+组结构 → 用户确认后开快环）` }
    },
  }
}

export function freezeDefinition() {
  return {
    name: 'freeze',
    description: '【冻结·单一锁点·慢环】锁 Q_N 权重 + 组结构 + 约束（非轨迹）。回执=合同评审单（weightsFace）；用户文本『确认』→ 快环开跑，『修改』→ 解锁重排（全段可逆，a2）。',
    parameters: { type: 'object', additionalProperties: false, required: [], properties: {} },
    output: OUT,
    async execute(_args, exec) {
      const sid = sidOf(exec)
      const s = mustState(sid)
      const r = onWeightsFreeze(s)
      if (!r.ok) throw new Error(r.error)
      saveState(sid, r.state)
      const surf = controlSurface(r.state)
      const sheet = [weightsFace(surf), '', treeText(r.state), '', '（评审单全文在盘；回复『确认』开快环实时定序，『修改』解锁重排）'].join('\n')
      return { ok: true, text: sheet }
    },
  }
}

/* ============================ 快环（实时定序段） ============================ */

export function optimalDeclareDefinition() {
  return {
    name: 'optimal_declare',
    description: '【最优律·声明·差分面 v0.3】args=diff：title+group（提议归属）+predict[{key,value,source}]+channels[≥2]（不足按第5闸重流程）+可选覆写 invariants/law/cost/vExpect/dipPlan/confidence/right/wrong。链式量（beforeBand=盘档 lastBand）/Q_N 成本投影/法基行由引擎物化——模型不抄。物化全量交 declareStep 同一道闸（无源=拒、≥2通道、dip 回升、签名局部化）。兼容 v0.2 全量形状（含 measure/law 直传）。',
    parameters: {
      type: 'object', additionalProperties: false, required: ['title'],
      properties: {
        title: { type: 'string', description: '本动作名（闭合按此落账）' },
        group: { type: 'string', description: '归属组（合同内标题；动作不预排——归属即组落账口径）' },
        predict: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['key', 'value'], properties: { key: { type: 'string' }, value: { type: 'string' }, source: { type: 'string' } } }, description: '先算出来的预测（source 缺=declareStep 定理4 直拒）' },
        channels: { type: 'array', items: { type: 'string' }, description: '测量通道标识（<2 → 第5闸重流程判定，非绕闸）' },
        invariants: { type: 'array', items: { type: 'string' } },
        law: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['signal', 'action'], properties: { signal: { type: 'string' }, action: { type: 'string' } } } },
        cost: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['failure', 'defense'], properties: { failure: { type: 'string' }, defense: { type: 'string' }, weight: { type: 'string' } } } },
        right: { type: 'string' }, wrong: { type: 'string' },
        vExpect: { type: 'string', enum: ['improve', 'dip'] },
        dipPlan: { type: 'string' },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
      },
    },
    output: OUT,
    async execute(args, exec) {
      const sid = sidOf(exec)
      const s = mustState(sid)
      if (s.stage !== 'rolling') throw new Error(`declare 仅在快环段（rolling）——当前=${s.stage}；先 freeze+确认`)
      const top = stackTop(loadStack(sid))
      if (top && top.status === 'open' && top.title !== String(args?.title || '').trim()) throw new Error(`栈顶「${top.title}」未闭合——闭合即推进，禁开新动作（写闸）`)
      const fullForm = args?.measure && Array.isArray(args.measure.channels) && Array.isArray(args?.law) && Array.isArray(args?.predictions || args?.predict) && (args?.predictions || args?.predict).every((p) => p.source)
      let contract, admission = 'full', notes = []
      if (fullForm) {
        contract = { ...args, predictions: args.predictions || args.predict }
      } else {
        const m = materialize(controlSurface(s), args)
        if (!m.ok) throw new Error(m.error)
        contract = m.contract
        admission = m.admission
        notes = m.notes
      }
      const r = declareStep(sid, contract)
      if (!r.ok) throw new Error(r.error)
      const lowNote = r.step.confidence === 'low' ? '\n⚠ 可辨识性=低：停下交分歧点，不得硬实现。' : ''
      const dipNote = r.step.vExpect === 'dip' ? '\n⚠ dip 已登记：回升义务挂账，下一闭合步必须改善。' : ''
      return { ok: true, text: `✅ 动作「${r.step.title}」契约物化落盘（open·准入=${admission}）。预测 ${r.step.predictions.length}、通道 ${r.step.measure.channels.length}、law ${r.step.law.length}（含基行）、beforeBand=${controlSurface(s).residual.lastBand || 'far'}（引擎直读）${notes.length ? '\n' + notes.join('\n') : ''}${lowNote}${dipNote}` }
    },
  }
}

export function optimalConvergeDefinition() {
  return {
    name: 'optimal_converge',
    description: '【最优律·收敛】三要素硬闸不变：agreed 数值「实测≠预测(通道)」异源复算 × ΔV 严格降（beforeBand=上步实测，引擎链校）× dv.channels≥2 两两不同。可选 group + closeGroup（声明该组由此动作收尾——落账走机械门：栈闭合齐+redteam 组逐动作审 pass 才 settled）。closed → recordClosed 自动续账；redteam 组动作闭合回执携**机械审材**（auditBrief）→ 派 fresh 子代理审后 audit_record 回账。',
    parameters: {
      type: 'object', additionalProperties: false, required: ['dv'],
      properties: {
        agreed: { type: 'array', items: { type: 'string' } },
        discrepancies: { type: 'array', items: { type: 'string' } },
        group: { type: 'string', description: '本动作归属组（recordClosed 口径）' },
        closeGroup: { type: 'boolean', description: '该组由本动作收尾（触发机械落账门）' },
        dv: { type: 'object', additionalProperties: false, required: ['beforeBand', 'measuredBand', 'channels'], properties: { beforeBand: { type: 'string', enum: ['far', 'near', 'at'] }, measuredBand: { type: 'string', enum: ['far', 'near', 'at'] }, channels: { type: 'array', items: { type: 'string' } } } },
      },
    },
    output: OUT,
    async execute(args, exec) {
      const sid = sidOf(exec)
      const r = convergeStep(sid, args || {})
      if (!r.ok) throw new Error(r.error)
      if (r.step.status !== 'closed') {
        const list = (r.step.discrepancies || []).map((x) => '  ✗ ' + x).join('\n')
        return { ok: true, text: `⚠️ 动作「${r.step.title}」预言失效（${r.step.discrepancies.length} 不吻合）：\n${list}\nrollback re-linearize → 重 declare（同签名直拒）。禁止修补冲刺。` }
      }
      let s = mustState(sid)
      const gTitle = String(args?.group || '').trim()
      s = { ...s, dipPending: loadStack(sid).steps.some((x) => x.pendingDip && x.dv && x.dv.after !== 'at') } // #B 修复：顶层挂账位与栈同步（饱和 dip 不计）
      const rc = recordClosed(s, { title: r.step.title, group: gTitle, band: r.step.dv?.after, at: Date.now() })
      if (rc.ok) s = rc.state
      const g = s.groups.find((x) => x.title === gTitle)
      let briefNote = ''
      if (g && g.verify === 'redteam') {
        try {
          const stackRaw = readFileSync(optimalFileFor(sid), 'utf8')
          const b = auditBrief({ stackRaw, targetTitle: r.step.title, cost: s.cost })
          briefNote = b.ok ? `\n【另头审·引擎备材】派 fresh 子代理直读栈文件审推导链（审材如下），回执原样交 audit_record(title, verdictText)：\n---\n${b.brief}\n---` : `\n【另头审备材异常】${b.error}`
        } catch (e) { briefNote = `\n【另头审备材异常】${e.message}` }
      }
      const notes = []
      if (args?.closeGroup && gTitle) {
        const tgt = s.groups.find((x) => x.title === gTitle)
        if (tgt) { tgt.closeRequested = true; notes.push(`组「${gTitle}」请求落账`) }
        const tr = trySettleGroups(s, loadStack(sid).steps)
        s = tr.state
        notes.push(...tr.notes)
      }
      saveState(sid, s)
      const surf = controlSurface(s)
      const head = `✅ 动作「${r.step.title}」closed（吻合 ${r.step.agreed.length} + ΔV ${r.step.dv.before}→${r.step.dv.after}）= V 账本锚点 · 残差:未落账组=${surf.residual.groupsOpen.length}·已闭=${surf.residual.closedCount}`
      return { ok: true, text: [head, briefNote, notes.join('\n'), s.stage === 'final' ? '全链落账 → terminal_check 归零。' : ''].filter(Boolean).join('\n') }
    },
  }
}

export function auditRecordDefinition(name = 'audit_record') {
  return {
    name,
    description: name === 'audit_record'
      ? '【审·回账】fresh 子代理审毕，原样回执交此硬验：引文必须是栈文件**逐字子串**（伪造即拒）+ verdict pass|reject（reject 必附 issues）+ ≤1KB。pass → 落账 closed[].audit；redteam 组的落账门据此放行。手动自演（cost_audit 别名）同形同闸——审方也得真读盘。'
      : '【审·手动修订道】与 audit_record 同形同闸（引文硬验不豁免自演）：scope 已废——title 精确匹配动作名。',
    parameters: {
      type: 'object', additionalProperties: false, required: ['title', 'verdictText'],
      properties: {
        title: { type: 'string', description: '被审动作名' },
        verdictText: { type: 'string', description: '审方回执原文（含 JSON：verdict/issues/quotes）' },
      },
    },
    output: OUT,
    async execute(args, exec) {
      const sid = sidOf(exec)
      const s = mustState(sid)
      let stackRaw = ''
      try { stackRaw = readFileSync(optimalFileFor(sid), 'utf8') } catch { throw new Error('栈文件不可读——审材不存在') }
      const p = parseVerdict({ stackRaw, verdictText: String(args?.verdictText || '') })
      if (!p.ok) throw new Error(`回执不合审契约：${p.error}`)
      const rec = recordAuditVerdict(s, String(args?.title || '').trim(), p.verdict)
      if (!rec.ok) throw new Error(rec.error)
      let s2 = rec.state
      const notes = [`审落账：「${args.title}」verdict=${p.verdict.verdict}（rounds=${s2.closed.find((c) => c.title === args.title)?.audit?.rounds}）`]
      if (p.verdict.verdict === 'reject') notes.push('打回义务：修复后**再审**（新引文），过审前该组落账门不开。')
      const tr = trySettleGroups(s2, loadStack(sid).steps)
      s2 = tr.state
      notes.push(...tr.notes)
      saveState(sid, s2)
      return { ok: true, text: notes.join('\n') + (s2.stage === 'final' ? '\n全链落账 → terminal_check 归零。' : '') }
    },
  }
}

export function optimalRollbackDefinition() {
  return {
    name: 'optimal_rollback',
    description: '【最优律·回滚】撤销栈顶（open/invalidated；closed=锚点不可撤）。reason=re-linearize 产物（哪个推导错了）；同签名重 declare 直拒（定理6 局部式——引擎位）。',
    parameters: { type: 'object', additionalProperties: false, required: ['reason'], properties: { reason: { type: 'string', description: '≥8 字：错在哪层（预测来源/权重/状态定义/偏差策略）' } } },
    output: OUT,
    async execute(args, exec) {
      const sid = sidOf(exec)
      const reason = String(args?.reason || '').trim()
      if (reason.length < 8) throw new Error('rollback 需要 reason ≥8 字（可审计——看不出为何撤=白滚）')
      const r = rollbackStep(sid, reason)
      if (!r.ok) throw new Error(r.error)
      return { ok: true, text: `↩️「${r.step.title}」已撤（原=${r.step.status}）。重 declare 须带新模型签名（来源/权重/不变式至少一易）。` }
    },
  }
}

export function optimalStackDefinition() {
  return {
    name: 'optimal_stack',
    description: '【栈】动作栈+V 时间线+回炉史（审材邻域切片的数据源；全量展示仍是可用通道，常驻面已不依赖它）。',
    parameters: { type: 'object', additionalProperties: false, required: [], properties: {} },
    output: OUT,
    async execute(_args, exec) {
      const sid = sidOf(exec)
      return { ok: true, text: stackText(loadStack(sid)) }
    },
  }
}

export function reviseDoDefinition() {
  return {
    name: 'revise_do',
    description: '【形态修订·组级 v0.3】开发期改组默认执行形态 do（登记 doHistory 轨迹）；verify（核对承诺）只读——审强度不因形态变化打折。',
    parameters: {
      type: 'object', additionalProperties: false, required: ['group', 'do'],
      properties: {
        group: { type: 'string' },
        do: { type: 'string', enum: ['self', 'subagent', 'workflow', 'daemon', 'mixed'] },
        reason: { type: 'string' },
      },
    },
    output: OUT,
    async execute(args, exec) {
      const sid = sidOf(exec)
      const s = mustState(sid)
      const g = s.groups.find((x) => x.title === String(args?.group || '').trim())
      if (!g) throw new Error('组不在合同内')
      if (!['self', 'subagent', 'workflow', 'daemon', 'mixed'].includes(args?.do)) throw new Error('do 枚举无效：self|subagent|workflow|daemon|mixed（输入门面拒，不入库）')
      const from = g.do || 'self'
      g.do = args.do
      g.doHistory = [...(g.doHistory || []), { at: Date.now(), from, to: args.do, reason: String(args?.reason || '') }]
      saveState(sid, { ...s, groups: s.groups.map((x) => (x.title === g.title ? g : x)) })
      return { ok: true, text: `组「${g.title}」执行形态 ${from}→${args.do}（verify 未动，审史在账）` }
    },
  }
}

export function terminalCheckDefinition() {
  return {
    name: 'terminal_check',
    description: '【终端·归零】唯一 throw 位（stage≠final 直拒）。v3 零判据：全组 settled ∧ 栈无未闭动作 ∧ 无 dip 挂账——报告 terminalReport 落盘；非零=报告交处置。',
    parameters: { type: 'object', additionalProperties: false, required: [], properties: {} },
    output: OUT,
    async execute(_args, exec) {
      const sid = sidOf(exec)
      const s = mustState(sid)
      const rep = terminalCheck(s.cost, loadStack(sid), s, s.stage)
      saveState(sid, { ...s, terminalReport: { at: Date.now(), ...rep } })
      const head = rep.zero
        ? `✅ 终端归零：断言 ${(s.cost.assertions || []).length} 条·闭合动作=${rep.closedSteps}·组落账=齐`
        : `⚠ 终端未归零（交处置）：未落账组=${rep.unsettledGroups.join('、') || '无'}；未闭动作=${rep.openSteps.join('、') || '无'}；dip=${rep.dipPending}`
      return { ok: true, text: head + `\n目的：${cut(rep.purpose, 60)}` }
    },
  }
}
