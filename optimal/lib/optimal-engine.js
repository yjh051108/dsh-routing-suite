/**
 * optimal-engine — LQR 最优律增量栈（纯函数+磁盘单轨；optimal-mode 核心，可单测）。
 * 哲学：最优律由目标 backward 推导；每步 declare 最优律契约 → 实现 → converge 验证
 * cost-to-go（V 序带）严格下降 + 数值逐项吻合（≠非同源复算）+ 双通道测量。
 * 闭合=closed（V 账本锚点，不可撤）；不吻合/ΔV 不降=invalidated → rollback=re-linearize
 * （重声明必须带新模型签名——同签名拒绝=定理 6 反漂移）。不存在"调试"状态。
 *
 * V 序带三档（批准决议）：band ∈ {far, near, at}（远/近/达），declared 期望 + measured 实证；
 * dip 例外：declare 预声明"暂差段+回升计划"，本步允许 band 不降，但记 dipPending——
 * 下一 closed 步必须回升（pendingDip 时 converge 强制 measuredBand < declared 前档），反 J 曲线滥用。
 *
 * 借用 LQR 结构律（backward 推导/单调门/策略前置），不声称数学等价——任务态非线性代价非二次。
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

export const BANDS = { far: 3, near: 2, at: 1 } // 序带：数字越小越接近目标
export const bandName = (b) => (b === 'at' ? '达档' : b === 'near' ? '近档' : '远档')
export function optimalDir() {
  return join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'graded-state') // 目录沿用（迁移兼容）
}
export function optimalFileFor(sid) {
  return join(optimalDir(), String(sid || '').replace(/[^a-zA-Z0-9-]/g, '_') + '.optimal.json')
}
export function loadStack(sid) {
  const f = optimalFileFor(sid)
  const legacy = join(optimalDir(), String(sid || '').replace(/[^a-zA-Z0-9-]/g, '_') + '.predict.json')
  try {
    if (!existsSync(f) && existsSync(legacy)) { try { renameSync(legacy, f) } catch { /* 竞态容忍 */ } }
    if (!existsSync(f)) return { version: 2, steps: [] }
    const s = JSON.parse(readFileSync(f, 'utf8'))
    if (!Array.isArray(s.steps)) s.steps = []
    s.version = s.version || 2
    return s
  } catch { return { version: 2, steps: [] } }
}
export function saveStack(sid, s) {
  try {
    s.version = 2
    mkdirSync(optimalDir(), { recursive: true })
    writeFileSync(optimalFileFor(sid), JSON.stringify(s), 'utf8')
    return true
  } catch { return false }
}
export const stackTop = (s) => s.steps[s.steps.length - 1] || null

/** 残差→序带（与 freeze 档链同一分档定义）。 */
export const costBand = (n) => (n >= 3 ? 'far' : n >= 1 ? 'near' : 'at')

/** V 账本数据生成（单一同源：stackText 与 /panel 端点两处消费——禁止两处各造）。 */
export function vLadderOf(steps) {
  const closed = (steps || []).filter((s) => s.status === 'closed')
  return {
    run: closed.map((s) => ({ n: s.n, title: s.title, from: s.dv?.before || '', to: s.dv?.after || '', mode: s.dv?.mode || 'improve', pendingDip: s.pendingDip === true })),
    dipPending: (steps || []).filter((s) => s.pendingDip === true).length,
  }
}

/** 模型签名（反漂移闸）：title+来源集+不变式+代价权重——rollback 后重 declare 必须变。 */
export function modelSignature(step) {
  const src = (step.predictions || []).map((p) => p.source || '').sort().join('|')
  const inv = (step.invariants || []).sort().join('|')
  const cost = (step.cost || []).map((c) => c.failure).sort().join('|')
  return `${step.title}::${src}::${inv}::${cost}`
}

/**
 * declareStep：最优律契约落盘（每块开工前）。
 * 契约五段（SPEC-optimal §3）：invariants（状态链）/ predictions（值+来源）/
 * cost（失败模式+防错+权重）/ law（偏差策略：观测到 X 则按预声明动作响应）/
 * measure（预期-观测对+双通道计划）+ vExpect（ΔV 预测档：'improve' / 'dip' / 'maintain'=at 档保持验证）+ confidence（可辨识性）。
 */
export function declareStep(sid, args) {
  const s = loadStack(sid)
  const cur = stackTop(s)
  const step = {
    n: cur ? cur.n + 1 : 1,
    title: String(args?.title || '').trim(),
    invariants: (args?.invariants || []).map(String),
    predictions: (args?.predictions || []).map((p) => ({ key: String(p.key), value: String(p.value), source: String(p.source || '（无来源——定理4：阈值必有来源）') })),
    cost: (args?.cost || args?.budget || []).map((c) => ({ failure: String(c.failure), defense: String(c.defense), weight: String(c.weight || '标准：失败态权重→∞（防错=选标准）') })),
    law: (args?.law || []).map((l) => ({ signal: String(l.signal), action: String(l.action) })),
    measure: args?.measure ? { right: String(args.measure.right || ''), wrongSignal: String(args.measure.wrongSignal || ''), channels: (Array.isArray(args.measure.channels) ? args.measure.channels : []).map(String) } : null,
    vExpect: ['improve', 'dip', 'maintain'].includes(args?.vExpect) ? args.vExpect : 'improve',
    dipPlan: String(args?.dipPlan || ''),
    confidence: ['high', 'medium', 'low'].includes(args?.confidence) ? args.confidence : 'medium',
    status: 'open', agreed: [], discrepancies: [], dv: null, signature: '', at: Date.now(),
  }
  if (!step.title) return { ok: false, error: 'optimal_declare 需要 title（本块名，与盘档小类名一致——闭合即按此 mark）' }
  if (step.predictions.length === 0) return { ok: false, error: '预测值为空=未推导——至少 1 个可度量结果先算出来（禁止先实现后取值）' }
  // 定理4 硬化（v0.3 #3 接线发现：v0.2 实况=占位标签无硬拒；闸只增不减合规）：无源=声明期直拒
  if ((args?.predictions || []).some((p) => !String(p?.source || '').trim())) return { ok: false, error: '定理4：预测必须逐条含来源（source=公式/标准/实测原话；无来源=无效——防"自造 0.02"冒充标准）。补齐来源后重 declare。' }
  if (args?.measure && !Array.isArray(args.measure.channels)) return { ok: false, error: 'measure.channels 形状错：需字符串数组 ≥2 条（如 ["盘档: …","运行时: …"]）——契约校验直拒，非实现异常' }
  if (!step.measure || step.measure.channels.length < 2) return { ok: false, error: 'measure.channels 需 ≥2 条独立测量通道（定理5：双通道一致；同源两遍不计）' }
  if (step.law.length === 0) return { ok: false, error: 'law 必填 ≥1 条——偏差策略前置（观测到 X→按预声明动作 Y）。无预声明策略=隐含\u201c到时候调试\u201d——消灭\u201c调试\u201d态的结构位' }
  if (step.vExpect === 'dip' && step.dipPlan.length < 8) return { ok: false, error: 'dip 预声明须带回升计划（dipPlan ≥8 字：暂差段之后如何回升——反 J-curve 滥用）' }
  step.signature = modelSignature(step)
  // 反漂移（定理 6）：被回滚步的签名与新声明相同 → 拒绝（必须 re-linearize：改来源/权重/状态定义之一）
  const rb = (s.rolledBack || []).filter((r) => r.title === step.title)
  const sameSig = rb.find((r) => r.signature === step.signature)
  if (sameSig) {
    return { ok: false, error: `定理6·反馈收敛闸：块「${step.title}」第 ${rb.length + 1} 次以**相同模型签名**重声明（来源/权重/不变式均未变）——禁止再调参数。必须换建模（新公式来源/新代价权重/新状态定义）或停下把分歧点交给用户。`, rollbackHistory: rb.map((r) => r.reason) }
  }
  if (cur && cur.status === 'open') {
    // 同块重声明（未闭合前修订）：栈顶替换；签名查重防"原地重猜"
    const s2 = { ...s }
    s2.steps[s2.steps.length - 1] = step
    saveStack(sid, s2)
    return { ok: true, step, replaced: true }
  }
  s.steps.push(step)
  saveStack(sid, s)
  return { ok: true, step }
}

/**
 * convergeStep：实现后闭合验证。三要素硬闸（任一不过=invalidated）：
 * ① 数值逐项：discrepancies 空；含数字预测的 agreed 必须「key: 实测 ≠ 预测(通道)」（≠非同源复算，复述=假锚）
 * ② ΔV 序带：dv.measuredBand 严格 < dv.beforeBand（dip 声明步除外，转回升义务 pendingDip）
 * ③ 双通道：dv.channels ≥2 且通道标识两两不同（同源不计）
 * 全过 → closed（V 账本落 beforeBand→measuredBand）。
 */
export function convergeStep(sid, args) {
  const s = loadStack(sid)
  const cur = stackTop(s)
  if (!cur) return { ok: false, error: '无 open 步——先 optimal_declare（optimal-drive：无推导不实现）' }
  if (cur.status !== 'open') return { ok: false, error: `步${cur.n}「${cur.title}」已 ${cur.status}——无需重复收敛` }
  cur.agreed = (args?.agreed || []).map(String)
  cur.discrepancies = (args?.discrepancies || []).map(String)
  // ① 数值闭包（v0.3.2 Bug-A 修复）：
  // 含数字预测的 agreed 必须含「≠」——否则整体拒绝（必须显式声明测量结果）
  // 数值对校验只查有 agreed 覆盖的 numerics（已声明测量结果的才核格式）
  if (!args?.exempt && cur.discrepancies.length === 0) {
    const numeric = cur.predictions.filter((p) => /\d/.test(String(p.value)))
    if (numeric.length > 0) {
      // Bug-A fix：先算覆盖（agreed 覆盖 = 含该 numerics 的 key）
      const hasCoverage = numeric.some((p) => cur.agreed.some((a) => a.includes(p.key)))
      // 无覆盖时：等待测量声明，不强制要求 ≠（用户尚未填写测量结果）
      // 有覆盖但无 ≠ 时：要求 ≠（用户已填测量结果但未按格式）
      if (!hasCoverage) {
        // 跳过：尚未声明测量结果，不校验
      } else if (!cur.agreed.some((a) => a.includes('≠'))) {
        return { ok: false, error: `本块含 ${numeric.length} 个数值型预测（${numeric.map((p) => p.key).join('、')}）——agreed 必须附非同源复算证据，格式「key: 实测值 ≠ 预测值(通道)」；declare=事前计算、agree=独立测量，复述声明不算闭合（防自我认证假锚）` }
      }
      // ①b 数值对硬校验：只查 agreed 有覆盖的 numerics（无覆盖=未声明测量结果，等待即可，不强制不吻合）
      const forced = []
      for (const p of numeric) {
        const item = cur.agreed.find((a) => a.includes(p.key))
        if (!item) continue // 无 agreed 覆盖：尚未声明测量结果，不校验格式
        const pair = /实测\s*([0-9][0-9.]*)[^0-9]*≠[^0-9]*([0-9][0-9.]*)/.exec(item)
        if (!pair) forced.push(`${p.key}: 假吻合（数值预测需「实测 <A> ≠ 预测 <B>」数字对；未来事件/占位词≠测量，实测缺位=未验证）`)
        else if (pair[1] !== pair[2]) forced.push(`${p.key}: 实测 ${pair[1]} 与预测 ${pair[2]} 不一致（这是不吻合，应入 discrepancies 走 re-linearize，非 agreed）`)
      }
      if (forced.length) cur.discrepancies = [...cur.discrepancies, ...forced]
    }
  }
  // ② ΔV 序带 + ③ 双通道
  const dv = args?.dv || null
  if (!args?.exempt && cur.discrepancies.length === 0) {
    if (!dv || !dv.beforeBand || !dv.measuredBand) return { ok: false, error: 'dv 必填：{beforeBand, measuredBand, channels[]}——cost-to-go 序带（far/near/at）测前/测后档（ΔV 不报=未验证）' }
    const b = BANDS[dv.beforeBand], m = BANDS[dv.measuredBand]
    if (b === undefined || m === undefined) return { ok: false, error: 'dv 档位非法：只认 far/near/at（序带三档）' }
    const chans = (dv.channels || []).map((c) => String(c))
    if (chans.length < 2) return { ok: false, error: 'dv.channels 需 ≥2 条独立测量通道的实证（双通道一致——定理5；单通道=未闭合）' }
    const tags = chans.map((c) => (c.split(/[:：]/)[0] || '').trim().toLowerCase())
    if (new Set(tags).size !== tags.length) return { ok: false, error: 'dv.channels 通道标识重复/同源——两遍法不计，需两种独立测量路径（如 解析推导×运行时实测 / 公式×仿真 / 盘档×面板）' }
    // v0.3.3 maintain（验证类任务死锁修复——用户反馈直采）：保持目标态=合法闭环，
    // 不是假装 improve、也不是借 dip 编回升故事。闭合条件：before=at 且 measured=at。
    if (cur.vExpect === 'maintain') {
      if (b !== BANDS.at) return { ok: false, error: `vExpect=maintain 只在 at 档合法（目标已达）：当前 before=${dv.beforeBand} 未达目标——保持=逃避改善义务。推进走 improve，确属暂差段 declare dip 带回升计划。` }
      if (m !== BANDS.at) return { ok: false, error: `maintain 步测后=${dv.measuredBand}：不是保持目标态，是倒退——预言失效走 rollback re-linearize（诚实报档优于硬凑 maintain 闭合）。` }
      cur.dv = { before: dv.beforeBand, after: dv.measuredBand, channels: chans, mode: 'maintain' }
      s.steps.forEach((x) => { if (x !== cur && x.pendingDip) x.pendingDip = false }) // 回 at 即清：与饱和步同口径
    } else if (m >= b && cur.vExpect !== 'dip') {
      return { ok: false, error: `ΔV 闸未过：测后档 ${dv.measuredBand}(${bandName(dv.measuredBand)}) 未严格优于测前 ${dv.beforeBand}(${bandName(dv.beforeBand)})——cost-to-go 不降=模型预言失效。回滚 re-linearize（rollback→改建模→重 declare）；确属暂差段（重构 J-curve）应事先 declare vExpect='dip' 带回升计划；验证「已达 at 且保持」应 declare vExpect='maintain'（v0.3.3：闭合条件=测后仍 at，无回升义务）。` }
    } else if (m >= b && cur.vExpect === 'dip') {
      if (b === BANDS.at && m !== BANDS.at) return { ok: false, error: 'dip 登记被拒（v0.3.1·体验单缺陷①活板门关闭）：before=at 已是最优档，measured=' + dv.measuredBand + ' 的挂账其清偿条件（严格优于 at）在枚举内不可满足——不可满足的债务不配登记。at 档验证/保持步用 vExpect=maintain（v0.3.3）；真倒退=预言失效，走 rollback re-linearize 改建模。' }
      if (m === BANDS.at) {
        // 底档 dip=饱和（smoke2 #A + v0.3.1 清偿救援）：达 at 即终结债务——清一切挂账（含存量 at 登记死角）
        cur.dv = { before: dv.beforeBand, after: dv.measuredBand, channels: chans, mode: 'dip-saturated' }
        s.steps.forEach((x) => { if (x !== cur && x.pendingDip) x.pendingDip = false })
      } else {
        if (s.steps.some((x) => x.pendingDip && x.status === 'closed')) return { ok: false, error: '栈上已有未清偿的 dip 段——连续 dip 禁止（回升义务优先：先闭合一个改善步清账，再议新的暂差段）' }
        cur.pendingDip = true // 本步暂差合法（按声明轨迹）；下一闭合步必须回升
        cur.dv = { before: dv.beforeBand, after: dv.measuredBand, channels: chans, mode: 'dip' }
      }
    } else {
      cur.dv = { before: dv.beforeBand, after: dv.measuredBand, channels: chans, mode: cur.vExpect }
    }
  }
  // dip 清偿 sweep（v0.3.1 缺陷①「回 at 即清」）：improve 步严格优于挂账前档，或任何 improve 达 at——债务终结
  s.steps.forEach((x) => { if (x !== cur && x.pendingDip && cur.dv && cur.dv.mode === 'improve' && (BANDS[cur.dv.after] < BANDS[x.dv.before] || cur.dv.after === 'at')) x.pendingDip = false })
  cur.status = cur.discrepancies.length === 0 && (cur.dv || args?.exempt) ? 'closed' : 'invalidated'
  if (cur.status === 'closed' && cur.dv) cur.vLedger = `${cur.dv.before}→${cur.dv.after}`
  saveStack(sid, s)
  return { ok: true, step: cur }
}

/** optimal_rollback：撤销栈顶（open/invalidated）；closed=V 账本锚点不可撤。reason=re-linearize 产物。 */
export function rollbackStep(sid, reason) {
  const s = loadStack(sid)
  const cur = stackTop(s)
  if (!cur) return { ok: false, error: '空栈——无可回滚' }
  if (cur.status === 'closed') return { ok: false, error: `步${cur.n}「${cur.title}」已闭合（V 账本锚点）不可撤销` }
  const removed = s.steps.pop()
  removed.rollbackReason = String(reason || '').trim() || '（未记录）'
  s.rolledBack = s.rolledBack || []
  s.rolledBack.push({ n: removed.n, title: removed.title, reason: removed.rollbackReason, signature: removed.signature, diffs: removed.discrepancies || [], at: Date.now() })
  saveStack(sid, s)
  return { ok: true, step: removed }
}

/** 匹配盘档块的闭合步（推进门禁：完成须有同名 closed 步）。 */
export function findClosedFor(sid, title) {
  const s = loadStack(sid)
  return s.steps.filter((x) => x.status === 'closed' && x.title === title).pop() || null
}

/** V 时间线文本（面板/审计/红队入口）。 */
export function stackText(s) {
  if (!s.steps.length) return '（空栈——没有已声明的最优律步；新块先 optimal_declare：backward 从目标推导，每步从契约起步）'
  const rows = s.steps.map((st) => {
    const dv = st.dv ? ` ΔV=${st.dv.mode === 'dip' ? 'dip' : '↓'} ${st.dv.before}→${st.dv.after}` : ''
    const pend = st.pendingDip ? ' [dip未清偿]' : ''
    return `#${st.n} ${st.title} [${st.status}] 不变式=${st.invariants.length} 预测=${st.predictions.length} 偏差策略=${st.law.length} 通道=${st.measure?.channels?.length || 0} 吻合=${st.agreed.length} 不吻合=${st.discrepancies.length}${dv}${pend}`
  })
  const ladder = vLadderOf(s.steps)
  const vTl = ladder.run.map((r) => `#${r.n}「${r.title}」${r.from}→${r.to}`).join(' ⇒ ') + (ladder.dipPending ? ` [dip 挂账 ${ladder.dipPending} 笔未清偿]` : '')
  const rb = (s.rolledBack || []).length ? '\nre-linearize 审计：' + s.rolledBack.map((r) => `#${r.n}「${r.title}」原因=${r.reason}`).join(' | ') : ''
  return `**最优律增量栈（${s.steps.length} 步）**\n${rows.join('\n')}\n栈顶=${stackTop(s)?.status || '-'}\nV 时间线：${vTl || '（无闭合步）'}${rb}`
}

/** backward 价值链初始档（L2 锁定回执用，SPEC §6：锁定时从盘档算初档呈现）。 */
export function valueChainText(items) {
  const total = (items || []).length
  if (!total) return ''
  const band0 = total >= 3 ? 'far' : total >= 1 ? 'near' : 'at'
  return `**V 初档（backward 自目标推）**：未闭合小类 ${total} 个 → 残差档 **${band0}(${bandName(band0)})**；每块 converge 的 ΔV 以此为链起点，逐块声明 before/after 档（链不连续=declare 时校对）。`
}
